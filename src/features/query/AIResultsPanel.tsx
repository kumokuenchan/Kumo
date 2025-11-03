import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface AIResultsPanelProps {
  type: 'explain' | 'optimize' | 'analyze' | 'schema' | null;
  content: string;
  isLoading: boolean;
  onClose: () => void;
}

// SQL Keywords for syntax highlighting
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON',
  'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'AND', 'OR', 'NOT',
  'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'INSERT', 'UPDATE', 'DELETE',
  'CREATE', 'ALTER', 'DROP', 'TABLE', 'INDEX', 'VIEW', 'DISTINCT', 'COUNT', 'SUM',
  'AVG', 'MIN', 'MAX', 'UNION', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
];

// Important technical keywords to highlight
const TECH_KEYWORDS = [
  'index', 'indexes', 'performance', 'bottleneck', 'optimize', 'optimization',
  'slow', 'fast', 'cache', 'query plan', 'execution plan', 'primary key',
  'foreign key', 'constraint', 'transaction', 'lock', 'deadlock', 'scan',
  'full table scan', 'sequential scan', 'cost', 'analyze', 'explain'
];

// Format content with syntax highlighting
function formatContent(content: string, type: 'explain' | 'optimize' | 'analyze' | 'schema' | null): JSX.Element[] {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];

  lines.forEach((line, index) => {
    // Check if line is a section header (starts with number or ##)
    const isHeader = /^#+\s/.test(line) || /^\d+\.\s+[A-Z]/.test(line);

    if (isHeader) {
      // Section header - bold and colored
      elements.push(
        <div key={index} className="font-bold text-base mt-4 mb-2 first:mt-0">
          {line}
        </div>
      );
    } else if (line.trim().length === 0) {
      // Empty line
      elements.push(<div key={index} className="h-2" />);
    } else {
      // Regular line - apply keyword highlighting
      elements.push(
        <div key={index} className="mb-1">
          {highlightKeywords(line)}
        </div>
      );
    }
  });

  return elements;
}

// Highlight SQL keywords and technical terms in a line
function highlightKeywords(line: string): JSX.Element {
  let parts: Array<{ text: string; type: 'sql' | 'tech' | 'normal' }> = [{ text: line, type: 'normal' }];

  // Highlight SQL keywords
  SQL_KEYWORDS.forEach(keyword => {
    const newParts: typeof parts = [];
    parts.forEach(part => {
      if (part.type === 'normal') {
        const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
        const splits = part.text.split(regex);
        splits.forEach((split, i) => {
          if (i % 2 === 0) {
            if (split) newParts.push({ text: split, type: 'normal' });
          } else {
            newParts.push({ text: split, type: 'sql' });
          }
        });
      } else {
        newParts.push(part);
      }
    });
    parts = newParts;
  });

  // Highlight technical keywords
  TECH_KEYWORDS.forEach(keyword => {
    const newParts: typeof parts = [];
    parts.forEach(part => {
      if (part.type === 'normal') {
        const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
        const splits = part.text.split(regex);
        splits.forEach((split, i) => {
          if (i % 2 === 0) {
            if (split) newParts.push({ text: split, type: 'normal' });
          } else {
            newParts.push({ text: split, type: 'tech' });
          }
        });
      } else {
        newParts.push(part);
      }
    });
    parts = newParts;
  });

  return (
    <>
      {parts.map((part, i) => {
        if (part.type === 'sql') {
          return <span key={i} className="text-purple-600 dark:text-purple-400 font-semibold">{part.text}</span>;
        } else if (part.type === 'tech') {
          return <span key={i} className="text-orange-600 dark:text-orange-400 font-medium">{part.text}</span>;
        } else {
          return <span key={i}>{part.text}</span>;
        }
      })}
    </>
  );
}

