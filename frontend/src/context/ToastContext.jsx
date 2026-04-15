/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react';
import * as Icons from '../components/Icons';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3500) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

    const iconMap = {
        success: <Icons.CheckCircle />,
        error:   <Icons.XCircle />,
        info:    <Icons.Info />,
        warning: <Icons.AlertTriangle />,
    };

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        <span style={{ color: t.type === 'success' ? 'var(--success-500)' : t.type === 'error' ? 'var(--danger-500)' : t.type === 'warning' ? 'var(--warning-500)' : 'var(--primary-400)', flexShrink: 0 }}>
                            {iconMap[t.type]}
                        </span>
                        <span style={{ flex: 1 }}>{t.message}</span>
                        <button onClick={() => removeToast(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px', flexShrink: 0 }}>
                            <Icons.X />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
