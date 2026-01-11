// ============================================
// PLAYLIST CARD COMPONENT
// ============================================
// Ubicación: src/renderer/src/components/PlaylistCard.jsx
// Fecha: 09 de Enero de 2025
// ============================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Music, Clock, MoreVertical, Edit2, Trash2, Copy, Film } from 'lucide-react';

/**
 * PlaylistCard - Card visual para mostrar una playlist
 */
const PlaylistCard = ({ playlist, onUpdate, onDelete, onDuplicate }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [thumbnailError, setThumbnailError] = useState(false);

    // Formatear duración total
    const formatDuration = (seconds) => {
        if (!seconds) return '0 min';
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins} min`;
    };

    // Obtener thumbnail URL
    const getThumbnailUrl = () => {
        if (playlist.thumbnail || playlist.first_thumbnail) {
            const path = (playlist.thumbnail || playlist.first_thumbnail).replace(/\\/g, '/');
            return `file://${path}`;
        }
        return null;
    };

    const handleMenuClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(!showMenu);
    };

    const handleEdit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(false);
        if (onUpdate) onUpdate(playlist);
    };

    const handleDelete = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(false);
        if (onDelete) onDelete(playlist);
    };

    const handleDuplicate = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(false);
        if (onDuplicate) onDuplicate(playlist);
    };

    const thumbnailUrl = getThumbnailUrl();

    return (
        <Link
            to={`/playlist/${playlist.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
            onClick={() => setShowMenu(false)}
        >
            <div
                style={{
                    backgroundColor: '#212121',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    position: 'relative'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                    setShowMenu(false);
                }}
            >
                {/* Thumbnail / Cover */}
                <div style={{
                    width: '100%',
                    paddingTop: '56.25%',
                    position: 'relative',
                    background: thumbnailUrl && !thumbnailError
                        ? '#000'
                        : `linear-gradient(135deg, ${playlist.color || '#10b981'}90, ${playlist.color || '#10b981'}50)`
                }}>
                    {thumbnailUrl && !thumbnailError ? (
                        <img
                            src={thumbnailUrl}
                            alt={playlist.name}
                            onError={() => setThumbnailError(true)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                        />
                    ) : (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Music size={48} color="#fff" opacity={0.8} />
                        </div>
                    )}

                    {/* Overlay con info */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                        padding: '40px 12px 12px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px'
                        }}>
                            <span style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '13px',
                                color: '#fff',
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                padding: '4px 8px',
                                borderRadius: '4px'
                            }}>
                                <Film size={14} />
                                {playlist.video_count || 0} videos
                            </span>
                            {playlist.total_duration > 0 && (
                                <span style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '13px',
                                    color: '#fff',
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    padding: '4px 8px',
                                    borderRadius: '4px'
                                }}>
                                    <Clock size={14} />
                                    {formatDuration(playlist.total_duration)}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Botón Play central */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s'
                    }}
                        className="play-button"
                    >
                        <Play size={28} color="#fff" fill="#fff" />
                    </div>

                    {/* Badge de color */}
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        width: '8px',
                        height: '32px',
                        backgroundColor: playlist.color || '#10b981',
                        borderRadius: '4px'
                    }} />

                    {/* Menú de opciones */}
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px'
                    }}>
                        <button
                            onClick={handleMenuClick}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'rgba(0,0,0,0.7)',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.9)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.7)'}
                        >
                            <MoreVertical size={18} />
                        </button>

                        {/* Dropdown menu */}
                        {showMenu && (
                            <div style={{
                                position: 'absolute',
                                top: '40px',
                                right: '0',
                                backgroundColor: '#2a2a2a',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                                overflow: 'hidden',
                                minWidth: '150px',
                                zIndex: 100
                            }}>
                                <button
                                    onClick={handleEdit}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#fff',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Edit2 size={16} />
                                    Editar
                                </button>
                                <button
                                    onClick={handleDuplicate}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#fff',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Copy size={16} />
                                    Duplicar
                                </button>
                                <div style={{ height: '1px', backgroundColor: '#444', margin: '4px 0' }} />
                                <button
                                    onClick={handleDelete}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#ef4444',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        textAlign: 'left'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <Trash2 size={16} />
                                    Eliminar
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div style={{ padding: '14px' }}>
                    <h3 style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        marginBottom: '6px',
                        color: '#fff',
                        display: '-webkit-box',
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}>
                        {playlist.name}
                    </h3>

                    {playlist.description && (
                        <p style={{
                            fontSize: '13px',
                            color: '#888',
                            margin: 0,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            lineHeight: '1.4'
                        }}>
                            {playlist.description}
                        </p>
                    )}
                </div>

                {/* CSS para hover del botón play */}
                <style>{`
                    div:hover .play-button {
                        opacity: 1 !important;
                    }
                `}</style>
            </div>
        </Link>
    );
};

export default PlaylistCard;