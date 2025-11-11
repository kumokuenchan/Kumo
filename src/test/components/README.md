# Component Tests

This directory contains comprehensive unit tests for React components in the application.

## Test Structure

- `Toast.test.tsx` - Tests for Toast notification component
- `ConfirmDialog.test.tsx` - Tests for confirmation dialog component  
- `PasswordPrompt.test.tsx` - Tests for password input modal
- `GenerateTestDataModal.test.tsx` - Tests for test data generation modal
- `PreferencesModal.test.tsx` - Tests for editor preferences modal
- `index.test.ts` - Test entry point that imports all component tests

## Running Tests

### Run all component tests:
```bash
npm run test:unit:components
```

### Run with coverage:
```bash
npm run test:unit:coverage -- src/test/components/
```

### Run in watch mode:
```bash
npm run test:unit -- src/test/components/ --watch
```

### Run specific test file:
```bash
npm run test:unit -- src/test/components/Toast.test.tsx
```

## Test Coverage

The component tests cover:

- **Rendering**: Proper component rendering with different props
- **User Interactions**: Button clicks, form submissions, input changes
- **State Management**: Component state updates and resets
- **Event Handling**: Proper event handler calls
- **Form Validation**: Input validation and error handling
- **Loading States**: Button states and loading indicators
- **Accessibility**: ARIA attributes, focus management, semantic structure
- **Visual Elements**: Icons, styling, modal structure
- **Edge Cases**: Empty states, invalid inputs, boundary conditions

## Testing Framework

- **Vitest** - Test runner
- **Testing Library** - Component testing utilities
- **@testing-library/jest-dom** - Custom Jest matchers
- **jsdom** - Browser environment simulation

## Mocking

The test setup includes mocks for:
- `window.matchMedia` - Media query testing
- `navigator.clipboard` - Clipboard API
- `localStorage` and `sessionStorage` - Storage APIs
- `ResizeObserver` and `IntersectionObserver` - Web APIs
- `fetch` - Network requests
- Console warnings and errors (suppressed in tests)
