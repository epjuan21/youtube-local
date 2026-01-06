import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { showToast } from './ToastNotifications';

function SyncStatus() {
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    const [syncMessage, setSyncMessage] = useState('');
    const [stats, setStats] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [syncHistory, setSyncHistory] = useState([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    useEffect(() => {
        loadStats();
        loadSyncHistory();

        // Escuchar eventos de sincronización
        const unsubscribeProgress = window.electronAPI.onSyncProgress((data) => {
            setSyncing(true);
            setSyncMessage(`${data.type}: ${data.filename || ''}`);
            
            // Actualizar progreso si viene en los datos
            if (data.current && data.total) {
                setProgress({ current: data.current, total: data.total });
            }
        });

        const unsubscribeComplete = window.electronAPI.onSyncComplete((data) => {
            setSyncing(false);
            setLastSync(new Date());
            setSyncMessage('');
            setProgress({ current: 0, total: 0 });
            loadStats();
            loadSyncHistory();

            // Mostrar notificación toast
            showToast(
                `Sincronización completada: ${data.added || 0} agregados, ${data.updated || 0} actualizados`,
                'success',
                4000
            );
        });

        const unsubscribeFileChanged = window.electronAPI.onFileChanged((data) => {
            loadStats();
            
            // Mostrar toast para cambios importantes
            if (data.type === 'added') {
                showToast(`Nuevo video detectado: ${data.filename}`, 'info', 3000);
            } else if (data.type === 'deleted') {
                showToast(`Video no disponible: ${data.filename}`, 'warning', 3000);
            }
        });

        return () => {
            unsubscribeProgress();
            unsubscribeComplete();
            unsubscribeFileChanged();
        };
    }, []);

    const loadStats = async () => {
        try {
            const result = await window.electronAPI.getVideoStats();
            setStats(result);
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    };

    const loadSyncHistory = async () => {
        try {
            const result = await window.electronAPI.getSyncHistory();
            if (result && result.length > 0) {
                setSyncHistory(result.slice(0, 10)); // Últimos 10
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    };

    const handleManualSync = async () => {
        if (syncing) return;

        setSyncing(true);
        setSyncMessage('Iniciando sincronización...');
        
        showToast('Iniciando sincronización de carpetas', 'info', 2000);

        try {
            await window.electronAPI.scanAllFolders();
        } catch (error) {
            console.error('Error en sincronización:', error);
            setSyncMessage('');
            setSyncing(false);
            showToast('Error en la sincronización', 'error', 4000);
        }
    };

    const getStatusIcon = () => {
        if (syncing) {
            return (
                <div style={{ animation: 'spin 1s linear infinite', display: 'flex' }}>
                    <RefreshCw size={20} color="#3ea6ff" />
                </div>
            );
        }
        if (stats && stats.unavailable > 0) {
            return <AlertCircle size={20} color="#ff9800" />;
        }
        if (stats && stats.available > 0) {
            return <CheckCircle size={20} color="#4caf50" />;
        }
        return <XCircle size={20} color="#666" />;
    };

    const getStatusText = () => {
        if (syncing) {
            return progress.total > 0 
                ? `Sincronizando (${progress.current}/${progress.total})`
                : 'Sincronizando...';
        }
        if (!stats) {
            return 'Sin datos';
        }
        if (stats.unavailable > 0) {
            return `${stats.unavailable} no disponibles`;
        }
        return `${stats.available} videos`;
    };

    const formatTime = (dateString) => {
        if (!dateString) return 'Nunca';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Hace un momento';
        if (diffMins < 60) return `Hace ${diffMins} min`;
        if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} horas`;
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#212121',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            minWidth: '280px',
            maxWidth: '350px',
            zIndex: 1000,
            overflow: 'hidden',
            transition: 'all 0.3s ease'
        }}>
            {/* Header principal */}
            <div 
                style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                }}
                onClick={() => setIsExpanded(!isExpanded)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: syncMessage || (progress.total > 0 && syncing) ? '8px' : '0'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        {getStatusIcon()}
                        <div>
                            <div style={{ 
                                fontSize: '14px', 
                                fontWeight: '500',
                                marginBottom: '2px'
                            }}>
                                {getStatusText()}
                            </div>
                            {lastSync && !syncing && (
                                <div style={{
                                    fontSize: '11px',
                                    color: '#666',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <Clock size={10} />
                                    {formatTime(lastSync)}
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleManualSync();
                            }}
                            disabled={syncing}
                            style={{
                                padding: '6px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: syncing ? 'not-allowed' : 'pointer',
                                opacity: syncing ? 0.5 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                color: '#fff',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (!syncing) e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                            title="Sincronizar ahora"
                        >
                            <RefreshCw size={16} />
                        </button>

                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>

                {/* Mensaje de sincronización */}
                {syncMessage && (
                    <div style={{
                        fontSize: '12px',
                        color: '#aaa',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        paddingLeft: '30px'
                    }}>
                        {syncMessage}
                    </div>
                )}

                {/* Barra de progreso durante sincronización */}
                {syncing && progress.total > 0 && (
                    <div style={{
                        marginTop: '8px',
                        paddingLeft: '30px'
                    }}>
                        <div style={{
                            width: '100%',
                            height: '4px',
                            backgroundColor: '#2a2a2a',
                            borderRadius: '2px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${(progress.current / progress.total) * 100}%`,
                                height: '100%',
                                backgroundColor: '#3ea6ff',
                                borderRadius: '2px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>
                )}

                {/* Estadísticas rápidas */}
                {stats && !syncing && (
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '8px',
                        paddingTop: '8px',
                        paddingLeft: '30px',
                        borderTop: '1px solid #2a2a2a',
                        fontSize: '12px'
                    }}>
                        <div style={{ 
                            color: '#4caf50',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            ✓ {stats.available}
                        </div>
                        <div style={{ 
                            color: '#ff4444',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            ✗ {stats.unavailable}
                        </div>
                        <div style={{ color: '#666' }}>
                            Total: {stats.total}
                        </div>
                    </div>
                )}
            </div>

            {/* Panel expandible con historial */}
            {isExpanded && (
                <div style={{
                    borderTop: '1px solid #2a2a2a',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    animation: 'slideDown 0.3s ease-out'
                }}>
                    <div style={{
                        padding: '12px 16px'
                    }}>
                        <h4 style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#aaa',
                            marginBottom: '8px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            Historial de Sincronización
                        </h4>

                        {syncHistory.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {syncHistory.map((entry, index) => (
                                    <div 
                                        key={index}
                                        style={{
                                            padding: '8px',
                                            backgroundColor: '#1a1a1a',
                                            borderRadius: '6px',
                                            fontSize: '11px'
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginBottom: '4px'
                                        }}>
                                            <span style={{ color: '#aaa' }}>
                                                {formatTime(entry.timestamp)}
                                            </span>
                                            <span style={{ 
                                                color: entry.success ? '#4caf50' : '#ff4444',
                                                fontWeight: '500'
                                            }}>
                                                {entry.success ? '✓' : '✗'}
                                            </span>
                                        </div>
                                        <div style={{ color: '#888' }}>
                                            {entry.added > 0 && `+${entry.added} `}
                                            {entry.updated > 0 && `~${entry.updated} `}
                                            {entry.deleted > 0 && `-${entry.deleted}`}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: '#666',
                                fontSize: '12px'
                            }}>
                                No hay historial disponible
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        max-height: 0;
                    }
                    to {
                        opacity: 1;
                        max-height: 300px;
                    }
                }

                /* Estilo del scrollbar */
                div::-webkit-scrollbar {
                    width: 6px;
                }

                div::-webkit-scrollbar-track {
                    background: #1a1a1a;
                }

                div::-webkit-scrollbar-thumb {
                    background: #3f3f3f;
                    border-radius: 3px;
                }

                div::-webkit-scrollbar-thumb:hover {
                    background: #4f4f4f;
                }
            `}</style>
        </div>
    );
}

export default SyncStatus;