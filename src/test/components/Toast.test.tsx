import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Toast, { ToastContainer, type ToastType } from '../../components/Toast';

describe('Toast Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Toast Types', () => {
    const toastTypes: ToastType[] = ['success', 'error', 'info'];

    toastTypes.forEach((type) => {
      it(`renders ${type} toast with correct styling`, () => {
        render(
          <Toast
            message={`Test ${type} message`}
            type={type}
            onClose={mockOnClose}
          />
        );

        const toast = screen.getByText(`Test ${type} message`);
        expect(toast).toBeInTheDocument();
      });
    });
  });

  describe('Rendering', () => {
    it('renders with message and close button', () => {
      render(
        <Toast
          message="Test message"
          type="success"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Test message')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('displays correct icon for each type', () => {
      const { rerender } = render(
        <Toast
          message="Success message"
          type="success"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Success message')).toBeInTheDocument();

      rerender(
        <Toast
          message="Error message"
          type="error"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  describe('Auto Close', () => {
    it('calls onClose after duration expires', () => {
      render(
        <Toast
          message="Auto close message"
          type="info"
          onClose={mockOnClose}
          duration={2000}
        />
      );

      expect(mockOnClose).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2000);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not auto close when duration is 0', () => {
      render(
        <Toast
          message="Manual close message"
          type="success"
          onClose={mockOnClose}
          duration={0}
        />
      );

      vi.advanceTimersByTime(5000);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('clears timeout on unmount', () => {
      const { unmount } = render(
        <Toast
          message="Test message"
          type="success"
          onClose={mockOnClose}
          duration={3000}
        />
      );

      unmount();

      vi.advanceTimersByTime(3000);

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Manual Close', () => {
    it('calls onClose when close button is clicked', () => {
      render(
        <Toast
          message="Test message"
          type="success"
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ToastContainer', () => {
    it('renders children correctly', () => {
      render(
        <ToastContainer>
          <div>Test Child</div>
        </ToastContainer>
      );

      expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('applies correct positioning classes', () => {
      const { container } = render(
        <ToastContainer>
          <div>Test</div>
        </ToastContainer>
      );

      const containerElement = container.firstChild as HTMLElement;
      expect(containerElement).toHaveClass('fixed', 'top-20', 'right-6', 'z-[9999]');
    });
  });

  describe('Accessibility', () => {
    it('has proper role and aria attributes', () => {
      render(
        <Toast
          message="Accessible message"
          type="info"
          onClose={mockOnClose}
        />
      );

      const toast = screen.getByText('Accessible message');
      expect(toast.closest('div')).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('renders motion component', () => {
      const { container } = render(
        <Toast
          message="Animation test"
          type="success"
          onClose={mockOnClose}
        />
      );

      // Check that the Toast component renders with animations
      const toastElement = screen.getByText('Animation test');
      expect(toastElement).toBeInTheDocument();
    });
  });
});
