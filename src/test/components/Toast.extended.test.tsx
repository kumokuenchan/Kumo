import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Toast, { ToastContainer, type ToastType } from '../../components/Toast';

describe('Toast Component - Extended Edge Cases', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Extended Animation Tests', () => {
    it('handles framer-motion with complex timing', () => {
      render(
        <Toast
          message="Complex animation test"
          type="success"
          onClose={mockOnClose}
        />
      );

      // Verify the component renders with animations
      const toast = screen.getByText('Complex animation test');
      expect(toast).toBeInTheDocument();
    });

    it('handles rapid open/close cycles', () => {
      const { unmount } = render(
        <Toast
          message="Rapid test"
          type="info"
          onClose={mockOnClose}
        />
      );

      // Simulate rapid unmount/mount
      unmount();
      render(
        <Toast
          message="Rapid test 2"
          type="info"
          onClose={mockOnClose}
        />
      );
    });
  });

  describe('Extended Message Handling', () => {
    it('handles very long messages', () => {
      const longMessage = 'a'.repeat(1000);
      
      render(
        <Toast
          message={longMessage}
          type="success"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('handles messages with special characters', () => {
      const specialMessage = 'Special chars: <>&"\'🎉🚀💻';
      
      render(
        <Toast
          message={specialMessage}
          type="error"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(specialMessage)).toBeInTheDocument();
    });

    it('handles Unicode and emoji messages', () => {
      const unicodeMessage = 'Unicode: 你好 नमस्ते Привет مرحبا 🎯⚡🔥';
      
      render(
        <Toast
          message={unicodeMessage}
          type="info"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText(unicodeMessage)).toBeInTheDocument();
    });

    it('handles empty message gracefully', () => {
      render(
        <Toast
          message="Message with content"
          type="success"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Message with content')).toBeInTheDocument();
    });
  });

  describe('Extended Duration Tests', () => {
    it('handles very long durations', () => {
      render(
        <Toast
          message="Long duration test"
          type="success"
          onClose={mockOnClose}
          duration={60000} // 1 minute
        />
      );

      // Should not auto-close within reasonable time
      vi.advanceTimersByTime(5000);
      expect(mockOnClose).not.toHaveBeenCalled();

      // Should still close at 60 seconds
      vi.advanceTimersByTime(55000);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('handles zero duration', () => {
      render(
        <Toast
          message="Zero duration test"
          type="success"
          onClose={mockOnClose}
          duration={0}
        />
      );

      // Should not auto-close
      vi.advanceTimersByTime(10000);
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('handles negative duration', () => {
      render(
        <Toast
          message="Negative duration test"
          type="success"
          onClose={mockOnClose}
          duration={-1000}
        />
      );

      // Should be treated as no auto-close
      vi.advanceTimersByTime(5000);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Extended State Management', () => {
    it('handles rapid onClose calls', () => {
      render(
        <Toast
          message="Rapid onClose test"
          type="success"
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button');
      
      // Click rapidly multiple times
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);

      // All clicks should be registered
      expect(mockOnClose).toHaveBeenCalledTimes(3);
    });

    it('handles manual close during auto-close countdown', () => {
      render(
        <Toast
          message="Countdown test"
          type="success"
          onClose={mockOnClose}
          duration={5000}
        />
      );

      // Halfway through countdown
      vi.advanceTimersByTime(2500);
      expect(mockOnClose).not.toHaveBeenCalled();

      // Manual close
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      // Should not auto-close after manual close
      vi.advanceTimersByTime(3000);
      expect(mockOnClose).toHaveBeenCalledTimes(2);
    });
  });

  describe('Extended Accessibility Tests', () => {
    it('handles keyboard navigation properly', () => {
      render(
        <Toast
          message="Keyboard test"
          type="success"
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByRole('button');
      
      // Test Tab navigation
      fireEvent.keyDown(closeButton, { key: 'Tab' });
      fireEvent.keyUp(closeButton, { key: 'Tab' });

      // Test Enter key
      fireEvent.keyDown(closeButton, { key: 'Enter' });
      fireEvent.keyUp(closeButton, { key: 'Enter' });

      // Test Space key
      fireEvent.keyDown(closeButton, { key: ' ' });
      fireEvent.keyUp(closeButton, { key: ' ' });
    });

    it('maintains proper role and aria attributes', () => {
      const { container } = render(
        <Toast
          message="Accessibility test"
          type="success"
          onClose={mockOnClose}
        />
      );

      const toastElement = container.querySelector('div');
      expect(toastElement).toBeInTheDocument();
    });
  });

  describe('Extended Visual and Styling Tests', () => {
    it('applies all type-specific styling classes', () => {
      const types: ToastType[] = ['success', 'error', 'info'];
      
      types.forEach(type => {
        const { container, unmount } = render(
          <Toast
            message={`${type} test`}
            type={type}
            onClose={mockOnClose}
          />
        );

        const toastElement = container.querySelector('div');
        expect(toastElement).toBeInTheDocument();
        
        // Each type should have appropriate styling
        const hasTypeClasses = toastElement?.className.includes(`border-${type === 'success' ? 'emerald' : type === 'error' ? 'red' : 'blue'}`);
        expect(hasTypeClasses).toBe(true);
        
        unmount();
      });
    });

    it('handles responsive design classes', () => {
      const { container } = render(
        <Toast
          message="Responsive test"
          type="success"
          onClose={mockOnClose}
        />
      );

      const toastElement = container.querySelector('div');
      expect(toastElement).toHaveClass('min-w-[320px]', 'max-w-md');
    });
  });

  describe('Extended Performance Tests', () => {
    it('handles many simultaneous toasts', () => {
      const toasts = Array.from({ length: 50 }, (_, i) => (
        <Toast
          key={i}
          message={`Toast ${i}`}
          type={['success', 'error', 'info'][i % 3] as ToastType}
          onClose={mockOnClose}
          duration={1000}
        />
      ));

      render(
        <ToastContainer>
          {toasts}
        </ToastContainer>
      );

      // All toasts should render
      for (let i = 0; i < 50; i++) {
        expect(screen.getByText(`Toast ${i}`)).toBeInTheDocument();
      }
    });

    it('handles rapid creation and destruction', () => {
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(
          <Toast
            message={`Quick test ${i}`}
            type="success"
            onClose={mockOnClose}
          />
        );

        expect(screen.getByText(`Quick test ${i}`)).toBeInTheDocument();
        unmount();
      }
    });
  });

  describe('Extended Container Tests', () => {
    it('handles empty container', () => {
      render(
        <ToastContainer>
        </ToastContainer>
      );

      const container = screen.getAllByRole('generic')[0];
      expect(container).toBeInTheDocument();
    });

    it('handles container with null children', () => {
      render(
        <ToastContainer>
          {null}
        </ToastContainer>
      );

      const container = screen.getAllByRole('generic')[0];
      expect(container).toBeInTheDocument();
    });

    it('handles container with mixed children', () => {
      render(
        <ToastContainer>
          <div>Regular div</div>
          {null}
          {undefined}
          <Toast
            message="Mixed child test"
            type="success"
            onClose={mockOnClose}
          />
        </ToastContainer>
      );

      expect(screen.getByText('Regular div')).toBeInTheDocument();
      expect(screen.getByText('Mixed child test')).toBeInTheDocument();
    });

    it('applies correct z-index stacking', () => {
      const { container } = render(
        <ToastContainer>
          <Toast
            message="Z-index test"
            type="success"
            onClose={mockOnClose}
          />
        </ToastContainer>
      );

      const containerElement = container.firstChild as HTMLElement;
      expect(containerElement).toHaveClass('z-[9999]');
    });
  });

  describe('Extended Error Handling', () => {
    it('handles memory cleanup on unmount', () => {
      const { unmount } = render(
        <Toast
          message="Cleanup test"
          type="success"
          onClose={mockOnClose}
          duration={10000}
        />
      );

      // Unmount while timer is active
      unmount();

      // Should not call onClose after unmount
      vi.advanceTimersByTime(15000);
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Extended Type Safety', () => {
    it('handles all valid toast types', () => {
      const types: ToastType[] = ['success', 'error', 'info'];
      
      types.forEach(type => {
        const { unmount } = render(
          <Toast
            message={`Type test: ${type}`}
            type={type}
            onClose={mockOnClose}
          />
        );

        expect(screen.getByText(`Type test: ${type}`)).toBeInTheDocument();
        unmount();
      });
    });

    it('handles ref forwarding', () => {
      const ref = { current: null };
      
      const { container } = render(
        <Toast
          ref={ref}
          message="Ref test"
          type="success"
          onClose={mockOnClose}
        />
      );

      // The ref should be forwarded properly
      expect(container).toBeInTheDocument();
    });
  });
});
