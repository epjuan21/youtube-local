// src/renderer/src/components/ResumeDialog.jsx
// Diálogo para preguntar si reanudar reproducción desde donde se dejó

import React from 'react';
import { Play, RotateCcw, X } from 'lucide-react';

/**
 * Formatea segundos a formato legible
 */
function formatTime(seconds) {
    if (!seconds || seconds <= 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Diálogo para reanudar reproducción
 */
function ResumeDialog({
    isOpen,
    lastPosition,
    duration,
    onResume,
    onStartOver,
    onClose
}) {
    if (!isOpen) return null;

    const progress = duration > 0 ? (lastPosition / duration) * 100 : 0;
    const remaining = duration - lastPosition;

    return (
        <>
            {/* Overlay */}
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease'
                }}
                onClick={onClose}
            >
                {/* Dialog */}
                <div
                    style={{
                        backgroundColor: '#212121',
                        borderRadius: '16px',
                        padding: '24px',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                        animation: 'scaleIn 0.2s ease'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '20px'
                    }}>
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            margin: 0
                        }}>
                            ¿Continuar viendo?
                        </h3>
                        <button
                            onClick={onClose}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#aaa',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#333';
                                e.target.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = '#aaa';
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Progress info */}
                    <div style={{
                        backgroundColor: '#181818',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '20px'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '12px',
                            fontSize: '14px'
                        }}>
                            <span style={{ color: '#aaa' }}>
                                Dejaste en <span style={{ color: 'white', fontWeight: '500' }}>{formatTime(lastPosition)}</span>
                            </span>
                            <span style={{ color: '#aaa' }}>
                                de {formatTime(duration)}
                            </span>
                        </div>

                        {/* Barra de progreso */}
                        <div style={{
                            height: '6px',
                            backgroundColor: '#333',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            marginBottom: '8px'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${progress}%`,
                                backgroundColor: '#ff0000',
                                borderRadius: '3px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: '12px',
                            color: '#666'
                        }}>
                            <span>{Math.round(progress)}% visto</span>
                            <span>{formatTime(remaining)} restantes</span>
                        </div>
                    </div>

                    {/* Botones */}
                    <div style={{
                        display: 'flex',
                        gap: '12px'
                    }}>
                        <button
                            onClick={onStartOver}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '12px 16px',
                                backgroundColor: '#333',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#444';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#333';
                            }}
                        >
                            <RotateCcw size={18} />
                            Desde el inicio
                        </button>

                        <button
                            onClick={onResume}
                            style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                padding: '12px 16px',
                                backgroundColor: '#ff0000',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#cc0000';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#ff0000';
                            }}
                        >
                            <Play size={18} fill="white" />
                            Continuar
                        </button>
                    </div>
                </div>
            </div>

            {/* Estilos de animación */}
            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.95);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
        </>
    );
}

export default ResumeDialog;