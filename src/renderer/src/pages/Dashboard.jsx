// src/renderer/src/pages/Dashboard.jsx
// Dashboard de Estadísticas - Fase 4
// Muestra KPIs de la biblioteca y Top 10 videos más vistos

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    Film,
    Eye,
    Clock,
    HardDrive,
    TrendingUp,
    Play,
    Star,
    RefreshCw
} from 'lucide-react';

/**
 * Tarjeta de KPI individual
 */
function StatCard({ icon: Icon, label, value, subValue, color, loading }) {
    return (
        <div style={{
            backgroundColor: '#212121',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            minWidth: '200px'
        }}>
            <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '12px',
                backgroundColor: `${color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Icon size={24} color={color} />
            </div>
            <div>
                {loading ? (
                    <>
                        <div style={{
                            width: '80px',
                            height: '28px',
                            backgroundColor: '#333',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            animation: 'pulse 1.5s ease-in-out infinite'
                        }} />
                        <div style={{
                            width: '60px',
                            height: '14px',
                            backgroundColor: '#333',
                            borderRadius: '4px',
                            animation: 'pulse 1.5s ease-in-out infinite'
                        }} />
                    </>
                ) : (
                    <>
                        <div style={{
                            fontSize: '24px',
                            fontWeight: '700',
                            color: '#fff',
                            lineHeight: 1.2
                        }}>
                            {value}
                        </div>
                        <div style={{
                            fontSize: '13px',
                            color: '#aaa'
                        }}>
                            {label}
                        </div>
                        {subValue && (
                            <div style={{
                                fontSize: '11px',
                                color: '#666',
                                marginTop: '2px'
                            }}>
                                {subValue}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

/**
 * Item de video en el Top 10
 */
function TopVideoItem({ video, rank, onClick }) {
    const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const thumbnailUrl = video.thumbnail
        ? `file://${video.thumbnail.replace(/\\/g, '/')}`
        : null;

    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                backgroundColor: '#212121',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#212121'}
        >
            {/* Ranking */}
            <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: rank <= 3 ? '#ffc107' : '#333',
                color: rank <= 3 ? '#000' : '#aaa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '13px',
                flexShrink: 0
            }}>
                {rank}
            </div>

            {/* Thumbnail */}
            <div style={{
                width: '100px',
                height: '56px',
                backgroundColor: '#333',
                borderRadius: '6px',
                overflow: 'hidden',
                flexShrink: 0,
                position: 'relative'
            }}>
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={video.title}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                        }}
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Play size={20} color="#666" />
                    </div>
                )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: '4px'
                }}>
                    {video.title || video.filename || 'Sin título'}
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12px',
                    color: '#aaa'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Eye size={12} />
                        {video.watch_count || video.views || 0} vistas
                    </span>
                    {video.total_time_watched && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {formatDuration(video.total_time_watched)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton para Top Videos
 */
function TopVideoSkeleton() {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px',
            backgroundColor: '#212121',
            borderRadius: '8px'
        }}>
            <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#333',
                animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{
                width: '100px',
                height: '56px',
                backgroundColor: '#333',
                borderRadius: '6px',
                animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <div style={{ flex: 1 }}>
                <div style={{
                    width: '70%',
                    height: '16px',
                    backgroundColor: '#333',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    animation: 'pulse 1.5s ease-in-out infinite'
                }} />
                <div style={{
                    width: '40%',
                    height: '12px',
                    backgroundColor: '#333',
                    borderRadius: '4px',
                    animation: 'pulse 1.5s ease-in-out infinite'
                }} />
            </div>
        </div>
    );
}

/**
 * Componente principal del Dashboard
 */
