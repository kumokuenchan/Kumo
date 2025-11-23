import { Router, Request, Response } from 'express';
import { chromium, firefox, webkit, Browser, Page } from 'playwright';
import path from 'path';
import fs from 'fs/promises';

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
  video?: 'on' | 'off' | 'retain-on-failure';
  screenshot?: 'on' | 'off' | 'only-on-failure';
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

        // Helper to get locator with optional nth index
        const getLocator = (sel: string) => {
          // Check for >> nth=N syntax
          const nthMatch = sel.match(/^(.+?)\s*>>\s*nth=(\d+)$/);
          if (nthMatch) {
            return page.locator(nthMatch[1]).nth(parseInt(nthMatch[2]));
          }
          // Check for :first suffix
          if (sel.endsWith(':first')) {
            return page.locator(sel.replace(/:first$/, '')).first();
          }
          // Check for :all suffix (strict mode - error if multiple)
          if (sel.endsWith(':all')) {
            return page.locator(sel.replace(/:all$/, ''));
          }
          // Default: return locator without first() - we'll handle visibility per action
          return page.locator(sel);
        };

        // Helper to get first visible element from locator
        const getFirstVisible = async (locator: any) => {
          const count = await locator.count();
          if (count === 0) {
            throw new Error(`No elements found for selector: ${selector}`);
          }
          if (count === 1) return locator.first();

          // Find first visible element
          for (let i = 0; i < count; i++) {
            const el = locator.nth(i);
            try {
              if (await el.isVisible()) {
                return el;
              }
            } catch (e) {
              // Element might be detached, continue to next
              continue;
            }
          }
          // Fallback to first if none visible
          return locator.first();
        };

        switch (step.action) {
          case 'navigate':
            await page.goto(resolveUrl(step.url || ''));
            break;

          case 'click':
            await (await getFirstVisible(getLocator(selector))).click();
            break;

          case 'fill':
            await (await getFirstVisible(getLocator(selector))).fill(step.value || '');
            break;

          case 'select':
            await (await getFirstVisible(getLocator(selector))).selectOption(step.value || '');
            break;

          case 'check':
            await (await getFirstVisible(getLocator(selector))).check();
            break;

          case 'uncheck':
            await (await getFirstVisible(getLocator(selector))).uncheck();
            break;

          case 'hover':
            await (await getFirstVisible(getLocator(selector))).hover();
            break;

          case 'press':
            await (await getFirstVisible(getLocator(selector))).press(step.key || 'Enter');
            break;

          case 'wait':
            await page.waitForTimeout(step.timeout || 1000);
            break;

          case 'waitForSelector':
            await (await getFirstVisible(getLocator(selector))).waitFor({
              state: (step.state as any) || 'visible',
              timeout: step.timeout || 30000
            });
            break;

          case 'screenshot':
            const timestamp = Date.now();
            // Use project root directory for screenshots
            const projectRoot = path.resolve(process.cwd());
            const screenshotDir = path.join(projectRoot, 'playwright-screenshots');
            const screenshotPath = path.join(screenshotDir, `screenshot-${test.id}-${step.id}-${timestamp}.png`);
            
            // Ensure directory exists
            try {
              await fs.mkdir(screenshotDir, { recursive: true });
            } catch (e) {
              console.error('Failed to create screenshots directory:', e);
            }
            
            await page.screenshot({ 
              fullPage: step.fullPage || false,
              path: screenshotPath
            });
            
            // Store screenshot path in step result
            stepResults.push({
              stepId: step.id,
              passed: true,
              duration: Date.now() - stepStartTime,
              screenshot: screenshotPath
            });
            continue; // Skip adding to stepResults again

          case 'assertVisible':
            await expect(await getFirstVisible(getLocator(selector))).toBeVisible();
            break;

          case 'assertHidden':
            // For assertHidden, check if any element is hidden
            const hiddenLocator = getLocator(selector);
            const hiddenCount = await hiddenLocator.count();
            if (hiddenCount === 0) {
              // No elements found, consider it hidden
              break;
            }
            let allHidden = true;
            for (let i = 0; i < hiddenCount; i++) {
              try {
                if (await hiddenLocator.nth(i).isVisible()) {
                  allHidden = false;
                  break;
                }
              } catch (e) {
                // Element might be detached, consider it hidden
                continue;
              }
            }
            if (!allHidden) {
              throw new Error(`Expected element to be hidden but at least one is visible`);
            }
            break;

          case 'assertText':
            if (step.matchType === 'contains') {
              await expect(await getFirstVisible(getLocator(selector))).toContainText(step.expected || '');
            } else if (step.matchType === 'regex') {
              await expect(await getFirstVisible(getLocator(selector))).toHaveText(new RegExp(step.expected || ''));
            } else {
              await expect(await getFirstVisible(getLocator(selector))).toHaveText(step.expected || '');
            }
            break;

          case 'assertValue':
            await expect(await getFirstVisible(getLocator(selector))).toHaveValue(step.expected || '');
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
        
        // Take screenshot on failure if configured
        let screenshotPath: string | undefined;
        if (test.config.screenshot === 'only-on-failure' || test.config.screenshot === 'on') {
          try {
            const timestamp = Date.now();
            // Use project root directory for screenshots
            const projectRoot = path.resolve(process.cwd());
            const screenshotDir = path.join(projectRoot, 'playwright-screenshots');
            screenshotPath = path.join(screenshotDir, `failure-${test.id}-${step.id}-${timestamp}.png`);
            
            // Ensure directory exists
            await fs.mkdir(screenshotDir, { recursive: true });
            
            if (page && !page.isClosed()) {
              await page.screenshot({ 
                fullPage: true,
                path: screenshotPath
              });
            }
          } catch (screenshotError) {
            console.error('Failed to take failure screenshot:', screenshotError);
          }
        }
        
        // Check if it's a page closure error
        if (error instanceof Error && 
            (error.message.includes('Target page, context or browser has been closed') ||
             error.message.includes('Page was closed') ||
             error.message.includes('Page was closed during test execution'))) {
          testError = 'Page was closed during test execution';
          console.error('Page closed during step execution:', step.action);
        } else {
          testError = `Step "${step.action}" failed: ${stepError}`;
        }
        testPassed = false;
        
        // Break out of the loop on page closure
        if (error instanceof Error && 
            (error.message.includes('Target page, context or browser has been closed') ||
             error.message.includes('Page was closed'))) {
          break;
        }
      }

      // Take screenshot on failure if configured
      let screenshotPath: string | undefined;
      if (!stepPassed && (test.config.screenshot === 'only-on-failure' || test.config.screenshot === 'on')) {
        try {
          const timestamp = Date.now();
          // Use project root directory for screenshots
          const projectRoot = path.resolve(process.cwd());
          const screenshotDir = path.join(projectRoot, 'playwright-screenshots');
          screenshotPath = path.join(screenshotDir, `failure-${test.id}-${step.id}-${timestamp}.png`);
          
          // Ensure directory exists
          await fs.mkdir(screenshotDir, { recursive: true });
          
          if (page && !page.isClosed()) {
            await page.screenshot({ 
              fullPage: true,
              path: screenshotPath
            });
          }
        } catch (screenshotError) {
          console.error('Failed to take failure screenshot:', screenshotError);
        }
      }
      
      stepResults.push({
        stepId: step.id,
        passed: stepPassed,
        duration: Date.now() - stepStartTime,
        error: stepError,
        screenshot: screenshotPath
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

// ===== ADVANCED FEATURES =====

// Generate HAR file from page navigation
router.post('/har', async (req: Request, res: Response) => {
  const { url, config = {}, options = {} } = req.body as {
    url: string;
    config?: Partial<TestConfig>;
    options?: {
      waitTime?: number;
      includeContent?: boolean;
    };
  };

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const { waitTime = 3000, includeContent = false } = options;
  let browser: Browser | null = null;
  let page: Page | null = null;
  let context: any = null;

  try {
    const browserLauncher = config.browser === 'firefox' ? firefox :
                            config.browser === 'webkit' ? webkit : chromium;

    browser = await browserLauncher.launch({
      headless: config.headless ?? true
    });

    context = await browser.newContext({
      viewport: config.viewport || { width: 1920, height: 1080 }
    });

    // Start HAR recording
    await context.route('**/*', async (route) => {
      const request = route.request();
      await route.continue();
    });

    page = await context.newPage();
    
    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(waitTime);

    // Get HAR data
    const har = await page.evaluate(() => {
      const entries: any[] = [];
      
      // Get all network entries
      const performance = (window as any).performance;
      if (performance && performance.getEntriesByType) {
        const resources = performance.getEntriesByType('resource') as any[];
        
        resources.forEach(resource => {
          entries.push({
            startedDateTime: new Date(resource.startTime).toISOString(),
            time: resource.duration,
            request: {
              method: 'GET',
              url: resource.name,
              httpVersion: 'HTTP/1.1',
              headers: [],
              queryString: [],
              headersSize: -1,
              bodySize: 0
            },
            response: {
              status: 200,
              statusText: 'OK',
              httpVersion: 'HTTP/1.1',
              headers: [],
              cookies: [],
              content: {
                size: resource.transferSize || 0,
                mimeType: resource.initiatorType || 'unknown'
              },
              redirectURL: '',
              headersSize: -1,
              bodySize: resource.transferSize || 0
            },
            cache: {},
            timings: {
              send: 0,
              wait: resource.responseStart - resource.requestStart,
              receive: resource.responseEnd - resource.responseStart
            },
            pageref: 'page_1'
          });
        });
      }

      return {
        log: {
          version: '1.2',
          creator: {
            name: 'Playwright HAR Generator',
            version: '1.0'
          },
          entries
        }
      };
    });

    // Save HAR file
    const projectRoot = path.resolve(process.cwd());
    const harDir = path.join(projectRoot, 'playwright-hars');
    await fs.mkdir(harDir, { recursive: true });
    
    const harFilename = `har-${url.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.har`;
    const harPath = path.join(harDir, harFilename);
    
    await fs.writeFile(harPath, JSON.stringify(har, null, 2));

    res.json({
      success: true,
      harPath,
      entries: har.log.entries.length,
      har
    });

  } catch (error) {
    console.error('HAR generation failed:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
});

// Generate PDF from page
router.post('/pdf', async (req: Request, res: Response) => {
  const { url, config = {}, options = {} } = req.body as {
    url: string;
    config?: Partial<TestConfig>;
    options?: {
      format?: 'A4' | 'Letter';
      printBackground?: boolean;
      margin?: {
        top?: string;
        bottom?: string;
        left?: string;
        right?: string;
      };
    };
  };

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const {
    format = 'A4',
    printBackground = true,
    margin = { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' }
  } = options;

  let browser: Browser | null = null;
  let page: Page | null = null;
  let context: any = null;

  try {
    const browserLauncher = config.browser === 'firefox' ? firefox :
                            config.browser === 'webkit' ? webkit : chromium;

    browser = await browserLauncher.launch({
      headless: config.headless ?? true
    });

    context = await browser.newContext({
      viewport: config.viewport || { width: 1920, height: 1080 }
    });

    page = await context.newPage();
    
    // Navigate to URL
    await page.goto(url, { waitUntil: 'networkidle' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format,
      printBackground,
      margin,
      displayHeaderFooter: true,
      headerTemplate: '<div style="font-size:10px; width:100%; text-align:center;">{title}</div>',
      footerTemplate: '<div style="font-size:10px; width:100%; text-align:center;">Page {pageNumber} of {totalPages}</div>'
    });

    // Save PDF
    const projectRoot = path.resolve(process.cwd());
    const pdfDir = path.join(projectRoot, 'playwright-pdfs');
    await fs.mkdir(pdfDir, { recursive: true });
    
    const pdfFilename = `pdf-${url.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`;
    const pdfPath = path.join(pdfDir, pdfFilename);
    
    await fs.writeFile(pdfPath, pdfBuffer);

    res.json({
      success: true,
      pdfPath,
      size: pdfBuffer.length
    });

  } catch (error) {
    console.error('PDF generation failed:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
});

// Collect performance metrics
router.post('/performance', async (req: Request, res: Response) => {
  const { url, config = {}, options = {} } = req.body as {
    url: string;
    config?: Partial<TestConfig>;
    options?: {
      waitTime?: number;
      includeLighthouse?: boolean;
    };
  };

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const { waitTime = 3000, includeLighthouse = false } = options;
  let browser: Browser | null = null;
  let page: Page | null = null;
  let context: any = null;

  try {
    const browserLauncher = config.browser === 'firefox' ? firefox :
                            config.browser === 'webkit' ? webkit : chromium;

    browser = await browserLauncher.launch({
      headless: config.headless ?? true
    });

    context = await browser.newContext({
      viewport: config.viewport || { width: 1920, height: 1080 }
    });

    page = await context.newPage();
    
    // Collect performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as any;
      const paint = performance.getEntriesByType('paint');
      
      return {
        timing: {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          loadComplete: navigation.loadEventEnd - navigation.navigationStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
        },
        resources: performance.getEntriesByType('resource').length,
        size: {
          domNodes: document.querySelectorAll('*').length,
          images: document.querySelectorAll('img').length,
          scripts: document.querySelectorAll('script').length,
          stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length
        },
        memory: (performance as any).memory || {},
        vitals: {
          cls: (window as any).CLS || 0,
          fid: (window as any).FID || 0,
          lcp: (window as any).LCP || 0
        }
      };
    });

    // Get Web Vitals
    await page.waitForTimeout(waitTime);

    const finalMetrics = await page.evaluate(() => {
      return {
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || ''
      };
    });

    res.json({
      success: true,
      url,
      timestamp: new Date().toISOString(),
      metrics: { ...metrics, ...finalMetrics }
    });

  } catch (error) {
    console.error('Performance collection failed:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
});

// Device emulation testing
router.post('/device-test', async (req: Request, res: Response) => {
  const { url, device, config = {} } = req.body as {
    url: string;
    device: 'Desktop' | 'Mobile' | 'Tablet' | 'Custom';
    config?: {
      viewport?: { width: number; height: number };
      userAgent?: string;
      deviceScaleFactor?: number;
      isMobile?: boolean;
      hasTouch?: boolean;
    };
  };

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // Predefined device configurations
  const devices = {
    Desktop: {
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false
    },
    Mobile: {
      viewport: { width: 375, height: 667 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    },
    Tablet: {
      viewport: { width: 768, height: 1024 },
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    }
  };

  const deviceConfig = device === 'Custom' ? config : devices[device];

  let browser: Browser | null = null;
  let page: Page | null = null;
  let context: any = null;
  const results: any[] = [];

  try {
    // Use chromium by default for device testing
    browser = await chromium.launch({
      headless: true
    });

    context = await browser.newContext({
      ...deviceConfig,
      permissions: ['geolocation', 'camera', 'microphone']
    });

    page = await context.newPage();
    
    // Navigate and test
    await page.goto(url, { waitUntil: 'networkidle' });

    // Collect device-specific metrics
    const metrics = await page.evaluate(() => {
      return {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        devicePixelRatio: window.devicePixelRatio,
        touchSupport: 'ontouchstart' in window,
        orientation: screen.orientation?.type || 'unknown',
        responsive: {
          layoutShifts: (window as any).layoutShift || 0,
          viewportChanges: (window as any).viewportChanges || 0
        }
      };
    });

    // Take screenshot
    const projectRoot = path.resolve(process.cwd());
    const screenshotDir = path.join(projectRoot, 'playwright-screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const screenshotPath = path.join(screenshotDir, `device-${device}-${Date.now()}.png`);
    await page.screenshot({ 
      fullPage: true,
      path: screenshotPath
    });

    results.push({
      device,
      config: deviceConfig,
      metrics,
      screenshot: screenshotPath
    });

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Device test failed:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
});

// Geolocation testing
router.post('/geolocation', async (req: Request, res: Response) => {
  const { url, coordinates, config = {} } = req.body as {
    url: string;
    coordinates: {
      latitude: number;
      longitude: number;
      accuracy?: number;
    };
    config?: Partial<TestConfig>;
  };

  if (!url || !coordinates) {
    return res.status(400).json({ error: 'URL and coordinates are required' });
  }

  let browser: Browser | null = null;
  let page: Page | null = null;
  let context: any = null;

  try {
    const browserLauncher = config.browser === 'firefox' ? firefox :
                            config.browser === 'webkit' ? webkit : chromium;

    browser = await browserLauncher.launch({
      headless: config.headless ?? true
    });

    context = await browser.newContext({
      viewport: config.viewport || { width: 1920, height: 1080 },
      permissions: ['geolocation'],
      geolocation: coordinates
    });

    page = await context.newPage();
    
    // Test geolocation
    await page.goto(url, { waitUntil: 'networkidle' });

    const locationData = await page.evaluate(() => {
      return new Promise((resolve) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp
              });
            },
            (error) => {
              resolve({ error: error.message });
            }
          );
        } else {
          resolve({ error: 'Geolocation not supported' });
        }
      });
    });

    res.json({
      success: true,
      requested: coordinates,
      actual: locationData
    });

  } catch (error) {
    console.error('Geolocation test failed:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
});

// Extract structured data
router.post('/extract-data', async (req: Request, res: Response) => {
  const { url, config = {}, options = {} } = req.body as {
    url: string;
    config?: Partial<TestConfig>;
    options?: {
      includeJsonLd?: boolean;
      includeMicrodata?: boolean;
      includeRdfa?: boolean;
      includeMeta?: boolean;
    };
  };

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const {
    includeJsonLd = true,
    includeMicrodata = true,
    includeRdfa = true,
    includeMeta = true
  } = options;

  let browser: Browser | null = null;
  let page: Page | null = null;
  let context: any = null;

  try {
    const browserLauncher = config.browser === 'firefox' ? firefox :
                            config.browser === 'webkit' ? webkit : chromium;

    browser = await browserLauncher.launch({
      headless: config.headless ?? true
    });

    context = await browser.newContext({
      viewport: config.viewport || { width: 1920, height: 1080 }
    });

    page = await context.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle' });

    const extractedData = await page.evaluate((options) => {
      const data: any = {
        url: window.location.href,
        title: document.title,
        timestamp: new Date().toISOString()
      };

      // Extract JSON-LD
      if (options.includeJsonLd) {
        const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
        data.jsonLd = Array.from(jsonLdScripts).map(script => {
          try {
            return JSON.parse(script.textContent || '');
          } catch {
            return null;
          }
        }).filter(Boolean);
      }

      // Extract Microdata
      if (options.includeMicrodata) {
        const microdata = document.querySelectorAll('[itemscope]');
        data.microdata = Array.from(microdata).map(item => {
          const element = item as Element;
          const result: any = {
            type: element.getAttribute('itemtype') || 'Unknown',
            properties: {}
          };
          
          element.querySelectorAll('[itemprop]').forEach(prop => {
            const name = prop.getAttribute('itemprop');
            const value = prop.getAttribute('content') || prop.textContent || '';
            result.properties[name] = value;
          });
          
          return result;
        });
      }

      // Extract RDFa
      if (options.includeRdfa) {
        const rdfaElements = document.querySelectorAll('[typeof]');
        data.rdfa = Array.from(rdfaElements).map(elem => {
          const element = elem as Element;
          return {
            type: element.getAttribute('typeof') || 'Unknown',
            property: element.getAttribute('property') || '',
            content: element.getAttribute('content') || element.textContent || ''
          };
        });
      }

      // Extract Meta tags
      if (options.includeMeta) {
        const metaTags = document.querySelectorAll('meta');
        data.meta = Array.from(metaTags).map(tag => {
          const element = tag as Element;
          return {
            name: element.getAttribute('name') || element.getAttribute('property') || '',
            content: element.getAttribute('content') || '',
            charset: element.getAttribute('charset') || ''
          };
        }).filter(tag => tag.name || tag.charset);
      }

      // Extract Open Graph
      data.openGraph = {
        title: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '',
        description: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '',
        image: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '',
        url: document.querySelector('meta[property="og:url"]')?.getAttribute('content') || '',
        type: document.querySelector('meta[property="og:type"]')?.getAttribute('content') || ''
      };

      // Extract Twitter Card
      data.twitterCard = {
        card: document.querySelector('meta[name="twitter:card"]')?.getAttribute('content') || '',
        title: document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || '',
        description: document.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || '',
        image: document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || ''
      };

      return data;
    }, { includeJsonLd, includeMicrodata, includeRdfa, includeMeta });

    res.json({
      success: true,
      data: extractedData
    });

  } catch (error) {
    console.error('Data extraction failed:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
});

// Extract HTML content
router.post('/extract-html', async (req: Request, res: Response) => {
  const { url, config = {}, options = {} } = req.body as {
    url: string;
    config?: Partial<TestConfig>;
    options?: {
      includeStyles?: boolean;
      includeScripts?: boolean;
      cleanHtml?: boolean;
    };
  };

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const {
    includeStyles = true,
    includeScripts = false,
    cleanHtml = true
  } = options;

  let browser: Browser | null = null;
  let page: Page | null = null;
  let context: any = null;

  try {
    const browserLauncher = config.browser === 'firefox' ? firefox :
                            config.browser === 'webkit' ? webkit : chromium;

    browser = await browserLauncher.launch({
      headless: config.headless ?? true
    });

    context = await browser.newContext({
      viewport: config.viewport || { width: 1920, height: 1080 }
    });

    page = await context.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle' });

    const htmlContent = await page.evaluate((options) => {
      let html = document.documentElement.outerHTML;

      if (options.cleanHtml) {
        // Remove scripts if not included
        if (!options.includeScripts) {
          html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
        
        // Remove styles if not included
        if (!options.includeStyles) {
          html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
          html = html.replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '');
        }

        // Remove comments
        html = html.replace(/<!--[\s\S]*?-->/g, '');
      }

      return {
        html,
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
        keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
        lang: document.documentElement.lang || 'en',
        charset: document.characterSet || 'UTF-8'
      };
    }, { includeStyles, includeScripts, cleanHtml });

    // Save HTML file
    const projectRoot = path.resolve(process.cwd());
    const htmlDir = path.join(projectRoot, 'playwright-html');
    await fs.mkdir(htmlDir, { recursive: true });
    
    const htmlFilename = `html-${url.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.html`;
    const htmlPath = path.join(htmlDir, htmlFilename);
    
    await fs.writeFile(htmlPath, htmlContent.html);

    res.json({
      success: true,
      htmlPath,
      metadata: {
        title: htmlContent.title,
        description: htmlContent.description,
        keywords: htmlContent.keywords,
        lang: htmlContent.lang,
        charset: htmlContent.charset
      }
    });

  } catch (error) {
    console.error('HTML extraction failed:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
});

// WebSocket testing
router.post('/websocket-test', async (req: Request, res: Response) => {
  const { url, config = {}, options = {} } = req.body as {
    url: string;
    config?: Partial<TestConfig>;
    options?: {
      messages?: string[];
      waitForResponses?: boolean;
    };
  };

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const { messages = [], waitForResponses = true } = options;
  let browser: Browser | null = null;
  let page: Page | null = null;
  let context: any = null;

  try {
    const browserLauncher = config.browser === 'firefox' ? firefox :
                            config.browser === 'webkit' ? webkit : chromium;

    browser = await browserLauncher.launch({
      headless: config.headless ?? true
    });

    context = await browser.newContext({
      viewport: config.viewport || { width: 1920, height: 1080 }
    });

    page = await context.newPage();
    
    // Test WebSocket connection
    const wsResults = await page.evaluate(async (options) => {
      const results: any[] = [];
      
      try {
        // Create WebSocket connection
        const ws = new WebSocket(options.url);
        
        ws.onopen = () => {
          results.push({ type: 'connection', status: 'opened', timestamp: Date.now() });
          
          // Send test messages
          options.messages.forEach((message: string) => {
            ws.send(message);
            results.push({ type: 'sent', message, timestamp: Date.now() });
          });
        };
        
        ws.onmessage = (event) => {
          results.push({ 
            type: 'received', 
            message: event.data, 
            timestamp: Date.now() 
          });
        };
        
        ws.onerror = (error) => {
          results.push({ 
            type: 'error', 
            error: error.toString(), 
            timestamp: Date.now() 
          });
        };
        
        ws.onclose = () => {
          results.push({ type: 'connection', status: 'closed', timestamp: Date.now() });
        };
        
        // Wait for responses if required
        if (options.waitForResponses) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        ws.close();
        
      } catch (error) {
        results.push({ 
          type: 'error', 
          error: error.toString(), 
          timestamp: Date.now() 
        });
      }
      
      return results;
    }, { url, messages, waitForResponses });

    res.json({
      success: true,
      results: wsResults
    });

  } catch (error) {
    console.error('WebSocket test failed:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
});

// Compare two HAR files
router.post('/har-compare', async (req: Request, res: Response) => {
  const { baselineHar, comparisonHar, options = {} } = req.body as {
    baselineHar: any;
    comparisonHar: any;
    options?: {
      tolerancePercent?: number;
      includeEntries?: boolean;
    };
  };

  if (!baselineHar || !comparisonHar) {
    return res.status(400).json({ error: 'Both HAR files are required' });
  }

  const { tolerancePercent = 10, includeEntries = false } = options;

  try {
    const baselineEntries = baselineHar.log?.entries || [];
    const comparisonEntries = comparisonHar.log?.entries || [];

    // Calculate baseline metrics
    const baselineMetrics = {
      totalRequests: baselineEntries.length,
      totalSize: baselineEntries.reduce((sum: number, entry: any) => 
        sum + (entry.response?.content?.size || 0), 0),
      totalTime: baselineEntries.reduce((sum: number, entry: any) => 
        sum + (entry.time || 0), 0),
      failedRequests: baselineEntries.filter((e: any) => e.response?.status >= 400).length
    };

    // Calculate comparison metrics
    const comparisonMetrics = {
      totalRequests: comparisonEntries.length,
      totalSize: comparisonEntries.reduce((sum: number, entry: any) => 
        sum + (entry.response?.content?.size || 0), 0),
      totalTime: comparisonEntries.reduce((sum: number, entry: any) => 
        sum + (entry.time || 0), 0),
      failedRequests: comparisonEntries.filter((e: any) => e.response?.status >= 400).length
    };

    // Calculate regressions
    const regressions = [];
    
    const requestChange = ((comparisonMetrics.totalRequests - baselineMetrics.totalRequests) / baselineMetrics.totalRequests) * 100;
    if (Math.abs(requestChange) > tolerancePercent) {
      regressions.push({
        type: 'requests',
        baseline: baselineMetrics.totalRequests,
        comparison: comparisonMetrics.totalRequests,
        change: requestChange,
        status: requestChange > 0 ? 'increased' : 'decreased'
      });
    }

    const sizeChange = ((comparisonMetrics.totalSize - baselineMetrics.totalSize) / baselineMetrics.totalSize) * 100;
    if (Math.abs(sizeChange) > tolerancePercent) {
      regressions.push({
        type: 'size',
        baseline: baselineMetrics.totalSize,
        comparison: comparisonMetrics.totalSize,
        change: sizeChange,
        status: sizeChange > 0 ? 'increased' : 'decreased'
      });
    }

    const timeChange = ((comparisonMetrics.totalTime - baselineMetrics.totalTime) / baselineMetrics.totalTime) * 100;
    if (Math.abs(timeChange) > tolerancePercent) {
      regressions.push({
        type: 'time',
        baseline: baselineMetrics.totalTime,
        comparison: comparisonMetrics.totalTime,
        change: timeChange,
        status: timeChange > 0 ? 'slower' : 'faster'
      });
    }

    const failedChange = comparisonMetrics.failedRequests - baselineMetrics.failedRequests;
    if (failedChange > 0) {
      regressions.push({
        type: 'errors',
        baseline: baselineMetrics.failedRequests,
        comparison: comparisonMetrics.failedRequests,
        change: failedChange,
        status: 'increased'
      });
    }

    // Find slowest and largest requests
    const slowestBaseline = baselineEntries.reduce((slowest: any, entry: any) => 
      (entry.time || 0) > (slowest.time || 0) ? entry : slowest, baselineEntries[0]);
    const slowestComparison = comparisonEntries.reduce((slowest: any, entry: any) => 
      (entry.time || 0) > (slowest.time || 0) ? entry : slowest, comparisonEntries[0]);

    const largestBaseline = baselineEntries.reduce((largest: any, entry: any) => 
      (entry.response?.content?.size || 0) > (largest.response?.content?.size || 0) ? entry : largest, baselineEntries[0]);
    const largestComparison = comparisonEntries.reduce((largest: any, entry: any) => 
      (entry.response?.content?.size || 0) > (largest.response?.content?.size || 0) ? entry : largest, comparisonEntries[0]);

    const response: any = {
      success: true,
      baseline: baselineMetrics,
      comparison: comparisonMetrics,
      regressions,
      summary: {
        status: regressions.length === 0 ? 'PASS' : 'FAIL',
        regressionsCount: regressions.length,
        worstRegression: regressions.reduce((worst: any, reg: any) =>
          Math.abs(reg.change) > Math.abs(worst?.change || 0) ? reg : worst, null)
      },
      insights: {
        slowestRequestChange: (slowestComparison.time || 0) - (slowestBaseline.time || 0),
        largestRequestChange: (largestComparison.response?.content?.size || 0) - (largestBaseline.response?.content?.size || 0)
      }
    };

    if (includeEntries) {
      response.entries = {
        baseline: baselineEntries.slice(0, 10),
        comparison: comparisonEntries.slice(0, 10)
      };
    }

    res.json(response);

  } catch (error) {
    console.error('HAR comparison failed:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate performance report from HAR
router.post('/har-report', async (req: Request, res: Response) => {
  const { har, options = {} } = req.body as {
    har: any;
    options?: {
      format?: 'json' | 'html';
      includeRecommendations?: boolean;
    };
  };

  if (!har) {
    return res.status(400).json({ error: 'HAR file is required' });
  }

  const { format = 'json', includeRecommendations = true } = options;
  const entries = har.log?.entries || [];

  try {
    // Generate comprehensive report
    const report = {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: har.log?.version || '1.2',
        creator: har.log?.creator || { name: 'Playwright', version: '1.0' },
        pages: har.log?.pages || [],
        totalEntries: entries.length
      },
      summary: {
        totalRequests: entries.length,
        totalTransferSize: entries.reduce((sum: number, entry: any) => 
          sum + (entry.response?.content?.size || 0), 0),
        totalTime: entries.reduce((sum: number, entry: any) => 
          sum + (entry.time || 0), 0),
        averageTime: entries.length > 0 ? 
          entries.reduce((sum: number, entry: any) => sum + (entry.time || 0), 0) / entries.length : 0,
        failedRequests: entries.filter((e: any) => e.response?.status >= 400).length,
        domains: [...new Set(entries.map((e: any) => new URL(e.request.url).hostname))].length
      },
      breakdown: {
        byType: {} as Record<string, { count: number; size: number; time: number }>,
        byStatus: {} as Record<string, number>,
        byDomain: {} as Record<string, { count: number; size: number }>
      },
      performance: {
        slowestRequests: entries
          .sort((a: any, b: any) => (b.time || 0) - (a.time || 0))
          .slice(0, 10)
          .map((entry: any) => ({
            url: entry.request.url,
            time: entry.time,
            size: entry.response?.content?.size || 0,
            status: entry.response?.status
          })),
        largestRequests: entries
          .sort((a: any, b: any) => (b.response?.content?.size || 0) - (a.response?.content?.size || 0))
          .slice(0, 10)
          .map((entry: any) => ({
            url: entry.request.url,
            size: entry.response?.content?.size || 0,
            time: entry.time,
            type: entry.response?.content?.mimeType
          }))
      },
      issues: [] as any[],
      recommendations: [] as string[]
    };

    // Calculate breakdowns
    entries.forEach((entry: any) => {
      const type = entry.response?.content?.mimeType?.split('/')[0] || 'other';
      const domain = new URL(entry.request.url).hostname;
      const status = entry.response?.status?.toString() || 'unknown';

      if (!report.breakdown.byType[type]) {
        report.breakdown.byType[type] = { count: 0, size: 0, time: 0 };
      }
      report.breakdown.byType[type].count++;
      report.breakdown.byType[type].size += entry.response?.content?.size || 0;
      report.breakdown.byType[type].time += entry.time || 0;

      report.breakdown.byStatus[status] = (report.breakdown.byStatus[status] || 0) + 1;

      if (!report.breakdown.byDomain[domain]) {
        report.breakdown.byDomain[domain] = { count: 0, size: 0 };
      }
      report.breakdown.byDomain[domain].count++;
      report.breakdown.byDomain[domain].size += entry.response?.content?.size || 0;
    });

    // Identify issues
    entries.forEach((entry: any) => {
      if (entry.time > 2000) {
        report.issues.push({
          type: 'slow_request',
          severity: entry.time > 5000 ? 'high' : 'medium',
          url: entry.request.url,
          time: entry.time,
          message: `Request took ${(entry.time / 1000).toFixed(2)}s`
        });
      }

      if (entry.response?.status >= 400) {
        report.issues.push({
          type: 'http_error',
          severity: entry.response?.status >= 500 ? 'high' : 'medium',
          url: entry.request.url,
          status: entry.response.status,
          message: `HTTP ${entry.response.status} ${entry.response.statusText}`
        });
      }

      const size = entry.response?.content?.size || 0;
      if (size > 1024 * 1024) {
        report.issues.push({
          type: 'large_file',
          severity: 'medium',
          url: entry.request.url,
          size: size,
          message: `File size is ${(size / 1024 / 1024).toFixed(2)}MB`
        });
      }

      if (entry.request.url.startsWith('http://')) {
        report.issues.push({
          type: 'insecure_request',
          severity: 'high',
          url: entry.request.url,
          message: 'Insecure HTTP request'
        });
      }
    });

    // Generate recommendations
    if (includeRecommendations) {
      if (report.summary.totalRequests > 100) {
        report.recommendations.push('Consider reducing the number of HTTP requests by bundling assets');
      }

      if (report.summary.totalTransferSize > 3 * 1024 * 1024) {
        report.recommendations.push('Consider optimizing images and enabling compression');
      }

      if (report.summary.averageTime > 500) {
        report.recommendations.push('Consider optimizing server response times and using CDN');
      }

      if (report.summary.failedRequests > 0) {
        report.recommendations.push('Fix HTTP errors to improve user experience');
      }

      const imageRequests = report.breakdown.byType.image || { count: 0, size: 0, time: 0 };
      if (imageRequests.count > 0 && imageRequests.size > 1024 * 1024) {
        report.recommendations.push('Optimize images: use modern formats (WebP) and implement lazy loading');
      }

      const cacheableRequests = entries.filter((entry: any) => {
        const cacheControl = entry.response.headers.find((h: any) => 
          h.name.toLowerCase() === 'cache-control'
        );
        return !cacheControl || !cacheControl.value.includes('no-cache');
      });

      if (cacheableRequests.length > entries.length * 0.5) {
        report.recommendations.push('Implement proper caching headers for better performance');
      }
    }

    // Save report
    const projectRoot = path.resolve(process.cwd());
    const reportsDir = path.join(projectRoot, 'playwright-reports');
    await fs.mkdir(reportsDir, { recursive: true });
    
    const timestamp = Date.now();
    const jsonPath = path.join(reportsDir, `report-${timestamp}.json`);
    
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));

    res.json({
      success: true,
      reportPath: jsonPath,
      report
    });

  } catch (error) {
    console.error('Report generation failed:', error);
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
