import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Play, Clock, Eye, Image, Tag, Hash, ListMusic, CheckSquare, Square, Star } from 'lucide-react';
import CategoryBadge from './CategoryBadge';
import CategorySelector from './CategorySelector';
import TagBadge from './TagBadge';
import TagSelector from './TagSelector';
import PlaylistSelector from './PlaylistSelector';
import FavoriteButton from './FavoriteButton';
import LazyThumbnail from './LazyThumbnail';

function VideoCard({
    video,
    onUpdate,
    onFavoriteToggle,
    // Nuevos props para modo selección
    selectionMode = false,
    isSelected = false,
    onSelectionChange = null,
    // Optional onClick handler (para video prefetch tracking)
    onClick = null
}) {
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const [thumbnailError, setThumbnailError] = useState(false);

    // Estados para categorías
    const [categories, setCategories] = useState([]);
    const [showCategorySelector, setShowCategorySelector] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // Estados para tags
    const [tags, setTags] = useState([]);
    const [showTagSelector, setShowTagSelector] = useState(false);
    const [loadingTags, setLoadingTags] = useState(false);

    // Estados para playlists
    const [playlists, setPlaylists] = useState([]);
    const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);

    // Estado para favorito
    const [isFavorite, setIsFavorite] = useState(video.is_favorite || false);

    // Estados para carga diferida
    const [hasLoadedMetadata, setHasLoadedMetadata] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // Carga inicial - solo thumbnail y favorito
    useEffect(() => {
        loadThumbnail();
        setIsFavorite(video.is_favorite || false);
        // NO cargar metadata inmediatamente
    }, [video.id, video.thumbnail, video.is_favorite]);

    // Carga diferida con delay de 2 segundos
    useEffect(() => {
        if (hasLoadedMetadata) return;

        const delayTimer = setTimeout(() => {
            loadAllMetadata();
        }, 2000); // Carga después de 2s

        return () => clearTimeout(delayTimer);
    }, [video.id, hasLoadedMetadata]);

    // Carga en hover (antes del delay si el usuario hace hover)
    useEffect(() => {
        if (isHovered && !hasLoadedMetadata) {
            loadAllMetadata();
        }
    }, [isHovered, hasLoadedMetadata]);

    // Función combinada de carga de metadata
    const loadAllMetadata = async () => {
        if (hasLoadedMetadata) return;
        setHasLoadedMetadata(true);

        await Promise.all([
            loadCategories(),
            loadTags(),
            loadVideoPlaylists()
        ]);
    };

    const loadThumbnail = async () => {
        if (video.thumbnail) {
            const thumbnailPath = video.thumbnail.replace(/\\/g, '/');
            setThumbnailUrl(`file://${thumbnailPath}`);
        }
    };

    const loadCategories = async () => {
        try {
            setLoadingCategories(true);
            const data = await window.electronAPI.getVideoCategories(video.id);
            setCategories(data || []);
        } catch (error) {
            console.error('Error al cargar categorías del video:', error);
            setCategories([]);
        } finally {
            setLoadingCategories(false);
        }
    };

    const loadTags = async () => {
        try {
            setLoadingTags(true);
            const result = await window.electronAPI.tag.getVideoTags(video.id);
            if (result.success) {
                setTags(result.tags || []);
            }
        } catch (error) {
            console.error('Error al cargar tags del video:', error);
            setTags([]);
        } finally {
            setLoadingTags(false);
        }
    };

    const loadVideoPlaylists = async () => {
        try {
            const result = await window.electronAPI.playlist.getVideoPlaylists(video.id);
            if (result.success) {
                setPlaylists(result.playlists || []);
            }
        } catch (error) {
            console.error('Error al cargar playlists del video:', error);
            setPlaylists([]);
        }
    };

    const handleOpenCategorySelector = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectionMode) {
            setShowCategorySelector(true);
        }
    };

    const handleOpenTagSelector = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectionMode) {
            setShowTagSelector(true);
        }
    };

    const handleOpenPlaylistSelector = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectionMode) {
            setShowPlaylistSelector(true);
        }
    };

    const handleCategoriesSaved = async () => {
        await loadCategories();
        if (onUpdate) {
            onUpdate();
        }
    };

    const handleTagsSaved = async () => {
        await loadTags();
        if (onUpdate) {
            onUpdate();
        }
    };

    const handlePlaylistsSaved = async () => {
        await loadVideoPlaylists();
        if (onUpdate) {
            onUpdate();
        }
    };

    const handleFavoriteToggle = (newIsFavorite) => {
        setIsFavorite(newIsFavorite);
        if (onFavoriteToggle) {
            onFavoriteToggle(newIsFavorite);
        }
        if (onUpdate) {
            onUpdate();
        }
    };

    // Handler para selección
    const handleSelectionClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onSelectionChange) {
            onSelectionChange(video.id, !isSelected);
        }
    };

    // Handler para click en la card (en modo selección)
    const handleCardClick = (e) => {
        if (selectionMode) {
            e.preventDefault();
            handleSelectionClick(e);
        } else if (onClick) {
            e.preventDefault();
            onClick(video);
        }
    };

    // Memoizar formateo de duración para evitar recálculos
    const formattedDuration = useMemo(() => {
        if (!video.duration) return '0:00';
        const mins = Math.floor(video.duration / 60);
        const secs = video.duration % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, [video.duration]);

    // Memoizar formateo de watch_time
    const formattedWatchTime = useMemo(() => {
        if (!video.watch_time) return '0:00';
        const mins = Math.floor(video.watch_time / 60);
        const secs = video.watch_time % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, [video.watch_time]);

    // Memoizar formateo de tamaño de archivo
    const formattedFileSize = useMemo(() => {
        if (!video.file_size) return '0 MB';
        const mb = video.file_size / (1024 * 1024);
        if (mb >= 1024) {
            return `${(mb / 1024).toFixed(1)} GB`;
        }
        return `${mb.toFixed(1)} MB`;
    }, [video.file_size]);

    const handleThumbnailError = () => {
        setThumbnailError(true);
    };

    // Contenido de la card (reutilizable)
    const cardContent = (
        <div style={{
            backgroundColor: isSelected ? '#2d4a3e' : '#212121',
            borderRadius: '12px',
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s, background-color 0.2s',
            border: isSelected ? '2px solid #10b981' : '2px solid transparent',
            position: 'relative'
        }}
            onMouseEnter={(e) => {
                // Activar carga de metadata en hover
                setIsHovered(true);
                if (!selectionMode) {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
                }
            }}
            onMouseLeave={(e) => {
                setIsHovered(false);
                if (!selectionMode) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                }
            }}>

            {/* Checkbox de selección */}
            {selectionMode && (
                <div
                    onClick={handleSelectionClick}
                    style={{
                        position: 'absolute',
                        top: '8px',
                        left: '8px',
                        zIndex: 10,
                        backgroundColor: isSelected ? '#10b981' : 'rgba(0,0,0,0.7)',
                        borderRadius: '6px',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                >
                    {isSelected ? (
                        <CheckSquare size={20} color="#fff" />
                    ) : (
                        <Square size={20} color="#fff" />
                    )}
                </div>
            )}

            {/* Thumbnail con Lazy Loading */}
            <div style={{
                width: '100%',
                paddingTop: '56.25%',
                position: 'relative'
            }}>
                {thumbnailUrl && !thumbnailError ? (
                    <LazyThumbnail
                        src={thumbnailUrl}
                        alt={video.title}
                        isFavorite={video.is_favorite === 1}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            opacity: selectionMode ? 0.8 : 1
                        }}
                        placeholderColor="#000"
                        onError={handleThumbnailError}
                    />
                ) : (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            {thumbnailError ? (
                                <Image size={48} color="#666" opacity={0.7} />
                            ) : (
                                <Play size={48} color="#fff" opacity={0.7} />
                            )}
                        </div>
                    </div>
                )}

                {/* Duración */}
                {video.duration && (
                    <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                    }}>
                        {formattedDuration}
                    </div>
                )}

                {/* Badge de no disponible */}
                {!video.is_available && (
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: selectionMode ? '50px' : '8px',
                        backgroundColor: 'rgba(255,0,0,0.8)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '500'
                    }}>
                        No disponible
                    </div>
                )}

                {/* Badge de Favorito */}
                {isFavorite && !selectionMode && (
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        left: !video.is_available ? '130px' : '8px',
                        backgroundColor: 'rgba(255, 193, 7, 0.9)',
                        color: '#000',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <Star size={12} fill="#000" /> Favorito
                    </div>
                )}

                {/* Rating badge */}
                {video.rating && !selectionMode && (
                    <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '8px',
                        backgroundColor: 'rgba(255, 193, 7, 0.9)',
                        color: '#000',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                    }}>
                        <Star size={11} fill="#000" />
                        {video.rating}/10
                    </div>
                )}

                {/* Botones flotantes - Solo si no está en modo selección */}
                {!selectionMode && (
                    <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        display: 'flex',
                        gap: '6px'
                    }}>
                        {/* Botón de Playlist */}
                        <button
                            onClick={handleOpenPlaylistSelector}
                            style={{
                                backgroundColor: playlists.length > 0 ? 'rgba(16,185,129,0.9)' : 'rgba(0,0,0,0.7)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                color: '#fff'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(16,185,129,0.9)';
                                e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = playlists.length > 0 ? 'rgba(16,185,129,0.9)' : 'rgba(0,0,0,0.7)';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title={playlists.length > 0 ? `En ${playlists.length} playlist(s)` : 'Agregar a playlist'}
                        >
                            <ListMusic size={16} />
                        </button>

                        {/* Botón de Tags */}
                        <button
                            onClick={handleOpenTagSelector}
                            style={{
                                backgroundColor: tags.length > 0 ? 'rgba(139,92,246,0.9)' : 'rgba(0,0,0,0.7)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                color: '#fff'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(139,92,246,0.9)';
                                e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = tags.length > 0 ? 'rgba(139,92,246,0.9)' : 'rgba(0,0,0,0.7)';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title={tags.length > 0 ? `${tags.length} tag(s)` : 'Agregar tags'}
                        >
                            <Hash size={16} />
                        </button>

                        {/* Botón de Categorías */}
                        <button
                            onClick={handleOpenCategorySelector}
                            style={{
                                backgroundColor: categories.length > 0 ? 'rgba(59,130,246,0.9)' : 'rgba(0,0,0,0.7)',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                color: '#fff'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.9)';
                                e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = categories.length > 0 ? 'rgba(59,130,246,0.9)' : 'rgba(0,0,0,0.7)';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title={categories.length > 0 ? `${categories.length} categoría(s)` : 'Agregar categorías'}
                        >
                            <Tag size={16} />
                        </button>

                        {/* Botón de Favorito */}
                        <div onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                        }}>
                            <FavoriteButton
                                videoId={video.id}
                                isFavorite={isFavorite}
                                size={16}
                                onToggle={handleFavoriteToggle}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Info */}
            <div style={{ padding: '12px' }}>
                <h3 style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    lineHeight: '1.4',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                }}>
                    {video.title}
                </h3>

                {/* Badges de categorías */}
                {categories.length > 0 && !selectionMode && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        marginBottom: '6px'
                    }}>
                        {categories.slice(0, 3).map(category => (
                            <CategoryBadge
                                key={category.id}
                                category={category}
                                size="xs"
                            />
                        ))}
                        {categories.length > 3 && (
                            <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                backgroundColor: 'rgba(59,130,246,0.2)',
                                color: '#3b82f6',
                                borderRadius: '999px',
                                fontWeight: '600'
                            }}>
                                +{categories.length - 3}
                            </span>
                        )}
                    </div>
                )}

                {/* Badges de tags */}
                {tags.length > 0 && !selectionMode && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        marginBottom: '8px'
                    }}>
                        {tags.slice(0, 3).map(tag => (
                            <TagBadge
                                key={tag.id}
                                name={tag.name}
                                color={tag.color}
                                size="xs"
                            />
                        ))}
                        {tags.length > 3 && (
                            <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                backgroundColor: 'rgba(139,92,246,0.2)',
                                color: '#8b5cf6',
                                borderRadius: '999px',
                                fontWeight: '600'
                            }}>
                                +{tags.length - 3}
                            </span>
                        )}
                    </div>
                )}

                <div style={{
                    display: 'flex',
                    gap: '12px',
                    fontSize: '12px',
                    color: '#aaa',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={14} />
                        <span>{video.views || 0}</span>
                    </div>
                    {video.watch_time > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={14} />
                            <span>{formattedWatchTime}</span>
                        </div>
                    )}
                    {playlists.length > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#10b981'
                        }}>
                            <ListMusic size={14} />
                            <span>{playlists.length}</span>
                        </div>
                    )}
                </div>

                {video.file_size && (
                    <div style={{
                        marginTop: '8px',
                        fontSize: '11px',
                        color: '#666'
                    }}>
                        {formattedFileSize}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <>
            {selectionMode || onClick ? (
                <div onClick={handleCardClick} style={{ cursor: 'pointer' }}>
                    {cardContent}
                </div>
            ) : (
                <Link
                    to={`/video/${video.id}`}
                    style={{
                        textDecoration: 'none',
                        color: 'inherit',
                        cursor: 'pointer'
                    }}
                >
                    {cardContent}
                </Link>
            )}

            {/* Modal de selector de categorías */}
            {showCategorySelector && (
                <CategorySelector
                    videoId={video.id}
                    onClose={() => setShowCategorySelector(false)}
                    onSave={handleCategoriesSaved}
                />
            )}

            {/* Modal de selector de tags */}
            {showTagSelector && (
                <TagSelector
                    videoId={video.id}
                    videoTitle={video.title}
                    onClose={() => setShowTagSelector(false)}
                    onSave={handleTagsSaved}
                />
            )}

            {/* Modal de selector de playlists */}
            {showPlaylistSelector && (
                <PlaylistSelector
                    videoId={video.id}
                    videoTitle={video.title}
                    onClose={() => setShowPlaylistSelector(false)}
                    onSave={handlePlaylistsSaved}
                />
            )}
        </>
    );
}

// Memoizar el componente para evitar re-renders innecesarios
export default React.memo(VideoCard, (prevProps, nextProps) => {
    // Solo re-renderizar si datos críticos cambian
    return (
        prevProps.video.id === nextProps.video.id &&
        prevProps.video.is_favorite === nextProps.video.is_favorite &&
        prevProps.video.is_available === nextProps.video.is_available &&
        prevProps.video.duration === nextProps.video.duration &&
        prevProps.video.watch_time === nextProps.video.watch_time &&
        prevProps.video.file_size === nextProps.video.file_size &&
        prevProps.video.views === nextProps.video.views &&
        prevProps.video.rating === nextProps.video.rating &&
        prevProps.selectionMode === nextProps.selectionMode &&
        prevProps.isSelected === nextProps.isSelected
    );
});