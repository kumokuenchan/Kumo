import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GenerateTestDataModal from '../../components/GenerateTestDataModal';

describe('GenerateTestDataModal Component', () => {
  const mockOnGenerate = vi.fn();
  const mockOnCancel = vi.fn();
  const mockTables = ['users', 'orders', 'products', 'categories'];

  beforeEach(() => {
    mockOnGenerate.mockClear();
    mockOnCancel.mockClear();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(
        <GenerateTestDataModal
          isOpen={true}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Generate Test Data')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <GenerateTestDataModal
          isOpen={false}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.queryByText('Generate Test Data')).not.toBeInTheDocument();
    });

    it('displays database name when provided', () => {
      render(
        <GenerateTestDataModal
          isOpen={true}
          tables={mockTables}
          database="testdb"
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('testdb')).toBeInTheDocument();
    });
  });

  describe('Table Selection', () => {
    beforeEach(() => {
      render(
        <GenerateTestDataModal
          isOpen={true}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );
    });

    it('selects first table by default', () => {
      const selectElement = screen.getByDisplayValue('users');
      expect(selectElement).toBeInTheDocument();
    });

    it('allows table selection', () => {
      const selectElement = screen.getByDisplayValue('users');
      fireEvent.change(selectElement, { target: { value: 'orders' } });

      expect(selectElement).toHaveValue('orders');
    });

    it('shows all available tables', () => {
      mockTables.forEach(table => {
        expect(screen.getByText(table)).toBeInTheDocument();
      });
    });
  });

  describe('Row Count Input', () => {
    beforeEach(() => {
      render(
        <GenerateTestDataModal
          isOpen={true}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );
    });

    it('has default row count of 10', () => {
      const rowCountInput = screen.getByDisplayValue('10');
      expect(rowCountInput).toBeInTheDocument();
    });

    it('accepts row count changes', () => {
      const rowCountInput = screen.getByDisplayValue('10');
      fireEvent.change(rowCountInput, { target: { value: '50' } });

      expect(rowCountInput).toHaveValue(50);
    });

    it('resets invalid row count to default value', () => {
      const rowCountInput = screen.getByDisplayValue('10');
      fireEvent.change(rowCountInput, { target: { value: '0' } });

      // parseInt('0') || 10 results in 10 (default value)
      expect(rowCountInput).toHaveValue(10);
    });

    it('validates maximum row count', () => {
      const rowCountInput = screen.getByDisplayValue('10');
      fireEvent.change(rowCountInput, { target: { value: '150' } });

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      expect(mockOnGenerate).not.toHaveBeenCalled();
    });
  });

  describe('Form Actions', () => {
    beforeEach(() => {
      render(
        <GenerateTestDataModal
          isOpen={true}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );
    });

    it('calls onGenerate with correct parameters', () => {
      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      expect(mockOnGenerate).toHaveBeenCalledWith('users', 10);
    });

    it('calls onCancel when cancel button is clicked', () => {
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('uses custom row count', () => {
      const rowCountInput = screen.getByDisplayValue('10');
      fireEvent.change(rowCountInput, { target: { value: '25' } });

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      expect(mockOnGenerate).toHaveBeenCalledWith('users', 25);
    });
  });

  describe('Loading State', () => {
    it('disables buttons when isLoading is true', () => {
      render(
        <GenerateTestDataModal
          isOpen={true}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      const generateButton = screen.getByText('Generating...');
      const cancelButton = screen.getByText('Cancel');

      expect(generateButton.closest('button')).toBeDisabled();
      expect(cancelButton.closest('button')).toBeDisabled();
    });

    it('shows loading text on generate button', () => {
      render(
        <GenerateTestDataModal
          isOpen={true}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      );

      expect(screen.getByText('Generating...')).toBeInTheDocument();
      expect(screen.queryByText('Generate')).not.toBeInTheDocument();
    });
  });

  describe('Reset Behavior', () => {
    it('resets form when modal reopens', () => {
      const { rerender } = render(
        <GenerateTestDataModal
          isOpen={true}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );

      const rowCountInput = screen.getByDisplayValue('10');
      fireEvent.change(rowCountInput, { target: { value: '50' } });
      expect(rowCountInput).toHaveValue(50);

      rerender(
        <GenerateTestDataModal
          isOpen={false}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );

      rerender(
        <GenerateTestDataModal
          isOpen={true}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );

      const newRowCountInput = screen.getByDisplayValue('10');
      expect(newRowCountInput).toHaveValue(10);
    });

    it('selects first table when modal reopens', () => {
      const { rerender } = render(
        <GenerateTestDataModal
          isOpen={true}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );

      const selectElement = screen.getByDisplayValue('users');
      fireEvent.change(selectElement, { target: { value: 'products' } });
      expect(selectElement).toHaveValue('products');

      rerender(
        <GenerateTestDataModal
          isOpen={false}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );

      rerender(
        <GenerateTestDataModal
          isOpen={true}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );

      const newSelectElement = screen.getByDisplayValue('users');
      expect(newSelectElement).toHaveValue('users');
    });
  });

  describe('Icon Display', () => {
    it('displays beaker icon', () => {
      const { container } = render(
        <GenerateTestDataModal
          isOpen={true}
          tables={mockTables}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Empty Tables Handling', () => {
    it('handles empty tables array', () => {
      render(
        <GenerateTestDataModal
          isOpen={true}
          tables={[]}
          onGenerate={mockOnGenerate}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('No tables available. Please select a database first.')).toBeInTheDocument();
    });
  });
});
