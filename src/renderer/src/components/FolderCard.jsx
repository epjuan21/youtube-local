import { Folder, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

function FolderCard({ folder }) {
    return (
        <Link
            to={`/folder/${folder.id}`}
            style={{
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer'
            }}
        >
            <div style={{
                backgroundColor: '#212121',
                borderRadius: '12px',
                padding: '24px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                minHeight: '180px',
                justifyContent: 'center'
            }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                }}>
                {/* Icono de carpeta */}
                <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#3ea6ff',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Folder size={40} color="#fff" />
                </div>

                {/* Nombre de carpeta */}
                <h3 style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    textAlign: 'center',
                    lineHeight: '1.4',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    width: '100%'
                }}>
                    {folder.name}
                </h3>

                {/* Contador de videos */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    color: '#aaa'
                }}>
                    <Video size={16} />
                    <span>{folder.totalVideos} video{folder.totalVideos !== 1 ? 's' : ''}</span>
                </div>

                {/* Ruta (opcional, pequeña) */}
                <div style={{
                    fontSize: '11px',
                    color: '#666',
                    textAlign: 'center',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    fontFamily: 'monospace'
                }}>
                    {folder.path}
                </div>
            </div>
        </Link>
    );
}

export default FolderCard;