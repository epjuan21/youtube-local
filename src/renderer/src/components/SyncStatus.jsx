import { useState, useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, Clock, HardDrive } from 'lucide-react';
import { showToast } from './ToastNotifications';

function SyncStatus() {
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    const [syncMessage, setSyncMessage] = useState('');
    const [stats, setStats] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [syncHistory, setSyncHistory] = useState([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    // Estado para importación en lote
    const [bulkImporting, setBulkImporting] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(null);

    // Ref para evitar actualizaciones después de desmontar
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        loadStats();
        loadSyncHistory();

        // Escuchar eventos de sincronización normal
        const unsubscribeProgress = window.electronAPI.onSyncProgress((data) => {
            if (!isMountedRef.current) return;

            // No mostrar progreso de sync normal durante bulk import
            if (bulkImporting) return;

            setSyncing(true);
            setSyncMessage(`${data.type}: ${data.filename || ''}`);

            if (data.current && data.total) {
                setProgress({ current: data.current, total: data.total });
            }
        });

        const unsubscribeComplete = window.electronAPI.onSyncComplete((event, data) => {
            if (!isMountedRef.current) return;

            // No resetear si estamos en bulk import
            if (bulkImporting) return;

            setSyncing(false);
            setLastSync(new Date());
            setSyncMessage('');
            setProgress({ current: 0, total: 0 });
            loadStats();
            loadSyncHistory();
        });

        const unsubscribeFileChanged = window.electronAPI.onFileChanged((data) => {
            if (!isMountedRef.current) return;
            loadStats();

            if (data.type === 'added') {
                showToast(`Nuevo video detectado: ${data.filename}`, 'info', 3000);
            } else if (data.type === 'deleted') {
                showToast(`Video no disponible: ${data.filename}`, 'warning', 3000);
            }
        });

        // ====== LISTENERS PARA IMPORTACIÓN EN LOTE ======
        let cleanupBulkStart = null;
        let cleanupBulkProgress = null;
        let cleanupBulkComplete = null;
        let cleanupBulkScan = null;

        if (typeof window.electronAPI?.onBulkImportStart === 'function') {
            cleanupBulkStart = window.electronAPI.onBulkImportStart((data) => {
                if (!isMountedRef.current) return;
                console.log('📀 SyncStatus: Bulk import started');
                setBulkImporting(true);
                setSyncing(true);
                setBulkProgress({
                    phase: 'importing',
                    current: 0,
                    total: data.totalFolders,
                    folderName: ''
                });
                setSyncMessage(`Importando carpetas de ${data.drivePath}...`);
            });
        }

        if (typeof window.electronAPI?.onBulkImportProgress === 'function') {
            cleanupBulkProgress = window.electronAPI.onBulkImportProgress((data) => {
                if (!isMountedRef.current) return;
                setBulkProgress({
                    phase: 'importing',
                    current: data.current,
                    total: data.total,
                    folderName: data.folderName
                });
                setProgress({ current: data.current, total: data.total });
                setSyncMessage(`Importando: ${data.folderName}`);
            });
        }

        if (typeof window.electronAPI?.onBulkImportComplete === 'function') {
            cleanupBulkComplete = window.electronAPI.onBulkImportComplete((data) => {
                if (!isMountedRef.current) return;
                console.log('📀 SyncStatus: Bulk import complete, scanning...');
                setBulkProgress(prev => ({
                    ...prev,
                    phase: 'scanning',
                    results: data
                }));
                setSyncMessage(`Escaneando ${data.foldersAdded} carpetas nuevas...`);
            });
        }

        if (typeof window.electronAPI?.onBulkScanComplete === 'function') {
            cleanupBulkScan = window.electronAPI.onBulkScanComplete((data) => {
                if (!isMountedRef.current) return;
                console.log('📀 SyncStatus: Bulk scan complete');
                setBulkImporting(false);
                setSyncing(false);
                setBulkProgress(null);
                setSyncMessage('');
                setProgress({ current: 0, total: 0 });
                setLastSync(new Date());
                loadStats();
                loadSyncHistory();
            });
        }

        return () => {
            isMountedRef.current = false;
            unsubscribeProgress();
            unsubscribeComplete();
            unsubscribeFileChanged();

            if (cleanupBulkStart) cleanupBulkStart();
            if (cleanupBulkProgress) cleanupBulkProgress();
            if (cleanupBulkComplete) cleanupBulkComplete();
            if (cleanupBulkScan) cleanupBulkScan();
        };
    }, [bulkImporting]);

    const loadStats = async () => {
        try {
            const result = await window.electronAPI.getVideoStats();
            if (isMountedRef.current) {
                setStats(result);
            }
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    };

    const loadSyncHistory = async () => {
        try {
            const result = await window.electronAPI.getSyncHistory();
            if (isMountedRef.current && result && result.length > 0) {
                // Mapear los campos correctos de la BD
                const mappedHistory = result.slice(0, 10).map(entry => ({
                    // Campos de la BD: sync_date, videos_added, videos_removed, videos_updated, folder_path
                    timestamp: entry.sync_date,
                    added: entry.videos_added || 0,
                    updated: entry.videos_updated || 0,
                    deleted: entry.videos_removed || 0,
                    folderPath: entry.folder_path,
                    // Considerar exitoso si tiene algún dato
                    success: true
                }));
                setSyncHistory(mappedHistory);
            }
        } catch (error) {
            console.error('Error cargando historial:', error);
        }
    };

    const handleManualSync = async () => {
        if (syncing || bulkImporting) return;

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
        if (syncing || bulkImporting) {
            return (
                <div style={{ animation: 'spin 1s linear infinite', display: 'flex' }}>
                    {bulkImporting ? (
                        <HardDrive size={20} color="#3ea6ff" />
                    ) : (
                        <RefreshCw size={20} color="#3ea6ff" />
                    )}
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
        if (bulkImporting && bulkProgress) {
            if (bulkProgress.phase === 'scanning') {
                return 'Escaneando videos...';
            }
            return `Importando (${bulkProgress.current}/${bulkProgress.total})`;
        }
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

        try {
            const date = new Date(dateString);

            // Verificar si la fecha es válida
            if (isNaN(date.getTime())) {
                return 'Nunca';
            }

            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);

            if (diffMins < 1) return 'Hace un momento';
            if (diffMins < 60) return `Hace ${diffMins} min`;
            if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} horas`;
            return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        } catch (error) {
            return 'Nunca';
        }
    };

    const getFolderName = (folderPath) => {
        if (!folderPath) return '';
        const parts = folderPath.replace(/\\/g, '/').split('/');
        return parts[parts.length - 1] || folderPath;
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
                            {lastSync && !syncing && !bulkImporting && (
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
                            disabled={syncing || bulkImporting}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: (syncing || bulkImporting) ? 'not-allowed' : 'pointer',
                                opacity: (syncing || bulkImporting) ? 0.5 : 1,
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                color: '#fff',
                                transition: 'transform 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (!syncing && !bulkImporting) e.currentTarget.style.transform = 'scale(1.1)';
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
                {(syncing || bulkImporting) && progress.total > 0 && (
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
                                backgroundColor: bulkImporting ? '#10b981' : '#3ea6ff',
                                borderRadius: '2px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    </div>
                )}

                {/* Estadísticas rápidas */}
                {stats && !syncing && !bulkImporting && (
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
                                            <span style={{ 
                                                color: '#aaa',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                maxWidth: '150px'
                                            }}
                                            title={entry.folderPath}
                                            >
                                                {getFolderName(entry.folderPath)}
                                            </span>
                                            <span style={{
                                                color: '#4caf50',
                                                fontWeight: '500'
                                            }}>
                                                ✓
                                            </span>
                                        </div>
                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ color: '#888' }}>
                                                {entry.added > 0 && (
                                                    <span style={{ color: '#4caf50', marginRight: '8px' }}>
                                                        +{entry.added}
                                                    </span>
                                                )}
                                                {entry.updated > 0 && (
                                                    <span style={{ color: '#ff9800', marginRight: '8px' }}>
                                                        ~{entry.updated}
                                                    </span>
                                                )}
                                                {entry.deleted > 0 && (
                                                    <span style={{ color: '#ff4444' }}>
                                                        -{entry.deleted}
                                                    </span>
                                                )}
                                                {entry.added === 0 && entry.updated === 0 && entry.deleted === 0 && (
                                                    <span style={{ color: '#666' }}>Sin cambios</span>
                                                )}
                                            </div>
                                            <span style={{ color: '#666', fontSize: '10px' }}>
                                                {formatTime(entry.timestamp)}
                                            </span>
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