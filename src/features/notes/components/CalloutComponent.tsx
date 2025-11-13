import React from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import {
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lightbulb,
  Quote,
  Flame,
  Zap
} from 'lucide-react';

const calloutConfig = {
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-500',
    iconColor: 'text-blue-600 dark:text-blue-400',
    text: 'text-blue-900 dark:text-blue-100',
    label: 'Info',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-500',
    iconColor: 'text-amber-600 dark:text-amber-400',
    text: 'text-amber-900 dark:text-amber-100',
    label: 'Warning',
  },
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-500',
    iconColor: 'text-green-600 dark:text-green-400',
    text: 'text-green-900 dark:text-green-100',
    label: 'Success',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-500',
    iconColor: 'text-red-600 dark:text-red-400',
    text: 'text-red-900 dark:text-red-100',
    label: 'Error',
  },
  tip: {
    icon: Lightbulb,
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-500',
    iconColor: 'text-purple-600 dark:text-purple-400',
    text: 'text-purple-900 dark:text-purple-100',
    label: 'Tip',
  },
  quote: {
    icon: Quote,
    bg: 'bg-gray-50 dark:bg-gray-800/30',
    border: 'border-gray-500',
    iconColor: 'text-gray-600 dark:text-gray-400',
    text: 'text-gray-900 dark:text-gray-100',
    label: 'Quote',
  },
  important: {
    icon: Flame,
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-500',
    iconColor: 'text-orange-600 dark:text-orange-400',
    text: 'text-orange-900 dark:text-orange-100',
    label: 'Important',
  },
  note: {
    icon: Zap,
    bg: 'bg-cyan-50 dark:bg-cyan-950/30',
    border: 'border-cyan-500',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    text: 'text-cyan-900 dark:text-cyan-100',
    label: 'Note',
  },
};

export default function CalloutComponent({ node, updateAttributes }: any) {
  const type = node.attrs.type || 'info';
  const config = calloutConfig[type as keyof typeof calloutConfig] || calloutConfig.info;
  const Icon = config.icon;

  return (
    <NodeViewWrapper>
      <div className={`my-4 rounded-lg border-l-4 p-4 ${config.bg} ${config.border} ${config.text}`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 flex-shrink-0 mt-1 ${config.iconColor}`} />
          <div className="flex-1 min-w-0">
            <select
              value={type}
              onChange={(e) => updateAttributes({ type: e.target.value })}
              className={`mb-2 text-xs font-semibold bg-transparent border-none ${config.iconColor} cursor-pointer`}
              contentEditable={false}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {Object.entries(calloutConfig).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
            <NodeViewContent className="callout-content" />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
