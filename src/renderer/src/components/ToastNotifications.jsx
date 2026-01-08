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

    // ✅ MEJORADO: Fondos sólidos con mejor contraste
    const getBackgroundColor = () => {
        switch (toast.type) {
            case 'success':
                return '#1e3a1e'; // Verde oscuro sólido
            case 'error':
                return '#3d1f1f'; // Rojo oscuro sólido
            case 'warning':
                return '#3d2e1f'; // Naranja oscuro sólido
            case 'info':
            default:
                return '#1e2a3d'; // Azul oscuro sólido
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

    // ✅ MEJORADO: Color de texto más claro para mejor legibilidad
    const getTextColor = () => {
        switch (toast.type) {
            case 'success':
                return '#a5d6a7'; // Verde claro
            case 'error':
                return '#ef9a9a'; // Rojo claro
            case 'warning':
                return '#ffcc80'; // Naranja claro
            case 'info':
            default:
                return '#90caf9'; // Azul claro
        }
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 18px',
                backgroundColor: getBackgroundColor(), // ✅ Fondo sólido oscuro
                border: `2px solid ${getBorderColor()}`, // ✅ Borde más grueso
                borderRadius: '10px',
                marginBottom: '12px',
                minWidth: '320px',
                maxWidth: '500px',
                boxShadow: '0 6px 20px rgba(0,0,0,0.5)', // ✅ Sombra más pronunciada
                animation: isExiting ? 'slideOut 0.3s ease-out' : 'slideIn 0.3s ease-out',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)' // ✅ Efecto blur para mayor solidez
            }}
            onClick={handleClose}
        >
            {getIcon()}

            <div style={{
                flex: 1,
                fontSize: '14px',
                color: getTextColor(), // ✅ Color de texto mejorado
                fontWeight: '500', // ✅ Texto más bold
                lineHeight: '1.4'
            }}>
                {toast.message}
            </div>

            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleClose();
                }}
                style={{
                    background: 'rgba(255, 255, 255, 0.1)', // ✅ Fondo semi-transparente para hover
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
            >
                <X size={16} />
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