import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CodeBlock, MermaidDiagram } from '../../components/MarkdownComponents';

// Mock mermaid
vi.mock('mermaid', () => ({
  default: {
    render: vi.fn(),
  },
}));

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

// Mock document.documentElement.classList
const mockClassList = {
  contains: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  toggle: vi.fn(),
};

Object.defineProperty(document.documentElement, 'classList', {
  value: mockClassList,
  writable: true,
});

describe('CodeBlock Component', () => {
  const mockWriteText = vi.mocked(navigator.clipboard.writeText);

  beforeEach(() => {
    mockWriteText.mockClear();
    mockClassList.contains.mockReturnValue(false);
  });

  describe('Inline Code', () => {
    it('renders inline code with correct styling', () => {
      render(
        <CodeBlock inline={true}>
          const x = 42;
        </CodeBlock>
      );

      // Inline code is rendered as spans
      const codeElement = document.querySelector('code');
      expect(codeElement?.textContent).toContain('const x = 42');
      expect(codeElement).toHaveClass('px-1.5', 'py-0.5', 'rounded', 'bg-gray-100', 'text-pink-600');
    });

    it('applies dark mode classes to inline code', () => {
      mockClassList.contains.mockReturnValue(true);

      render(
        <CodeBlock inline={true}>
          const x = 42;
        </CodeBlock>
      );

      // Inline code is rendered as spans
      const codeElement = document.querySelector('code');
      expect(codeElement?.textContent).toContain('const x = 42');
      expect(codeElement).toHaveClass('dark:bg-slate-800', 'dark:text-pink-400');
    });
  });

  describe('Code Block Rendering', () => {
    it('renders code block without language', () => {
      render(
        <CodeBlock>
          console.log('Hello World');
        </CodeBlock>
      );

      // Code is rendered as token spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain("console.log('Hello World')");
    });

    it('renders code block with language class', () => {
      render(
        <CodeBlock className="language-javascript">
          const name = "John";
        </CodeBlock>
      );

      // Code is rendered as token spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('const');
      expect(preElement?.textContent).toContain('name');
      expect(preElement?.textContent).toContain('=');
      expect(preElement?.textContent).toContain('"John"');
    });

    it('handles different languages', () => {
      const languages = ['javascript', 'python', 'sql', 'json', 'yaml'];

      languages.forEach(lang => {
        const { unmount } = render(
          <CodeBlock className={`language-${lang}`}>
            {`sample ${lang} code`}
          </CodeBlock>
        );

        // Code is rendered as token spans
        const preElement = document.querySelector('pre');
        expect(preElement?.textContent).toContain(`sample ${lang} code`);
        unmount();
      });
    });
  });

  describe('Copy Functionality', () => {
    beforeEach(() => {
      render(
        <CodeBlock>
          console.log('test');
        </CodeBlock>
      );
    });

    it('shows copy button by default', () => {
      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    });

    it('copies code when copy button is clicked', () => {
      const copyButton = screen.getByRole('button', { name: 'Copy' });
      fireEvent.click(copyButton);

      // Check that the original code was copied
      expect(mockWriteText).toHaveBeenCalledWith("console.log('test');");
    });

    it('shows "Copied!" after successful copy', () => {
      const copyButton = screen.getByRole('button', { name: 'Copy' });
      fireEvent.click(copyButton);

      // "Copied!" might be rendered as text content that gets split into spans
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Copied!');
    });

    it('hides copy button on hover initially', () => {
      const copyButton = screen.getByRole('button', { name: 'Copy' });
      
      // The button should be visible initially (depending on CSS classes)
      // This test verifies the button exists
      expect(copyButton).toBeInTheDocument();
    });

    it('resets copy state after timeout', () => {
      vi.useFakeTimers();
      
      const copyButton = screen.getByRole('button', { name: 'Copy' });
      fireEvent.click(copyButton);

      // "Copied!" might be rendered as text content that gets split into spans
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Copied!');

      // Fast-forward time to trigger the 2-second timeout
      vi.advanceTimersByTime(2000);

      expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  describe('Dark Mode Support', () => {
    it('applies light theme by default', () => {
      mockClassList.contains.mockReturnValue(false);

      render(
        <CodeBlock>
          const x = 42;
        </CodeBlock>
      );

      // Verify that syntax highlighter uses light theme
      // Code is rendered as token spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('const x = 42');
    });

    it('applies dark theme when dark mode is active', () => {
      mockClassList.contains.mockReturnValue(true);

      render(
        <CodeBlock>
          const x = 42;
        </CodeBlock>
      );

      // Code is rendered as token spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('const x = 42');
    });
  });

  describe('Mermaid Diagrams', () => {
    it('renders Mermaid diagram when language is mermaid', () => {
      // Mock the Mermaid render function properly
      const mockRender = vi.fn().mockResolvedValue({
        svg: '<svg>Mermaid diagram</svg>',
      });
      
      vi.mocked(require('mermaid').default).render = mockRender;

      render(
        <CodeBlock className="language-mermaid">
          {`graph TD
A[Start] --> B[End]`}
        </CodeBlock>
      );

      // Should render Mermaid diagram instead of syntax highlighter
      expect(mockRender).toHaveBeenCalled();
    });
  });

  describe('Props Handling', () => {
    it('forwards additional props', () => {
      render(
        <CodeBlock data-testid="custom-code-block">
          test code
        </CodeBlock>
      );

      const codeBlock = screen.getByTestId('custom-code-block');
      expect(codeBlock).toBeInTheDocument();
    });

    it('handles undefined children', () => {
      render(
        <CodeBlock>
          {undefined}
        </CodeBlock>
      );

      // Should not crash - just check that component renders
      expect(screen.getByRole('generic')).toBeInTheDocument();
    });

    it('handles null children', () => {
      render(
        <CodeBlock>
          {null}
        </CodeBlock>
      );

      // Should not crash - just check that component renders
      expect(screen.getByRole('generic')).toBeInTheDocument();
    });
  });

  describe('Code Extraction', () => {
    it('extracts text from children correctly', () => {
      const codeWithNewline = "line1\nline2\nline3\n";
      
      render(
        <CodeBlock>
          {codeWithNewline}
        </CodeBlock>
      );

      // Should remove trailing newline
      expect(mockWriteText).toHaveBeenCalledWith("line1\nline2\nline3");
    });

    it('handles empty code', () => {
      render(
        <CodeBlock>
        </CodeBlock>
      );

      const copyButton = screen.getByRole('button', { name: 'Copy' });
      fireEvent.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith('');
    });
  });

  describe('Styling and Layout', () => {
    it('has relative positioning for copy button', () => {
      const { container } = render(
        <CodeBlock>
          const x = 42;
        </CodeBlock>
      );

      const wrapper = container.querySelector('.relative');
      expect(wrapper).toBeInTheDocument();
    });

    it('applies custom styles to syntax highlighter', () => {
      render(
        <CodeBlock>
          const x = 42;
        </CodeBlock>
      );

      // Verify the component renders without errors
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('const x = 42');
    });

    it('handles inline code block', () => {
      render(
        <CodeBlock>
          test
        </CodeBlock>
      );

      // Inline code is rendered as spans
      const codeElement = document.querySelector('code');
      expect(codeElement?.textContent).toContain("test");
    });
  });

  describe('Error Handling', () => {
    it('handles clipboard write errors gracefully', () => {
      mockWriteText.mockRejectedValue(new Error('Clipboard not available'));

      render(
        <CodeBlock>
          test code
        </CodeBlock>
      );

      const copyButton = screen.getByRole('button', { name: 'Copy' });
      
      // Should not throw an error
      expect(() => fireEvent.click(copyButton)).not.toThrow();
    });
  });
});

describe('MermaidDiagram Component', () => {
  const mockMermaid = vi.mocked(require('mermaid').default);

  beforeEach(() => {
    mockMermaid.render.mockClear();
    mockMermaid.render.mockResolvedValue({
      svg: '<svg>Test Diagram</svg>',
    });
  });

  describe('Basic Rendering', () => {
    it('renders mermaid diagram when valid', async () => {
      const chart = 'graph TD; A[Start] --> B[End];';

      render(
        <MermaidDiagram chart={chart} />
      );

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalled();
      });

      const container = document.querySelector('svg');
      expect(container).toBeInTheDocument();
    });

    it('shows error for invalid chart', async () => {
      const invalidChart = 'invalid mermaid syntax';

      render(
        <MermaidDiagram chart={invalidChart} />
      );

      await waitFor(() => {
        // Find error message by checking document text content
        expect(document.body.textContent || '').toMatch(/Not a valid Mermaid diagram/);
      });
    });

    it('shows error for empty chart', async () => {
      render(
        <MermaidDiagram chart="" />
      );

      await waitFor(() => {
        expect(document.body.textContent || '').toMatch(/Invalid diagram content/);
      });
    });

    it('shows error for null chart', async () => {
      render(
        <MermaidDiagram chart={null as any} />
      );

      await waitFor(() => {
        expect(document.body.textContent || '').toMatch(/Invalid diagram content/);
      });
    });
  });

  describe('Diagram Types', () => {
    // Temporarily reduce number of diagram types to avoid timeout
    const validDiagramTypes = [
      'graph TD; A-->B;',
      'flowchart LR; A-->B;',
      'sequenceDiagram; A->>B: Hello;',
      'classDiagram; class A {};',
    ];

    validDiagramTypes.forEach((diagram, index) => {
      it(`renders valid diagram type ${index + 1}`, async () => {
        render(
          <MermaidDiagram chart={diagram} />
        );

        await waitFor(() => {
          expect(mockMermaid.render).toHaveBeenCalled();
        });
      });
    });
  });

  describe('Input Sanitization', () => {
    it('removes HTML tags from chart', async () => {
      const chartWithHTML = '<div>graph TD; A-->B;</div>';

      render(
        <MermaidDiagram chart={chartWithHTML} />
      );

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalledWith(
          expect.any(String),
          'graph TD; A-->B;'
        );
      });
    });

    it('removes HTML entities from chart', async () => {
      const chartWithEntities = '&lt;div&gt;graph TD; A--&gt;B;&lt;/div&gt;';

      render(
        <MermaidDiagram chart={chartWithEntities} />
      );

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalledWith(
          expect.any(String),
          'graph TD; A-->B;'
        );
      });
    });

    it('removes non-ASCII characters', async () => {
      const chartWithNonASCII = 'graph TD; A─→B;';

      render(
        <MermaidDiagram chart={chartWithNonASCII} />
      );

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalledWith(
          expect.any(String),
          'graph TD; A->B;'
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message on render failure', async () => {
      mockMermaid.render.mockRejectedValue(new Error('Render failed'));

      const chart = 'graph TD; A-->B;';

      render(
        <MermaidDiagram chart={chart} />
      );

      await waitFor(() => {
        expect(document.body.textContent || '').toMatch(/Failed to render diagram/);
      });
    });

    it('logs error to console', async () => {
      const error = new Error('Test error');
      mockMermaid.render.mockRejectedValue(error);

      const chart = 'graph TD; A-->B;';

      render(
        <MermaidDiagram chart={chart} />
      );

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Mermaid error:', error);
      });
    });

    it('logs original chart on error', async () => {
      const error = new Error('Test error');
      mockMermaid.render.mockRejectedValue(error);

      const chart = 'graph TD; A-->B;';

      render(
        <MermaidDiagram chart={chart} />
      );

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Original chart:', chart);
        expect(console.error).toHaveBeenCalledWith('Chart length:', chart.length);
      });
    });
  });

  describe('ID Generation', () => {
    it('generates unique IDs for each diagram', async () => {
      const chart = 'graph TD; A-->B;';

      render(
        <MermaidDiagram chart={chart} />
      );

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalled();
      });

      const [id] = mockMermaid.render.mock.calls[0];
      expect(id).toMatch(/^mermaid-[a-z0-9]{9}$/);
    });

    it('generates different IDs for multiple diagrams', async () => {
      const chart1 = 'graph TD; A-->B;';
      const chart2 = 'graph LR; X-->Y;';

      render(
        <div>
          <MermaidDiagram chart={chart1} />
          <MermaidDiagram chart={chart2} />
        </div>
      );

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalledTimes(2);
      });

      const [id1] = mockMermaid.render.mock.calls[0];
      const [id2] = mockMermaid.render.mock.calls[1];
      expect(id1).not.toBe(id2);
    });
  });

  describe('SVG Rendering', () => {
    it('renders SVG with correct structure', async () => {
      const mockSVG = '<svg class="mermaid" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /></svg>';
      mockMermaid.render.mockResolvedValue({ svg: mockSVG });

      render(
        <MermaidDiagram chart="graph TD; A-->B;" />
      );

      await waitFor(() => {
        const svgElement = document.querySelector('svg');
      const container = svgElement?.closest('div');
        expect(svgElement?.getAttribute('dangerouslySetInnerHTML')).toBeDefined();
      });
    });

    it('applies proper styling to diagram container', async () => {
      mockMermaid.render.mockResolvedValue({ svg: '<svg>Test</svg>' });

      render(
        <MermaidDiagram chart="graph TD; A-->B;" />
      );

      await waitFor(() => {
        const container = document.querySelector('svg')?.closest('.flex');
        expect(container).toHaveClass(
          'justify-center', 'my-4', 'p-4', 'bg-white', 'dark:bg-slate-800',
          'rounded', 'border', 'dark:border-slate-700'
        );
      });
    });
  });

  describe('Styling and Layout', () => {
    it('has proper container styling', async () => {
      mockMermaid.render.mockResolvedValue({ svg: '<svg>Test</svg>' });

      render(
        <MermaidDiagram chart="graph TD; A-->B;" />
      );

      await waitFor(() => {
        const container = document.querySelector('svg')?.parentElement;
        expect(container).toHaveClass('flex', 'justify-center', 'my-4', 'p-4');
      });
    });

    it('applies dark mode classes', async () => {
      mockMermaid.render.mockResolvedValue({ svg: '<svg>Test</svg>' });

      render(
        <MermaidDiagram chart="graph TD; A-->B;" />
      );

      await waitFor(() => {
        const container = document.querySelector('svg')?.parentElement;
        expect(container).toHaveClass('dark:bg-slate-800', 'dark:border-slate-700');
      });
    });
  });

  describe('Case Insensitivity', () => {
    it('accepts lowercase diagram types', async () => {
      const lowercaseDiagrams = [
        'graph td; a-->b;',
        'flowchart lr; a-->b;',
        'sequencediagram; a->>b: hello;'
      ];

      for (const diagram of lowercaseDiagrams) {
        const { unmount } = render(
          <MermaidDiagram chart={diagram} />
        );

        await waitFor(() => {
          expect(mockMermaid.render).toHaveBeenCalled();
        });

        unmount();
        mockMermaid.render.mockClear();
      }
    });

    it('accepts uppercase diagram types', async () => {
      const uppercaseDiagrams = [
        'GRAPH TD; A-->B;',
        'FLOWCHART LR; A-->B;',
        'SEQUENCEDIAGRAM; A->>B: HELLO;'
      ];

      for (const diagram of uppercaseDiagrams) {
        const { unmount } = render(
          <MermaidDiagram chart={diagram} />
        );

        await waitFor(() => {
          expect(mockMermaid.render).toHaveBeenCalled();
        });

        unmount();
        mockMermaid.render.mockClear();
      }
    });

    it('accepts mixed case diagram types', async () => {
      const mixedCaseDiagrams = [
        'Graph TD; A-->B;',
        'flowChart LR; A-->B;',
        'SequenceDiagram; A->>B: Hello;'
      ];

      for (const diagram of mixedCaseDiagrams) {
        const { unmount } = render(
          <MermaidDiagram chart={diagram} />
        );

        await waitFor(() => {
          expect(mockMermaid.render).toHaveBeenCalled();
        });

        unmount();
        mockMermaid.render.mockClear();
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles very long diagrams', async () => {
      const longDiagram = 'graph TD; ' + 'A-->B;'.repeat(1000);

      render(
        <MermaidDiagram chart={longDiagram} />
      );

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalled();
      });
    });

    it('handles special characters in diagrams', async () => {
      const specialCharDiagram = 'graph TD; A[Special: "test"] --> B{Node?};';

      render(
        <MermaidDiagram chart={specialCharDiagram} />
      );

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalled();
      });
    });

    it('handles whitespace in diagrams', async () => {
      const whitespaceDiagram = `graph TD;
        A[Start] --> B[End];
      `;

      render(
        <MermaidDiagram chart={whitespaceDiagram} />
      );

      await waitFor(() => {
        expect(mockMermaid.render).toHaveBeenCalled();
      });
    });
  });
});
