import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import FilterBar from '../components/FilterBar';
import { LoadMoreButton } from '../components/PaginationComponents';
import { usePagination } from '../hooks/usePagination';
import { processVideos } from '../utils/videoSortFilter';
import { LoadingSpinner } from '../components/SkeletonLoaders';

function FavoritesPage() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estados para filtros y ordenamiento
    const [sortBy, setSortBy] = useState('lastviewed-desc'); // Por defecto: vistos recientemente
    const [filterBy, setFilterBy] = useState('all');
    const [viewMode, setViewMode] = useState('grid');

    useEffect(() => {
        loadFavorites();
    }, []);

    const loadFavorites = async () => {
        try {
            setLoading(true);
            const result = await window.electronAPI.getFavorites();
            setFavorites(result);
        } catch (error) {
            console.error('Error cargando favoritos:', error);
        } finally {
            setLoading(false);
        }
    };

    // Procesar videos con filtros y ordenamiento
    const processedVideos = processVideos(favorites, sortBy, filterBy);

    // Paginación - 24 videos por "página"
    const pagination = usePagination(processedVideos, 24);

    // Resetear paginación cuando cambian los filtros
    useEffect(() => {
        pagination.reset();
    }, [sortBy, filterBy]);

    // Callback cuando se quita un favorito
    const handleFavoriteToggle = (isFavorite) => {
        if (!isFavorite) {
            // Si se quitó de favoritos, recargar la lista
            setTimeout(() => loadFavorites(), 500);
        }
    };

    if (loading) {
        return <LoadingSpinner message="Cargando favoritos..." />;
    }

    if (favorites.length === 0) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '60vh',
                textAlign: 'center',
                padding: '20px'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: 'rgba(255, 193, 7, 0.15)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px'
                }}>
                    <Star size={40} color="#ffc107" />
                </div>
                <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>
                    No tienes favoritos aún
                </h2>
                <p style={{ color: '#aaa', fontSize: '16px', marginBottom: '8px' }}>
                    Marca tus videos favoritos haciendo clic en la estrella
                </p>
                <p style={{ color: '#666', fontSize: '14px' }}>
                    Tus videos favoritos aparecerán aquí para acceso rápido
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px'
                }}>
                    <Star size={28} color="#ffc107" fill="#ffc107" />
                    <h2 style={{ fontSize: '24px' }}>
                        Mis Favoritos
                    </h2>
                </div>
                <p style={{ fontSize: '14px', color: '#aaa' }}>
                    {favorites.length} video{favorites.length !== 1 ? 's' : ''} favorito{favorites.length !== 1 ? 's' : ''}
                    {processedVideos.length !== favorites.length && (
                        <span> • {processedVideos.length} después de filtrar</span>
                    )}
                </p>
            </div>

            {/* FilterBar */}
            <FilterBar
                onSortChange={setSortBy}
                onViewChange={setViewMode}
                onFilterChange={setFilterBy}
                currentSort={sortBy}
                currentView={viewMode}
                currentFilter={filterBy}
            />

            {/* Videos */}
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
                                <div key={video.id}>
                                    <VideoCard
                                        video={video}
                                        onFavoriteToggle={handleFavoriteToggle}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Vista Lista */}
                    {viewMode === 'list' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {pagination.items.map((video) => (
                                <VideoCardList
                                    key={video.id}
                                    video={video}
                                    onFavoriteToggle={handleFavoriteToggle}
                                />
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
            ) : (
                // Hay favoritos pero están todos filtrados
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
        </div>
    );
}

// Componente para vista de lista (simplificado)
function VideoCardList({ video, onFavoriteToggle }) {
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
        <div style={{
            display: 'flex',
            gap: '16px',
            padding: '12px',
            backgroundColor: '#212121',
            borderRadius: '8px',
            alignItems: 'center',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
        }}
            onClick={() => window.location.href = `/video/${video.id}`}
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
                </div>
            </div>

            {/* Botón de favorito */}
            <div onClick={(e) => e.stopPropagation()}>
                <FavoriteButton
                    videoId={video.id}
                    isFavorite={true}
                    size={20}
                    onToggle={onFavoriteToggle}
                />
            </div>
        </div>
    );
}

export default FavoritesPage;