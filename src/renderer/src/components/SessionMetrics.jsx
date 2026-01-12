// src/renderer/src/components/SessionMetrics.jsx
// Métricas de Sesión - Fase 4
// Muestra estadísticas de la sesión actual y patrones de visualización

import { useState, useEffect, useCallback } from 'react';
import {
    Clock,
    Play,
    TrendingUp,
    Calendar,
    Sun,
    Sunset,
    Moon,
    Coffee,
    Activity,
    BarChart3,
    Eye,
    CheckCircle,
    Timer,
    Zap
} from 'lucide-react';

/**
 * Formatea segundos a formato legible
 */
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0 min';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes} min`;
}

/**
 * Obtiene el nombre del día de la semana
 */
function getDayName(dayIndex) {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return days[dayIndex];
}

/**
 * Obtiene el período del día según la hora
 */
function getTimePeriod(hour) {
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
}

/**
 * Componente de tarjeta de estadística
 */
function StatCard({ icon: Icon, iconColor, label, value, subValue, trend }) {
    return (
        <div style={{
            backgroundColor: '#212121',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: `${iconColor}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon size={20} color={iconColor} />
                </div>
                {trend && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: trend > 0 ? '#10b981' : '#ef4444'
                    }}>
                        <TrendingUp size={14} style={{
                            transform: trend < 0 ? 'rotate(180deg)' : 'none'
                        }} />
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>

            <div>
                <div style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    marginBottom: '4px'
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
                        fontSize: '12px',
                        color: '#666',
                        marginTop: '4px'
                    }}>
                        {subValue}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Gráfico de barras para distribución por hora
 */
function HourlyChart({ data }) {
    if (!data || data.length === 0) return null;

    // Crear array completo de 24 horas
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
        const found = data.find(d => d.hour === i);
        return { hour: i, count: found?.count || 0 };
    });

    const maxCount = Math.max(...hourlyData.map(d => d.count), 1);

    // Agrupar en períodos del día
    const periods = [
        { name: 'Madrugada', hours: [0, 1, 2, 3, 4], icon: Moon, color: '#6366f1' },
        { name: 'Mañana', hours: [5, 6, 7, 8, 9, 10, 11], icon: Sun, color: '#f59e0b' },
        { name: 'Tarde', hours: [12, 13, 14, 15, 16, 17], icon: Coffee, color: '#10b981' },
        { name: 'Noche', hours: [18, 19, 20, 21, 22, 23], icon: Sunset, color: '#ef4444' }
    ];

    return (
        <div style={{
            backgroundColor: '#212121',
            borderRadius: '12px',
            padding: '20px'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px'
            }}>
                <BarChart3 size={20} color="#3ea6ff" />
                <h3 style={{ fontSize: '16px', fontWeight: '500', margin: 0 }}>
                    Actividad por Hora
                </h3>
            </div>

            {/* Gráfico de barras */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '2px',
                height: '100px',
                marginBottom: '8px'
            }}>
                {hourlyData.map((item) => {
                    const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                    const period = getTimePeriod(item.hour);
                    const colors = {
                        morning: '#f59e0b',
                        afternoon: '#10b981',
                        evening: '#ef4444',
                        night: '#6366f1'
                    };

                    return (
                        <div
                            key={item.hour}
                            style={{
                                flex: 1,
                                height: `${Math.max(height, 2)}%`,
                                backgroundColor: item.count > 0 ? colors[period] : '#333',
                                borderRadius: '2px 2px 0 0',
                                transition: 'height 0.3s ease',
                                cursor: 'pointer',
                                position: 'relative'
                            }}
                            title={`${item.hour}:00 - ${item.count} reproducciones`}
                        />
                    );
                })}
            </div>

            {/* Etiquetas de hora */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: '#666'
            }}>
                <span>0h</span>
                <span>6h</span>
                <span>12h</span>
                <span>18h</span>
                <span>24h</span>
            </div>

            {/* Resumen por período */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px',
                marginTop: '20px'
            }}>
                {periods.map((period) => {
                    const count = period.hours.reduce((sum, h) => {
                        const found = hourlyData.find(d => d.hour === h);
                        return sum + (found?.count || 0);
                    }, 0);
                    const Icon = period.icon;

                    return (
                        <div
                            key={period.name}
                            style={{
                                textAlign: 'center',
                                padding: '12px 8px',
                                backgroundColor: '#181818',
                                borderRadius: '8px'
                            }}
                        >
                            <Icon size={18} color={period.color} style={{ marginBottom: '6px' }} />
                            <div style={{ fontSize: '16px', fontWeight: '600' }}>
                                {count}
                            </div>
                            <div style={{ fontSize: '11px', color: '#666' }}>
                                {period.name}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Gráfico de distribución por día de la semana
 */
function WeeklyChart({ data }) {
    if (!data || data.length === 0) return null;

    // Crear array completo de 7 días
    const weeklyData = Array.from({ length: 7 }, (_, i) => {
        const found = data.find(d => d.day_of_week === i);
        return { day: i, count: found?.count || 0 };
    });

    const maxCount = Math.max(...weeklyData.map(d => d.count), 1);
    const totalViews = weeklyData.reduce((sum, d) => sum + d.count, 0);

    return (
        <div style={{
            backgroundColor: '#212121',
            borderRadius: '12px',
            padding: '20px'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px'
            }}>
                <Calendar size={20} color="#10b981" />
                <h3 style={{ fontSize: '16px', fontWeight: '500', margin: 0 }}>
                    Actividad por Día
                </h3>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px'
            }}>
                {weeklyData.map((item) => {
                    const percentage = totalViews > 0 ? (item.count / totalViews) * 100 : 0;
                    const isWeekend = item.day === 0 || item.day === 6;

                    return (
                        <div
                            key={item.day}
                            style={{
                                textAlign: 'center',
                                padding: '12px 8px',
                                backgroundColor: '#181818',
                                borderRadius: '8px',
                                border: isWeekend ? '1px solid #333' : 'none'
                            }}
                        >
                            <div style={{
                                fontSize: '12px',
                                color: '#666',
                                marginBottom: '8px'
                            }}>
                                {getDayName(item.day)}
                            </div>

                            {/* Barra vertical */}
                            <div style={{
                                height: '60px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'flex-end',
                                marginBottom: '8px'
                            }}>
                                <div style={{
                                    height: `${Math.max((item.count / maxCount) * 100, 5)}%`,
                                    backgroundColor: isWeekend ? '#f59e0b' : '#3ea6ff',
                                    borderRadius: '4px 4px 0 0',
                                    minHeight: '4px',
                                    transition: 'height 0.3s ease'
                                }} />
                            </div>

                            <div style={{
                                fontSize: '14px',
                                fontWeight: '600'
                            }}>
                                {item.count}
                            </div>
                            <div style={{
                                fontSize: '10px',
                                color: '#666'
                            }}>
                                {percentage.toFixed(0)}%
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Componente de estadísticas de sesión actual
 */
function CurrentSession({ sessionStats }) {
    if (!sessionStats) return null;

    const { stats, sessionId } = sessionStats;

    return (
        <div style={{
            backgroundColor: '#212121',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #3ea6ff30'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        animation: 'pulse 2s infinite'
                    }} />
                    <h3 style={{ fontSize: '16px', fontWeight: '500', margin: 0 }}>
                        Sesión Actual
                    </h3>
                </div>
                <span style={{
                    fontSize: '11px',
                    color: '#666',
                    fontFamily: 'monospace'
                }}>
                    {sessionId?.slice(-8)}
                </span>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '28px',
                        fontWeight: '600',
                        color: '#3ea6ff'
                    }}>
                        {stats.videosWatched || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>
                        Videos vistos
                    </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '28px',
                        fontWeight: '600',
                        color: '#10b981'
                    }}>
                        {stats.totalMinutes || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>
                        Minutos
                    </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '28px',
                        fontWeight: '600',
                        color: '#f59e0b'
                    }}>
                        {stats.completed || 0}
                    </div>
                    <div style={{ fontSize: '12px', color: '#aaa' }}>
                        Completados
                    </div>
                </div>
            </div>

            {stats.sessionStart && (
                <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #333',
                    fontSize: '12px',
                    color: '#666',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <Timer size={14} />
                    Inicio: {new Date(stats.sessionStart).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}

/**
 * Componente principal de Métricas de Sesión
 */
function SessionMetrics({ compact = false }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [watchStats, setWatchStats] = useState(null);
    const [sessionStats, setSessionStats] = useState(null);

    // Cargar estadísticas
    const loadStats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Cargar estadísticas generales
            const watchResult = await window.electronAPI.history.getWatchStats();
            if (watchResult.success) {
                setWatchStats(watchResult);
            }

            // Cargar estadísticas de sesión
            const sessionResult = await window.electronAPI.history.getSessionStats();
            if (sessionResult.success) {
                setSessionStats(sessionResult);
            }

        } catch (err) {
            console.error('Error cargando métricas:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadStats();

        // Actualizar cada 30 segundos
        const interval = setInterval(loadStats, 30000);
        return () => clearInterval(interval);
    }, [loadStats]);

    // Estado de carga
    if (loading && !watchStats) {
        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: compact ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px'
            }}>
                {[1, 2, 3, 4].map((i) => (
                    <div
                        key={i}
                        style={{
                            backgroundColor: '#212121',
                            borderRadius: '12px',
                            padding: '20px',
                            height: '120px',
                            animation: 'pulse 1.5s infinite'
                        }}
                    />
                ))}
            </div>
        );
    }

    // Error
    if (error) {
        return (
            <div style={{
                backgroundColor: '#331111',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                color: '#ff6b6b'
            }}>
                Error al cargar métricas: {error}
            </div>
        );
    }

    // Sin datos
    if (!watchStats?.stats) {
        return (
            <div style={{
                backgroundColor: '#212121',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center'
            }}>
                <Activity size={40} color="#666" style={{ marginBottom: '12px' }} />
                <p style={{ color: '#aaa', margin: 0 }}>
                    No hay datos de visualización todavía
                </p>
            </div>
        );
    }

    const { stats, byHour, byDayOfWeek, topVideos } = watchStats;

    // Vista compacta (para sidebar o widget)
    if (compact) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <CurrentSession sessionStats={sessionStats} />

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px'
                }}>
                    <StatCard
                        icon={Eye}
                        iconColor="#3ea6ff"
                        label="Total reproducciones"
                        value={stats.totalWatches}
                    />
                    <StatCard
                        icon={Clock}
                        iconColor="#10b981"
                        label="Horas vistas"
                        value={`${stats.totalHoursWatched}h`}
                    />
                </div>
            </div>
        );
    }

    // Vista completa
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{
                    width: '4px',
                    height: '28px',
                    backgroundColor: '#f59e0b',
                    borderRadius: '2px'
                }} />
                <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>
                    Métricas de Visualización
                </h2>
            </div>

            {/* Sesión actual */}
            <CurrentSession sessionStats={sessionStats} />

            {/* Estadísticas principales */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px'
            }}>
                <StatCard
                    icon={Eye}
                    iconColor="#3ea6ff"
                    label="Total reproducciones"
                    value={stats.totalWatches}
                    subValue={`${stats.uniqueVideos} videos únicos`}
                />
                <StatCard
                    icon={Clock}
                    iconColor="#10b981"
                    label="Tiempo total visto"
                    value={`${stats.totalHoursWatched}h`}
                    subValue={formatDuration(stats.totalSecondsWatched)}
                />
                <StatCard
                    icon={CheckCircle}
                    iconColor="#f59e0b"
                    label="Tasa de completado"
                    value={`${stats.completionRate}%`}
                    subValue={`${stats.completedWatches} videos completos`}
                />
                <StatCard
                    icon={Zap}
                    iconColor="#8b5cf6"
                    label="Progreso promedio"
                    value={`${Math.round(stats.avgPercentage)}%`}
                    subValue="por reproducción"
                />
            </div>

            {/* Gráficos de distribución */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '16px'
            }}>
                <HourlyChart data={byHour} />
                <WeeklyChart data={byDayOfWeek} />
            </div>

            {/* Top videos más vistos */}
            {topVideos && topVideos.length > 0 && (
                <div style={{
                    backgroundColor: '#212121',
                    borderRadius: '12px',
                    padding: '20px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px'
                    }}>
                        <TrendingUp size={20} color="#ef4444" />
                        <h3 style={{ fontSize: '16px', fontWeight: '500', margin: 0 }}>
                            Más Vistos
                        </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {topVideos.slice(0, 5).map((video, index) => (
                            <div
                                key={video.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px',
                                    backgroundColor: '#181818',
                                    borderRadius: '8px'
                                }}
                            >
                                <span style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: index < 3 ? '#f59e0b' : '#333',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}>
                                    {index + 1}
                                </span>

                                {video.thumbnail && (
                                    <img
                                        src={`file://${video.thumbnail}`}
                                        alt=""
                                        style={{
                                            width: '48px',
                                            height: '27px',
                                            objectFit: 'cover',
                                            borderRadius: '4px'
                                        }}
                                    />
                                )}

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {video.title}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#666' }}>
                                        {video.watch_count} reproducciones
                                    </div>
                                </div>

                                <div style={{
                                    fontSize: '12px',
                                    color: '#aaa'
                                }}>
                                    {formatDuration(video.total_time_watched)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}

export default SessionMetrics;