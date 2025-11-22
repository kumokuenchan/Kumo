import { Router, Request, Response } from 'express';
import { chromium, firefox, webkit, Browser, Page } from 'playwright';

const router = Router();

// Types matching frontend
interface TestStep {
  id: string;
  action: string;
  description?: string;
  url?: string;
  selector?: string;
  selectorType?: string;
  value?: string;
  key?: string;
  timeout?: number;
  state?: string;
  expected?: string;
  matchType?: string;
  fullPage?: boolean;
  enabled?: boolean;
}

interface TestConfig {
  browser: 'chromium' | 'firefox' | 'webkit';
  headless: boolean;
  viewport: { width: number; height: number };
  timeout: number;
  retries: number;
  baseUrl?: string;
  slowMo?: number;
}

interface PlaywrightTest {
  id: string;
  name: string;
  steps: TestStep[];
  config: TestConfig;
}

interface StepResult {
  stepId: string;
  passed: boolean;
  duration: number;
  error?: string;
  screenshot?: string;
}

interface PlaywrightEnvironment {
  baseUrl: string;
  variables: Record<string, string>;
}

// Run a Playwright test
router.post('/run', async (req: Request, res: Response) => {
  const { test, environment } = req.body as {
    test: PlaywrightTest;
    environment?: PlaywrightEnvironment;
  };

  if (!test || !test.steps) {
    return res.status(400).json({ error: 'Invalid test data' });
  }

  let browser: Browser | null = null;
  let page: Page | null = null;
  const stepResults: StepResult[] = [];
  let testPassed = true;
  let testError: string | undefined;

  try {
    // Launch browser
    const browserLauncher = test.config.browser === 'firefox' ? firefox :
                            test.config.browser === 'webkit' ? webkit : chromium;

    browser = await browserLauncher.launch({
      headless: test.config.headless,
      slowMo: test.config.slowMo
    });

    // Context options with optional video recording
    const contextOptions: any = {
      viewport: test.config.viewport
    };

    // Enable video recording if configured
    if (test.config.video === 'on' || test.config.video === 'retain-on-failure') {
      contextOptions.recordVideo = {
        dir: '/tmp/playwright-videos/',
        size: { width: 1280, height: 720 }
      };
    }

    const context = await browser.newContext(contextOptions);

    page = await context.newPage();
    page.setDefaultTimeout(test.config.timeout);

    // Apply environment variables to URLs
    const resolveUrl = (url: string): string => {
      if (!url) return url;

      // Replace environment variables
      if (environment?.variables) {
        for (const [key, value] of Object.entries(environment.variables)) {
          url = url.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
      }

      // Apply base URL
      const baseUrl = environment?.baseUrl || test.config.baseUrl;
      if (baseUrl && !url.startsWith('http')) {
        url = baseUrl.replace(/\/$/, '') + '/' + url.replace(/^\//, '');
      }

      return url;
    };

    // Execute each step
    for (const step of test.steps) {
      if (step.enabled === false) continue;

      const stepStartTime = Date.now();
      let stepPassed = true;
      let stepError: string | undefined;

      try {
        // Get selector
        const selector = step.selector ? formatSelector(step.selector, step.selectorType) : '';

        switch (step.action) {
          case 'navigate':
            await page.goto(resolveUrl(step.url || ''));
            break;

          case 'click':
            await page.locator(selector).click();
            break;

          case 'fill':
            await page.locator(selector).fill(step.value || '');
            break;

          case 'select':
            await page.locator(selector).selectOption(step.value || '');
            break;

          case 'check':
            await page.locator(selector).check();
            break;

          case 'uncheck':
            await page.locator(selector).uncheck();
            break;

          case 'hover':
            await page.locator(selector).hover();
            break;

          case 'press':
            await page.locator(selector).press(step.key || 'Enter');
            break;

          case 'wait':
            await page.waitForTimeout(step.timeout || 1000);
            break;

          case 'waitForSelector':
            await page.locator(selector).waitFor({
              state: (step.state as any) || 'visible',
              timeout: step.timeout || 30000
            });
            break;

          case 'screenshot':
            await page.screenshot({ fullPage: step.fullPage || false });
            break;

          case 'assertVisible':
            await expect(page.locator(selector)).toBeVisible();
            break;

          case 'assertHidden':
            await expect(page.locator(selector)).toBeHidden();
            break;

          case 'assertText':
            if (step.matchType === 'contains') {
              await expect(page.locator(selector)).toContainText(step.expected || '');
            } else if (step.matchType === 'regex') {
              await expect(page.locator(selector)).toHaveText(new RegExp(step.expected || ''));
            } else {
              await expect(page.locator(selector)).toHaveText(step.expected || '');
            }
            break;

          case 'assertValue':
            await expect(page.locator(selector)).toHaveValue(step.expected || '');
            break;

          case 'assertUrl':
            if (step.matchType === 'contains') {
              if (!page.url().includes(step.expected || '')) {
                throw new Error(`URL "${page.url()}" does not contain "${step.expected}"`);
              }
            } else {
              await expect(page).toHaveURL(step.expected || '');
            }
            break;

          case 'assertTitle':
            await expect(page).toHaveTitle(step.expected || '');
            break;
        }

      } catch (error) {
        stepPassed = false;
        stepError = error instanceof Error ? error.message : 'Step failed';
        testPassed = false;
        testError = `Step "${step.action}" failed: ${stepError}`;
      }

      stepResults.push({
        stepId: step.id,
        passed: stepPassed,
        duration: Date.now() - stepStartTime,
        error: stepError
      });

      // Stop on first failure
      if (!stepPassed) break;
    }

  } catch (error) {
    testPassed = false;
    testError = error instanceof Error ? error.message : 'Test execution failed';
  }

  // Get video path before closing
  let videoPath: string | undefined;
  if (page) {
    try {
      const video = page.video();
      if (video) {
        videoPath = await video.path();
      }
    } catch {}
  }

  // Cleanup
  try {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  } catch {}

  // Build response
  const response: any = {
    passed: testPassed,
    stepResults,
    error: testError
  };

  // Include video if recorded and test failed (or always on)
  if (videoPath) {
    if (test.config.video === 'on' || (test.config.video === 'retain-on-failure' && !testPassed)) {
      response.video = videoPath;
    }
  }

  res.json(response);
});

// Helper to format selector based on type
function formatSelector(selector: string, type?: string): string {
  switch (type) {
    case 'testId':
      return `[data-testid="${selector}"]`;
    case 'text':
      return `text=${selector}`;
    case 'role':
      return `role=${selector}`;
    case 'label':
      return `label=${selector}`;
    case 'xpath':
      return `xpath=${selector}`;
    case 'css':
      return selector;
    default:
      // If no type specified, try to detect the selector type
      // CSS selectors typically start with #, ., [, or contain :
      if (selector.startsWith('#') ||
          selector.startsWith('.') ||
          selector.startsWith('[') ||
          selector.includes(':') ||
          selector.includes('>') ||
          selector.includes(' ')) {
        return selector; // Treat as CSS
      }
      // Otherwise treat as text selector for plain strings
      return `text=${selector}`;
  }
}

// Playwright expect helper
function expect(locatorOrPage: any) {
  return {
    async toBeVisible() {
      await locatorOrPage.waitFor({ state: 'visible' });
    },
    async toBeHidden() {
      await locatorOrPage.waitFor({ state: 'hidden' });
    },
    async toContainText(text: string) {
      const content = await locatorOrPage.textContent();
      if (!content?.includes(text)) {
        throw new Error(`Expected text to contain "${text}" but got "${content}"`);
      }
    },
    async toHaveText(expected: string | RegExp) {
      const content = await locatorOrPage.textContent();
      if (expected instanceof RegExp) {
        if (!expected.test(content || '')) {
          throw new Error(`Expected text to match ${expected} but got "${content}"`);
        }
      } else if (content !== expected) {
        throw new Error(`Expected text "${expected}" but got "${content}"`);
      }
    },
    async toHaveValue(value: string) {
      const actual = await locatorOrPage.inputValue();
      if (actual !== value) {
        throw new Error(`Expected value "${value}" but got "${actual}"`);
      }
    },
    async toHaveURL(url: string) {
      const actual = locatorOrPage.url();
      if (actual !== url) {
        throw new Error(`Expected URL "${url}" but got "${actual}"`);
      }
    },
    async toHaveTitle(title: string) {
      const actual = await locatorOrPage.title();
      if (actual !== title) {
        throw new Error(`Expected title "${title}" but got "${actual}"`);
      }
    }
  };
}

// ===== RECORDER ENDPOINTS =====

// Store active recording sessions
const recordingSessions = new Map<string, {
  browser: Browser;
  page: Page;
  actions: any[];
}>();

// Start recording session
router.post('/recorder/start', async (req: Request, res: Response) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const sessionId = crypto.randomUUID();

    // Launch browser in headed mode for recording
    const browser = await chromium.launch({
      headless: false,
      args: ['--start-maximized']
    });

    const context = await browser.newContext({
      viewport: null // Use full window size
    });

    const page = await context.newPage();
    const actions: any[] = [];

    // Add navigation action
    actions.push({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action: 'navigate',
      url: url
    });

    // Listen for clicks
    await page.exposeFunction('__recordClick', (selector: string) => {
      actions.push({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        action: 'click',
        selector,
        selectorType: 'css'
      });
    });

    // Listen for input
    await page.exposeFunction('__recordInput', (selector: string, value: string) => {
      actions.push({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        action: 'fill',
        selector,
        selectorType: 'css',
        value
      });
    });

    // Listen for navigation
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        const currentUrl = frame.url();
        // Only record if it's a new navigation (not the initial one)
        if (actions.length > 1 && actions[actions.length - 1].url !== currentUrl) {
          actions.push({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            action: 'navigate',
            url: currentUrl
          });
        }
      }
    });

    // Inject recording script
    await page.addInitScript(() => {
      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target) {
          const selector = generateSelector(target);
          (window as any).__recordClick?.(selector);
        }
      }, true);

      document.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
          const selector = generateSelector(target);
          // Debounce input recording
          clearTimeout((target as any).__inputTimeout);
          (target as any).__inputTimeout = setTimeout(() => {
            (window as any).__recordInput?.(selector, target.value);
          }, 500);
        }
      }, true);

      function generateSelector(el: HTMLElement): string {
        // Try data-testid first
        if (el.getAttribute('data-testid')) {
          return `[data-testid="${el.getAttribute('data-testid')}"]`;
        }
        // Try id
        if (el.id) {
          return `#${el.id}`;
        }
        // Try unique class combination
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => c).slice(0, 2);
          if (classes.length) {
            return `.${classes.join('.')}`;
          }
        }
        // Fallback to tag + nth-child
        const parent = el.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children);
          const index = siblings.indexOf(el) + 1;
          return `${el.tagName.toLowerCase()}:nth-child(${index})`;
        }
        return el.tagName.toLowerCase();
      }
    });

    // Navigate to URL
    await page.goto(url);

    // Store session
    recordingSessions.set(sessionId, { browser, page, actions });

    // Auto-cleanup after 30 minutes
    setTimeout(() => {
      const session = recordingSessions.get(sessionId);
      if (session) {
        session.browser.close().catch(() => {});
        recordingSessions.delete(sessionId);
      }
    }, 30 * 60 * 1000);

    res.json({ sessionId });

  } catch (error) {
    console.error('Failed to start recording:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to start recording' });
  }
});

