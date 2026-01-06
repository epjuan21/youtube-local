import { Link } from 'react-router-dom';
import { Play, Clock } from 'lucide-react';
import FavoriteButton from './FavoriteButton';

function VideoCard({ video }) {
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

    return (
        <div style={{
            backgroundColor: '#212121',
            borderRadius: '12px',
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer',
            position: 'relative'
        }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.4)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
            }}
        >
            {/* Botón de favorito - posición absoluta sobre el thumbnail */}
            <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                zIndex: 10
            }}>
                <FavoriteButton
                    videoId={video.id}
                    isFavorite={video.is_favorite === 1}
                    size={18}
                />
            </div>

            <Link
                to={`/video/${video.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
            >
                {/* Thumbnail */}
                <div style={{
                    width: '100%',
                    paddingTop: '56.25%', // 16:9 aspect ratio
                    backgroundColor: '#000',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {video.thumbnail ? (
                        <img
                            src={`file://${video.thumbnail.replace(/\\/g, '/')}`}
                            alt={video.title || video.filename}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                            }}
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    ) : (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Play size={48} color="#666" />
                        </div>
                    )}

                    {/* Overlay con play button */}
                    <div className="play-overlay" style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            backgroundColor: 'rgba(62, 166, 255, 0.9)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Play size={28} color="#fff" fill="#fff" />
                        </div>
                    </div>

                    {/* Duration badge */}
                    {video.duration && (
                        <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            {formatDuration(video.duration)}
                        </div>
                    )}

                    {/* Badge de favorito visible en el thumbnail */}
                    {video.is_favorite === 1 && (
                        <div style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            backgroundColor: 'rgba(255, 193, 7, 0.9)',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#000',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            ⭐ Favorito
                        </div>
                    )}
                </div>

                {/* Info */}
                <div style={{ padding: '12px' }}>
                    {/* Título */}
                    <h3 style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '8px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.4',
                        minHeight: '2.8em'
                    }}>
                        {video.title || video.filename}
                    </h3>

                    {/* Stats */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '12px',
                        color: '#aaa',
                        marginBottom: '8px'
                    }}>
                        <span>{video.view_count || 0} vistas</span>
                        <span>•</span>
                        <span>{formatFileSize(video.file_size)}</span>
                    </div>

                    {/* Watch progress */}
                    {video.watch_time > 0 && video.duration > 0 && (
                        <div style={{ marginTop: '8px' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '11px',
                                color: '#666',
                                marginBottom: '4px'
                            }}>
                                <Clock size={12} />
                                <span>
                                    {Math.floor((video.watch_time / video.duration) * 100)}% visto
                                </span>
                            </div>
                            <div style={{
                                width: '100%',
                                height: '3px',
                                backgroundColor: '#3f3f3f',
                                borderRadius: '2px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${(video.watch_time / video.duration) * 100}%`,
                                    height: '100%',
                                    backgroundColor: '#3ea6ff',
                                    borderRadius: '2px'
                                }} />
                            </div>
                        </div>
                    )}

                    {/* Status badge */}
                    {video.is_available === 0 && (
                        <div style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            backgroundColor: 'rgba(255, 68, 68, 0.15)',
                            border: '1px solid #ff4444',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#ff4444',
                            textAlign: 'center'
                        }}>
                            No disponible
                        </div>
                    )}
                </div>
            </Link>

            <style>{`
                div:hover .play-overlay {
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    );
}

export default VideoCard;