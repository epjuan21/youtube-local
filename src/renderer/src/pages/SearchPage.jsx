import { useState, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import { useNavigate } from 'react-router-dom';
import VideoCard from '../components/VideoCard';
import VideoCardList from '../components/VideoCardList';
import VirtualizedGrid from '../components/VirtualizedGrid';
import FilterBar from '../components/FilterBar';
import { processVideos } from '../utils/videoSortFilter';
import { useScrollRestoration } from '../hooks/useScrollRestoration';
import { useThumbnailPrefetch } from '../hooks/useThumbnailPrefetch';

function SearchPage() {
    const { searchTerm } = useSearch();
    const navigate = useNavigate();
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados para filtros y ordenamiento
    const [sortBy, setSortBy] = useState('date-desc');
    const [filterBy, setFilterBy] = useState('all');
    const [viewMode, setViewMode] = useState('grid');

    // Estado para tracking de scroll y prefetching
    const [visibleIndex, setVisibleIndex] = useState(0);

    // Scroll restoration con clave única por búsqueda
    const scrollRef = useScrollRestoration(`search-${searchTerm}-${sortBy}-${filterBy}`);

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

    // Activar prefetching inteligente de thumbnails
    useThumbnailPrefetch(processedVideos, visibleIndex, {
        lookahead: 5,
        lookbehind: 2,
        enabled: viewMode === 'grid' && processedVideos.length > 0
    });

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
            {processedVideos.length > 0 ? (
                <>
                    {/* Vista Grid con Virtualización */}
                    {viewMode === 'grid' && (
                        <div style={{ height: 'calc(100vh - 300px)', minHeight: '400px' }}>
                            <VirtualizedGrid
                                ref={scrollRef}
                                videos={processedVideos}
                                onUpdate={loadSearchResults}
                                onVisibleIndexChange={setVisibleIndex}
                            />
                        </div>
                    )}

                    {/* Vista Lista - Formato compacto */}
                    {viewMode === 'list' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '8px' }}>
                            {processedVideos.map((video) => (
                                <VideoCardList key={video.id} video={video} onUpdate={loadSearchResults} />
                            ))}
                        </div>
                    )}
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

export default SearchPage;