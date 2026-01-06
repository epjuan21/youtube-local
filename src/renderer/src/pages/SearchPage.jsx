import { useState, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import { useNavigate } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import FilterBar from '../components/FilterBar';
import { LoadMoreButton } from '../components/PaginationComponents';
import { usePagination } from '../hooks/usePagination';
import { processVideos } from '../utils/videoSortFilter';

function SearchPage() {
    const { searchTerm } = useSearch();
    const navigate = useNavigate();
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados para filtros y ordenamiento
    const [sortBy, setSortBy] = useState('date-desc');
    const [filterBy, setFilterBy] = useState('all');
    const [viewMode, setViewMode] = useState('grid');

    useEffect(() => {
        if (searchTerm && searchTerm.trim()) {
            loadSearchResults();
        } else {
            setVideos([]);
            setLoading(false);
        }
    }, [searchTerm]);

    const loadSearchResults = async () => {
        try {
            setLoading(true);

            // Cargar todos los videos (incluir no disponibles para que el filtro funcione)
            const videosResult = await window.electronAPI.getVideos({ onlyAvailable: false });

            if (!searchTerm || !searchTerm.trim()) {
                setVideos([]);
                setLoading(false);
                return;
            }

            // Filtrar videos por término de búsqueda
            const term = searchTerm.toLowerCase();
            const filteredVideos = videosResult.filter(video => {
                // Buscar en título
                if (video.title && video.title.toLowerCase().includes(term)) {
                    return true;
                }

                // Buscar en descripción
                if (video.description && video.description.toLowerCase().includes(term)) {
                    return true;
                }

                // Buscar en nombre de archivo
                if (video.filename && video.filename.toLowerCase().includes(term)) {
                    return true;
                }

                // Buscar en la ruta (para encontrar por nombre de subcarpeta)
                if (video.filepath && video.filepath.toLowerCase().includes(term)) {
                    return true;
                }

                return false;
            });

            setVideos(filteredVideos);
        } catch (error) {
            console.error('Error cargando resultados de búsqueda:', error);
        } finally {
            setLoading(false);
        }
    };

    // Procesar videos con filtros y ordenamiento
    const processedVideos = processVideos(videos, sortBy, filterBy);

    // Paginación - 24 videos por "página"
    const pagination = usePagination(processedVideos, 24);

    // Resetear paginación cuando cambian los filtros
    useEffect(() => {
        pagination.reset();
    }, [sortBy, filterBy]);

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
                    <p style={{ color: '#aaa' }}>Buscando...</p>
                </div>
            </div>
        );
    }

    if (!searchTerm || !searchTerm.trim()) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '60px 20px'
            }}>
                <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>
                    Buscar videos
                </h2>
                <p style={{ color: '#aaa' }}>
                    Escribe algo en el campo de búsqueda para encontrar videos
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Header de resultados */}
            <div style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>
                    Resultados para "{searchTerm}"
                </h2>
                <p style={{ fontSize: '14px', color: '#aaa' }}>
                    {videos.length} resultado{videos.length !== 1 ? 's' : ''} encontrado{videos.length !== 1 ? 's' : ''}
                    {processedVideos.length !== videos.length && (
                        <span> • {processedVideos.length} después de filtrar</span>
                    )}
                </p>
            </div>

            {/* FilterBar - Solo mostrar si hay resultados */}
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

            {/* Resultados */}
            {pagination.items.length > 0 ? (
                <>
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
                </>
            ) : videos.length > 0 ? (
                // Hay resultados pero están todos filtrados
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
                        Se encontraron {videos.length} resultado{videos.length !== 1 ? 's' : ''} pero ninguno coincide con el filtro de disponibilidad
                    </p>
                </div>
            ) : (
                // No hay resultados de búsqueda
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
    const navigate = useNavigate();

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
        <div
            onClick={() => navigate(`/video/${video.id}`)}
            style={{
                display: 'flex',
                gap: '16px',
                padding: '12px',
                backgroundColor: '#212121',
                borderRadius: '8px',
                cursor: 'pointer',
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
        </div>
    );
}

export default SearchPage;