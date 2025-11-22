import { useState } from 'react';
import {
  X, Copy, Check, Github, GitBranch, Box, Terminal, Download
} from 'lucide-react';
import { type PlaywrightTest } from '../../services/playwrightStorage';

interface CICDIntegrationProps {
  tests: PlaywrightTest[];
  onClose: () => void;
}

type CICDPlatform = 'github' | 'gitlab' | 'jenkins' | 'docker';

export default function CICDIntegration({ tests, onClose }: CICDIntegrationProps) {
  const [platform, setPlatform] = useState<CICDPlatform>('github');
  const [copied, setCopied] = useState(false);
  const [options, setOptions] = useState({
    browsers: ['chromium'] as string[],
    parallel: true,
    retries: 2,
    schedule: '',
    artifacts: true
  });

  const generateConfig = (): string => {
    switch (platform) {
      case 'github':
        return generateGitHubActions();
      case 'gitlab':
        return generateGitLabCI();
      case 'jenkins':
        return generateJenkinsfile();
      case 'docker':
        return generateDockerfile();
      default:
        return '';
    }
  };

  const generateGitHubActions = () => {
    const browsers = options.browsers.join(', ');
    const schedule = options.schedule ? `\n  schedule:\n    - cron: '${options.schedule}'` : '';

    return `name: Playwright Tests

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]${schedule}

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        browser: [${browsers}]

    steps:
    - uses: actions/checkout@v4

    - uses: actions/setup-node@v4
      with:
        node-version: 20

    - name: Install dependencies
      run: npm ci

    - name: Install Playwright Browsers
      run: npx playwright install --with-deps \${{ matrix.browser }}

    - name: Run Playwright tests
      run: npx playwright test --project=\${{ matrix.browser }}${options.retries ? ` --retries=${options.retries}` : ''}${options.parallel ? ' --workers=4' : ' --workers=1'}
    ${options.artifacts ? `
    - uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report-\${{ matrix.browser }}
        path: playwright-report/
        retention-days: 30` : ''}`;
  };

  const generateGitLabCI = () => {
    return `stages:
  - test

variables:
  npm_config_cache: "$CI_PROJECT_DIR/.npm"

cache:
  paths:
    - .npm/
    - node_modules/

playwright-tests:
  stage: test
  image: mcr.microsoft.com/playwright:v1.40.0-jammy
  script:
    - npm ci
    - npx playwright test${options.retries ? ` --retries=${options.retries}` : ''}${options.parallel ? ' --workers=4' : ' --workers=1'}
  ${options.artifacts ? `artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 1 week` : ''}
  ${options.browsers.length > 1 ? `parallel:
    matrix:
      - BROWSER: [${options.browsers.join(', ')}]` : ''}`;
  };

  const generateJenkinsfile = () => {
    return `pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.40.0-jammy'
        }
    }

    stages {
        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Test') {
            ${options.browsers.length > 1 ? `matrix {
                axes {
                    axis {
                        name 'BROWSER'
                        values ${options.browsers.map(b => `'${b}'`).join(', ')}
                    }
                }
                stages {
                    stage('Run Tests') {
                        steps {
                            sh "npx playwright test --project=\${BROWSER}${options.retries ? ` --retries=${options.retries}` : ''}${options.parallel ? ' --workers=4' : ''}"
                        }
                    }
                }
            }` : `steps {
                sh 'npx playwright test${options.retries ? ` --retries=${options.retries}` : ''}${options.parallel ? ' --workers=4' : ''}'
            }`}
        }
    }

    post {
        always {
            ${options.artifacts ? `publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'playwright-report',
                reportFiles: 'index.html',
                reportName: 'Playwright Report'
            ])` : '// Cleanup'}
        }
    }
}`;
  };

  const generateDockerfile = () => {
    return `FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy test files
COPY . .

# Install browsers
RUN npx playwright install ${options.browsers.join(' ')}

# Run tests
CMD ["npx", "playwright", "test"${options.retries ? `, "--retries=${options.retries}"` : ''}${options.parallel ? ', "--workers=4"' : ''}]

# docker-compose.yml
# version: '3.8'
# services:
#   playwright:
#     build: .
#     volumes:
#       - ./playwright-report:/app/playwright-report
#     environment:
#       - CI=true`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateConfig());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadConfig = () => {
    const config = generateConfig();
    let filename = '';
    switch (platform) {
      case 'github': filename = '.github/workflows/playwright.yml'; break;
      case 'gitlab': filename = '.gitlab-ci.yml'; break;
      case 'jenkins': filename = 'Jenkinsfile'; break;
      case 'docker': filename = 'Dockerfile'; break;
    }

    const blob = new Blob([config], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.split('/').pop() || filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const platforms = [
    { id: 'github' as const, name: 'GitHub Actions', icon: Github },
    { id: 'gitlab' as const, name: 'GitLab CI', icon: GitBranch },
    { id: 'jenkins' as const, name: 'Jenkins', icon: Terminal },
    { id: 'docker' as const, name: 'Docker', icon: Box },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-4xl mx-4 max-h-[90vh] bg-white dark:bg-slate-800 rounded-xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <GitBranch className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                CI/CD Integration
              </h2>
              <p className="text-xs text-gray-500">
                Generate configuration for your CI/CD pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Options */}
          <div className="w-64 border-r border-gray-200 dark:border-slate-700 p-4 space-y-4">
            {/* Platform Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Platform
              </label>
              <div className="space-y-1">
                {platforms.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={`w-full px-3 py-2 text-sm rounded-lg flex items-center gap-2 ${
                      platform === p.id
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <p.icon className="w-4 h-4" />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Browsers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Browsers
              </label>
              {['chromium', 'firefox', 'webkit'].map(browser => (
                <label key={browser} className="flex items-center gap-2 mb-1">
                  <input
                    type="checkbox"
                    checked={options.browsers.includes(browser)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setOptions(prev => ({ ...prev, browsers: [...prev.browsers, browser] }));
                      } else {
                        setOptions(prev => ({ ...prev, browsers: prev.browsers.filter(b => b !== browser) }));
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{browser}</span>
                </label>
              ))}
            </div>

            {/* Options */}
            <div>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={options.parallel}
                  onChange={(e) => setOptions(prev => ({ ...prev, parallel: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Parallel execution</span>
              </label>
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={options.artifacts}
                  onChange={(e) => setOptions(prev => ({ ...prev, artifacts: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Save artifacts</span>
              </label>
            </div>

            {/* Retries */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Retries
              </label>
              <input
                type="number"
                value={options.retries}
                onChange={(e) => setOptions(prev => ({ ...prev, retries: parseInt(e.target.value) || 0 }))}
                className="w-20 px-2 py-1 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded"
                min="0"
                max="5"
              />
            </div>

            {/* Schedule (GitHub only) */}
            {platform === 'github' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Schedule (cron)
                </label>
                <input
                  type="text"
                  value={options.schedule}
                  onChange={(e) => setOptions(prev => ({ ...prev, schedule: e.target.value }))}
                  className="w-full px-2 py-1 text-sm bg-gray-100 dark:bg-slate-700 border-none rounded"
                  placeholder="0 0 * * *"
                />
              </div>
            )}
          </div>

          {/* Config Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Configuration
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1"
                >
                  {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={downloadConfig}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                {generateConfig()}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
