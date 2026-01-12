// src/renderer/src/components/WatchProgressBar.jsx
// Barra de progreso visual para mostrar en thumbnails de videos

import React from 'react';
import { Clock, CheckCircle } from 'lucide-react';

/**
 * Barra de progreso visual que se muestra en la parte inferior del thumbnail
 * Indica cuánto del video ha sido visto
 */
export function WatchProgressBar({
    progress = 0,
    showPercentage = false,
    height = 3,
    className = ''
}) {
    // Asegurar que el progreso esté entre 0 y 100
    const normalizedProgress = Math.min(100, Math.max(0, progress));

    // Determinar color basado en progreso
    const getProgressColor = () => {
        if (normalizedProgress >= 90) return '#059669'; // Verde oscuro - completado
        if (normalizedProgress >= 50) return '#f59e0b'; // Naranja - en progreso
        return '#ef4444'; // Rojo - recién empezado
    };

    return (
        <div
            className={`watch-progress-bar ${className}`}
            style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: `${height}px`,
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                zIndex: 10
            }}
        >
            <div
                style={{
                    height: '100%',
                    width: `${normalizedProgress}%`,
                    backgroundColor: getProgressColor(),
                    transition: 'width 0.3s ease, background-color 0.3s ease'
                }}
            />
            {showPercentage && normalizedProgress > 0 && (
                <span
                    style={{
                        position: 'absolute',
                        right: '4px',
                        top: '-20px',
                        fontSize: '10px',
                        color: 'white',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        padding: '2px 4px',
                        borderRadius: '2px'
                    }}
                >
                    {Math.round(normalizedProgress)}%
                </span>
            )}
        </div>
    );
}

/**
 * Badge de estado de visualización
 * Muestra si el video está en progreso o completado
 */
export function WatchStatusBadge({
    progress = 0,
    lastPosition = 0,
    duration = 0,
    size = 'small'
}) {
    const isCompleted = progress >= 90;
    const isInProgress = progress > 5 && progress < 90;

    if (!isCompleted && !isInProgress) return null;

    const sizeClasses = {
        small: 'text-xs px-1.5 py-0.5',
        medium: 'text-sm px-2 py-1',
        large: 'text-base px-3 py-1.5'
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (isCompleted) {
        return (
            <div
                className={`watch-status-badge completed ${sizeClasses[size]}`}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'rgba(5, 150, 105, 0.9)',
                    color: 'white',
                    borderRadius: '4px',
                    fontWeight: 500
                }}
            >
                <CheckCircle size={size === 'small' ? 12 : 16} />
                <span>Visto</span>
            </div>
        );
    }

    return (
        <div
            className={`watch-status-badge in-progress ${sizeClasses[size]}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'rgba(245, 158, 11, 0.9)',
                color: 'white',
                borderRadius: '4px',
                fontWeight: 500
            }}
        >
            <Clock size={size === 'small' ? 12 : 16} />
            <span>{formatTime(lastPosition)} / {formatTime(duration)}</span>
        </div>
    );
}

/**
 * Indicador circular de progreso
 * Alternativa a la barra para usar en listas o grids compactos
 */
export function CircularProgress({
    progress = 0,
    size = 24,
    strokeWidth = 3,
    showCheckOnComplete = true
}) {
    const normalizedProgress = Math.min(100, Math.max(0, progress));
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (normalizedProgress / 100) * circumference;

    const getColor = () => {
        if (normalizedProgress >= 90) return '#059669';
        if (normalizedProgress >= 50) return '#f59e0b';
        return '#ef4444';
    };

    if (normalizedProgress >= 90 && showCheckOnComplete) {
        return (
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    backgroundColor: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <CheckCircle size={size * 0.6} color="white" />
            </div>
        );
    }

    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            {/* Fondo */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="rgba(255, 255, 255, 0.2)"
                strokeWidth={strokeWidth}
            />
            {/* Progreso */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={getColor()}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
        </svg>
    );
}

/**
 * Tiempo restante formateado
 */
export function RemainingTime({
    lastPosition = 0,
    duration = 0,
    className = ''
}) {
    const remaining = Math.max(0, duration - lastPosition);

    const formatTime = (seconds) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${mins}m restantes`;
        }
        if (mins > 0) {
            return `${mins}m ${secs}s restantes`;
        }
        return `${secs}s restantes`;
    };

    if (remaining <= 0) return null;

    return (
        <span
            className={`remaining-time ${className}`}
            style={{
                color: '#9ca3af',
                fontSize: '12px'
            }}
        >
            {formatTime(remaining)}
        </span>
    );
}

/**
 * Componente compuesto para mostrar estado completo de visualización
 */
export function WatchProgress({
    progress = 0,
    lastPosition = 0,
    duration = 0,
    compact = false
}) {
    if (progress <= 0) return null;

    if (compact) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CircularProgress progress={progress} size={20} />
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                    {Math.round(progress)}%
                </span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <WatchStatusBadge
                    progress={progress}
                    lastPosition={lastPosition}
                    duration={duration}
                />
                <RemainingTime lastPosition={lastPosition} duration={duration} />
            </div>
            <WatchProgressBar progress={progress} height={4} />
        </div>
    );
}

export default WatchProgressBar;