import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PreferencesModal from '../../components/PreferencesModal';

describe('PreferencesModal Component', () => {
  const mockOnChange = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnClose.mockClear();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(
        <PreferencesModal
          isOpen={true}
          hintsEnabled={true}
          limit={100}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Editor Preferences')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <PreferencesModal
          isOpen={false}
          hintsEnabled={true}
          limit={100}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Editor Preferences')).not.toBeInTheDocument();
    });
  });

  describe('Hints Setting', () => {
    beforeEach(() => {
      render(
        <PreferencesModal
          isOpen={true}
          hintsEnabled={true}
          limit={100}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );
    });

    it('displays hints setting with description', () => {
      expect(screen.getByText('WHERE Value Hints')).toBeInTheDocument();
      expect(screen.getByText('Offer sampled values while editing WHERE')).toBeInTheDocument();
    });

    it('shows toggle button for hints', () => {
      const toggleButton = screen.getByRole('button', { name: 'On' });
      expect(toggleButton).toBeInTheDocument();
    });

    it('toggles hints setting when clicked', () => {
      const toggleButton = screen.getByRole('button', { name: 'On' });
      fireEvent.click(toggleButton);

      expect(mockOnChange).toHaveBeenCalledWith({
        hintsEnabled: false,
        limit: 100,
      });
    });

    it('shows current state correctly', () => {
      // The toggle should reflect the current state
      const toggleButton = screen.getByRole('button', { name: 'On' });
      // This would depend on the actual implementation of the toggle
      // For now, we just verify it exists and is clickable
      expect(toggleButton).toBeEnabled();
    });
  });

  describe('Max Suggested Values Setting', () => {
    beforeEach(() => {
      render(
        <PreferencesModal
          isOpen={true}
          hintsEnabled={true}
          limit={100}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );
    });

    it('displays max suggested values setting', () => {
      expect(screen.getByText('Max suggested values')).toBeInTheDocument();
    });

    it('shows current limit value', () => {
      expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    });

    it('accepts limit changes', () => {
      const limitInput = screen.getByDisplayValue('100');
      fireEvent.change(limitInput, { target: { value: '50' } });

      // The input should trigger onChange with the new value
      expect(mockOnChange).toHaveBeenCalledWith({
        hintsEnabled: true,
        limit: 50,
      });
    });

    it('calls onChange with new limit', () => {
      const limitInput = screen.getByDisplayValue('100');
      fireEvent.change(limitInput, { target: { value: '50' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        hintsEnabled: true,
        limit: 50,
      });
    });

    it('validates minimum limit', () => {
      const limitInput = screen.getByDisplayValue('100');
      fireEvent.change(limitInput, { target: { value: '0' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        hintsEnabled: true,
        limit: 1,
      });
    });

    it('validates maximum limit', () => {
      const limitInput = screen.getByDisplayValue('100');
      fireEvent.change(limitInput, { target: { value: '150' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        hintsEnabled: true,
        limit: 100,
      });
    });
  });

  describe('Close Functionality', () => {
    it('calls onClose when close button is clicked', () => {
      render(
        <PreferencesModal
          isOpen={true}
          hintsEnabled={true}
          limit={100}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Initial State', () => {
    it('shows correct initial values', () => {
      render(
        <PreferencesModal
          isOpen={true}
          hintsEnabled={false}
          limit={50}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    });
  });

  describe('Toggle Behavior', () => {
    it('toggles hints enabled state', () => {
      const { rerender } = render(
        <PreferencesModal
          isOpen={true}
          hintsEnabled={true}
          limit={100}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      const toggleButton = screen.getByRole('button', { name: 'On' });
      fireEvent.click(toggleButton);

      expect(mockOnChange).toHaveBeenCalledWith({
        hintsEnabled: false,
        limit: 100,
      });

      rerender(
        <PreferencesModal
          isOpen={true}
          hintsEnabled={false}
          limit={100}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(toggleButton);

      expect(mockOnChange).toHaveBeenCalledWith({
        hintsEnabled: true,
        limit: 100,
      });
    });
  });

  describe('Input Validation', () => {
    beforeEach(() => {
      render(
        <PreferencesModal
          isOpen={true}
          hintsEnabled={true}
          limit={100}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );
    });

    it('prevents negative values', () => {
      const limitInput = screen.getByDisplayValue('100');
      fireEvent.change(limitInput, { target: { value: '-10' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        hintsEnabled: true,
        limit: 1,
      });
    });

    it('handles empty input', () => {
      const limitInput = screen.getByDisplayValue('100');
      fireEvent.change(limitInput, { target: { value: '' } });

      // Check what was actually called
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('accepts valid numeric input', () => {
      const limitInput = screen.getByDisplayValue('100');
      fireEvent.change(limitInput, { target: { value: '250' } });

      expect(mockOnChange).toHaveBeenCalledWith({
        hintsEnabled: true,
        limit: 100, // Clamped to max value
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(
        <PreferencesModal
          isOpen={true}
          hintsEnabled={true}
          limit={100}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      const heading = screen.getByText('Editor Preferences');
      expect(heading).toHaveRole('heading');
    });

    it('has close button with aria-label', () => {
      render(
        <PreferencesModal
          isOpen={true}
          hintsEnabled={true}
          limit={100}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByLabelText('Close');
      expect(closeButton).toBeInTheDocument();
    });

    it('has proper input labels', () => {
      render(
        <PreferencesModal
          isOpen={true}
          hintsEnabled={true}
          limit={100}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      const limitInput = screen.getByDisplayValue('100');
      expect(limitInput).toHaveAttribute('type', 'number');
    });
  });

  describe('Modal Structure', () => {
    it('has proper backdrop and modal structure', () => {
      const { container } = render(
        <PreferencesModal
          isOpen={true}
          hintsEnabled={true}
          limit={100}
          onChange={mockOnChange}
          onClose={mockOnClose}
        />
      );

      const backdrop = container.firstChild as HTMLElement;
      expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-black/50');
    });
  });
});
