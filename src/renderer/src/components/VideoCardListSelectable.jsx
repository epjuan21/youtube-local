import { CheckSquare, Square } from 'lucide-react';

/**
 * Componente de video en formato lista con checkbox de selección
 * Usado en modo selección para edición en lote
 */
function VideoCardListSelectable({ video, isSelected, onSelectionChange }) {
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

    const handleClick = () => {
        onSelectionChange(video.id, !isSelected);
    };

    return (
        <div
            onClick={handleClick}
            style={{
                display: 'flex',
                gap: '16px',
                padding: '12px',
                backgroundColor: isSelected ? '#2d4a3e' : '#212121',
                borderRadius: '8px',
                cursor: 'pointer',
                alignItems: 'center',
                border: isSelected ? '2px solid #10b981' : '2px solid transparent',
                transition: 'all 0.2s'
            }}
        >
            {/* Checkbox */}
            <div style={{
                padding: '8px',
                backgroundColor: isSelected ? '#10b981' : '#3f3f3f',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {isSelected ? (
                    <CheckSquare size={20} color="#fff" />
                ) : (
                    <Square size={20} color="#aaa" />
                )}
            </div>

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
                            objectFit: 'cover',
                            opacity: isSelected ? 0.8 : 1
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
                    whiteSpace: 'nowrap',
                    color: isSelected ? '#fff' : 'inherit'
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
        </div>
    );
}

export default VideoCardListSelectable;
