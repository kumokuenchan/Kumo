import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(({ message, type, onClose, duration = 3000 }, ref) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
    error: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
    info: <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
  };

  const colors = {
    success: 'bg-white/90 dark:bg-[#161b22]/90 backdrop-blur-sm border-green-200/50 dark:border-green-800/50 shadow-green-500/10',
    error: 'bg-white/90 dark:bg-[#161b22]/90 backdrop-blur-sm border-red-200/50 dark:border-red-800/50 shadow-red-500/10',
    info: 'bg-white/90 dark:bg-[#161b22]/90 backdrop-blur-sm border-blue-200/50 dark:border-blue-800/50 shadow-blue-500/10',
  };

  const textColors = {
    success: 'text-green-800 dark:text-green-300',
    error: 'text-red-800 dark:text-red-300',
    info: 'text-blue-800 dark:text-blue-300',
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`flex items-start gap-3 p-4 rounded-2xl border shadow-2xl shadow-black/20 dark:shadow-black/40 ${colors[type]} min-w-[300px] max-w-md transform transition-all duration-200 hover:scale-105`}
    >
      <div className="flex-shrink-0 mt-0.5">{icons[type]}</div>
      <p className={`flex-1 text-sm font-medium ${textColors[type]}`}>{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition"
      >
        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>
    </motion.div>
  );
});

Toast.displayName = 'Toast';

export default Toast;

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {children}
      </AnimatePresence>
    </div>
  );
}
