// Playwright E2E Testing Module - Storage Service

// Step action types
export type StepAction =
  | 'navigate'
  | 'click'
  | 'fill'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'hover'
  | 'press'
  | 'wait'
  | 'waitForSelector'
  | 'screenshot'
  | 'assertVisible'
  | 'assertHidden'
  | 'assertText'
  | 'assertValue'
  | 'assertUrl'
  | 'assertTitle';

// Selector types
export type SelectorType = 'css' | 'xpath' | 'text' | 'testId' | 'role' | 'label';

// Browser types
export type BrowserType = 'chromium' | 'firefox' | 'webkit';

// Test step definition
export interface TestStep {
  id: string;
  action: StepAction;
  description?: string;
  // Navigation
  url?: string;
  // Selector-based actions
  selector?: string;
  selectorType?: SelectorType;
  // Input values
  value?: string;
  // Key press
  key?: string;
  // Wait options
  timeout?: number;
  state?: 'visible' | 'hidden' | 'attached' | 'detached';
  // Assertion options
  expected?: string;
  matchType?: 'exact' | 'contains' | 'regex';
  // Screenshot options
  fullPage?: boolean;
  // Step status
  enabled?: boolean;
}

// Test configuration
export interface TestConfig {
  browser: BrowserType;
  headless: boolean;
  viewport: { width: number; height: number };
  timeout: number;
  retries: number;
  baseUrl?: string;
  slowMo?: number;
  video?: 'off' | 'on' | 'retain-on-failure';
  screenshot?: 'off' | 'on' | 'only-on-failure';
}

// Default test configuration
export const defaultTestConfig: TestConfig = {
  browser: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 720 },
  timeout: 30000,
  retries: 0,
  video: 'retain-on-failure',
  screenshot: 'only-on-failure'
};

// Step execution result
export interface StepResult {
  stepId: string;
  passed: boolean;
  duration: number;
  error?: string;
  screenshot?: string; // Base64 or path
}

// Test execution result
export interface TestResult {
  id: string;
  testId: string;
  runAt: number;
  duration: number;
  passed: boolean;
  browser: BrowserType;
  stepResults: StepResult[];
  error?: string;
  video?: string;
  trace?: string;
}

// Playwright test case
export interface PlaywrightTest {
  id: string;
  name: string;
  description?: string;
  steps: TestStep[];
  config: TestConfig;
  tags: string[];
  suiteId?: string;
  createdAt: number;
  updatedAt: number;
  lastResult?: {
    passed: boolean;
    duration: number;
    runAt: number;
  };
}

// Test suite
export interface PlaywrightSuite {
  id: string;
  name: string;
  description?: string;
  testIds: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

// Environment preset
export interface PlaywrightEnvironment {
  id: string;
  name: string;
  baseUrl: string;
  variables: Record<string, string>;
}

// Storage class
class PlaywrightStorage {
  private testsKey = 'playwright:tests';
  private suitesKey = 'playwright:suites';
  private resultsKey = 'playwright:results';
  private environmentsKey = 'playwright:environments';
  private activeEnvironmentKey = 'playwright:activeEnvironment';
  private maxResults = 100;

  // ===== TESTS =====

