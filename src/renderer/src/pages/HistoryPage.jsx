// src/renderer/src/pages/HistoryPage.jsx
// Página de Historial de Reproducción - Fase 4
// Incluye historial navegable y métricas de sesión

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    History,
    Search,
    Calendar,
    Trash2,
    Play,
    Clock,
    CheckCircle,
    AlertTriangle,
    X,
    BarChart3,
    List
} from 'lucide-react';
import SessionMetrics from '../components/SessionMetrics';

/**
 * Formatea segundos a formato legible
 */
function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formatea fecha a formato legible
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
        return 'Hoy';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
        return 'Ayer';
    } else {
        return date.toLocaleDateString('es-ES', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
    }
}

/**
 * Formatea hora
 */
function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Componente de item individual del historial
 */
function HistoryItem({ item, onPlay, onDelete }) {
    const [isHovered, setIsHovered] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const progress = item.percentage_watched || 0;
    const isCompleted = progress >= 90;
    const thumbnailUrl = item.thumbnail ? `file://${item.thumbnail}` : null;

    return (
        <div
            style={{
                display: 'flex',
                gap: '16px',
                padding: '12px',
                backgroundColor: isHovered ? '#2a2a2a' : 'transparent',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setShowDeleteConfirm(false);
            }}
            onClick={() => onPlay(item)}
        >
            {/* Thumbnail */}
            <div style={{
                position: 'relative',
                width: '160px',
                minWidth: '160px',
                aspectRatio: '16/9',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: '#333'
            }}>
                {thumbnailUrl ? (
                    <img
                        src={thumbnailUrl}
                        alt={item.title}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
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
                        <Play size={24} color="#666" />
                    </div>
                )}

                {isHovered && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Play size={32} color="white" fill="white" />
                    </div>
                )}

                <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '4px',
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    fontSize: '11px'
                }}>
                    {formatDuration(item.duration)}
                </div>

                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '3px',
                    backgroundColor: 'rgba(255,255,255,0.3)'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        backgroundColor: isCompleted ? '#10b981' : '#ff0000'
                    }} />
                </div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {item.title || item.filename}
                </h3>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12px',
                    color: '#aaa',
                    marginBottom: '4px'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} />
                        {formatTime(item.watched_at)}
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isCompleted ? (
                            <>
                                <CheckCircle size={12} color="#10b981" />
                                <span style={{ color: '#10b981' }}>Completado</span>
                            </>
                        ) : (
                            <span>{Math.round(progress)}% visto</span>
                        )}
                    </span>
                </div>

                <p style={{
                    fontSize: '12px',
                    color: '#666',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {formatDuration(item.progress_seconds)} de {formatDuration(item.duration)}
                </p>
            </div>

            {/* Botón eliminar */}
            {isHovered && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {showDeleteConfirm ? (
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '12px', color: '#aaa' }}>¿Eliminar?</span>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(item.id);
                                }}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#ef4444',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                Sí
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(false);
                                }}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#333',
                                    border: 'none',
                                    borderRadius: '4px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                }}
                            >
                                No
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowDeleteConfirm(true);
                            }}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#aaa',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#333';
                                e.target.style.color = '#ef4444';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = '#aaa';
                            }}
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

/**
 * Modal de confirmación para limpiar historial
 */
function ClearHistoryModal({ isOpen, onConfirm, onCancel }) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={onCancel}
        >
            <div
                style={{
                    backgroundColor: '#212121',
                    borderRadius: '16px',
                    padding: '24px',
                    maxWidth: '400px',
                    width: '90%'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: '#ef444420',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <AlertTriangle size={24} color="#ef4444" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '18px', margin: 0 }}>¿Limpiar historial?</h3>
                        <p style={{ fontSize: '14px', color: '#aaa', margin: 0 }}>
                            Esta acción no se puede deshacer
                        </p>
                    </div>
                </div>

                <p style={{ fontSize: '14px', color: '#aaa', marginBottom: '24px' }}>
                    Se eliminarán todas las entradas del historial y el progreso guardado.
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#333',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#ef4444',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Limpiar historial
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Página principal de Historial
 */
