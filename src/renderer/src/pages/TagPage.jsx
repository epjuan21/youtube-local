// ============================================
// TAG PAGE COMPONENT
// ============================================
// Ubicación: src/renderer/src/pages/TagPage.jsx
// Fecha: 08 de Enero de 2025
// ============================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Hash, Film, Filter, SortAsc } from 'lucide-react';
import VideoCard from '../components/VideoCard';
import TagBadge from '../components/TagBadge';

const TagPage = () => {
    const { tagId } = useParams();
    const navigate = useNavigate();

    // Estados
    const [tag, setTag] = useState(null);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filtros y ordenamiento
    const [sortBy, setSortBy] = useState('title');
    const [filterAvailable, setFilterAvailable] = useState('all'); // 'all' | 'available' | 'unavailable'

    // Opciones de ordenamiento
    const sortOptions = [
        { value: 'title', label: 'Título A-Z' },
        { value: 'title_desc', label: 'Título Z-A' },
        { value: 'views', label: 'Más vistas' },
        { value: 'recent', label: 'Más recientes' },
        { value: 'duration', label: 'Duración' },
        { value: 'size', label: 'Tamaño' }
    ];

    // Cargar datos al montar
    useEffect(() => {
        if (tagId) {
            loadTagData();
        }
    }, [tagId]);

    const loadTagData = async () => {
        setLoading(true);
        setError('');

        try {
            // Cargar información del tag
            const tagResult = await window.electronAPI.tag.getById(parseInt(tagId));
            if (tagResult.success) {
                setTag(tagResult.tag);
            } else {
                setError('Tag no encontrado');
                return;
            }

            // Cargar videos del tag
            const videosResult = await window.electronAPI.tag.getVideos(parseInt(tagId));
            if (videosResult.success) {
                setVideos(videosResult.videos || []);
            }
        } catch (err) {
            console.error('Error cargando datos del tag:', err);
            setError('Error al cargar el tag');
        } finally {
            setLoading(false);
        }
    };

    // Filtrar y ordenar videos
    const getFilteredAndSortedVideos = () => {
        let filtered = [...videos];

        // Filtrar por disponibilidad
        if (filterAvailable === 'available') {
            filtered = filtered.filter(v => v.is_available === 1);
        } else if (filterAvailable === 'unavailable') {
            filtered = filtered.filter(v => v.is_available === 0);
        }

        // Ordenar
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'title':
                    return (a.title || '').localeCompare(b.title || '');
                case 'title_desc':
                    return (b.title || '').localeCompare(a.title || '');
                case 'views':
                    return (b.views || 0) - (a.views || 0);
                case 'recent':
                    return new Date(b.upload_date || 0) - new Date(a.upload_date || 0);
                case 'duration':
                    return (b.duration || 0) - (a.duration || 0);
                case 'size':
                    return (b.file_size || 0) - (a.file_size || 0);
                default:
                    return 0;
            }
        });

        return filtered;
    };

    const filteredVideos = getFilteredAndSortedVideos();

    // Loading state
    if (loading) {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#181818'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '3px solid #333',
                        borderTopColor: '#8b5cf6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ color: '#888', fontSize: '14px' }}>Cargando tag...</p>
                </div>
                <style>{`
                    @keyframes spin {
                        to { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#181818'
            }}>
                <div style={{
                    textAlign: 'center',
                    padding: '40px'
                }}>
                    <Hash size={64} color="#666" style={{ marginBottom: '16px' }} />
                    <h2 style={{ color: '#fff', marginBottom: '8px' }}>{error}</h2>
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            marginTop: '16px',
                            padding: '10px 20px',
                            backgroundColor: '#8b5cf6',
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
            </div>
        );
    }

    return (
        <div style={{
            flex: 1,
            backgroundColor: '#181818',
            overflowY: 'auto'
        }}>
            {/* Header */}
            <div style={{
                padding: '24px 32px',
                borderBottom: '1px solid #2a2a2a',
                background: 'linear-gradient(to bottom, #1f1f1f, #181818)'
            }}>
                {/* Botón volver */}
                <button
                    onClick={() => navigate(-1)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: 'transparent',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        color: '#aaa',
                        cursor: 'pointer',
                        fontSize: '13px',
                        marginBottom: '20px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#555';
                        e.currentTarget.style.color = '#fff';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#333';
                        e.currentTarget.style.color = '#aaa';
                    }}
                >
                    <ArrowLeft size={16} />
                    Volver
                </button>

                {/* Info del tag */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px'
                }}>
                    {/* Icono del tag */}
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '16px',
                        background: `linear-gradient(135deg, ${tag?.color || '#8b5cf6'}80, ${tag?.color || '#8b5cf6'}40)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `2px solid ${tag?.color || '#8b5cf6'}50`
                    }}>
                        <Hash size={40} color={tag?.color || '#8b5cf6'} />
                    </div>

                    <div>
                        <div style={{ marginBottom: '8px' }}>
                            <TagBadge
                                name={tag?.name || 'Tag'}
                                color={tag?.color || '#8b5cf6'}
                                size="lg"
                            />
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            color: '#888',
                            fontSize: '14px'
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Film size={16} />
                                {videos.length} {videos.length === 1 ? 'video' : 'videos'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Controles de filtrado */}
            <div style={{
                padding: '16px 32px',
                borderBottom: '1px solid #2a2a2a',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap'
            }}>
                {/* Ordenar por */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <SortAsc size={16} color="#888" />
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: '#252525',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '13px',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        {sortOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Filtrar disponibilidad */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <Filter size={16} color="#888" />
                    <select
                        value={filterAvailable}
                        onChange={(e) => setFilterAvailable(e.target.value)}
                        style={{
                            padding: '8px 12px',
                            backgroundColor: '#252525',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '13px',
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value="all">Todos</option>
                        <option value="available">Disponibles</option>
                        <option value="unavailable">No disponibles</option>
                    </select>
                </div>

                {/* Contador */}
                <div style={{
                    marginLeft: 'auto',
                    color: '#666',
                    fontSize: '13px'
                }}>
                    Mostrando {filteredVideos.length} de {videos.length} videos
                </div>
            </div>

            {/* Grid de videos */}
            <div style={{ padding: '24px 32px' }}>
                {filteredVideos.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: '#666'
                    }}>
                        <Film size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <h3 style={{ color: '#888', marginBottom: '8px' }}>
                            No hay videos
                        </h3>
                        <p style={{ fontSize: '14px' }}>
                            {filterAvailable !== 'all'
                                ? 'No hay videos que coincidan con el filtro seleccionado'
                                : 'Este tag no tiene videos asignados aún'
                            }
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '24px'
                    }}>
                        {filteredVideos.map(video => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                onUpdate={loadTagData}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TagPage;