function Dashboard() {
    const [overview, setOverview] = useState(null);
    const [watchStats, setWatchStats] = useState(null);
    const [topVideos, setTopVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Cargar datos al montar
    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Cargar datos en paralelo
            const [overviewResult, watchStatsResult] = await Promise.all([
                window.electronAPI.stats.getOverview(),
                window.electronAPI.history.getWatchStats()
            ]);

            if (overviewResult.success) {
                setOverview(overviewResult.overview);
            } else {
                console.error('Error en overview:', overviewResult.error);
            }

            if (watchStatsResult.success) {
                setWatchStats(watchStatsResult.stats);
                setTopVideos(watchStatsResult.topVideos || []);
            } else {
                console.error('Error en watchStats:', watchStatsResult.error);
            }

        } catch (err) {
            console.error('Error cargando dashboard:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Formatear números grandes
    const formatNumber = (num) => {
        if (!num) return '0';
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '4px',
                        height: '28px',
                        backgroundColor: '#3ea6ff',
                        borderRadius: '2px'
                    }} />
                    <div>
                        <h1 style={{
                            fontSize: '24px',
                            fontWeight: '600',
                            margin: 0
                        }}>
                            Dashboard
                        </h1>
                        <p style={{
                            fontSize: '13px',
                            color: '#aaa',
                            margin: 0
                        }}>
                            Estadísticas de tu biblioteca de videos
                        </p>
                    </div>
                </div>

                <button
                    onClick={loadDashboardData}
                    disabled={loading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        backgroundColor: '#333',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#444')}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#333'}
                >
                    <RefreshCw size={16} className={loading ? 'spin' : ''} />
                    Actualizar
                </button>
            </div>

            {/* Error */}
            {error && (
                <div style={{
                    padding: '16px',
                    backgroundColor: '#331111',
                    borderRadius: '8px',
                    color: '#ff6b6b',
                    marginBottom: '24px'
                }}>
                    Error al cargar datos: {error}
                </div>
            )}

            {/* KPIs Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '32px'
            }}>
                <StatCard
                    icon={Film}
                    label="Total Videos"
                    value={formatNumber(overview?.totalVideos)}
                    subValue={overview?.unavailableVideos > 0
                        ? `${overview.unavailableVideos} no disponibles`
                        : null}
                    color="#3ea6ff"
                    loading={loading}
                />

                <StatCard
                    icon={Eye}
                    label="Total Vistas"
                    value={formatNumber(overview?.totalViews || watchStats?.totalWatches)}
                    subValue={watchStats?.uniqueVideos
                        ? `${watchStats.uniqueVideos} videos únicos`
                        : null}
                    color="#10b981"
                    loading={loading}
                />

                <StatCard
                    icon={Clock}
                    label="Tiempo Visto"
                    value={watchStats?.totalHoursWatched
                        ? `${watchStats.totalHoursWatched}h`
                        : overview?.totalDurationFormatted || '0h'}
                    subValue={watchStats?.completionRate
                        ? `${watchStats.completionRate}% completados`
                        : null}
                    color="#f59e0b"
                    loading={loading}
                />

                <StatCard
                    icon={HardDrive}
                    label="Espacio en Disco"
                    value={overview?.totalSizeFormatted || '0 GB'}
                    subValue={overview?.availableVideos
                        ? `${overview.availableVideos} disponibles`
                        : null}
                    color="#8b5cf6"
                    loading={loading}
                />
            </div>

            {/* KPIs secundarios */}
            {overview && (
                <div style={{
                    display: 'flex',
                    gap: '24px',
                    marginBottom: '32px',
                    flexWrap: 'wrap'
                }}>
                    {overview.avgRating && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#212121',
                            borderRadius: '20px'
                        }}>
                            <Star size={16} color="#ffc107" fill="#ffc107" />
                            <span style={{ fontSize: '14px' }}>
                                Rating promedio: <strong>{overview.avgRating}/10</strong>
                            </span>
                        </div>
                    )}

                    {overview.categoriesUsed > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#212121',
                            borderRadius: '20px'
                        }}>
                            <span style={{ fontSize: '14px', color: '#aaa' }}>
                                {overview.categoriesUsed} categorías
                            </span>
                        </div>
                    )}

                    {overview.tagsUsed > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#212121',
                            borderRadius: '20px'
                        }}>
                            <span style={{ fontSize: '14px', color: '#aaa' }}>
                                {overview.tagsUsed} tags
                            </span>
                        </div>
                    )}

                    {overview.playlistsCount > 0 && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 16px',
                            backgroundColor: '#212121',
                            borderRadius: '20px'
                        }}>
                            <span style={{ fontSize: '14px', color: '#aaa' }}>
                                {overview.playlistsCount} playlists
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Top 10 Videos */}
            <div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px'
                }}>
                    <TrendingUp size={20} color="#3ea6ff" />
                    <h2 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: 0
                    }}>
                        Top 10 Videos Más Vistos
                    </h2>
                </div>

                {loading ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <TopVideoSkeleton key={i} />
                        ))}
                    </div>
                ) : topVideos.length > 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        {topVideos.map((video, index) => (
                            <Link
                                key={video.id}
                                to={`/video/${video.id}`}
                                style={{ textDecoration: 'none', color: 'inherit' }}
                            >
                                <TopVideoItem
                                    video={video}
                                    rank={index + 1}
                                />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div style={{
                        padding: '40px 20px',
                        backgroundColor: '#212121',
                        borderRadius: '12px',
                        textAlign: 'center'
                    }}>
                        <Eye size={40} color="#444" style={{ marginBottom: '12px' }} />
                        <p style={{ color: '#aaa', margin: 0 }}>
                            Aún no hay videos vistos. Comienza a reproducir videos para ver estadísticas aquí.
                        </p>
                    </div>
                )}
            </div>

            {/* Estilos */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
}

export default Dashboard;
