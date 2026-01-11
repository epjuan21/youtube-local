import { useParams, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
    ThumbsUp, ThumbsDown, Eye, Calendar, HardDrive,
    Star, Tag, Hash, ListMusic, Clock, Edit3, StickyNote
} from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import FavoriteButton from '../components/FavoriteButton';
import CategoryBadge from '../components/CategoryBadge';
import CategorySelector from '../components/CategorySelector';
import TagBadge from '../components/TagBadge';
import TagSelector from '../components/TagSelector';
import PlaylistSelector from '../components/PlaylistSelector';
import MetadataEditor from '../components/MetadataEditor';
import VideoMetadataDisplay from '../components/VideoMetadataDisplay';

function Video() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);

    const [categories, setCategories] = useState([]);
    const [showCategorySelector, setShowCategorySelector] = useState(false);

    const [tags, setTags] = useState([]);
    const [showTagSelector, setShowTagSelector] = useState(false);

    const [playlists, setPlaylists] = useState([]);
    const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);

    const [playlistInfo, setPlaylistInfo] = useState(null);
    const [playlistVideos, setPlaylistVideos] = useState([]);

    const [showMetadataEditor, setShowMetadataEditor] = useState(false);

    useEffect(() => {
        loadVideo();
        loadCategories();
        loadTags();
        loadPlaylists();

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
            console.error('Error cargando categorias:', error);
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

    const handleCategoriesSaved = () => {
        loadCategories();
    };

    const handleTagsSaved = () => {
        loadTags();
    };

    const handlePlaylistsSaved = () => {
        loadPlaylists();
    };

    const handleMetadataSaved = (updatedVideo) => {
        setVideo(updatedVideo);
    };

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
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Video no encontrado</h2>
                <p style={{ color: '#aaa' }}>El video que buscas no existe o fue eliminado.</p>
            </div>
        );
    }

    if (!video.is_available) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#ff4444' }}>
                    Video no disponible
                </h2>
                <p style={{ color: '#aaa', marginBottom: '8px' }}>
                    Este video no esta disponible actualmente.
                </p>
                <p style={{ color: '#666', fontSize: '14px' }}>{video.filepath}</p>
            </div>
        );
    }

    const videoUrl = `file://${video.filepath.replace(/\\/g, '/')}`;

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <VideoPlayer
                videoPath={videoUrl}
                videoId={video.id}
                onTimeUpdate={handleTimeUpdate}
                onPlay={handleVideoStart}
                playlistId={playlistInfo?.id || null}
                playlistName={playlistInfo?.name || null}
                currentIndex={currentPlaylistIndex}
                totalVideos={playlistVideos.length}
                onNextVideo={handleNextVideo}
                onPreviousVideo={handlePreviousVideo}
                hasNext={hasNextVideo}
                hasPrevious={hasPreviousVideo}
            />



            <div style={{ padding: '20px 0' }}>
                {/* Title with Edit Button */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px',
                    marginBottom: '12px'
                }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '500', flex: 1 }}>
                        {video.title}
                    </h1>
                    <button
                        onClick={() => setShowMetadataEditor(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: '#3f3f3f',
                            border: 'none',
                            borderRadius: '20px',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f4f4f'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f3f3f'}
                    >
                        <Edit3 size={14} />
                        Editar
                    </button>
                </div>

                {/* Rating Display */}
                {video.rating && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            backgroundColor: '#ffc10715',
                            border: '1px solid #ffc10730',
                            borderRadius: '20px'
                        }}>
                            <Star size={16} color="#ffc107" fill="#ffc107" />
                            <span style={{ color: '#ffc107', fontWeight: '600', fontSize: '14px' }}>
                                {video.rating}/10
                            </span>
                        </div>
                    </div>
                )}

                {/* Badges de Categorias y Tags */}
                {(categories.length > 0 || tags.length > 0) && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '16px'
                    }}>
                        {categories.map(category => (
                            <CategoryBadge key={category.id} category={category} size="sm" />
                        ))}
                        {tags.map(tag => (
                            <TagBadge key={tag.id} name={tag.name} color={tag.color} size="sm" />
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

                {/* BARRA DE ACCIONES PRINCIPAL */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '16px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #303030',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    {/* Boton Favorito */}
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

                    {/* Boton Categorias */}
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
                                ? 'rgba(59, 130, 246, 0.25)' : '#4f4f4f';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = categories.length > 0
                                ? 'rgba(59, 130, 246, 0.15)' : '#3f3f3f';
                        }}
                    >
                        <Tag size={18} />
                        <span>Categorias</span>
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

                    {/* Boton Tags */}
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
                                ? 'rgba(139, 92, 246, 0.25)' : '#4f4f4f';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = tags.length > 0
                                ? 'rgba(139, 92, 246, 0.15)' : '#3f3f3f';
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

                    {/* Boton Playlist */}
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
                                ? 'rgba(16, 185, 129, 0.25)' : '#4f4f4f';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = playlists.length > 0
                                ? 'rgba(16, 185, 129, 0.15)' : '#3f3f3f';
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
                        marginBottom: (video.description || video.notes) ? '16px' : '0',
                        paddingBottom: (video.description || video.notes) ? '16px' : '0',
                        borderBottom: (video.description || video.notes) ? '1px solid #303030' : 'none'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <HardDrive size={16} color="#aaa" />
                            <div>
                                <div style={{ fontSize: '12px', color: '#aaa' }}>Tamano</div>
                                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                    {formatFileSize(video.file_size)}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Clock size={16} color="#aaa" />
                            <div>
                                <div style={{ fontSize: '12px', color: '#aaa' }}>Duracion</div>
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
                                    <div style={{ fontSize: '12px', color: '#aaa' }}>Ultima vez visto</div>
                                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                        {formatDate(video.last_viewed)}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    {video.description && (
                        <div style={{ marginBottom: video.notes ? '16px' : '0' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                                Descripcion
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

                    {/* Private Notes */}
                    {video.notes && (
                        <div style={{
                            padding: '12px',
                            backgroundColor: '#8b5cf610',
                            border: '1px solid #8b5cf630',
                            borderRadius: '8px'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '8px'
                            }}>
                                <StickyNote size={14} color="#8b5cf6" />
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#8b5cf6' }}>
                                    NOTAS PRIVADAS
                                </span>
                            </div>
                            <p style={{
                                whiteSpace: 'pre-wrap',
                                color: '#ccc',
                                lineHeight: '1.6',
                                fontSize: '14px',
                                margin: 0
                            }}>
                                {video.notes}
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
                            Ubicacion del archivo
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

            {/* MODALES */}
            {showCategorySelector && (
                <CategorySelector
                    videoId={video.id}
                    onClose={() => setShowCategorySelector(false)}
                    onSave={handleCategoriesSaved}
                />
            )}

            {showTagSelector && (
                <TagSelector
                    videoId={video.id}
                    videoTitle={video.title}
                    onClose={() => setShowTagSelector(false)}
                    onSave={handleTagsSaved}
                />
            )}

            {showPlaylistSelector && (
                <PlaylistSelector
                    videoId={video.id}
                    videoTitle={video.title}
                    onClose={() => setShowPlaylistSelector(false)}
                    onSave={handlePlaylistsSaved}
                />
            )}

            {showMetadataEditor && (
                <MetadataEditor
                    video={video}
                    isOpen={showMetadataEditor}
                    onClose={() => setShowMetadataEditor(false)}
                    onSave={handleMetadataSaved}
                />
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>

            <VideoMetadataDisplay
                video={video}
                onMetadataExtracted={(updatedVideo) => setVideo(updatedVideo)}
            />
        </div>
    );
}

export default Video;