import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, Eye, Calendar, HardDrive } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';

function Video() {
    const { id } = useParams();
    const [video, setVideo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadVideo();
    }, [id]);

    const loadVideo = async () => {
        try {
            const result = await window.electronAPI.getVideoById(parseInt(id));
            setVideo(result);
        } catch (error) {
            console.error('Error cargando video:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVideoStart = async () => {
        // Incrementar vista solo una vez
        try {
            await window.electronAPI.incrementVideoView(video.id);
            // Actualizar el estado local sin recargar
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
        // Actualizar watch_time en la base de datos
        await window.electronAPI.updateWatchTime(video.id, 5);
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
            />

            {/* Video Info */}
            <div style={{ padding: '20px 0' }}>
                {/* Title */}
                <h1 style={{
                    fontSize: '20px',
                    marginBottom: '16px',
                    fontWeight: '500'
                }}>
                    {video.title}
                </h1>

                {/* Actions Bar */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '16px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid #303030',
                    flexWrap: 'wrap'
                }}>
                    <button
                        onClick={handleLike}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: '#3f3f3f',
                            border: 'none',
                            borderRadius: '18px',
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

                    <button
                        onClick={handleDislike}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: '#3f3f3f',
                            border: 'none',
                            borderRadius: '18px',
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

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: '#3f3f3f',
                        borderRadius: '18px',
                        fontSize: '14px'
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
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
                            <Calendar size={16} color="#aaa" />
                            <div>
                                <div style={{ fontSize: '12px', color: '#aaa' }}>Agregado</div>
                                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                    {formatDate(video.upload_date)}
                                </div>
                            </div>
                        </div>

                        {video.duration && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={16} color="#aaa" />
                                <div>
                                    <div style={{ fontSize: '12px', color: '#aaa' }}>Duración</div>
                                    <div style={{ fontSize: '14px', fontWeight: '500' }}>
                                        {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
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