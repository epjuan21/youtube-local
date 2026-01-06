import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react';

/**
 * Sistema de notificaciones Toast
 */

// Context para manejar toasts globalmente
let toastListeners = [];
let toastId = 0;

export function showToast(message, type = 'info', duration = 3000) {
    const toast = {
        id: toastId++,
        message,
        type, // 'success', 'error', 'warning', 'info'
        duration
    };

    toastListeners.forEach(listener => listener(toast));
    return toast.id;
}

/**
 * Componente individual de Toast
 */
function Toast({ toast, onClose }) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (toast.duration > 0) {
            const timer = setTimeout(() => {
                handleClose();
            }, toast.duration);

            return () => clearTimeout(timer);
        }
    }, [toast.duration]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(() => {
            onClose(toast.id);
        }, 300); // Duración de la animación de salida
    };

    const getIcon = () => {
        switch (toast.type) {
            case 'success':
                return <CheckCircle size={20} color="#4caf50" />;
            case 'error':
                return <XCircle size={20} color="#ff4444" />;
            case 'warning':
                return <AlertCircle size={20} color="#ff9800" />;
            case 'info':
            default:
                return <Info size={20} color="#3ea6ff" />;
        }
    };

    const getBackgroundColor = () => {
        switch (toast.type) {
            case 'success':
                return 'rgba(76, 175, 80, 0.15)';
            case 'error':
                return 'rgba(255, 68, 68, 0.15)';
            case 'warning':
                return 'rgba(255, 152, 0, 0.15)';
            case 'info':
            default:
                return 'rgba(62, 166, 255, 0.15)';
        }
    };

    const getBorderColor = () => {
        switch (toast.type) {
            case 'success':
                return '#4caf50';
            case 'error':
                return '#ff4444';
            case 'warning':
                return '#ff9800';
            case 'info':
            default:
                return '#3ea6ff';
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: getBackgroundColor(),
                border: `1px solid ${getBorderColor()}`,
                borderRadius: '8px',
                marginBottom: '12px',
                minWidth: '300px',
                maxWidth: '500px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                animation: isExiting ? 'slideOut 0.3s ease-out' : 'slideIn 0.3s ease-out',
                cursor: 'pointer'
            }}
            onClick={handleClose}
        >
            {getIcon()}

            <div style={{ flex: 1, fontSize: '14px', color: '#fff' }}>
                {toast.message}
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#aaa',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center'
                }}
            >
                <X size={18} />
            </button>
        </div>
    );
}

/**
 * Contenedor de Toasts
 */
export function ToastContainer() {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const listener = (toast) => {
            setToasts(prev => [...prev, toast]);
        };

        toastListeners.push(listener);

        return () => {
            toastListeners = toastListeners.filter(l => l !== listener);
        };
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <>
            <div style={{
                position: 'fixed',
                top: '80px',
                right: '20px',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end'
            }}>
                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} onClose={removeToast} />
                ))}
            </div>

            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(400px);
                        opacity: 0;
                    }
                }
            `}</style>
        </>
    );
}

export default {
    showToast,
    ToastContainer
};