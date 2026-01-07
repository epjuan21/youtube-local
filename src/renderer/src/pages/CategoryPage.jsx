import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Tag, Loader, AlertCircle, Filter } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import CategoryBadge from '../components/CategoryBadge';

function CategoryPage() {
    const { categoryId } = useParams();
    const navigate = useNavigate();

    const [category, setCategory] = useState(null);
    const [videos, setVideos] = useState([]);
    const [filteredVideos, setFilteredVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados de filtrado y paginación
    const [sortBy, setSortBy] = useState('recent');
    const [filterAvailable, setFilterAvailable] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const videosPerPage = 24;

    useEffect(() => {
        loadData();
    }, [categoryId]);

    useEffect(() => {
        applyFilters();
    }, [videos, sortBy, filterAvailable]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Cargar info de la categoría
            const categoryData = await window.electronAPI.getCategoryById(parseInt(categoryId));

            if (!categoryData) {
                setError('Categoría no encontrada');
                return;
            }

            setCategory(categoryData);

            // Cargar videos de la categoría
            const videosData = await window.electronAPI.getCategoryVideos(parseInt(categoryId));
            setVideos(videosData || []);
        } catch (err) {
            console.error('Error al cargar datos de categoría:', err);
            setError('Error al cargar la categoría');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...videos];

        // Filtrar por disponibilidad
        if (filterAvailable === 'available') {
            filtered = filtered.filter(v => v.is_available);
        } else if (filterAvailable === 'unavailable') {
            filtered = filtered.filter(v => !v.is_available);
        }

        // Ordenar
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'recent':
                    return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest':
                    return new Date(a.created_at) - new Date(b.created_at);
                case 'title':
                    return a.title.localeCompare(b.title);
                case 'views':
                    return (b.views || 0) - (a.views || 0);
                case 'duration':
                    return (b.duration || 0) - (a.duration || 0);
                case 'size':
                    return (b.file_size || 0) - (a.file_size || 0);
                default:
                    return 0;
            }
        });

        setFilteredVideos(filtered);
        setCurrentPage(1); // Reset página al filtrar
    };

    const handleVideoUpdate = async () => {
        await loadData();
    };

    // Paginación
    const indexOfLastVideo = currentPage * videosPerPage;
    const indexOfFirstVideo = indexOfLastVideo - videosPerPage;
    const currentVideos = filteredVideos.slice(indexOfFirstVideo, indexOfLastVideo);
    const totalPages = Math.ceil(filteredVideos.length / videosPerPage);

    const handleLoadMore = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    if (loading) {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '16px',
                color: '#fff'
            }}>
                <Loader size={48} className="animate-spin" style={{ color: '#3b82f6' }} />
                <p style={{ fontSize: '18px' }}>Cargando categoría...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '16px',
                color: '#fff'
            }}>
                <AlertCircle size={48} style={{ color: '#ef4444' }} />
                <p style={{ fontSize: '18px' }}>{error}</p>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}
                >
                    Volver al inicio
                </button>
            </div>
        );
    }

    return (
        <div style={{
            flex: 1,
            padding: '24px',
            overflowY: 'auto',
            color: '#fff'
        }}>
            {/* Header */}
            <div style={{
                marginBottom: '32px'
            }}>
                {/* Botón volver */}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        fontSize: '14px',
                        marginBottom: '16px',
                        padding: '8px',
                        borderRadius: '8px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#fff';
                        e.currentTarget.style.backgroundColor = '#2a2a2a';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = '#999';
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <ArrowLeft size={18} />
                    <span>Volver</span>
                </button>

                {/* Info de categoría */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '12px'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '12px',
                        backgroundColor: category?.color || '#3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '32px'
                    }}>
                        {category?.icon || '📁'}
                    </div>
                    <div>
                        <h1 style={{
                            fontSize: '32px',
                            fontWeight: '700',
                            marginBottom: '4px'
                        }}>
                            {category?.name || 'Categoría'}
                        </h1>
                        <p style={{
                            fontSize: '16px',
                            color: '#999'
                        }}>
                            {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
                            {category?.description && ` · ${category.description}`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#999',
                    fontSize: '14px'
                }}>
                    <Filter size={16} />
                    <span>Filtros:</span>
                </div>

                {/* Ordenar */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        backgroundColor: '#2a2a2a',
                        color: '#fff',
                        border: '1px solid #3f3f3f',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    <option value="recent">Más recientes</option>
                    <option value="oldest">Más antiguos</option>
                    <option value="title">Título (A-Z)</option>
                    <option value="views">Más vistos</option>
                    <option value="duration">Mayor duración</option>
                    <option value="size">Mayor tamaño</option>
                </select>

                {/* Disponibilidad */}
                <select
                    value={filterAvailable}
                    onChange={(e) => setFilterAvailable(e.target.value)}
                    style={{
                        padding: '8px 12px',
                        backgroundColor: '#2a2a2a',
                        color: '#fff',
                        border: '1px solid #3f3f3f',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px'
                    }}
                >
                    <option value="all">Todos</option>
                    <option value="available">Disponibles</option>
                    <option value="unavailable">No disponibles</option>
                </select>
            </div>

            {/* Grid de videos */}
            {filteredVideos.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '64px 24px',
                    color: '#666'
                }}>
                    <Tag size={64} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <p style={{ fontSize: '18px', marginBottom: '8px' }}>
                        No hay videos en esta categoría
                    </p>
                    <p style={{ fontSize: '14px' }}>
                        Agrega videos a esta categoría desde la vista principal
                    </p>
                </div>
            ) : (
                <>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '16px',
                        marginBottom: '32px'
                    }}>
                        {currentVideos.map(video => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                onUpdate={handleVideoUpdate}
                            />
                        ))}
                    </div>

                    {/* Load More */}
                    {currentPage < totalPages && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            marginTop: '32px'
                        }}>
                            <button
                                onClick={handleLoadMore}
                                style={{
                                    padding: '12px 32px',
                                    backgroundColor: '#3b82f6',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#2563eb';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = '#3b82f6';
                                }}
                            >
                                Cargar más ({indexOfLastVideo} de {filteredVideos.length})
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default CategoryPage;