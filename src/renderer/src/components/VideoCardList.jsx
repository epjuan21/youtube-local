import { Link } from 'react-router-dom';

/**
 * Componente de video en formato lista compacto
 * Thumbnail 120px, layout horizontal, información mínima
 */
function VideoCardList({ video }) {
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
        <Link
            to={`/video/${video.id}`}
            style={{
                display: 'flex',
                gap: '16px',
                padding: '12px',
                backgroundColor: '#212121',
                borderRadius: '8px',
                textDecoration: 'none',
                color: 'inherit',
                transition: 'background-color 0.2s',
                alignItems: 'center'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#212121'}
        >
            {/* Thumbnail */}
            <div style={{
                width: '120px',
                height: '68px',
                backgroundColor: '#000',
                borderRadius: '6px',
                flexShrink: 0,
                position: 'relative',
                overflow: 'hidden'
            }}>
                {video.thumbnail && (
                    <img
                        src={`file://${video.thumbnail.replace(/\\/g, '/')}`}
                        alt={video.title || video.filename}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                )}
                {video.duration && (
                    <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '4px',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600'
                    }}>
                        {formatDuration(video.duration)}
                    </div>
                )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
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
                    fontSize: '12px',
                    color: '#aaa'
                }}>
                    {formatFileSize(video.file_size)} • {formatDuration(video.duration)}
                </div>
            </div>

            {/* Estado */}
            <div style={{
                padding: '6px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: video.is_available ? 'rgba(62, 166, 255, 0.15)' : 'rgba(255, 68, 68, 0.15)',
                color: video.is_available ? '#3ea6ff' : '#ff4444'
            }}>
                {video.is_available ? 'Disponible' : 'No disponible'}
            </div>
        </Link>
    );
}

export default VideoCardList;
