import '@testing-library/jest-dom';

// Mock environment variables for testing
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock fetch
global.fetch = vi.fn();

// Mock framer-motion - React components
vi.mock('framer-motion', () => {
  const React = require('react');
  
  const MotionDiv = ({ children, ...props }: any) => {
    return React.createElement('div', { 
      'data-testid': 'motion-div',
      ...props 
    }, children);
  };
  
  const MotionButton = ({ children, ...props }: any) => {
    return React.createElement('button', { 
      'data-testid': 'motion-button',
      ...props 
    }, children);
  };
  
  const AnimatePresence = ({ children }: any) => {
    return React.createElement('div', { 
      'data-testid': 'animate-presence' 
    }, children);
  };
  
  return {
    motion: {
      div: MotionDiv,
      button: MotionButton,
    },
    AnimatePresence: AnimatePresence,
  };
});

// Mock lucide-react - TypeScript compatible
vi.mock('lucide-react', () => {
  const React = require('react');
  
  const createSvgMock = (testid: string) => {
    return React.createElement('svg', {
      'data-testid': testid,
      'width': '20',
      'height': '20'
    });
  };
  
  return {
    CheckCircle: () => createSvgMock('check-circle'),
    XCircle: () => createSvgMock('x-circle'),
    AlertCircle: () => createSvgMock('alert-circle'),
    X: () => createSvgMock('x-icon'),
    Beaker: () => createSvgMock('beaker'),
    Settings: () => createSvgMock('settings'),
    Database: () => createSvgMock('database'),
    RefreshCw: () => createSvgMock('refresh-cw'),
    Download: () => createSvgMock('download'),
    Copy: () => createSvgMock('copy'),
    Play: () => createSvgMock('play'),
    Search: () => createSvgMock('search'),
    FileText: () => createSvgMock('file-text'),
    User: () => createSvgMock('user'),
    Save: () => createSvgMock('save'),
    Lock: () => createSvgMock('lock'),
    Eye: () => createSvgMock('eye'),
    EyeOff: () => createSvgMock('eye-off'),
    Key: () => createSvgMock('key'),
    Check: () => createSvgMock('check'),
    ArrowRight: () => createSvgMock('arrow-right'),
    ArrowLeft: () => createSvgMock('arrow-left'),
    Plus: () => createSvgMock('plus'),
    Minus: () => createSvgMock('minus'),
    Loader2: () => createSvgMock('loader2'),
    Circle: () => createSvgMock('circle'),
  };
});

// Mock mermaid
vi.mock('mermaid', () => {
  const mockRender = vi.fn().mockImplementation((id, code) => {
    return Promise.resolve({
      svg: `<svg id="${id}">${code}</svg>`,
    });
  });

  // Add mockClear method to the render function
  mockRender.mockClear = vi.fn();

  const mockMermaid = {
    render: mockRender,
    init: vi.fn(),
    contentLoaded: vi.fn(),
  };

  return mockMermaid;
});

// Suppress console warnings in tests
vi.spyOn(console, 'warn').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});