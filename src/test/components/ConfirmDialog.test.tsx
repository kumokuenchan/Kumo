import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from '../../components/ConfirmDialog';

describe('ConfirmDialog Component', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnConfirm.mockClear();
    mockOnCancel.mockClear();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test Message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Message')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <ConfirmDialog
          isOpen={false}
          title="Test Title"
          message="Test Message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Message')).not.toBeInTheDocument();
    });

    it('renders with default labels', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test Message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders with custom labels', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test Message"
          confirmLabel="Yes, Delete"
          cancelLabel="Keep It"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Yes, Delete')).toBeInTheDocument();
      expect(screen.getByText('Keep It')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test Message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
    });

    it('calls onConfirm when confirm button is clicked', () => {
      const confirmButton = screen.getByText('Confirm');
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is clicked', () => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('disables buttons when isLoading is true', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test Message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      const confirmButton = screen.getByText('Processing...');
      const cancelButton = screen.getByText('Cancel');

      expect(confirmButton.closest('button')).toBeDisabled();
      expect(cancelButton.closest('button')).toBeDisabled();
    });

    it('shows loading spinner and text', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test Message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /spinner|processing/i })).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('displays warning icon', () => {
      const { container } = render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test Message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('has proper modal structure', () => {
      const { container } = render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test Message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const backdrop = container.firstChild as HTMLElement;
      expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-black/50');
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Delete Confirmation"
          message="Are you sure you want to delete this item?"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Delete Confirmation')).toBeInTheDocument();
      expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
    });

    it('button elements are properly labeled', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test Message"
          confirmLabel="Delete"
          cancelLabel="Keep"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const deleteButton = screen.getByText('Delete');
      const keepButton = screen.getByText('Keep');

      expect(deleteButton.closest('button')).toBeInTheDocument();
      expect(keepButton.closest('button')).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    it('has button elements available for focus', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          title="Test Title"
          message="Test Message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const firstButton = screen.getByText('Cancel');
      expect(firstButton.closest('button')).toBeInTheDocument();
    });
  });
});
