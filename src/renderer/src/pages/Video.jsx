import { useParams, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    ThumbsUp, ThumbsDown, Eye, Calendar, HardDrive,
    Star, Tag, Hash, ListMusic, Clock
} from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import FavoriteButton from '../components/FavoriteButton';
import CategoryBadge from '../components/CategoryBadge';
import CategorySelector from '../components/CategorySelector';
import TagBadge from '../components/TagBadge';
import TagSelector from '../components/TagSelector';
import PlaylistSelector from '../components/PlaylistSelector';

function Video() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);

    // Estados para categorías
    const [categories, setCategories] = useState([]);
    const [showCategorySelector, setShowCategorySelector] = useState(false);

    // Estados para tags
    const [tags, setTags] = useState([]);
    const [showTagSelector, setShowTagSelector] = useState(false);

    // Estados para playlists
    const [playlists, setPlaylists] = useState([]);
    const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);

    // Estados para reproducción en playlist
    const [playlistInfo, setPlaylistInfo] = useState(null);
    const [playlistVideos, setPlaylistVideos] = useState([]);

    useEffect(() => {
        loadVideo();
        loadCategories();
        loadTags();
        loadPlaylists();

        // Verificar si venimos de una playlist
        const playlistId = searchParams.get('playlist');
        if (playlistId) {
            loadPlaylistInfo(parseInt(playlistId));
        }
    }, [id, searchParams]);

    const loadVideo = async () => {
        try {
            setLoading(true);
            const result = await window.electronAPI.getVideoById(parseInt(id));
            setVideo(result);
        } catch (error) {
            console.error('Error cargando video:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const data = await window.electronAPI.getVideoCategories(parseInt(id));
            setCategories(data || []);
        } catch (error) {
            console.error('Error cargando categorías:', error);
            setCategories([]);
        }
    };

    const loadTags = async () => {
        try {
            const result = await window.electronAPI.tag.getVideoTags(parseInt(id));
            if (result.success) {
                setTags(result.tags || []);
            }
        } catch (error) {
            console.error('Error cargando tags:', error);
            setTags([]);
        }
    };

    const loadPlaylists = async () => {
        try {
            const result = await window.electronAPI.playlist.getVideoPlaylists(parseInt(id));
            if (result.success) {
                setPlaylists(result.playlists || []);
            }
        } catch (error) {
            console.error('Error cargando playlists:', error);
            setPlaylists([]);
        }
    };

    const loadPlaylistInfo = async (playlistId) => {
        try {
            const result = await window.electronAPI.playlist.getById(playlistId);
            if (result.success) {
                setPlaylistInfo(result.playlist);

                // Cargar videos de la playlist
                const videosResult = await window.electronAPI.playlist.getVideos(playlistId);
                if (videosResult.success) {
                    setPlaylistVideos(videosResult.videos || []);
                }
            }
        } catch (error) {
            console.error('Error cargando info de playlist:', error);
        }
    };

    const handleVideoStart = async () => {
        try {
            await window.electronAPI.incrementVideoView(video.id);
            setVideo(prev => ({ ...prev, views: (prev.views || 0) + 1 }));
        } catch (error) {
            console.error('Error incrementando vista:', error);
        }
    };

    const handleLike = async () => {
        const newLikes = (video.likes || 0) + 1;
        await window.electronAPI.updateVideo(video.id, { likes: newLikes });
        setVideo({ ...video, likes: newLikes });
    };

    const handleDislike = async () => {
        const newDislikes = (video.dislikes || 0) + 1;
        await window.electronAPI.updateVideo(video.id, { dislikes: newDislikes });
        setVideo({ ...video, dislikes: newDislikes });
    };

    const handleTimeUpdate = async (currentTime) => {
        await window.electronAPI.updateWatchTime(video.id, 5);
    };

    // Handlers para categorías
    const handleCategoriesSaved = () => {
        loadCategories();
    };

    // Handlers para tags
    const handleTagsSaved = () => {
        loadTags();
    };

    // Handlers para playlists
    const handlePlaylistsSaved = () => {
        loadPlaylists();
    };

    // Handlers para navegación en playlist
    const handleNextVideo = () => {
        if (!playlistInfo || playlistVideos.length === 0) return;

        const currentIndex = playlistVideos.findIndex(v => v.id === parseInt(id));
        if (currentIndex < playlistVideos.length - 1) {
            const nextVideo = playlistVideos[currentIndex + 1];
            window.location.href = `/video/${nextVideo.id}?playlist=${playlistInfo.id}`;
        }
    };

    const handlePreviousVideo = () => {
        if (!playlistInfo || playlistVideos.length === 0) return;

        const currentIndex = playlistVideos.findIndex(v => v.id === parseInt(id));
        if (currentIndex > 0) {
            const prevVideo = playlistVideos[currentIndex - 1];
            window.location.href = `/video/${prevVideo.id}?playlist=${playlistInfo.id}`;
        }
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 MB';
        const mb = bytes / (1024 * 1024);
        if (mb >= 1024) {
            return `${(mb / 1024).toFixed(2)} GB`;
        }
        return `${mb.toFixed(2)} MB`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Desconocida';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calcular info de playlist
    const currentPlaylistIndex = playlistVideos.findIndex(v => v.id === parseInt(id));
    const hasNextVideo = currentPlaylistIndex < playlistVideos.length - 1;
    const hasPreviousVideo = currentPlaylistIndex > 0;

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60vh'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid #3ea6ff',
                        borderTop: '4px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }} />
                    <p style={{ color: '#aaa' }}>Cargando video...</p>
                </div>
            </div>
        );
    }

    if (!video) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '60px 20px'
            }}>
                <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Video no encontrado</h2>
                <p style={{ color: '#aaa' }}>El video que buscas no existe o fue eliminado.</p>
            </div>
        );
    }

    if (!video.is_available) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '60px 20px'
            }}>
                <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#ff4444' }}>
                    Video no disponible
                </h2>
                <p style={{ color: '#aaa', marginBottom: '8px' }}>
                    Este video no está disponible actualmente.
                </p>
                <p style={{ color: '#666', fontSize: '14px' }}>
                    {video.filepath}
                </p>
            </div>
        );
    }

    // Convertir ruta de Windows a formato file:// URL
    const videoUrl = `file://${video.filepath.replace(/\\/g, '/')}`;

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            {/* Video Player */}
            <VideoPlayer
                videoPath={videoUrl}
                videoId={video.id}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handleVideoStart}
                // Props para playlist
                playlistId={playlistInfo?.id || null}
                playlistName={playlistInfo?.name || null}
                currentIndex={currentPlaylistIndex}
                totalVideos={playlistVideos.length}
                onNextVideo={handleNextVideo}
                onPreviousVideo={handlePreviousVideo}
                hasNext={hasNextVideo}
                hasPrevious={hasPreviousVideo}
            />

            {/* Video Info */}
            <div style={{ padding: '20px 0' }}>
                {/* Title */}
                <h1 style={{
                    fontSize: '20px',
                    marginBottom: '12px',
                    fontWeight: '500'
                }}>
                    {video.title}
                </h1>

                {/* Badges de Categorías y Tags */}
                {(categories.length > 0 || tags.length > 0) && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '16px'
                    }}>
                        {/* Categorías */}
                        {categories.map(category => (
                            <CategoryBadge
                                key={category.id}
                                category={category}
                                size="sm"
                            />
                        ))}

                        {/* Tags */}
                        {tags.map(tag => (
                            <TagBadge
                                key={tag.id}
                                name={tag.name}
                                color={tag.color}
                                size="sm"
                            />
                        ))}
                    </div>
                )}

                {/* Indicador de Playlists */}
                {playlists.length > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        padding: '8px 12px',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        width: 'fit-content'
                    }}>
                        <ListMusic size={16} color="#10b981" />
                        <span style={{ fontSize: '13px', color: '#10b981' }}>
                            En {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}:
                        </span>
                        <span style={{ fontSize: '13px', color: '#aaa' }}>
                            {playlists.map(p => p.name).join(', ')}
                        </span>
                    </div>
                )}

                {/* ========================================== */}
                {/* BARRA DE ACCIONES PRINCIPAL               */}
                {/* ========================================== */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '16px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #303030',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    {/* Botón Favorito */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        backgroundColor: video.is_favorite ? 'rgba(255, 193, 7, 0.15)' : '#3f3f3f',
                        border: video.is_favorite ? '1px solid rgba(255, 193, 7, 0.5)' : '1px solid transparent',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}>
                        <FavoriteButton
                            videoId={video.id}
                            isFavorite={video.is_favorite}
                            size={18}
                            showLabel={true}
                            onToggle={(newState) => setVideo({ ...video, is_favorite: newState })}
                        />
                    </div>

                    {/* Botón Categorías */}
                    <button
                        onClick={() => setShowCategorySelector(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: categories.length > 0 ? 'rgba(59, 130, 246, 0.15)' : '#3f3f3f',
                            border: categories.length > 0 ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid transparent',
                            borderRadius: '20px',
                            color: categories.length > 0 ? '#3b82f6' : '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = categories.length > 0
                                ? 'rgba(59, 130, 246, 0.25)'
                                : '#4f4f4f';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = categories.length > 0
                                ? 'rgba(59, 130, 246, 0.15)'
                                : '#3f3f3f';
                        }}
                    >
                        <Tag size={18} />
                        <span>Categorías</span>
                        {categories.length > 0 && (
                            <span style={{
                                backgroundColor: '#3b82f6',
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                {categories.length}
                            </span>
                        )}
                    </button>

                    {/* Botón Tags */}
                    <button
                        onClick={() => setShowTagSelector(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: tags.length > 0 ? 'rgba(139, 92, 246, 0.15)' : '#3f3f3f',
                            border: tags.length > 0 ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid transparent',
                            borderRadius: '20px',
                            color: tags.length > 0 ? '#8b5cf6' : '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = tags.length > 0
                                ? 'rgba(139, 92, 246, 0.25)'
                                : '#4f4f4f';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = tags.length > 0
                                ? 'rgba(139, 92, 246, 0.15)'
                                : '#3f3f3f';
                        }}
                    >
                        <Hash size={18} />
                        <span>Tags</span>
                        {tags.length > 0 && (
                            <span style={{
                                backgroundColor: '#8b5cf6',
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                {tags.length}
                            </span>
                        )}
                    </button>

                    {/* Botón Playlist */}
                    <button
                        onClick={() => setShowPlaylistSelector(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: playlists.length > 0 ? 'rgba(16, 185, 129, 0.15)' : '#3f3f3f',
                            border: playlists.length > 0 ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid transparent',
                            borderRadius: '20px',
                            color: playlists.length > 0 ? '#10b981' : '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = playlists.length > 0
                                ? 'rgba(16, 185, 129, 0.25)'
                                : '#4f4f4f';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = playlists.length > 0
                                ? 'rgba(16, 185, 129, 0.15)'
                                : '#3f3f3f';
                        }}
                    >
                        <ListMusic size={18} />
                        <span>Playlist</span>
                        {playlists.length > 0 && (
                            <span style={{
                                backgroundColor: '#10b981',
                                color: '#fff',
                                padding: '2px 8px',
                                borderRadius: '10px',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                {playlists.length}
                            </span>
                        )}
                    </button>

                    {/* Separador */}
                    <div style={{
                        width: '1px',
                        height: '24px',
                        backgroundColor: '#404040',
                        margin: '0 4px'
                    }} />

                    {/* Like Button */}
                    <button
                        onClick={handleLike}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: '#3f3f3f',
                            border: 'none',
                            borderRadius: '20px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f4f4f'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f3f3f'}
                    >
                        <ThumbsUp size={18} />
                        <span>{video.likes || 0}</span>
                    </button>

                    {/* Dislike Button */}
                    <button
                        onClick={handleDislike}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: '#3f3f3f',
                            border: 'none',
                            borderRadius: '20px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f4f4f'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f3f3f'}
                    >
                        <ThumbsDown size={18} />
                        <span>{video.dislikes || 0}</span>
                    </button>

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Views indicator */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: '#2a2a2a',
                        borderRadius: '20px',
                        fontSize: '14px',
                        color: '#aaa'
                    }}>
                        <Eye size={18} />
                        <span>{video.views || 0} vista{video.views !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* Description Box */}
                <div style={{
                    backgroundColor: '#212121',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '20px'
                }}>
                    {/* Metadata Grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px',
                        marginBottom: video.description ? '16px' : '0',
                        paddingBottom: video.description ? '16px' : '0',
                        borderBottom: video.description ? '1px solid #303030' : 'none'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <HardDrive size={16} color="#aaa" />
                            <div>
                                <div style={{ fontSize: '12px', color: '#aaa' }}>Tamaño</div>
                                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                    {formatFileSize(video.file_size)}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} color="#aaa" />
                            <div>
                                <div style={{ fontSize: '12px', color: '#aaa' }}>Duración</div>
                                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                    {formatDuration(video.duration)}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={16} color="#aaa" />
                            <div>
                                <div style={{ fontSize: '12px', color: '#aaa' }}>Agregado</div>
                                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                    {formatDate(video.added_at || video.upload_date)}
                                </div>
                            </div>
                        </div>

                        {video.last_viewed && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Eye size={16} color="#aaa" />
                                <div>
                                    <div style={{ fontSize: '12px', color: '#aaa' }}>Última vez visto</div>
                                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                        {formatDate(video.last_viewed)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {video.description && (
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                Descripción
                            </h3>
                            <p style={{
                                whiteSpace: 'pre-wrap',
                                color: '#aaa',
                                lineHeight: '1.6',
                                fontSize: '14px'
                            }}>
                                {video.description}
                            </p>
                        </div>
                    )}

                    {/* File Path */}
                    <div style={{
                        marginTop: '16px',
                        paddingTop: '16px',
                        borderTop: '1px solid #303030'
                    }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                            Ubicación del archivo
                        </div>
                        <div style={{
                            fontSize: '13px',
                            color: '#aaa',
                            wordBreak: 'break-all',
                            fontFamily: 'monospace'
                        }}>
                            {video.filepath}
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================== */}
            {/* MODALES                                   */}
            {/* ========================================== */}

            {/* Modal de Categorías */}
            {showCategorySelector && (
                <CategorySelector
                    videoId={video.id}
                    onClose={() => setShowCategorySelector(false)}
                    onSave={handleCategoriesSaved}
                />
            )}

            {/* Modal de Tags */}
            {showTagSelector && (
                <TagSelector
                    videoId={video.id}
                    videoTitle={video.title}
                    onClose={() => setShowTagSelector(false)}
                    onSave={handleTagsSaved}
                />
            )}

            {/* Modal de Playlists */}
            {showPlaylistSelector && (
                <PlaylistSelector
                    videoId={video.id}
                    videoTitle={video.title}
                    onClose={() => setShowPlaylistSelector(false)}
                    onSave={handlePlaylistsSaved}
                />
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default Video;