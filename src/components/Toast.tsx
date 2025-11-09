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
    success: <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
    info: <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
  };

  const colors = {
    success: 'bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl border-emerald-200/60 dark:border-emerald-800/60 shadow-emerald-500/20',
    error: 'bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl border-red-200/60 dark:border-red-800/60 shadow-red-500/20',
    info: 'bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl border-blue-200/60 dark:border-blue-800/60 shadow-blue-500/20',
  };

  const textColors = {
    success: 'text-emerald-800 dark:text-emerald-300',
    error: 'text-red-800 dark:text-red-300',
    info: 'text-blue-800 dark:text-blue-300',
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -30, scale: 0.9 }}
      transition={{ 
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 0.8
      }}
      whileHover={{ scale: 1.02 }}
      className={`flex items-start gap-3 p-4 rounded-3xl border shadow-2xl ${colors[type]} min-w-[320px] max-w-md transform transition-all duration-200`}
    >
      <motion.div 
        className="flex-shrink-0 mt-0.5"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 500, damping: 30 }}
      >
        {icons[type]}
      </motion.div>
      <p className={`flex-1 text-sm font-medium ${textColors[type]} leading-relaxed`}>{message}</p>
      <motion.button
        onClick={onClose}
        className="flex-shrink-0 p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </motion.button>
    </motion.div>
  );
});

Toast.displayName = 'Toast';

export default Toast;

export function ToastContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-3 max-w-sm">
      <AnimatePresence mode="popLayout">
        {children}
      </AnimatePresence>
    </div>
  );
}
