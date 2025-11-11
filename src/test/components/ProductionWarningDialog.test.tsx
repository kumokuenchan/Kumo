import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProductionWarningDialog from '../../components/ProductionWarningDialog';

describe('ProductionWarningDialog Component', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnConfirm.mockClear();
    mockOnCancel.mockClear();
  });

  describe('Rendering', () => {
    it('renders with required props', () => {
      render(
        <ProductionWarningDialog
          connectionName="Production DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Production Database Warning!')).toBeInTheDocument();
      expect(screen.getByText('Production DB')).toBeInTheDocument();
      expect(screen.getByText('I Understand, Connect')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('displays connection name correctly', () => {
      const connectionNames = [
        'Main Production Database',
        'User Database (Production)',
        'Analytics DB - Live',
        'SimpleName',
        'Database with special chars: @#$%',
      ];

      connectionNames.forEach(name => {
        const { unmount } = render(
          <ProductionWarningDialog
            connectionName={name}
            onConfirm={mockOnConfirm}
            onCancel={mockOnCancel}
          />
        );

        expect(screen.getByText(name)).toBeInTheDocument();
        unmount();
      });
    });

    it('displays warning icon', () => {
      const { container } = render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('has proper modal backdrop', () => {
      const { container } = render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const backdrop = container.firstChild as HTMLElement;
      expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50');
    });
  });

  describe('Warning Messages', () => {
    it('displays production database warning text', () => {
      render(
        <ProductionWarningDialog
          connectionName="Production DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/You are about to connect to a/)).toBeInTheDocument();
      expect(screen.getByText(/PRODUCTION/)).toBeInTheDocument();
    });

    it('displays caution message', () => {
      render(
        <ProductionWarningDialog
          connectionName="Production DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/Any operations you perform/)).toBeInTheDocument();
      expect(screen.getByText(/Please double-check all queries before execution/)).toBeInTheDocument();
    });

    it('displays connection name in highlighted box', () => {
      const { container } = render(
        <ProductionWarningDialog
          connectionName="Critical Production DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const connectionBox = container.querySelector('.bg-red-50');
      expect(connectionBox).toBeInTheDocument();
      expect(screen.getByText('Critical Production DB')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    beforeEach(() => {
      render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
    });

    it('calls onConfirm when confirm button is clicked', () => {
      const confirmButton = screen.getByText('I Understand, Connect');
      fireEvent.click(confirmButton);

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is clicked', () => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard events', () => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.keyDown(cancelButton, { key: 'Enter' });
      fireEvent.keyDown(cancelButton, { key: ' ' });

      // onClick should still be called for Enter and Space
      expect(mockOnCancel).toHaveBeenCalledTimes(2);
    });
  });

  describe('Button Styling', () => {
    it('applies correct styling to buttons', () => {
      const { container } = render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(2);

      const [cancelButton, confirmButton] = buttons;
      expect(cancelButton).toHaveClass('border', 'border-gray-300', 'text-gray-700');
      expect(confirmButton).toHaveClass('bg-red-600', 'text-white');
    });

    it('applies hover states', () => {
      const { container } = render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const confirmButton = screen.getByText('I Understand, Connect');
      expect(confirmButton).toHaveClass('hover:bg-red-700');
    });
  });

  describe('Layout and Structure', () => {
    it('has responsive layout', () => {
      const { container } = render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const modal = container.querySelector('.bg-white');
      expect(modal).toHaveClass('rounded-lg', 'shadow-xl', 'max-w-md', 'w-full', 'mx-4');
    });

    it('centers modal in viewport', () => {
      const { container } = render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const backdrop = container.firstChild as HTMLElement;
      expect(backdrop).toHaveClass('flex', 'items-center', 'justify-center');
    });

    it('has proper spacing and padding', () => {
      const { container } = render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const content = container.querySelector('.p-6');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long connection names', () => {
      const longName = 'a'.repeat(200);
      
      render(
        <ProductionWarningDialog
          connectionName={longName}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('handles special characters in connection name', () => {
      const specialName = 'DB@Production#1 (Live) - {Critical}';

      render(
        <ProductionWarningDialog
          connectionName={specialName}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(specialName)).toBeInTheDocument();
    });

    it('handles empty connection name', () => {
      render(
        <ProductionWarningDialog
          connectionName=""
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      // Check that the warning section exists
      expect(screen.getByText('Production Database Warning!')).toBeInTheDocument();
      expect(screen.getByText('PRODUCTION')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Production Database Warning!')).toHaveRole('heading');
    });

    it('has keyboard accessible buttons', () => {
      render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toBeDisabled();
      });
    });

    it('displays high contrast warning colors', () => {
      const { container } = render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const warningIcon = container.querySelector('.bg-red-100');
      expect(warningIcon).toBeInTheDocument();
      
      const warningText = screen.getByText(/PRODUCTION/);
      expect(warningText).toHaveClass('font-bold', 'text-red-600');
    });
  });

  describe('Z-index and Overlay', () => {
    it('has proper z-index for overlay', () => {
      const { container } = render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const backdrop = container.firstChild as HTMLElement;
      expect(backdrop).toHaveClass('z-50');
    });

    it('creates overlay covering entire viewport', () => {
      const { container } = render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const backdrop = container.firstChild as HTMLElement;
      expect(backdrop).toHaveClass('fixed', 'inset-0');
    });
  });

  describe('Visual Feedback', () => {
    it('uses warning colors for critical elements', () => {
      render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const productionText = screen.getByText(/PRODUCTION/);
      expect(productionText).toHaveClass('text-red-600');
    });

    it('highlights connection name prominently', () => {
      render(
        <ProductionWarningDialog
          connectionName="Test DB"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );

      const connectionText = screen.getByText('Test DB');
      expect(connectionText.parentElement).toHaveClass('bg-red-50');
      expect(connectionText).toHaveClass('text-red-900', 'font-semibold');
    });
  });
});
