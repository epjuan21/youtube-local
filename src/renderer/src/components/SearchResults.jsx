import { useNavigate } from 'react-router-dom';
import { ChevronRight, Folder, Video as VideoIcon } from 'lucide-react';
import VideoCard from './VideoCard';

function SearchResults({ videos, watchFolders, searchTerm }) {
    const navigate = useNavigate();

    // Función auxiliar - DEFINIR PRIMERO
    const getFolderName = (path) => {
        const normalized = path.replace(/\\/g, '/');
        const parts = normalized.split('/').filter(p => p.length > 0);
        return parts[parts.length - 1] || path;
    };

    // Agrupar videos por carpeta
    const groupedResults = watchFolders.map(folder => {
        const folderVideos = videos.filter(v => v.watch_folder_id === folder.id);

        if (folderVideos.length === 0) return null;

        // Agrupar por subcarpetas
        const videosWithPaths = folderVideos.map(video => {
            const folderPath = folder.folder_path.replace(/\\/g, '/');
            const videoPath = video.filepath.replace(/\\/g, '/');
            const relativePath = videoPath.replace(folderPath, '').replace(/^\//, '');
            const pathParts = relativePath.split('/');

            // Obtener la ruta de la carpeta contenedora
            const parentPath = pathParts.length > 1
                ? pathParts.slice(0, -1).join('/')
                : '';

            return {
                ...video,
                parentPath,
                parentName: parentPath ? pathParts[pathParts.length - 2] : getFolderName(folder.folder_path)
            };
        });

        // Agrupar por carpeta padre
        const byParent = videosWithPaths.reduce((acc, video) => {
            const key = video.parentPath || 'root';
            if (!acc[key]) {
                acc[key] = {
                    path: video.parentPath,
                    name: video.parentName,
                    videos: []
                };
            }
            acc[key].videos.push(video);
            return acc;
        }, {});

        return {
            folder,
            name: getFolderName(folder.folder_path),
            groups: Object.values(byParent)
        };
    }).filter(Boolean);

    const handleNavigateToFolder = (folderId, subpath) => {
        if (subpath) {
            navigate(`/folder/${folderId}/${encodeURIComponent(subpath)}`);
        } else {
            navigate(`/folder/${folderId}`);
        }
    };

    const totalResults = videos.length;

    if (totalResults === 0) {
        return (
            <div>
                {/* Header de resultados */}
                <div style={{ marginBottom: '32px' }}>
                    <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>
                        Resultados para "{searchTerm}"
                    </h2>
                    <p style={{ fontSize: '14px', color: '#aaa' }}>
                        0 videos encontrados
                    </p>
                </div>

                {/* Mensaje si no hay resultados */}
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: '#212121',
                    borderRadius: '12px'
                }}>
                    <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>
                        No se encontraron resultados
                    </h3>
                    <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '16px' }}>
                        No hay videos que coincidan con "{searchTerm}"
                    </p>
                    <p style={{ color: '#666', fontSize: '13px' }}>
                        Intenta con otros términos de búsqueda
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header de resultados */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>
                    Resultados para "{searchTerm}"
                </h2>
                <p style={{ fontSize: '14px', color: '#aaa' }}>
                    {totalResults} video{totalResults !== 1 ? 's' : ''} encontrado{totalResults !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Resultados agrupados por carpeta */}
            {groupedResults.map((result) => (
                <div key={result.folder.id} style={{ marginBottom: '40px' }}>
                    {/* Header de carpeta principal */}
                    <div
                        onClick={() => handleNavigateToFolder(result.folder.id, '')}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            backgroundColor: '#212121',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#212121'}
                    >
                        <Folder size={20} color="#3ea6ff" />
                        <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '500' }}>
                                {result.name}
                            </h3>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#aaa' }}>
                            <VideoIcon size={16} />
                            <span style={{ fontSize: '14px' }}>
                                {result.groups.reduce((sum, g) => sum + g.videos.length, 0)} resultado{result.groups.reduce((sum, g) => sum + g.videos.length, 0) !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <ChevronRight size={20} color="#666" />
                    </div>

                    {/* Grupos por subcarpeta */}
                    {result.groups.map((group, index) => (
                        <div key={index} style={{ marginBottom: '24px' }}>
                            {/* Subcarpeta header */}
                            {group.path && (
                                <div
                                    onClick={() => handleNavigateToFolder(result.folder.id, group.path)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '10px 14px',
                                        backgroundColor: '#1a1a1a',
                                        borderRadius: '6px',
                                        marginBottom: '12px',
                                        marginLeft: '20px',
                                        cursor: 'pointer',
                                        borderLeft: '3px solid #3ea6ff',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#252525'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
                                >
                                    <Folder size={18} color="#3ea6ff" />
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontSize: '16px', fontWeight: '500' }}>
                                            {group.name}
                                        </h4>
                                    </div>
                                    <span style={{ fontSize: '13px', color: '#aaa' }}>
                                        {group.videos.length} video{group.videos.length !== 1 ? 's' : ''}
                                    </span>
                                    <ChevronRight size={18} color="#666" />
                                </div>
                            )}

                            {/* Videos */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '16px',
                                paddingLeft: group.path ? '40px' : '20px'
                            }}>
                                {group.videos.map((video) => (
                                    <VideoCard key={video.id} video={video} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

export default SearchResults;