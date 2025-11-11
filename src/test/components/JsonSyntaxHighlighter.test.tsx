import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import JsonSyntaxHighlighter from '../../components/JsonSyntaxHighlighter';

describe('JsonSyntaxHighlighter Component', () => {
  describe('Basic Rendering', () => {
    it('renders preformatted text', () => {
      const { container } = render(
        <JsonSyntaxHighlighter data={{}} />
      );

      const preElement = container.querySelector('pre');
      expect(preElement).toBeInTheDocument();
      expect(preElement).toHaveClass('font-mono', 'text-sm', 'leading-relaxed');
    });

    it('renders empty object', () => {
      render(
        <JsonSyntaxHighlighter data={{}} />
      );

      expect(screen.getByText((content) => content.includes('{') && content.includes('}'))).toBeInTheDocument();
    });

    it('renders empty array', () => {
      render(
        <JsonSyntaxHighlighter data={[]} />
      );

      expect(screen.getByText('[ ]')).toBeInTheDocument();
    });

    it('handles null value', () => {
      render(
        <JsonSyntaxHighlighter data={null} />
      );

      expect(screen.getByText('null')).toBeInTheDocument();
    });

    it('handles undefined value', () => {
      render(
        <JsonSyntaxHighlighter data={undefined} />
      );

      expect(screen.getByText('undefined')).toBeInTheDocument();
    });
  });

  describe('Primitive Types', () => {
    it('renders strings with quotes', () => {
      render(
        <JsonSyntaxHighlighter data="test string" />
      );

      expect(screen.getByText('"test string"')).toBeInTheDocument();
    });

    it('renders numbers', () => {
      const { rerender } = render(
        <JsonSyntaxHighlighter data={42} />
      );

      expect(screen.getByText('42')).toBeInTheDocument();

      rerender(
        <JsonSyntaxHighlighter data={3.14} />
      );

      expect(screen.getByText('3.14')).toBeInTheDocument();

      rerender(
        <JsonSyntaxHighlighter data={-10} />
      );

      expect(screen.getByText('-10')).toBeInTheDocument();
    });

    it('renders booleans', () => {
      const { rerender } = render(
        <JsonSyntaxHighlighter data={true} />
      );

      expect(screen.getByText('true')).toBeInTheDocument();

      rerender(
        <JsonSyntaxHighlighter data={false} />
      );

      expect(screen.getByText('false')).toBeInTheDocument();
    });
  });

  describe('ObjectId Handling', () => {
    it('detects ObjectId by _id key', () => {
      const data = { _id: "507f1f77bcf86cd799439011" };
      
      render(
        <JsonSyntaxHighlighter data={data} />
      );

      // ObjectId is rendered as text spans, not single text node
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('ObjectId(');
      expect(preElement?.textContent).toContain('507f1f77bcf86cd799439011');
    });

    it('detects 24-character hex strings as ObjectId', () => {
      const data = "507f1f77bcf86cd799439011";
      
      render(
        <JsonSyntaxHighlighter data={data} />
      );

      // ObjectId is rendered as text spans, not single text node
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('ObjectId(');
      expect(preElement?.textContent).toContain('507f1f77bcf86cd799439011');
    });

    it('detects ObjectId in nested objects', () => {
      const data = {
        user: { _id: "507f1f77bcf86cd799439011" },
        post: { id: "507f1f77bcf86cd799439011" }
      };
      
      render(
        <JsonSyntaxHighlighter data={data} />
      );

      // ObjectId is rendered as text spans, not single text node
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('ObjectId(');
      expect(preElement?.textContent).toContain('507f1f77bcf86cd799439011');
    });

    it('handles invalid ObjectId format', () => {
      const data = { _id: "short" };
      
      render(
        <JsonSyntaxHighlighter data={data} />
      );

      expect(screen.getByText('"short"')).toBeInTheDocument();
    });
  });

  describe('ISODate Handling', () => {
    it('detects ISO date strings', () => {
      const data = { createdAt: "2023-12-01T10:30:45.123Z" };
      
      render(
        <JsonSyntaxHighlighter data={data} />
      );

      // ISODate is rendered as text spans, not single text node
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('ISODate(');
      expect(preElement?.textContent).toContain('2023-12-01T10:30:45.123Z');
    });

    it('handles various ISO date formats', () => {
      const dates = [
        "2023-12-01T10:30:45.123Z",
        "2023-12-01T10:30:45Z",
        "2023-12-01T10:30:45",
        "2023-12-01T10:30:45.000Z"
      ];

      dates.forEach(date => {
        const { unmount } = render(
          <JsonSyntaxHighlighter data={{ date }} />
        );

        // ISODate is rendered as text spans, not single text node
        const preElement = document.querySelector('pre');
        expect(preElement?.textContent).toContain('ISODate(');
        expect(preElement?.textContent).toContain(date);
        unmount();
      });
    });

    it('does not format invalid date strings', () => {
      const data = { invalid: "not a date" };
      
      render(
        <JsonSyntaxHighlighter data={data} />
      );

      expect(screen.getByText('"not a date"')).toBeInTheDocument();
    });
  });

  describe('Array Rendering', () => {
    it('renders empty array inline', () => {
      render(
        <JsonSyntaxHighlighter data={[]} />
      );

      expect(screen.getByText('[ ]')).toBeInTheDocument();
    });

    it('renders simple arrays inline when short', () => {
      render(
        <JsonSyntaxHighlighter data={["a", "b", "c"]} />
      );

      // Array content is rendered as text spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('[ "a", "b", "c" ]');
    });

    it('renders long arrays with newlines', () => {
      render(
        <JsonSyntaxHighlighter data={["item1", "item2", "item3", "item4"]} />
      );

      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('\n');
      expect(preElement?.textContent).toContain('  ');
    });

    it('renders arrays with objects', () => {
      render(
        <JsonSyntaxHighlighter data={[{ name: "John" }, { name: "Jane" }]} />
      );

      // Object properties are rendered as spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('"name"');
      expect(preElement?.textContent).toContain('"John"');
      expect(preElement?.textContent).toContain('"Jane"');
    });

    it('renders arrays with mixed types', () => {
      render(
        <JsonSyntaxHighlighter data={["string", 42, true, null]} />
      );

      expect(screen.getByText('"string"')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('true')).toBeInTheDocument();
      expect(screen.getByText('null')).toBeInTheDocument();
    });
  });

  describe('Object Rendering', () => {
    it('renders empty object inline', () => {
      render(
        <JsonSyntaxHighlighter data={{}} />
      );

      // Object is rendered as spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('{ }');
    });

    it('renders object properties', () => {
      render(
        <JsonSyntaxHighlighter data={{ name: "John", age: 30 }} />
      );

      // Object properties are rendered as spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('"name"');
      expect(preElement?.textContent).toContain('"John"');
      expect(preElement?.textContent).toContain('"age"');
      expect(preElement?.textContent).toContain('30');
    });

    it('renders nested objects', () => {
      render(
        <JsonSyntaxHighlighter data={{
          user: { name: "John", address: { city: "NYC" } }
        }} />
      );

      // Object properties are rendered as spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('"user"');
      expect(preElement?.textContent).toContain('"address"');
      expect(preElement?.textContent).toContain('"city"');
      expect(preElement?.textContent).toContain('"NYC"');
    });

    it('handles special characters in property names', () => {
      render(
        <JsonSyntaxHighlighter data={{ "user-name": "John", "user_age": 30 }} />
      );

      expect(screen.getByText('"user-name"')).toBeInTheDocument();
      expect(screen.getByText('"user_age"')).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('applies correct colors to strings', () => {
      const { container } = render(
        <JsonSyntaxHighlighter data={{ name: "test" }} />
      );

      const stringElement = container.querySelector('.text-green-600');
      expect(stringElement).toBeInTheDocument();
      expect(stringElement?.textContent).toBe('"test"');
    });

    it('applies correct colors to numbers', () => {
      const { container } = render(
        <JsonSyntaxHighlighter data={{ age: 25 }} />
      );

      const numberElement = container.querySelector('.text-blue-700');
      expect(numberElement).toBeInTheDocument();
      expect(numberElement?.textContent).toBe('25');
    });

    it('applies correct colors to booleans', () => {
      const { container } = render(
        <JsonSyntaxHighlighter data={{ active: true }} />
      );

      const booleanElement = container.querySelector('.text-purple-600');
      expect(booleanElement).toBeInTheDocument();
      expect(booleanElement?.textContent).toBe('true');
    });

    it('applies correct colors to keys', () => {
      const { container } = render(
        <JsonSyntaxHighlighter data={{ name: "test" }} />
      );

      const keyElement = container.querySelector('.text-cyan-600');
      expect(keyElement).toBeInTheDocument();
      expect(keyElement?.textContent).toBe('"name"');
    });
  });

  describe('Dark Mode Support', () => {
    it('applies dark mode classes', () => {
      const { container } = render(
        <JsonSyntaxHighlighter data={{ name: "test" }} />
      );

      const preElement = container.querySelector('pre');
      expect(preElement).toHaveClass('dark:text-gray-200');
    });

    it('applies dark mode colors for strings', () => {
      const { container } = render(
        <JsonSyntaxHighlighter data={{ name: "test" }} />
      );

      const stringElement = container.querySelector('.dark\\:text-green-400');
      expect(stringElement).toBeInTheDocument();
    });

    it('applies dark mode colors for numbers', () => {
      const { container } = render(
        <JsonSyntaxHighlighter data={{ age: 25 }} />
      );

      const numberElement = container.querySelector('.dark\\:text-blue-300');
      expect(numberElement).toBeInTheDocument();
    });
  });

  describe('Complex Data Structures', () => {
    it('renders complex nested objects', () => {
      const data = {
        user: {
          _id: "507f1f77bcf86cd799439011",
          name: "John Doe",
          age: 30,
          active: true,
          address: {
            street: "123 Main St",
            city: "NYC"
          },
          hobbies: ["reading", "swimming"]
        }
      };

      render(
        <JsonSyntaxHighlighter data={data} />
      );

      // Check for various elements - content is split across spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('ObjectId(');
      expect(preElement?.textContent).toContain('"John Doe"');
      expect(preElement?.textContent).toContain('30');
      expect(preElement?.textContent).toContain('true');
      expect(preElement?.textContent).toContain('"street"');
      expect(preElement?.textContent).toContain('"123 Main St"');
    });

    it('renders arrays of objects', () => {
      const data = {
        users: [
          { name: "John", age: 30 },
          { name: "Jane", age: 25 }
        ]
      };

      render(
        <JsonSyntaxHighlighter data={data} />
      );

      // Object properties are rendered as spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('"users"');
      expect(preElement?.textContent).toContain('"John"');
      expect(preElement?.textContent).toContain('"Jane"');
    });

    it('handles deeply nested structures', () => {
      const data = {
        level1: {
          level2: {
            level3: {
              level4: {
                value: "deep"
              }
            }
          }
        }
      };

      render(
        <JsonSyntaxHighlighter data={data} />
      );

      // Object properties are rendered as spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('"level1"');
      expect(preElement?.textContent).toContain('"level2"');
      expect(preElement?.textContent).toContain('"level3"');
      expect(preElement?.textContent).toContain('"level4"');
      expect(preElement?.textContent).toContain('"deep"');
    });
  });

  describe('Edge Cases', () => {
    it('handles very long strings', () => {
      const longString = 'a'.repeat(1000);
      
      render(
        <JsonSyntaxHighlighter data={{ content: longString }} />
      );

      expect(screen.getByText(`"${longString}"`)).toBeInTheDocument();
    });

    it('handles very large numbers', () => {
      render(
        <JsonSyntaxHighlighter data={{ big: 9007199254740991 }} />
      );

      expect(screen.getByText('9007199254740991')).toBeInTheDocument();
    });

    it('handles special number values', () => {
      const { rerender } = render(
        <JsonSyntaxHighlighter data={{ inf: Infinity }} />
      );

      expect(screen.getByText('Infinity')).toBeInTheDocument();

      rerender(
        <JsonSyntaxHighlighter data={{ negInf: -Infinity }} />
      );

      expect(screen.getByText('-Infinity')).toBeInTheDocument();

      rerender(
        <JsonSyntaxHighlighter data={{ nan: NaN }} />
      );

      expect(screen.getByText('NaN')).toBeInTheDocument();
    });

    it('handles functions in objects', () => {
      const data = { func: () => {} };
      
      render(
        <JsonSyntaxHighlighter data={data} />
      );

      // Functions should be rendered as strings
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('() =>');
    });
  });

  describe('Performance', () => {
    it('handles large objects', () => {
      const largeObj: any = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = `value${i}`;
      }

      expect(() => {
        render(
          <JsonSyntaxHighlighter data={largeObj} />
        );
      }).not.toThrow();
    });

    it('handles large arrays', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => `item${i}`);

      expect(() => {
        render(
          <JsonSyntaxHighlighter data={largeArray} />
        );
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic markup', () => {
      const { container } = render(
        <JsonSyntaxHighlighter data={{ name: "test" }} />
      );

      const preElement = container.querySelector('pre');
      expect(preElement).toBeInTheDocument();
    });

    it('preserves whitespace correctly', () => {
      const { container } = render(
        <JsonSyntaxHighlighter data={{ multiline: "line1\nline2\nline3" }} />
      );

      const preElement = container.querySelector('pre');
      expect(preElement).toHaveClass('whitespace-pre');
    });
  });

  describe('String Escaping', () => {
    it('handles quotes in strings', () => {
      render(
        <JsonSyntaxHighlighter data={{ quote: 'He said "Hello"' }} />
      );

      // Quotes are rendered as spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('"He said "Hello""');
    });

    it('handles backslashes in strings', () => {
      render(
        <JsonSyntaxHighlighter data={{ path: "C:\\Users\\Test" }} />
      );

      // Backslashes are rendered as spans
      const preElement = document.querySelector('pre');
      expect(preElement?.textContent).toContain('"C:\\Users\\Test"');
    });

    it('handles newlines in strings', () => {
      render(
        <JsonSyntaxHighlighter data={{ text: "line1\nline2" }} />
      );

      const preElement = document.querySelector('pre');
      // JSON strings preserve actual newlines, not escaped ones
      expect(preElement?.textContent).toContain('line1');
      expect(preElement?.textContent).toContain('line2');
    });
  });
});