// Get recorded actions
router.get('/recorder/:sessionId/actions', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = recordingSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({ actions: session.actions });
});

// Stop recording session
router.post('/recorder/:sessionId/stop', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const session = recordingSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  try {
    await session.browser.close();
    recordingSessions.delete(sessionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop recording' });
  }
});

// ===== REPORT GENERATION =====

// Generate HTML report
router.post('/report/html', async (req: Request, res: Response) => {
  const { results, testName } = req.body;

  const html = generateHtmlReport(results, testName);

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="${testName || 'test'}-report.html"`);
  res.send(html);
});

function generateHtmlReport(results: any[], testName: string): string {
  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;
  const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - ${testName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 900px; margin: 0 auto; }
    .header { background: white; padding: 24px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .summary { display: flex; gap: 24px; margin-top: 16px; }
    .stat { text-align: center; }
    .stat-value { font-size: 32px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .passed { color: #22c55e; }
    .failed { color: #ef4444; }
    .result { background: white; padding: 16px; border-radius: 8px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .result-name { font-weight: 600; }
    .result-status { padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .result-status.pass { background: #dcfce7; color: #166534; }
    .result-status.fail { background: #fee2e2; color: #991b1b; }
    .steps { font-size: 14px; }
    .step { padding: 8px 12px; border-left: 3px solid #e5e5e5; margin-bottom: 4px; }
    .step.pass { border-color: #22c55e; }
    .step.fail { border-color: #ef4444; background: #fef2f2; }
    .step-error { color: #991b1b; font-size: 12px; margin-top: 4px; }
    .duration { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Test Report: ${testName}</h1>
      <p style="color: #666;">Generated on ${new Date().toLocaleString()}</p>
      <div class="summary">
        <div class="stat">
          <div class="stat-value">${results.length}</div>
          <div class="stat-label">Total</div>
        </div>
        <div class="stat">
          <div class="stat-value passed">${passed}</div>
          <div class="stat-label">Passed</div>
        </div>
        <div class="stat">
          <div class="stat-value failed">${failed}</div>
          <div class="stat-label">Failed</div>
        </div>
        <div class="stat">
          <div class="stat-value">${totalDuration}ms</div>
          <div class="stat-label">Duration</div>
        </div>
      </div>
    </div>

    ${results.map(result => `
      <div class="result">
        <div class="result-header">
          <span class="result-name">${result.testName || 'Test'}</span>
          <span class="result-status ${result.passed ? 'pass' : 'fail'}">${result.passed ? 'PASSED' : 'FAILED'}</span>
        </div>
        ${result.stepResults ? `
          <div class="steps">
            ${result.stepResults.map((step: any) => `
              <div class="step ${step.passed ? 'pass' : 'fail'}">
                <strong>${step.action || 'Step'}</strong>
                <span class="duration">${step.duration}ms</span>
                ${step.error ? `<div class="step-error">${step.error}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${result.error ? `<div class="step-error" style="margin-top: 8px;">${result.error}</div>` : ''}
      </div>
    `).join('')}
  </div>
</body>
</html>`;
}

export default router;
