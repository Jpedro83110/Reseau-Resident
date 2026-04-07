import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const ICONS = {
  success: { Icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 border-green-200' },
  error: { Icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
  info: { Icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' },
  warning: { Icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
};

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans un <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback(({ type = 'info', message, duration = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
    if (duration > 0) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    }
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Desktop : top-right, Mobile : bottom (au-dessus bottom nav) */}
      <div className="fixed top-4 right-4 z-[100] hidden md:flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />)}
        </AnimatePresence>
      </div>
      <div className="fixed bottom-20 left-4 right-4 z-[100] flex md:hidden flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />)}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { Icon, color, bg } = ICONS[toast.type] || ICONS.info;
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${bg}`}
    >
      <Icon size={18} className={color} />
      <p className="flex-1 text-sm text-gray-800">{toast.message}</p>
      <button onClick={onDismiss} className="p-1 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center">
        <X size={14} />
      </button>
    </motion.div>
  );
}

export default ToastProvider;
