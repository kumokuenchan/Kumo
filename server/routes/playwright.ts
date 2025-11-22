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

    const context = await browser.newContext({
      viewport: test.config.viewport
    });

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
  } finally {
    // Cleanup
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }

  res.json({
    passed: testPassed,
    stepResults,
    error: testError
  });
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
    default:
      return selector;
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

export default router;
