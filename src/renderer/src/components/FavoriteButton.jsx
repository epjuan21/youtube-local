import { Star } from 'lucide-react';
import { useState } from 'react';
import { showToast } from './ToastNotifications';

/**
 * Botón de favorito con animación
 */
function FavoriteButton({ videoId, isFavorite: initialFavorite, size = 20, showLabel = false, onToggle }) {
    const [isFavorite, setIsFavorite] = useState(initialFavorite || false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleToggle = async (e) => {
        // Prevenir propagación del evento (evitar que se abra el video)
        e.preventDefault();
        e.stopPropagation();

        if (isLoading) return;

        try {
            setIsLoading(true);
            setIsAnimating(true);

            // Llamar a la API de Electron
            const result = await window.electronAPI.toggleFavorite(videoId);

            if (result.success) {
                setIsFavorite(result.isFavorite);

                // Mostrar toast
                showToast(
                    result.isFavorite
                        ? 'Agregado a favoritos'
                        : 'Eliminado de favoritos',
                    result.isFavorite ? 'success' : 'info',
                    2000
                );

                // Callback si existe
                if (onToggle) {
                    onToggle(result.isFavorite);
                }
            } else {
                showToast('Error al actualizar favorito', 'error', 3000);
            }

        } catch (error) {
            console.error('Error toggling favorite:', error);
            showToast('Error al actualizar favorito', 'error', 3000);
        } finally {
            setIsLoading(false);
            setTimeout(() => setIsAnimating(false), 300);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isLoading}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: showLabel ? '8px 12px' : '8px',
                backgroundColor: isFavorite ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                color: isFavorite ? '#ffc107' : '#fff',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: isLoading ? 0.6 : 1,
                transform: isAnimating ? 'scale(1.2)' : 'scale(1)'
            }}
            onMouseEnter={(e) => {
                if (!isLoading) {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.backgroundColor = isFavorite
                        ? 'rgba(255, 193, 7, 0.25)'
                        : 'rgba(255, 255, 255, 0.2)';
                }
            }}
            onMouseLeave={(e) => {
                if (!isAnimating) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.backgroundColor = isFavorite
                        ? 'rgba(255, 193, 7, 0.15)'
                        : 'rgba(255, 255, 255, 0.1)';
                }
            }}
            title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
        >
            <Star
                size={size}
                fill={isFavorite ? 'currentColor' : 'none'}
                style={{
                    transition: 'all 0.2s ease'
                }}
            />
            {showLabel && (
                <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    {isFavorite ? 'Favorito' : 'Agregar'}
                </span>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% {
                        transform: scale(1);
                    }
                    50% {
                        transform: scale(1.2);
                    }
                }
            `}</style>
        </button>
    );
}

export default FavoriteButton;