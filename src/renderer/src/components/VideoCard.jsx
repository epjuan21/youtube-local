import { Link } from 'react-router-dom';
import { Play, Clock, Eye, Image, Tag, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';
import CategoryBadge from './CategoryBadge';
import CategorySelector from './CategorySelector';
import TagBadge from './TagBadge';
import TagSelector from './TagSelector';
import FavoriteButton from './FavoriteButton';

function VideoCard({ video, onUpdate, onFavoriteToggle }) {
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const [thumbnailError, setThumbnailError] = useState(false);

    // Estados para categorías
    const [categories, setCategories] = useState([]);
    const [showCategorySelector, setShowCategorySelector] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // 🆕 Estados para tags
    const [tags, setTags] = useState([]);
    const [showTagSelector, setShowTagSelector] = useState(false);
    const [loadingTags, setLoadingTags] = useState(false);

    // Estado para favorito
    const [isFavorite, setIsFavorite] = useState(video.is_favorite || false);

    useEffect(() => {
        loadThumbnail();
        loadCategories();
        loadTags(); // 🆕 Cargar tags
        setIsFavorite(video.is_favorite || false);
    }, [video.id, video.thumbnail, video.is_favorite]);

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

    // 🆕 Cargar tags del video
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

    const handleOpenCategorySelector = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowCategorySelector(true);
    };

    // 🆕 Abrir selector de tags
    const handleOpenTagSelector = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowTagSelector(true);
    };

    const handleCategoriesSaved = async () => {
        await loadCategories();
        if (onUpdate) {
            onUpdate();
        }
    };

    // 🆕 Callback cuando se guardan tags
    const handleTagsSaved = async () => {
        await loadTags();
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

    const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 MB';
        const mb = bytes / (1024 * 1024);
        if (mb >= 1024) {
            return `${(mb / 1024).toFixed(1)} GB`;
        }
        return `${mb.toFixed(1)} MB`;
    };

    const handleThumbnailError = () => {
        setThumbnailError(true);
    };

    return (
        <>
            <Link
                to={`/video/${video.id}`}
                style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    cursor: 'pointer'
                }}
            >
                <div style={{
                    backgroundColor: '#212121',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                    }}>

                    {/* Thumbnail */}
                    <div style={{
                        width: '100%',
                        paddingTop: '56.25%',
                        backgroundColor: '#000',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {thumbnailUrl && !thumbnailError ? (
                            <img
                                src={thumbnailUrl}
                                alt={video.title}
                                onError={handleThumbnailError}
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
                                {thumbnailError ? (
                                    <Image size={48} color="#666" opacity={0.7} />
                                ) : (
                                    <Play size={48} color="#fff" opacity={0.7} />
                                )}
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
                                {formatDuration(video.duration)}
                            </div>
                        )}

                        {/* Badge de no disponible */}
                        {!video.is_available && (
                            <div style={{
                                position: 'absolute',
                                top: '8px',
                                left: '8px',
                                backgroundColor: 'rgba(255,0,0,0.8)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '500'
                            }}>
                                No disponible
                            </div>
                        )}

                        {/* Badge de Favorito (solo si es favorito) */}
                        {isFavorite && (
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
                                ⭐ Favorito
                            </div>
                        )}

                        {/* Botones flotantes - Esquina superior derecha */}
                        <div style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            display: 'flex',
                            gap: '6px'
                        }}>
                            {/* 🆕 Botón de Tags */}
                            <button
                                onClick={handleOpenTagSelector}
                                style={{
                                    backgroundColor: tags.length > 0 ? 'rgba(139, 92, 246, 0.9)' : 'rgba(0,0,0,0.7)',
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
                                    e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 1)';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = tags.length > 0 ? 'rgba(139, 92, 246, 0.9)' : 'rgba(0,0,0,0.7)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                title="Gestionar tags"
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
                                    e.currentTarget.style.backgroundColor = 'rgba(59,130,246,1)';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = categories.length > 0 ? 'rgba(59,130,246,0.9)' : 'rgba(0,0,0,0.7)';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                title="Gestionar categorías"
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
                        {categories.length > 0 && (
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

                        {/* 🆕 Badges de tags */}
                        {tags.length > 0 && (
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
                                        showHash={true}
                                    />
                                ))}
                                {tags.length > 3 && (
                                    <span style={{
                                        fontSize: '10px',
                                        padding: '2px 6px',
                                        backgroundColor: 'rgba(139, 92, 246, 0.2)',
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
                                    <span>{formatDuration(video.watch_time)}</span>
                                </div>
                            )}
                        </div>

                        {video.file_size && (
                            <div style={{
                                marginTop: '8px',
                                fontSize: '11px',
                                color: '#666'
                            }}>
                                {formatFileSize(video.file_size)}
                            </div>
                        )}
                    </div>
                </div>
            </Link>

            {/* Modal de selector de categorías */}
            {showCategorySelector && (
                <CategorySelector
                    videoId={video.id}
                    onClose={() => setShowCategorySelector(false)}
                    onSave={handleCategoriesSaved}
                />
            )}

            {/* 🆕 Modal de selector de tags */}
            {showTagSelector && (
                <TagSelector
                    videoId={video.id}
                    onClose={() => setShowTagSelector(false)}
                    onSave={handleTagsSaved}
                />
            )}
        </>
    );
}

export default VideoCard;