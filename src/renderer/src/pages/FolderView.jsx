import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ChevronRight, Home, Folder, ArrowLeft,
    CheckSquare, Square, X, Edit3, Trash2
} from 'lucide-react';
import VideoCard from '../components/VideoCard';
import VirtualizedGrid from '../components/VirtualizedGrid';
import FolderCard from '../components/FolderCard';
import FilterBar from '../components/FilterBar';
import BulkEditor from '../components/BulkEditor';
import { processVideos } from '../utils/videoSortFilter';
import { useScrollRestoration } from '../hooks/useScrollRestoration';

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

    // Estados para selección múltiple
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedVideos, setSelectedVideos] = useState(new Set());

    // Estado para el editor en lote
    const [showBulkEditor, setShowBulkEditor] = useState(false);

    // Scroll restoration con clave única por carpeta y filtros
    const scrollRef = useScrollRestoration(`folder-${id}-${subpath || 'root'}-${sortBy}-${filterBy}`);

    useEffect(() => {
        loadFolderContent();
    }, [id, subpath]);

    // Salir del modo selección al cambiar de carpeta
    useEffect(() => {
        setSelectionMode(false);
        setSelectedVideos(new Set());
    }, [id, subpath]);

    const loadFolderContent = async () => {
        try {
            setLoading(true);

            const folders = await window.electronAPI.getWatchFolders();
            const currentFolder = folders.find(f => f.id === parseInt(id));

            if (!currentFolder) {
                navigate('/');
                return;
            }

            setFolder(currentFolder);

            const decodedSubpath = subpath ? decodeURIComponent(subpath) : '';
            const fullPath = decodedSubpath
                ? `${currentFolder.folder_path}/${decodedSubpath}`.replace(/\\/g, '/')
                : currentFolder.folder_path.replace(/\\/g, '/');

            setCurrentPath(fullPath);

            const allVideos = await window.electronAPI.getVideos({ onlyAvailable: false });
            const folderVideos = allVideos.filter(v => v.watch_folder_id === parseInt(id));

            const directVideos = [];
            const subfolderMap = new Map();

            folderVideos.forEach(video => {
                const videoPath = video.filepath.replace(/\\/g, '/');

                if (videoPath.startsWith(fullPath)) {
                    const relativePath = videoPath.replace(fullPath, '').replace(/^\//, '');
                    const pathParts = relativePath.split('/');

                    if (pathParts.length === 1) {
                        directVideos.push(video);
                    } else {
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

    // ========== HANDLERS PARA SELECCIÓN MÚLTIPLE ==========

    const handleToggleSelectionMode = () => {
        if (selectionMode) {
            // Salir del modo selección
            setSelectionMode(false);
            setSelectedVideos(new Set());
        } else {
            // Entrar en modo selección
            setSelectionMode(true);
        }
    };

    const handleVideoSelectionChange = (videoId, isSelected) => {
        setSelectedVideos(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(videoId);
            } else {
                newSet.delete(videoId);
            }
            return newSet;
        });
    };

    const handleSelectAll = () => {
        const allVideoIds = processedVideos.map(v => v.id);
        setSelectedVideos(new Set(allVideoIds));
    };

    const handleDeselectAll = () => {
        setSelectedVideos(new Set());
    };

    const handleOpenBulkEditor = () => {
        if (selectedVideos.size > 0) {
            setShowBulkEditor(true);
        }
    };

    const handleBulkEditorSave = () => {
        // Recargar contenido y salir del modo selección
        loadFolderContent();
        setSelectionMode(false);
        setSelectedVideos(new Set());
    };

    // Obtener los objetos de video seleccionados
    const getSelectedVideoObjects = () => {
        return processedVideos.filter(v => selectedVideos.has(v.id));
    };

    // Procesar videos con filtros y ordenamiento
    const processedVideos = processVideos(videos, sortBy, filterBy);

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
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '12px'
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

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Botón de modo selección */}
                    {videos.length > 0 && (
                        <button
                            onClick={handleToggleSelectionMode}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 16px',
                                backgroundColor: selectionMode ? '#10b981' : '#3f3f3f',
                                border: 'none',
                                borderRadius: '18px',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (!selectionMode) e.currentTarget.style.backgroundColor = '#4f4f4f';
                            }}
                            onMouseLeave={(e) => {
                                if (!selectionMode) e.currentTarget.style.backgroundColor = '#3f3f3f';
                            }}
                        >
                            {selectionMode ? <X size={18} /> : <CheckSquare size={18} />}
                            {selectionMode ? 'Cancelar' : 'Seleccionar'}
                        </button>
                    )}

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
            </div>

            {/* Barra de selección múltiple */}
            {selectionMode && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#1a3a2a',
                    borderRadius: '12px',
                    marginBottom: '20px',
                    border: '1px solid #10b98150'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '14px', color: '#10b981', fontWeight: '600' }}>
                            {selectedVideos.size} de {processedVideos.length} seleccionados
                        </span>

                        <button
                            onClick={handleSelectAll}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: 'transparent',
                                border: '1px solid #10b98150',
                                borderRadius: '6px',
                                color: '#10b981',
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            Seleccionar todo
                        </button>

                        {selectedVideos.size > 0 && (
                            <button
                                onClick={handleDeselectAll}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #ff444450',
                                    borderRadius: '6px',
                                    color: '#ff4444',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                Deseleccionar todo
                            </button>
                        )}
                    </div>

                    {selectedVideos.size > 0 && (
                        <button
                            onClick={handleOpenBulkEditor}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '10px 20px',
                                backgroundColor: '#3ea6ff',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#000',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5ab5ff'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3ea6ff'}
                        >
                            <Edit3 size={16} />
                            Editar seleccionados
                        </button>
                    )}
                </div>
            )}

            {/* FilterBar - Solo mostrar si hay videos y no está en modo selección */}
            {videos.length > 0 && !selectionMode && (
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
            {subfolders.length > 0 && !selectionMode && (
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
            {processedVideos.length > 0 && (
                <div>
                    <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>
                        Videos ({processedVideos.length})
                    </h3>

                    {/* Vista Grid con Virtualización */}
                    {viewMode === 'grid' && (
                        <div style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}>
                            <VirtualizedGrid
                                ref={scrollRef}
                                videos={processedVideos}
                                onUpdate={loadFolderContent}
                                selectionMode={selectionMode}
                                selectedVideos={selectedVideos}
                                onSelectionChange={handleVideoSelectionChange}
                            />
                        </div>
                    )}

                    {/* Vista Lista - Mantener sin virtualizar por ahora */}
                    {viewMode === 'list' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {processedVideos.map((video) => (
                                <VideoCard
                                    key={video.id}
                                    video={video}
                                    onUpdate={loadFolderContent}
                                    selectionMode={selectionMode}
                                    isSelected={selectedVideos.has(video.id)}
                                    onSelectionChange={handleVideoSelectionChange}
                                />
                            ))}
                        </div>
                    )}
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

            {/* Modal de edición en lote */}
            {showBulkEditor && (
                <BulkEditor
                    videos={getSelectedVideoObjects()}
                    isOpen={showBulkEditor}
                    onClose={() => setShowBulkEditor(false)}
                    onSave={handleBulkEditorSave}
                />
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
                    <span>{video.views || 0} vistas</span>
                    <span>•</span>
                    <span>{formatFileSize(video.file_size)}</span>
                    <span>•</span>
                    <span>Agregado: {formatDate(video.upload_date)}</span>
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

// Componente para vista de lista con selección
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
                    {formatFileSize(video.file_size)} • {video.views || 0} vistas
                </div>
            </div>
        </div>
    );
}

export default FolderView;