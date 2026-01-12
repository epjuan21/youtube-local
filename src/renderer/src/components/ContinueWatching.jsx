// src/renderer/src/components/ContinueWatching.jsx
// Sección "Continuar Viendo" para mostrar videos con progreso parcial

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Play,
    Clock,
    CheckCircle,
    X,
    ChevronRight,
    RotateCcw,
    Trash2
} from 'lucide-react';

/**
 * Formatea segundos a formato legible (1h 23m o 45:30)
 */
function formatDuration(seconds) {
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
 * Formatea tiempo restante de forma amigable
 */
function formatTimeRemaining(lastPosition, duration) {
    const remaining = Math.max(0, duration - lastPosition);

    if (remaining <= 0) return 'Completado';

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m restantes`;
    }
    if (minutes > 0) {
        return `${minutes} min restantes`;
    }
    return 'Menos de 1 min';
}

/**
 * Componente de tarjeta individual de video en progreso
 */
function ContinueWatchingCard({ video, onResume, onMarkAsWatched, onClearProgress }) {
    const [isHovered, setIsHovered] = useState(false);
    const [showActions, setShowActions] = useState(false);

    const progress = video.progress_percentage || 0;
    const thumbnailUrl = video.thumbnail
        ? `file://${video.thumbnail}`
        : null;

    return (
        <div
            style={{
                position: 'relative',
                backgroundColor: '#212121',
                borderRadius: '12px',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isHovered ? '0 8px 25px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
                minWidth: '280px',
                maxWidth: '320px',
                flex: '0 0 auto'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setShowActions(false);
            }}
            onClick={() => onResume(video)}
        >
            {/* Thumbnail con overlay de progreso */}
            <div style={{ position: 'relative', aspectRatio: '16/9' }}>
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={video.title}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                    />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#333',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Play size={40} color="#666" />
                    </div>
                )}

                {/* Overlay oscuro en hover */}
                {isHovered && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Play size={30} color="#000" fill="#000" style={{ marginLeft: '4px' }} />
                        </div>
                    </div>
                )}

                {/* Badge de tiempo restante */}
                <div style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500'
                }}>
                    {formatTimeRemaining(video.last_position, video.duration)}
                </div>

                {/* Duración total */}
                <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '11px'
                }}>
                    {formatDuration(video.duration)}
                </div>

                {/* Barra de progreso */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    backgroundColor: 'rgba(255,255,255,0.3)'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        backgroundColor: '#ff0000',
                        transition: 'width 0.3s ease'
                    }} />
                </div>

                {/* Botón de acciones */}
                {isHovered && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowActions(!showActions);
                        }}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}
                    >
                        <X size={16} />
                    </button>
                )}

                {/* Menú de acciones */}
                {showActions && (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            top: '40px',
                            left: '8px',
                            backgroundColor: '#333',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            zIndex: 10
                        }}
                    >
                        <button
                            onClick={() => {
                                onMarkAsWatched(video.id);
                                setShowActions(false);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                width: '100%',
                                fontSize: '13px',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#444'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <CheckCircle size={16} color="#10b981" />
                            Marcar como visto
                        </button>
                        <button
                            onClick={() => {
                                onClearProgress(video.id);
                                setShowActions(false);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                width: '100%',
                                fontSize: '13px',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#444'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <RotateCcw size={16} color="#f59e0b" />
                            Reiniciar progreso
                        </button>
                        <button
                            onClick={() => {
                                onClearProgress(video.id);
                                setShowActions(false);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                width: '100%',
                                fontSize: '13px',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#444'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                            <Trash2 size={16} color="#ef4444" />
                            Quitar de la lista
                        </button>
                    </div>
                )}
            </div>

            {/* Info del video */}
            <div style={{ padding: '12px' }}>
                <h3 style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {video.title || video.filename}
                </h3>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#aaa'
                }}>
                    <Clock size={12} />
                    <span>
                        {formatDuration(video.last_position)} de {formatDuration(video.duration)}
                    </span>
                    <span style={{
                        marginLeft: 'auto',
                        color: '#ff0000',
                        fontWeight: '500'
                    }}>
                        {Math.round(progress)}%
                    </span>
                </div>
            </div>
        </div>
    );
}

/**
 * Componente principal de "Continuar Viendo"
 */