export function AIResultsPanel({ type, content, isLoading, onClose }: AIResultsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!type && !isLoading) return null;

  // Set title and icon based on type
  const title = type === 'explain'
    ? 'SQL Explanation'
    : type === 'optimize'
      ? 'Optimization Suggestions'
      : type === 'schema'
        ? 'Schema Analysis'
        : 'Data Analysis';
  const Icon = type === 'optimize' ? Zap : Sparkles;

  // Better color schemes for each type
  const colors = type === 'explain'
    ? {
        border: 'border-blue-200 dark:border-blue-800',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        headerBg: 'bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-950/30',
        headerBorder: 'border-blue-200 dark:border-blue-800',
        iconColor: 'text-blue-600 dark:text-blue-400',
        titleColor: 'text-blue-900 dark:text-blue-100',
        contentBg: 'bg-white dark:bg-gray-900/50',
        contentText: 'text-gray-800 dark:text-gray-200',
        hoverBg: 'hover:bg-blue-200/50 dark:hover:bg-blue-800/30',
        scrollbar: ''
      }
    : type === 'analyze'
      ? {
          border: 'border-green-200 dark:border-green-800',
          bg: 'bg-green-50 dark:bg-green-950/30',
          headerBg: 'bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-950/30',
          headerBorder: 'border-green-200 dark:border-green-800',
          iconColor: 'text-green-600 dark:text-green-400',
          titleColor: 'text-green-900 dark:text-green-100',
          contentBg: 'bg-white dark:bg-gray-900/50',
          contentText: 'text-gray-800 dark:text-gray-200',
          hoverBg: 'hover:bg-green-200/50 dark:hover:bg-green-800/30',
          scrollbar: ''
        }
      : type === 'schema'
        ? {
          border: 'border-green-200 dark:border-green-800',
          bg: 'bg-green-50 dark:bg-green-950/30',
          headerBg: 'bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-950/30',
          headerBorder: 'border-green-200 dark:border-green-800',
          iconColor: 'text-green-600 dark:text-green-400',
          titleColor: 'text-green-900 dark:text-green-100',
          contentBg: 'bg-white dark:bg-gray-900/50',
          contentText: 'text-gray-800 dark:text-gray-200',
          hoverBg: 'hover:bg-green-200/50 dark:hover:bg-green-800/30',
          scrollbar: ''
        }
      : {
          border: 'border-yellow-200 dark:border-yellow-800',
          bg: 'bg-yellow-50 dark:bg-yellow-950/30',
          headerBg: 'bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/40 dark:to-yellow-950/30',
          headerBorder: 'border-yellow-200 dark:border-yellow-800',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          titleColor: 'text-yellow-900 dark:text-yellow-100',
          contentBg: 'bg-white dark:bg-gray-900/50',
          contentText: 'text-gray-800 dark:text-gray-200',
          hoverBg: 'hover:bg-yellow-200/50 dark:hover:bg-yellow-800/30',
          scrollbar: ''
        };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={`mt-4 rounded-lg border ${colors.border} ${colors.bg} overflow-hidden shadow-lg`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 ${colors.headerBg} border-b ${colors.headerBorder}`}>
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${colors.iconColor}`} />
            <h3 className={`font-semibold ${colors.titleColor}`}>{title}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-1.5 rounded-md transition-colors ${colors.iconColor} ${colors.hoverBg}`}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-md transition-colors ${colors.iconColor} ${colors.hoverBg}`}
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className={`${colors.contentBg}`}>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className={`w-6 h-6 ${colors.iconColor} animate-spin`} />
                    <span className={`ml-3 ${colors.contentText}`}>
                      {type === 'schema' ? 'Analyzing your schema...' : type === 'analyze' ? 'Analyzing your data...' : 'Analyzing your SQL...'}
                    </span>
                  </div>
                ) : (
                  <div
                    className={`${colors.contentText} leading-relaxed text-sm font-mono max-h-96 overflow-y-auto p-5`}
                    style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: type === 'explain'
                        ? 'rgb(96 165 250) rgb(219 234 254)' // blue
                        : type === 'analyze'
                          ? 'rgb(34 197 94) rgb(220 252 231)' // green
                          : type === 'schema'
                            ? 'rgb(34 197 94) rgb(220 252 231)' // green
                            : 'rgb(250 204 21) rgb(254 249 195)' // yellow
                    }}
                  >
                    {formatContent(content, type)}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
