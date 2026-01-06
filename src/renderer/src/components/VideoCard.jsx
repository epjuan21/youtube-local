import { Link } from 'react-router-dom';
import { Play, Clock, Eye, Image } from 'lucide-react';
import { useState, useEffect } from 'react';

function VideoCard({ video }) {
    const [thumbnailUrl, setThumbnailUrl] = useState(null);
    const [thumbnailError, setThumbnailError] = useState(false);

    useEffect(() => {
        loadThumbnail();
    }, [video.id, video.thumbnail]);

    const loadThumbnail = async () => {
        if (video.thumbnail) {
            // Convertir ruta de Windows a URL válida para el navegador
            const thumbnailPath = video.thumbnail.replace(/\\/g, '/');
            setThumbnailUrl(`file://${thumbnailPath}`);
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
                    paddingTop: '56.25%', // 16:9 aspect ratio
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
    );
}

export default VideoCard;