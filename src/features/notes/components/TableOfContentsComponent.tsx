import React, { useEffect, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { List } from 'lucide-react';

interface Heading {
  level: number;
  text: string;
  id: string;
}

export default function TableOfContentsComponent({ editor }: any) {
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    const updateHeadings = () => {
      const headingsArray: Heading[] = [];
      const json = editor.getJSON();

      // Recursively find all headings
      const findHeadings = (node: any) => {
        if (node.type === 'heading') {
          const text = node.content?.map((n: any) => n.text || '').join('') || '';
          const id = text.toLowerCase().replace(/[^\w]+/g, '-');
          headingsArray.push({
            level: node.attrs.level,
            text,
            id,
          });
        }

        if (node.content) {
          node.content.forEach(findHeadings);
        }
      };

      json.content?.forEach(findHeadings);
      setHeadings(headingsArray);
    };

    updateHeadings();

    // Listen for editor updates
    editor.on('update', updateHeadings);

    return () => {
      editor.off('update', updateHeadings);
    };
  }, [editor]);

  if (headings.length === 0) {
    return (
      <NodeViewWrapper>
        <div className="my-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <List className="w-5 h-5" />
            <span className="text-sm italic">No headings found. Add headings to generate a table of contents.</span>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper>
      <div className="my-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border-l-4 border-blue-500">
        <div className="flex items-center gap-2 mb-3">
          <List className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">Table of Contents</h3>
        </div>
        <nav>
          <ul className="space-y-1">
            {headings.map((heading, index) => (
              <li
                key={index}
                style={{ paddingLeft: `${(heading.level - 1) * 1}rem` }}
                className="text-sm"
              >
                <a
                  href={`#${heading.id}`}
                  className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 hover:underline transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    // Scroll to heading (if IDs are added to headings in the future)
                  }}
                >
                  {heading.level === 1 && '•  '}
                  {heading.level === 2 && '◦  '}
                  {heading.level === 3 && '▪  '}
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </NodeViewWrapper>
  );
}
