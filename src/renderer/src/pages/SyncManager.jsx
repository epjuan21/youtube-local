import { useState, useEffect, useRef } from 'react';
import { FolderPlus, RefreshCw, Trash2, CheckCircle, XCircle, Video } from 'lucide-react';
import { showToast } from '../components/ToastNotifications';

function SyncManager() {
    const [folders, setFolders] = useState([]);
    const [syncing, setSyncing] = useState(false);
    const [syncingFolder, setSyncingFolder] = useState(null);
    const [stats, setStats] = useState(null);
    const [folderVideoCounts, setFolderVideoCounts] = useState({});

    const syncCompleteListenerRef = useRef(null);
    const hasShownToastRef = useRef(false);

    useEffect(() => {
        loadFolders();
        loadStats();

        if (syncCompleteListenerRef.current) {
            return;
        }

        const handleSyncComplete = (event, data) => {
            console.log('📊 Sync complete received:', data);

            // Prevenir toasts duplicados
            const eventId = JSON.stringify(data);
            if (hasShownToastRef.current === eventId) {
                console.log('⚠️ Toast duplicado prevenido');
                return;
            }
            hasShownToastRef.current = eventId;

            setTimeout(() => {
                hasShownToastRef.current = false;
            }, 2000);

            // ✅ VALIDACIÓN MÁS ESTRICTA
            let shouldShowToast = false;
            let statsToShow = null;

            // Si es sincronización de una carpeta específica
            if (data.folderId && data.stats) {
                console.log('Type: Single folder sync');
                const stats = data.stats;

                // ✅ SOLO mostrar si hay cambios REALES
                if (stats.added > 0 || stats.updated > 0 || stats.removed > 0) {
                    shouldShowToast = true;
                    statsToShow = stats;
                    console.log('✅ Has changes, will show toast');
                } else {
                    console.log('⏭️ No changes (0,0,0), NOT showing toast');
                }
            }

            // Si es sincronización de todas las carpetas
            else if (data.results && Array.isArray(data.results)) {
                console.log('Type: Multiple folders sync, count:', data.results.length);

                let totalAdded = 0;
                let totalUpdated = 0;
                let totalRemoved = 0;

                data.results.forEach((result, index) => {
                    console.log(`Result ${index}:`, result.stats);
                    if (result.stats) {
                        totalAdded += result.stats.added || 0;
                        totalUpdated += result.stats.updated || 0;
                        totalRemoved += result.stats.removed || 0;
                    }
                });

                console.log('Totals:', { totalAdded, totalUpdated, totalRemoved });

                // ✅ SOLO mostrar si hay cambios REALES
                if (totalAdded > 0 || totalUpdated > 0 || totalRemoved > 0) {
                    shouldShowToast = true;
                    statsToShow = {
                        added: totalAdded,
                        updated: totalUpdated,
                        removed: totalRemoved
                    };
                    console.log('✅ Has changes, will show toast');
                } else {
                    console.log('⏭️ No changes (0,0,0), NOT showing toast');
                }
            }

            // ✅ MOSTRAR TOAST SOLO SI PASÓ LAS VALIDACIONES
            if (shouldShowToast && statsToShow) {
                console.log('🎨 Showing toast with stats:', statsToShow);
                showSyncToast(statsToShow);
            } else {
                console.log('🚫 NOT showing toast - no changes detected');
            }

            // Recargar datos
            loadStats();
            loadFolders();
        };

        if (typeof window.electronAPI?.onSyncComplete === 'function') {
            const cleanup = window.electronAPI.onSyncComplete(handleSyncComplete);
            syncCompleteListenerRef.current = cleanup;
            console.log('✅ Listener de sync-complete registrado');
        }

        return () => {
            if (syncCompleteListenerRef.current) {
                console.log('🧹 Limpiando listener de sync-complete');
                if (typeof syncCompleteListenerRef.current === 'function') {
                    syncCompleteListenerRef.current();
                }
                syncCompleteListenerRef.current = null;
            }
        };
    }, []);

    const showSyncToast = (stats) => {
        const { added = 0, updated = 0, removed = 0 } = stats;

        console.log('🎨 showSyncToast called with:', stats);

        // ✅ VALIDACIÓN ADICIONAL: No mostrar si todo es 0
        if (added === 0 && updated === 0 && removed === 0) {
            console.log('🚫 showSyncToast: All zeros, aborting');
            return;
        }

        const parts = [];
        if (added > 0) parts.push(`${added} agregado${added !== 1 ? 's' : ''}`);
        if (updated > 0) parts.push(`${updated} actualizado${updated !== 1 ? 's' : ''}`);
        if (removed > 0) parts.push(`${removed} no disponible${removed !== 1 ? 's' : ''}`);

        if (parts.length === 0) {
            console.log('🚫 showSyncToast: No parts to show, aborting');
            return;
        }

        const message = `Sincronización completada: ${parts.join(', ')}`;
        const type = 'success';

        console.log('✅ Showing toast:', message);
        showToast(message, type, 5000);
    };

    const loadFolders = async () => {
        const result = await window.electronAPI.getWatchFolders();
        setFolders(result);
        loadVideoCounts(result);
    };

    const loadVideoCounts = async (foldersData) => {
        const counts = {};

        for (const folder of foldersData) {
            const videos = await window.electronAPI.getVideos({
                onlyAvailable: false
            });

            const folderVideos = videos.filter(v => v.watch_folder_id === folder.id);
            const availableCount = folderVideos.filter(v => v.is_available === 1).length;
            const unavailableCount = folderVideos.filter(v => v.is_available === 0).length;

            counts[folder.id] = {
                total: folderVideos.length,
                available: availableCount,
                unavailable: unavailableCount
            };
        }

        setFolderVideoCounts(counts);
    };

    const loadStats = async () => {
        const result = await window.electronAPI.getVideoStats();
        setStats(result);
    };

    const handleAddFolder = async () => {
        const folderPath = await window.electronAPI.selectFolder();
        if (folderPath) {
            try {
                console.log('📂 Adding folder:', folderPath);
                await window.electronAPI.addWatchFolder(folderPath);
                showToast('Carpeta agregada exitosamente', 'success', 3000);

                loadFolders();
                loadStats();
            } catch (error) {
                console.error('Error agregando carpeta:', error);
                showToast(`Error: ${error.message}`, 'error');
            }
        }
    };

    const handleRemoveFolder = async (id) => {
        if (confirm('¿Eliminar esta carpeta? Los videos se eliminarán permanentemente de la base de datos.')) {
            try {
                await window.electronAPI.removeWatchFolder(id);
                showToast('Carpeta eliminada exitosamente', 'success');
                loadFolders();
                loadStats();
            } catch (error) {
                console.error('Error eliminando carpeta:', error);
                showToast(`Error al eliminar: ${error.message}`, 'error');
            }
        }
    };

    const handleSyncAll = async () => {
        setSyncing(true);
        try {
            console.log('🔄 Syncing all folders...');
            showToast('Iniciando sincronización de todas las carpetas...', 'info', 2000);
            await window.electronAPI.scanAllFolders();
        } catch (error) {
            console.error('Error sincronizando:', error);
            showToast(`Error al sincronizar: ${error.message}`, 'error');
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncFolder = async (folderId) => {
        setSyncingFolder(folderId);
        try {
            console.log('🔄 Syncing folder:', folderId);
            showToast('Iniciando sincronización...', 'info', 2000);
            await window.electronAPI.scanFolder(folderId);
        } catch (error) {
            console.error('Error sincronizando carpeta:', error);
            showToast(`Error al sincronizar: ${error.message}`, 'error');
        } finally {
            setSyncingFolder(null);
        }
    };

    return (
        <div style={{ maxWidth: '1000px' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
            }}>
                <h1 style={{ fontSize: '24px' }}>Sincronización de Videos</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={handleAddFolder}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: '#3ea6ff',
                            border: 'none',
                            borderRadius: '18px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        <FolderPlus size={18} />
                        Agregar Carpeta
                    </button>
                    <button
                        onClick={handleSyncAll}
                        disabled={syncing}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: '#3f3f3f',
                            border: 'none',
                            borderRadius: '18px',
                            color: '#fff',
                            cursor: syncing ? 'not-allowed' : 'pointer',
                            fontWeight: '500',
                            opacity: syncing ? 0.6 : 1
                        }}
                    >
                        <RefreshCw size={18} />
                        {syncing ? 'Sincronizando...' : 'Sincronizar Todo'}
                    </button>
                </div>
            </div>

            {stats && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        backgroundColor: '#212121',
                        padding: '20px',
                        borderRadius: '12px'
                    }}>
                        <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px' }}>
                            Total de Videos
                        </p>
                        <p style={{ fontSize: '32px', fontWeight: '600' }}>{stats.total}</p>
                    </div>
                    <div style={{
                        backgroundColor: '#212121',
                        padding: '20px',
                        borderRadius: '12px'
                    }}>
                        <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px' }}>
                            Disponibles
                        </p>
                        <p style={{ fontSize: '32px', fontWeight: '600', color: '#3ea6ff' }}>
                            {stats.available}
                        </p>
                    </div>
                    <div style={{
                        backgroundColor: '#212121',
                        padding: '20px',
                        borderRadius: '12px'
                    }}>
                        <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '8px' }}>
                            No Disponibles
                        </p>
                        <p style={{ fontSize: '32px', fontWeight: '600', color: '#ff4444' }}>
                            {stats.unavailable}
                        </p>
                    </div>
                </div>
            )}

            <div>
                <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Carpetas Monitoreadas</h2>
                {folders.length === 0 ? (
                    <div style={{
                        backgroundColor: '#212121',
                        padding: '40px',
                        borderRadius: '12px',
                        textAlign: 'center'
                    }}>
                        <p style={{ color: '#aaa' }}>
                            No hay carpetas configuradas. Agrega una carpeta para comenzar.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {folders.map((folder) => {
                            const videoCount = folderVideoCounts[folder.id] || { total: 0, available: 0, unavailable: 0 };
                            const isSyncingThis = syncingFolder === folder.id;

                            return (
                                <div
                                    key={folder.id}
                                    style={{
                                        backgroundColor: '#212121',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            {folder.is_active ? (
                                                <CheckCircle size={16} color="#3ea6ff" />
                                            ) : (
                                                <XCircle size={16} color="#ff4444" />
                                            )}
                                            <span style={{ fontWeight: '500' }}>{folder.folder_path}</span>
                                        </div>

                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            marginTop: '8px'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontSize: '13px'
                                            }}>
                                                <Video size={14} color="#aaa" />
                                                <span style={{ color: '#aaa' }}>
                                                    {videoCount.total} video{videoCount.total !== 1 ? 's' : ''}
                                                </span>
                                                {videoCount.available > 0 && (
                                                    <span style={{ color: '#4caf50', marginLeft: '4px' }}>
                                                        ({videoCount.available} disponible{videoCount.available !== 1 ? 's' : ''})
                                                    </span>
                                                )}
                                                {videoCount.unavailable > 0 && (
                                                    <span style={{ color: '#ff4444', marginLeft: '4px' }}>
                                                        ({videoCount.unavailable} no disponible{videoCount.unavailable !== 1 ? 's' : ''})
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {folder.last_scan && (
                                            <p style={{ color: '#666', fontSize: '11px', marginTop: '6px' }}>
                                                Último escaneo: {new Date(folder.last_scan).toLocaleString()}
                                            </p>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={() => handleSyncFolder(folder.id)}
                                            disabled={isSyncingThis || syncing}
                                            title="Sincronizar esta carpeta"
                                            style={{
                                                padding: '8px 12px',
                                                backgroundColor: isSyncingThis ? '#555' : '#3ea6ff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                cursor: (isSyncingThis || syncing) ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                opacity: (isSyncingThis || syncing) ? 0.6 : 1
                                            }}
                                        >
                                            <RefreshCw
                                                size={16}
                                                style={{
                                                    animation: isSyncingThis ? 'spin 1s linear infinite' : 'none'
                                                }}
                                            />
                                            {isSyncingThis ? 'Sincronizando...' : 'Sincronizar'}
                                        </button>

                                        <button
                                            onClick={() => handleRemoveFolder(folder.id)}
                                            disabled={syncing || isSyncingThis}
                                            title="Eliminar carpeta"
                                            style={{
                                                padding: '8px',
                                                backgroundColor: '#3f3f3f',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: '#ff4444',
                                                cursor: (syncing || isSyncingThis) ? 'not-allowed' : 'pointer',
                                                opacity: (syncing || isSyncingThis) ? 0.5 : 1
                                            }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

export default SyncManager;