function HistoryPage() {
    const navigate = useNavigate();

    // Estado
    const [activeTab, setActiveTab] = useState('history'); // 'history' | 'metrics'
    const [groupedHistory, setGroupedHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('all');
    const [showClearModal, setShowClearModal] = useState(false);
    const [stats, setStats] = useState(null);

    // Calcular rango de fechas según filtro
    const getDateRange = useCallback(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (dateFilter) {
            case 'today':
                return {
                    start: today.toISOString(),
                    end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
                };
            case 'week':
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                return {
                    start: weekAgo.toISOString(),
                    end: now.toISOString()
                };
            case 'month':
                const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                return {
                    start: monthAgo.toISOString(),
                    end: now.toISOString()
                };
            default:
                return null;
        }
    }, [dateFilter]);

    // Cargar historial
    const loadHistory = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let result;

            if (searchQuery.trim()) {
                result = await window.electronAPI.history.search(searchQuery);
            } else {
                const dateRange = getDateRange();
                if (dateRange) {
                    result = await window.electronAPI.history.getByDateRange(
                        dateRange.start,
                        dateRange.end
                    );
                } else {
                    result = await window.electronAPI.history.getGroupedByDate(30);
                }
            }

            if (result.success) {
                if (result.grouped) {
                    setGroupedHistory(result.grouped);
                } else if (result.history) {
                    const grouped = groupByDate(result.history);
                    setGroupedHistory(grouped);
                }
            } else {
                setError(result.error);
            }

            const statsResult = await window.electronAPI.history.getWatchStats();
            if (statsResult.success) {
                setStats(statsResult.stats);
            }

        } catch (err) {
            console.error('Error cargando historial:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, getDateRange]);

    // Agrupar historial por fecha
    const groupByDate = (history) => {
        const groups = {};

        history.forEach(item => {
            const date = new Date(item.watched_at);
            const dateKey = date.toISOString().split('T')[0];

            if (!groups[dateKey]) {
                groups[dateKey] = {
                    date: dateKey,
                    items: [],
                    count: 0,
                    totalSeconds: 0
                };
            }

            groups[dateKey].items.push(item);
            groups[dateKey].count++;
            groups[dateKey].totalSeconds += item.progress_seconds || 0;
        });

        return Object.values(groups).sort((a, b) =>
            new Date(b.date) - new Date(a.date)
        );
    };

    useEffect(() => {
        if (activeTab === 'history') {
            loadHistory();
        }
    }, [loadHistory, activeTab]);

    // Manejar reproducción
    const handlePlay = (item) => {
        navigate(`/video/${item.video_id}?resume=${item.progress_seconds}`);
    };

    // Eliminar entrada
    const handleDelete = async (historyId) => {
        try {
            const result = await window.electronAPI.history.deleteEntry(historyId);
            if (result.success) {
                loadHistory();
            }
        } catch (err) {
            console.error('Error eliminando entrada:', err);
        }
    };

    // Limpiar todo el historial
    const handleClearAll = async () => {
        try {
            const result = await window.electronAPI.history.clearAll();
            if (result.success) {
                setGroupedHistory([]);
                setShowClearModal(false);
                setStats(null);
            }
        } catch (err) {
            console.error('Error limpiando historial:', err);
        }
    };

    // Búsqueda con debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'history') {
                loadHistory();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const totalItems = groupedHistory.reduce((sum, group) => sum + group.items.length, 0);

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
                        height: '32px',
                        backgroundColor: '#3ea6ff',
                        borderRadius: '2px'
                    }} />
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>
                            Historial de Reproducción
                        </h1>
                        {stats && (
                            <p style={{ fontSize: '14px', color: '#aaa', margin: '4px 0 0 0' }}>
                                {stats.totalWatches} reproducciones • {stats.totalHoursWatched}h vistas
                            </p>
                        )}
                    </div>
                </div>

                {activeTab === 'history' && totalItems > 0 && (
                    <button
                        onClick={() => setShowClearModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: 'transparent',
                            border: '1px solid #444',
                            borderRadius: '8px',
                            color: '#aaa',
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.borderColor = '#ef4444';
                            e.target.style.color = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.borderColor = '#444';
                            e.target.style.color = '#aaa';
                        }}
                    >
                        <Trash2 size={16} />
                        Limpiar historial
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                borderBottom: '1px solid #333',
                paddingBottom: '12px'
            }}>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        backgroundColor: activeTab === 'history' ? '#3ea6ff' : 'transparent',
                        border: 'none',
                        borderRadius: '20px',
                        color: activeTab === 'history' ? 'white' : '#aaa',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: activeTab === 'history' ? '500' : '400',
                        transition: 'all 0.2s'
                    }}
                >
                    <List size={18} />
                    Historial
                </button>
                <button
                    onClick={() => setActiveTab('metrics')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        backgroundColor: activeTab === 'metrics' ? '#3ea6ff' : 'transparent',
                        border: 'none',
                        borderRadius: '20px',
                        color: activeTab === 'metrics' ? 'white' : '#aaa',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: activeTab === 'metrics' ? '500' : '400',
                        transition: 'all 0.2s'
                    }}
                >
                    <BarChart3 size={18} />
                    Métricas
                </button>
            </div>

            {/* Contenido según tab */}
            {activeTab === 'metrics' ? (
                <SessionMetrics />
            ) : (
                <>
                    {/* Filtros y búsqueda */}
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginBottom: '24px',
                        flexWrap: 'wrap'
                    }}>
                        {/* Búsqueda */}
                        <div style={{
                            flex: '1',
                            minWidth: '250px',
                            position: 'relative'
                        }}>
                            <Search
                                size={18}
                                color="#666"
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)'
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Buscar en historial..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px 10px 40px',
                                    backgroundColor: '#212121',
                                    border: '1px solid #333',
                                    borderRadius: '8px',
                                    color: 'white',
                                    fontSize: '14px',
                                    outline: 'none'
                                }}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#666',
                                        padding: '4px'
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {/* Filtros de fecha */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[
                                { value: 'all', label: 'Todo' },
                                { value: 'today', label: 'Hoy' },
                                { value: 'week', label: 'Esta semana' },
                                { value: 'month', label: 'Este mes' }
                            ].map((filter) => (
                                <button
                                    key={filter.value}
                                    onClick={() => setDateFilter(filter.value)}
                                    style={{
                                        padding: '10px 16px',
                                        backgroundColor: dateFilter === filter.value ? '#3ea6ff' : '#212121',
                                        border: 'none',
                                        borderRadius: '20px',
                                        color: dateFilter === filter.value ? 'white' : '#aaa',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: dateFilter === filter.value ? '500' : '400',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Estado de carga */}
                    {loading && (
                        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                border: '3px solid #333',
                                borderTopColor: '#3ea6ff',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 16px'
                            }} />
                            <p style={{ color: '#aaa' }}>Cargando historial...</p>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            backgroundColor: '#331111',
                            borderRadius: '12px'
                        }}>
                            <p style={{ color: '#ff6b6b', marginBottom: '12px' }}>
                                Error al cargar historial: {error}
                            </p>
                            <button
                                onClick={loadHistory}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#3ea6ff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {/* Historial vacío */}
                    {!loading && !error && groupedHistory.length === 0 && (
                        <div style={{
                            textAlign: 'center',
                            padding: '60px 20px',
                            backgroundColor: '#212121',
                            borderRadius: '12px'
                        }}>
                            <History size={48} color="#666" style={{ marginBottom: '16px' }} />
                            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>
                                {searchQuery
                                    ? 'No se encontraron resultados'
                                    : 'No hay historial de reproducción'}
                            </h3>
                            <p style={{ color: '#aaa', fontSize: '14px' }}>
                                {searchQuery
                                    ? `No hay videos que coincidan con "${searchQuery}"`
                                    : 'Los videos que reproduzcas aparecerán aquí'}
                            </p>
                        </div>
                    )}

                    {/* Lista de historial */}
                    {!loading && !error && groupedHistory.length > 0 && (
                        <div>
                            {groupedHistory.map((group) => (
                                <div key={group.date} style={{ marginBottom: '32px' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        marginBottom: '12px',
                                        paddingBottom: '12px',
                                        borderBottom: '1px solid #333'
                                    }}>
                                        <Calendar size={18} color="#aaa" />
                                        <h2 style={{
                                            fontSize: '16px',
                                            fontWeight: '500',
                                            margin: 0,
                                            textTransform: 'capitalize'
                                        }}>
                                            {formatDate(group.date)}
                                        </h2>
                                        <span style={{
                                            fontSize: '13px',
                                            color: '#666',
                                            backgroundColor: '#333',
                                            padding: '2px 8px',
                                            borderRadius: '12px'
                                        }}>
                                            {group.items.length} video{group.items.length !== 1 ? 's' : ''}
                                        </span>
                                        <span style={{
                                            fontSize: '13px',
                                            color: '#666'
                                        }}>
                                            • {formatDuration(group.totalSeconds)} visto
                                        </span>
                                    </div>

                                    <div>
                                        {group.items.map((item) => (
                                            <HistoryItem
                                                key={item.id}
                                                item={item}
                                                onPlay={handlePlay}
                                                onDelete={handleDelete}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Modal de limpiar */}
            <ClearHistoryModal
                isOpen={showClearModal}
                onConfirm={handleClearAll}
                onCancel={() => setShowClearModal(false)}
            />

            {/* Estilos */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                
                input::placeholder {
                    color: #666;
                }
                
                input:focus {
                    border-color: #3ea6ff;
                }
            `}</style>
        </div>
    );
}

export default HistoryPage;