import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, Home, Folder, ArrowLeft } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import FolderCard from '../components/FolderCard';
import FilterBar from '../components/FilterBar';
import { LoadMoreButton } from '../components/PaginationComponents';
import { usePagination } from '../hooks/usePagination';
import { processVideos } from '../utils/videoSortFilter';

function FolderView() {
    const { id, subpath } = useParams();
    const navigate = useNavigate();
    const [folder, setFolder] = useState(null);
    const [videos, setVideos] = useState([]);
    const [subfolders, setSubfolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPath, setCurrentPath] = useState('');

    // Estados para filtros y ordenamiento
    const [sortBy, setSortBy] = useState('date-desc');
    const [filterBy, setFilterBy] = useState('all');
    const [viewMode, setViewMode] = useState('grid');

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
                const encodedPath = encodeURIComponent(accumulatedPath);
                breadcrumbs.push({
                    name: part,
                    path: `/folder/${id}/${encodedPath}`
                });
            });
        }

        return breadcrumbs;
    };

    const handleSubfolderClick = (subfolder) => {
        const encodedPath = encodeURIComponent(subfolder.relativePath);
        navigate(`/folder/${id}/${encodedPath}`);
    };

    // Procesar videos con filtros y ordenamiento
    const processedVideos = processVideos(videos, sortBy, filterBy);

    // Paginación - 24 videos por "página" (load more)
    const pagination = usePagination(processedVideos, 24);

    // Resetear paginación cuando cambian los filtros
    useEffect(() => {
        pagination.reset();
    }, [sortBy, filterBy]);

    const breadcrumbs = getBreadcrumbs();

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
                    <p style={{ color: '#aaa' }}>Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Breadcrumbs */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
                flexWrap: 'wrap'
            }}>
                <Link
                    to="/"
                    style={{
                        color: '#aaa',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#aaa'}
                >
                    <Home size={16} />
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
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f4f4f'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f3f3f'}
                >
                    <ArrowLeft size={18} />
                    Volver
                </button>
            </div>

            {/* FilterBar - Solo mostrar si hay videos */}
            {videos.length > 0 && (
                <FilterBar
                    onSortChange={setSortBy}
                    onViewChange={setViewMode}
                    onFilterChange={setFilterBy}
                    currentSort={sortBy}
                    currentView={viewMode}
                    currentFilter={filterBy}
                />
            )}

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
            {pagination.items.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
                        Videos ({processedVideos.length})
                    </h3>

                    {/* Vista Grid */}
                    {viewMode === 'grid' && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                            gap: '16px'
                        }}>
                            {pagination.items.map((video) => (
                                <VideoCard key={video.id} video={video} />
                            ))}
                        </div>
                    )}

                    {/* Vista Lista */}
                    {viewMode === 'list' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {pagination.items.map((video) => (
                                <VideoCardList key={video.id} video={video} />
                            ))}
                        </div>
                    )}

                    {/* Botón Load More */}
                    <LoadMoreButton
                        onLoadMore={pagination.loadMore}
                        hasMore={pagination.hasMore}
                        loading={false}
                        currentItems={pagination.displayedItems}
                        totalItems={pagination.totalItems}
                    />
                </div>
            )}

            {/* Mensaje si está vacío después del filtrado */}
            {videos.length > 0 && processedVideos.length === 0 && (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: '#212121',
                    borderRadius: '12px'
                }}>
                    <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>
                        No hay videos con el filtro seleccionado
                    </h3>
                    <p style={{ color: '#aaa', fontSize: '14px' }}>
                        Intenta cambiar los filtros de disponibilidad
                    </p>
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

// Componente para vista de lista
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

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
                width: '160px',
                height: '90px',
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
                        fontSize: '11px',
                        fontWeight: '600'
                    }}>
                        {formatDuration(video.duration)}
                    </div>
                )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                    fontSize: '15px',
                    fontWeight: '500',
                    marginBottom: '6px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {video.title || video.filename}
                </h3>
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    fontSize: '13px',
                    color: '#aaa',
                    flexWrap: 'wrap'
                }}>
                    <span>{video.view_count || 0} vistas</span>
                    <span>•</span>
                    <span>{formatFileSize(video.file_size)}</span>
                    <span>•</span>
                    <span>Agregado: {formatDate(video.added_at)}</span>
                    {video.last_viewed && (
                        <>
                            <span>•</span>
                            <span>Visto: {formatDate(video.last_viewed)}</span>
                        </>
                    )}
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

export default FolderView;