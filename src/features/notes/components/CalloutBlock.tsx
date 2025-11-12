import React from 'react';
import { CalloutType } from '../../../types/notes';
import { Info, AlertTriangle, AlertCircle, CheckCircle, Lightbulb, FileText } from 'lucide-react';

interface CalloutBlockProps {
  type: CalloutType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function CalloutBlock({ type, title, children, className = '' }: CalloutBlockProps) {
  const getCalloutConfig = () => {
    switch (type) {
      case 'info':
        return {
          icon: Info,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          textColor: 'text-blue-900 dark:text-blue-100',
          iconColor: 'text-blue-600 dark:text-blue-400',
          titleColor: 'text-blue-900 dark:text-blue-100',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-900 dark:text-yellow-100',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          titleColor: 'text-yellow-900 dark:text-yellow-100',
        };
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-900 dark:text-red-100',
          iconColor: 'text-red-600 dark:text-red-400',
          titleColor: 'text-red-900 dark:text-red-100',
        };
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-200 dark:border-green-800',
          textColor: 'text-green-900 dark:text-green-100',
          iconColor: 'text-green-600 dark:text-green-400',
          titleColor: 'text-green-900 dark:text-green-100',
        };
      case 'tip':
        return {
          icon: Lightbulb,
          bgColor: 'bg-purple-50 dark:bg-purple-900/20',
          borderColor: 'border-purple-200 dark:border-purple-800',
          textColor: 'text-purple-900 dark:text-purple-100',
          iconColor: 'text-purple-600 dark:text-purple-400',
          titleColor: 'text-purple-900 dark:text-purple-100',
        };
      case 'note':
      default:
        return {
          icon: FileText,
          bgColor: 'bg-gray-50 dark:bg-gray-800',
          borderColor: 'border-gray-200 dark:border-gray-700',
          textColor: 'text-gray-900 dark:text-gray-100',
          iconColor: 'text-gray-600 dark:text-gray-400',
          titleColor: 'text-gray-900 dark:text-gray-100',
        };
    }
  };

  const config = getCalloutConfig();
  const Icon = config.icon;

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border-l-4 rounded-r-lg p-4 my-4 ${className}`}
    >
      <div className="flex gap-3">
        <div className={`flex-shrink-0 ${config.iconColor} mt-0.5`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={`font-semibold ${config.titleColor} mb-2`}>
              {title}
            </h4>
          )}
          <div className={`${config.textColor} text-sm`}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Usage examples component for demo/testing
export function CalloutExamples() {
  return (
    <div className="space-y-4 p-6">
      <CalloutBlock type="info" title="Information">
        This is an informational callout. Use it to provide helpful context or additional details.
      </CalloutBlock>

      <CalloutBlock type="warning" title="Warning">
        This is a warning callout. Use it to highlight important caveats or potential issues.
      </CalloutBlock>

      <CalloutBlock type="error" title="Error">
        This is an error callout. Use it to indicate critical problems or failures.
      </CalloutBlock>

      <CalloutBlock type="success" title="Success">
        This is a success callout. Use it to confirm positive outcomes or completions.
      </CalloutBlock>

      <CalloutBlock type="tip" title="Pro Tip">
        This is a tip callout. Use it to share helpful hints or best practices.
      </CalloutBlock>

      <CalloutBlock type="note">
        This is a simple note callout without a title. Great for quick annotations.
      </CalloutBlock>
    </div>
  );
}