function ContinueWatching({ limit = 10, onVideoSelect }) {
    const navigate = useNavigate();
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cargar videos en progreso
    const loadContinueWatching = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

             const result = await window.electronAPI.history.getContinueWatching(limit);

            if (result.success) {
                setVideos(result.videos || []);
            } else {
                setError(result.error);
            }
        } catch (err) {
            console.error('Error cargando continuar viendo:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        loadContinueWatching();
    }, [loadContinueWatching]);

    // Manejar clic en video (reanudar)
    const handleResume = (video) => {
        if (onVideoSelect) {
            onVideoSelect(video);
        } else {
            // Navegar al video con parámetro de posición
            navigate(`/video/${video.id}?resume=${video.last_position}`);
        }
    };

    // Marcar como visto
    const handleMarkAsWatched = async (videoId) => {
        try {
            const result = await window.electronAPI.history.clearProgress(videoId);
            if (result.success) {
                // Recargar lista
                loadContinueWatching();
            }
        } catch (err) {
            console.error('Error marcando como visto:', err);
        }
    };

    // Limpiar progreso
const handleClearProgress = async (videoId) => {
        try {
            const result = await window.electronAPI.history.clearProgress(videoId);
            if (result.success) {
                // Recargar lista
                loadContinueWatching();
            }
        } catch (err) {
            console.error('Error limpiando progreso:', err);
        }
    };

    // No mostrar sección si no hay videos
    if (!loading && videos.length === 0) {
        return null;
    }

    return (
        <div style={{ marginBottom: '32px' }}>
            {/* Header de la sección */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '4px',
                        height: '24px',
                        backgroundColor: '#ff0000',
                        borderRadius: '2px'
                    }} />
                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        margin: 0
                    }}>
                        Continuar viendo
                    </h2>
                    {!loading && (
                        <span style={{
                            fontSize: '14px',
                            color: '#aaa',
                            backgroundColor: '#333',
                            padding: '2px 8px',
                            borderRadius: '12px'
                        }}>
                            {videos.length}
                        </span>
                    )}
                </div>

                {videos.length > 0 && (
                    <button
                        onClick={() => navigate('/history')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '8px 12px',
                            backgroundColor: 'transparent',
                            border: '1px solid #444',
                            borderRadius: '20px',
                            color: '#aaa',
                            cursor: 'pointer',
                            fontSize: '13px',
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
                        Ver historial
                        <ChevronRight size={16} />
                    </button>
                )}
            </div>

            {/* Loading state */}
            {loading && (
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    overflowX: 'auto',
                    paddingBottom: '8px'
                }}>
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            style={{
                                minWidth: '280px',
                                backgroundColor: '#212121',
                                borderRadius: '12px',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{
                                aspectRatio: '16/9',
                                backgroundColor: '#333',
                                animation: 'pulse 1.5s ease-in-out infinite'
                            }} />
                            <div style={{ padding: '12px' }}>
                                <div style={{
                                    height: '16px',
                                    backgroundColor: '#333',
                                    borderRadius: '4px',
                                    marginBottom: '8px',
                                    animation: 'pulse 1.5s ease-in-out infinite'
                                }} />
                                <div style={{
                                    height: '12px',
                                    backgroundColor: '#333',
                                    borderRadius: '4px',
                                    width: '60%',
                                    animation: 'pulse 1.5s ease-in-out infinite'
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error state */}
            {error && (
                <div style={{
                    padding: '20px',
                    backgroundColor: '#331111',
                    borderRadius: '8px',
                    color: '#ff6b6b',
                    textAlign: 'center'
                }}>
                    <p>Error al cargar videos: {error}</p>
                    <button
                        onClick={loadContinueWatching}
                        style={{
                            marginTop: '12px',
                            padding: '8px 16px',
                            backgroundColor: '#ff0000',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* Lista de videos */}
            {!loading && !error && videos.length > 0 && (
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    overflowX: 'auto',
                    paddingBottom: '8px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#444 transparent'
                }}>
                    {videos.map((video) => (
                        <ContinueWatchingCard
                            key={video.id}
                            video={video}
                            onResume={handleResume}
                            onMarkAsWatched={handleMarkAsWatched}
                            onClearProgress={handleClearProgress}
                        />
                    ))}
                </div>
            )}

            {/* Estilos para animación de skeleton */}
            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Scrollbar personalizada */
        div::-webkit-scrollbar {
          height: 6px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
        </div>
    );
}

export default ContinueWatching;