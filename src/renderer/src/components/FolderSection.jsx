import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import VideoCard from './VideoCard';

function FolderSection({ folder }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [expandedSubfolders, setExpandedSubfolders] = useState(new Set());

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const toggleSubfolder = (subfolderPath) => {
        const newExpanded = new Set(expandedSubfolders);
        if (newExpanded.has(subfolderPath)) {
            newExpanded.delete(subfolderPath);
        } else {
            newExpanded.add(subfolderPath);
        }
        setExpandedSubfolders(newExpanded);
    };

    return (
        <div style={{ marginBottom: '32px' }}>
            {/* Header de Carpeta Principal */}
            <div
                onClick={toggleExpand}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: '#212121',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#212121'}
            >
                {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                {isExpanded ? <FolderOpen size={20} color="#3ea6ff" /> : <Folder size={20} color="#3ea6ff" />}

                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '500', marginBottom: '2px' }}>
                        {folder.name}
                    </h2>
                    <p style={{ fontSize: '12px', color: '#aaa' }}>
                        {folder.totalVideos} video{folder.totalVideos !== 1 ? 's' : ''}
                    </p>
                </div>

                <div style={{
                    fontSize: '11px',
                    color: '#666',
                    fontFamily: 'monospace',
                    maxWidth: '400px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {folder.path}
                </div>
            </div>

            {/* Contenido Expandible */}
            {isExpanded && (
                <div style={{ paddingLeft: '20px' }}>
                    {/* Videos directos en la carpeta raíz */}
                    {folder.directVideos.length > 0 && (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '16px'
                            }}>
                                {folder.directVideos.map((video) => (
                                    <VideoCard key={video.id} video={video} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Subcarpetas */}
                    {folder.subfolders.map((subfolder) => {
                        const isSubfolderExpanded = expandedSubfolders.has(subfolder.path);

                        return (
                            <div key={subfolder.path} style={{ marginBottom: '20px' }}>
                                {/* Header de Subcarpeta */}
                                <div
                                    onClick={() => toggleSubfolder(subfolder.path)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 14px',
                                        backgroundColor: '#1a1a1a',
                                        borderRadius: '6px',
                                        marginBottom: '12px',
                                        cursor: 'pointer',
                                        borderLeft: '3px solid #3ea6ff',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#252525'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
                                >
                                    {isSubfolderExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                    {isSubfolderExpanded ? <FolderOpen size={18} color="#3ea6ff" /> : <Folder size={18} color="#3ea6ff" />}

                                    <div style={{ flex: 1 }}>
                                        <h3 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '2px' }}>
                                            {subfolder.name}
                                        </h3>
                                        <p style={{ fontSize: '11px', color: '#888' }}>
                                            {subfolder.videos.length} video{subfolder.videos.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>

                                {/* Videos de la Subcarpeta */}
                                {isSubfolderExpanded && (
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                        gap: '16px',
                                        paddingLeft: '20px'
                                    }}>
                                        {subfolder.videos.map((video) => (
                                            <VideoCard key={video.id} video={video} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Mensaje si no hay videos */}
                    {folder.directVideos.length === 0 && folder.subfolders.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px',
                            color: '#666',
                            fontSize: '14px'
                        }}>
                            No hay videos en esta carpeta
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default FolderSection;