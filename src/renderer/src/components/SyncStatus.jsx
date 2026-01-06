import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';

function SyncStatus() {
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    const [syncMessage, setSyncMessage] = useState('');
    const [stats, setStats] = useState(null);

    useEffect(() => {
        loadStats();

        // Escuchar eventos de sincronización
        const unsubscribeProgress = window.electronAPI.onSyncProgress((data) => {
            setSyncing(true);
            setSyncMessage(`${data.type}: ${data.filename || ''}`);
        });

        const unsubscribeComplete = window.electronAPI.onSyncComplete((data) => {
            setSyncing(false);
            setLastSync(new Date());
            setSyncMessage('Sincronización completada');
            loadStats();

            // Limpiar mensaje después de 3 segundos
            setTimeout(() => setSyncMessage(''), 3000);
        });

        const unsubscribeFileChanged = window.electronAPI.onFileChanged((data) => {
            loadStats();
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

    const handleManualSync = async () => {
        setSyncing(true);
        setSyncMessage('Iniciando sincronización...');
        try {
            await window.electronAPI.scanAllFolders();
        } catch (error) {
            console.error('Error en sincronización:', error);
            setSyncMessage('Error en sincronización');
        }
    };

    const getStatusIcon = () => {
        if (syncing) {
            return <Loader size={16} className="spinning" color="#3ea6ff" />;
        }
        if (stats && stats.unavailable > 0) {
            return <AlertCircle size={16} color="#ff9800" />;
        }
        if (stats && stats.available > 0) {
            return <CheckCircle size={16} color="#4caf50" />;
        }
        return <XCircle size={16} color="#666" />;
    };

    const getStatusText = () => {
        if (syncing) {
            return 'Sincronizando...';
        }
        if (!stats) {
            return 'Sin datos';
        }
        if (stats.unavailable > 0) {
            return `${stats.unavailable} no disponibles`;
        }
        return `${stats.available} videos`;
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#212121',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            minWidth: '250px',
            zIndex: 1000
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: syncMessage ? '8px' : '0'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    {getStatusIcon()}
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>
                        {getStatusText()}
                    </span>
                </div>

                <button
                    onClick={handleManualSync}
                    disabled={syncing}
                    style={{
                        padding: '6px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: syncing ? 'not-allowed' : 'pointer',
                        opacity: syncing ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        color: '#fff'
                    }}
                    title="Sincronizar ahora"
                >
                    <RefreshCw size={16} className={syncing ? 'spinning' : ''} />
                </button>
            </div>

            {syncMessage && (
                <div style={{
                    fontSize: '12px',
                    color: '#aaa',
                    marginTop: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {syncMessage}
                </div>
            )}

            {lastSync && !syncing && (
                <div style={{
                    fontSize: '11px',
                    color: '#666',
                    marginTop: '4px'
                }}>
                    Última sincronización: {lastSync.toLocaleTimeString()}
                </div>
            )}

            {stats && (
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid #303030',
                    fontSize: '12px'
                }}>
                    <div style={{ color: '#4caf50' }}>
                        ✓ {stats.available}
                    </div>
                    <div style={{ color: '#ff4444' }}>
                        ✗ {stats.unavailable}
                    </div>
                    <div style={{ color: '#aaa' }}>
                        Total: {stats.total}
                    </div>
                </div>
            )}
        </div>
    );
}

export default SyncStatus;