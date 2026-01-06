import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Home, Folder, ArrowLeft } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import FolderCard from '../components/FolderCard';

function FolderView() {
    const { id, subpath } = useParams();
    const navigate = useNavigate();
    const [folder, setFolder] = useState(null);
    const [videos, setVideos] = useState([]);
    const [subfolders, setSubfolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState('');

    useEffect(() => {
        loadFolderContent();
    }, [id, subpath]);

    const loadFolderContent = async () => {
        try {
            setLoading(true);

            // Obtener información de la carpeta
            const folders = await window.electronAPI.getWatchFolders();
            const currentFolder = folders.find(f => f.id === parseInt(id));

            if (!currentFolder) {
                navigate('/');
                return;
            }

            setFolder(currentFolder);

            // Construir la ruta actual
            const decodedSubpath = subpath ? decodeURIComponent(subpath) : '';
            const fullPath = decodedSubpath
                ? `${currentFolder.folder_path}/${decodedSubpath}`.replace(/\\/g, '/')
                : currentFolder.folder_path.replace(/\\/g, '/');

            setCurrentPath(fullPath);

            // Obtener todos los videos de esta carpeta
            const allVideos = await window.electronAPI.getVideos({ onlyAvailable: false });
            const folderVideos = allVideos.filter(v => v.watch_folder_id === parseInt(id));

            // Filtrar videos y subcarpetas según la ruta actual
            const directVideos = [];
            const subfolderMap = new Map();

            folderVideos.forEach(video => {
                const videoPath = video.filepath.replace(/\\/g, '/');

                // Verificar si el video pertenece a la ruta actual
                if (videoPath.startsWith(fullPath)) {
                    const relativePath = videoPath.replace(fullPath, '').replace(/^\//, '');
                    const pathParts = relativePath.split('/');

                    if (pathParts.length === 1) {
                        // Video directo en esta carpeta
                        directVideos.push(video);
                    } else {
                        // Video en subcarpeta
                        const subfolderName = pathParts[0];
                        const subfolderPath = `${fullPath}/${subfolderName}`;

                        if (!subfolderMap.has(subfolderPath)) {
                            subfolderMap.set(subfolderPath, {
                                id: `${id}-${subfolderName}`,
                                name: subfolderName,
                                path: subfolderPath,
                                videos: []
                            });
                        }

                        subfolderMap.get(subfolderPath).videos.push(video);
                    }
                }
            });

            // Convertir subcarpetas a formato compatible con FolderCard
            const subfoldersArray = Array.from(subfolderMap.values()).map(sf => ({
                id: sf.id,
                name: sf.name,
                path: sf.path,
                totalVideos: sf.videos.length,
                availableVideos: sf.videos.filter(v => v.is_available === 1).length,
                isSubfolder: true,
                parentId: id,
                relativePath: sf.path.replace(currentFolder.folder_path.replace(/\\/g, '/'), '').replace(/^\//, '')
            })).sort((a, b) => a.name.localeCompare(b.name));

            setSubfolders(subfoldersArray);
            setVideos(directVideos);

        } catch (error) {
            console.error('Error cargando contenido de carpeta:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFolderName = (path) => {
        const normalized = path.replace(/\\/g, '/');
        const parts = normalized.split('/').filter(p => p.length > 0);
        return parts[parts.length - 1] || path;
    };

    const getBreadcrumbs = () => {
        if (!folder) return [];

        const breadcrumbs = [{ name: getFolderName(folder.folder_path), path: `/folder/${id}` }];

        if (subpath) {
            const parts = decodeURIComponent(subpath).split('/');
            let accumulatedPath = '';

            parts.forEach((part, index) => {
                accumulatedPath += (index > 0 ? '/' : '') + part;
                breadcrumbs.push({
                    name: part,
                    path: `/folder/${id}/${encodeURIComponent(accumulatedPath)}`
                });
            });
        }

        return breadcrumbs;
    };

    const handleSubfolderClick = (subfolder) => {
        navigate(`/folder/${id}/${encodeURIComponent(subfolder.relativePath)}`);
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
                    <p style={{ color: '#aaa' }}>Cargando contenido...</p>
                </div>
            </div>
        );
    }

    const breadcrumbs = getBreadcrumbs();
    const totalItems = subfolders.length + videos.length;

    return (
        <div>
            {/* Breadcrumbs */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px',
                flexWrap: 'wrap'
            }}>
                <Link
                    to="/"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: '#aaa',
                        textDecoration: 'none',
                        fontSize: '14px',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#aaa'}
                >
                    <Home size={16} />
                    <span>Inicio</span>
                </Link>

                {breadcrumbs.map((crumb, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ChevronRight size={16} color="#666" />
                        {index === breadcrumbs.length - 1 ? (
                            <span style={{ fontSize: '14px', color: '#fff', fontWeight: '500' }}>
                                {crumb.name}
                            </span>
                        ) : (
                            <Link
                                to={crumb.path}
                                style={{
                                    fontSize: '14px',
                                    color: '#aaa',
                                    textDecoration: 'none',
                                    transition: 'color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#aaa'}
                            >
                                {crumb.name}
                            </Link>
                        )}
                    </div>
                ))}
            </div>

            {/* Header con botón volver */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
            }}>
                <div>
                    <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>
                        {breadcrumbs[breadcrumbs.length - 1]?.name || 'Carpeta'}
                    </h2>
                    <p style={{ fontSize: '14px', color: '#aaa' }}>
                        {subfolders.length > 0 && `${subfolders.length} subcarpeta${subfolders.length !== 1 ? 's' : ''}`}
                        {subfolders.length > 0 && videos.length > 0 && ' • '}
                        {videos.length > 0 && `${videos.length} video${videos.length !== 1 ? 's' : ''}`}
                    </p>
                </div>

                <button
                    onClick={() => navigate(-1)}
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
                        fontWeight: '500'
                    }}
                >
                    <ArrowLeft size={18} />
                    Volver
                </button>
            </div>

            {/* Subcarpetas */}
            {subfolders.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Folder size={20} color="#3ea6ff" />
                        Subcarpetas
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '20px'
                    }}>
                        {subfolders.map((subfolder) => (
                            <div
                                key={subfolder.id}
                                onClick={() => handleSubfolderClick(subfolder)}
                            >
                                <FolderCard folder={subfolder} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Videos directos */}
            {videos.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
                        Videos
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '16px'
                    }}>
                        {videos.map((video) => (
                            <VideoCard key={video.id} video={video} />
                        ))}
                    </div>
                </div>
            )}

            {/* Mensaje si está vacío */}
            {subfolders.length === 0 && videos.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: '#212121',
                    borderRadius: '12px'
                }}>
                    <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>
                        Carpeta vacía
                    </h3>
                    <p style={{ color: '#aaa', fontSize: '14px' }}>
                        No hay videos ni subcarpetas en esta ubicación
                    </p>
                </div>
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

export default FolderView;