  getTests(): PlaywrightTest[] {
    try {
      const raw = localStorage.getItem(this.testsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  getTest(id: string): PlaywrightTest | null {
    return this.getTests().find(t => t.id === id) || null;
  }

  saveTest(test: Omit<PlaywrightTest, 'id' | 'createdAt' | 'updatedAt'>): PlaywrightTest {
    const tests = this.getTests();
    const newTest: PlaywrightTest = {
      ...test,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    tests.push(newTest);
    this.persistTests(tests);
    return newTest;
  }

  updateTest(id: string, updates: Partial<Omit<PlaywrightTest, 'id' | 'createdAt'>>): void {
    const tests = this.getTests();
    const index = tests.findIndex(t => t.id === id);
    if (index !== -1) {
      tests[index] = { ...tests[index], ...updates, updatedAt: Date.now() };
      this.persistTests(tests);
    }
  }

  deleteTest(id: string): void {
    const tests = this.getTests().filter(t => t.id !== id);
    this.persistTests(tests);
    // Also remove from suites
    const suites = this.getSuites();
    suites.forEach(suite => {
      if (suite.testIds.includes(id)) {
        this.updateSuite(suite.id, {
          testIds: suite.testIds.filter(tid => tid !== id)
        });
      }
    });
  }

  duplicateTest(id: string): PlaywrightTest | null {
    const test = this.getTest(id);
    if (!test) return null;

    const { id: _, createdAt, updatedAt, lastResult, ...testData } = test;
    return this.saveTest({
      ...testData,
      name: `${test.name} (Copy)`,
      steps: test.steps.map(s => ({ ...s, id: crypto.randomUUID() }))
    });
  }

  private persistTests(tests: PlaywrightTest[]): void {
    try {
      localStorage.setItem(this.testsKey, JSON.stringify(tests));
    } catch (e) {
      console.error('Failed to save tests:', e);
    }
  }

  // ===== SUITES =====

  getSuites(): PlaywrightSuite[] {
    try {
      const raw = localStorage.getItem(this.suitesKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  getSuite(id: string): PlaywrightSuite | null {
    return this.getSuites().find(s => s.id === id) || null;
  }

  saveSuite(suite: Omit<PlaywrightSuite, 'id' | 'createdAt' | 'updatedAt'>): PlaywrightSuite {
    const suites = this.getSuites();
    const newSuite: PlaywrightSuite = {
      ...suite,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    suites.push(newSuite);
    this.persistSuites(suites);
    return newSuite;
  }

  updateSuite(id: string, updates: Partial<Omit<PlaywrightSuite, 'id' | 'createdAt'>>): void {
    const suites = this.getSuites();
    const index = suites.findIndex(s => s.id === id);
    if (index !== -1) {
      suites[index] = { ...suites[index], ...updates, updatedAt: Date.now() };
      this.persistSuites(suites);
    }
  }

  deleteSuite(id: string): void {
    const suites = this.getSuites().filter(s => s.id !== id);
    this.persistSuites(suites);
  }

  getTestsBySuite(suiteId: string): PlaywrightTest[] {
    const suite = this.getSuite(suiteId);
    if (!suite) return [];
    const tests = this.getTests();
    return suite.testIds.map(id => tests.find(t => t.id === id)).filter(Boolean) as PlaywrightTest[];
  }

  private persistSuites(suites: PlaywrightSuite[]): void {
    try {
      localStorage.setItem(this.suitesKey, JSON.stringify(suites));
    } catch (e) {
      console.error('Failed to save suites:', e);
    }
  }

  // ===== RESULTS =====

  getResults(): TestResult[] {
    try {
      const raw = localStorage.getItem(this.resultsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  getResultsForTest(testId: string): TestResult[] {
    return this.getResults().filter(r => r.testId === testId);
  }

  saveResult(result: Omit<TestResult, 'id'>): TestResult {
    const results = this.getResults();
    const newResult: TestResult = {
      ...result,
      id: crypto.randomUUID()
    };
    results.unshift(newResult);

    // Trim old results
    if (results.length > this.maxResults) {
      results.splice(this.maxResults);
    }

    this.persistResults(results);

    // Update test's lastResult
    this.updateTest(result.testId, {
      lastResult: {
        passed: result.passed,
        duration: result.duration,
        runAt: result.runAt
      }
    });

    return newResult;
  }

  clearResults(): void {
    try {
      localStorage.removeItem(this.resultsKey);
    } catch {}
  }

  private persistResults(results: TestResult[]): void {
    try {
      localStorage.setItem(this.resultsKey, JSON.stringify(results));
    } catch (e) {
      console.error('Failed to save results:', e);
    }
  }

  // ===== ENVIRONMENTS =====

  getEnvironments(): PlaywrightEnvironment[] {
    try {
      const raw = localStorage.getItem(this.environmentsKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  saveEnvironment(env: Omit<PlaywrightEnvironment, 'id'>): PlaywrightEnvironment {
    const environments = this.getEnvironments();
    const newEnv: PlaywrightEnvironment = {
      ...env,
      id: crypto.randomUUID()
    };
    environments.push(newEnv);
    try {
      localStorage.setItem(this.environmentsKey, JSON.stringify(environments));
    } catch {}
    return newEnv;
  }

  deleteEnvironment(id: string): void {
    const environments = this.getEnvironments().filter(e => e.id !== id);
    try {
      localStorage.setItem(this.environmentsKey, JSON.stringify(environments));
    } catch {}
  }

  getActiveEnvironmentId(): string | null {
    try {
      return localStorage.getItem(this.activeEnvironmentKey);
    } catch {
      return null;
    }
  }

  setActiveEnvironmentId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem(this.activeEnvironmentKey, id);
      } else {
        localStorage.removeItem(this.activeEnvironmentKey);
      }
    } catch {}
  }

  getActiveEnvironment(): PlaywrightEnvironment | null {
    const id = this.getActiveEnvironmentId();
    if (!id) return null;
    return this.getEnvironments().find(e => e.id === id) || null;
  }

  // ===== EXPORT/IMPORT =====

  exportAll(): { tests: PlaywrightTest[]; suites: PlaywrightSuite[]; environments: PlaywrightEnvironment[] } {
    return {
      tests: this.getTests(),
      suites: this.getSuites(),
      environments: this.getEnvironments()
    };
  }

  importAll(data: { tests?: PlaywrightTest[]; suites?: PlaywrightSuite[]; environments?: PlaywrightEnvironment[] }): void {
    if (data.tests) {
      this.persistTests(data.tests);
    }
    if (data.suites) {
      this.persistSuites(data.suites);
    }
    if (data.environments) {
      try {
        localStorage.setItem(this.environmentsKey, JSON.stringify(data.environments));
      } catch {}
    }
  }

  // ===== CODE GENERATION =====

  generateTestCode(test: PlaywrightTest): string {
    const lines: string[] = [
      `import { test, expect } from '@playwright/test';`,
      '',
      `test.describe('${test.name}', () => {`,
      `  test('${test.name}', async ({ page }) => {`
    ];

    if (test.config.baseUrl) {
      lines.push(`    // Base URL: ${test.config.baseUrl}`);
    }

    for (const step of test.steps) {
      if (step.enabled === false) continue;

      const indent = '    ';
      const selector = step.selector ? this.formatSelector(step.selector, step.selectorType) : '';

      switch (step.action) {
        case 'navigate':
          lines.push(`${indent}await page.goto('${step.url}');`);
          break;
        case 'click':
          lines.push(`${indent}await page.locator('${selector}').click();`);
          break;
        case 'fill':
          lines.push(`${indent}await page.locator('${selector}').fill('${step.value}');`);
          break;
        case 'select':
          lines.push(`${indent}await page.locator('${selector}').selectOption('${step.value}');`);
          break;
        case 'check':
          lines.push(`${indent}await page.locator('${selector}').check();`);
          break;
        case 'uncheck':
          lines.push(`${indent}await page.locator('${selector}').uncheck();`);
          break;
        case 'hover':
          lines.push(`${indent}await page.locator('${selector}').hover();`);
          break;
        case 'press':
          lines.push(`${indent}await page.locator('${selector}').press('${step.key}');`);
          break;
        case 'wait':
          lines.push(`${indent}await page.waitForTimeout(${step.timeout || 1000});`);
          break;
        case 'waitForSelector':
          lines.push(`${indent}await page.locator('${selector}').waitFor({ state: '${step.state || 'visible'}' });`);
          break;
        case 'screenshot':
          lines.push(`${indent}await page.screenshot({ fullPage: ${step.fullPage || false} });`);
          break;
        case 'assertVisible':
          lines.push(`${indent}await expect(page.locator('${selector}')).toBeVisible();`);
          break;
        case 'assertHidden':
          lines.push(`${indent}await expect(page.locator('${selector}')).toBeHidden();`);
          break;
        case 'assertText':
          if (step.matchType === 'contains') {
            lines.push(`${indent}await expect(page.locator('${selector}')).toContainText('${step.expected}');`);
          } else if (step.matchType === 'regex') {
            lines.push(`${indent}await expect(page.locator('${selector}')).toHaveText(/${step.expected}/);`);
          } else {
            lines.push(`${indent}await expect(page.locator('${selector}')).toHaveText('${step.expected}');`);
          }
          break;
        case 'assertValue':
          lines.push(`${indent}await expect(page.locator('${selector}')).toHaveValue('${step.expected}');`);
          break;
        case 'assertUrl':
          if (step.matchType === 'contains') {
            lines.push(`${indent}expect(page.url()).toContain('${step.expected}');`);
          } else {
            lines.push(`${indent}await expect(page).toHaveURL('${step.expected}');`);
          }
          break;
        case 'assertTitle':
          lines.push(`${indent}await expect(page).toHaveTitle('${step.expected}');`);
          break;
      }
    }

    lines.push('  });');
    lines.push('});');
    lines.push('');

    return lines.join('\n');
  }

  private formatSelector(selector: string, type?: SelectorType): string {
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
}

export const playwrightStorage = new PlaywrightStorage();
