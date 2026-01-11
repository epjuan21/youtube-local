import { useState, useEffect, useRef } from 'react';
import { FolderPlus, RefreshCw, Trash2, CheckCircle, XCircle, Video, HardDrive, X, Loader2 } from 'lucide-react';
import { showToast } from '../components/ToastNotifications';

function SyncManager() {
    const [folders, setFolders] = useState([]);
    const [syncing, setSyncing] = useState(false);
    const [syncingFolder, setSyncingFolder] = useState(null);
    const [stats, setStats] = useState(null);
    const [folderVideoCounts, setFolderVideoCounts] = useState({});

    // Estados para importación en lote
    const [bulkImporting, setBulkImporting] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(null);
    const [showBulkModal, setShowBulkModal] = useState(false);

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

            const eventId = JSON.stringify(data);
            if (hasShownToastRef.current === eventId) {
                console.log('⚠️ Toast duplicado prevenido');
                return;
            }
            hasShownToastRef.current = eventId;

            setTimeout(() => {
                hasShownToastRef.current = false;
            }, 2000);

            let shouldShowToast = false;
            let statsToShow = null;

            if (data.folderId && data.stats) {
                console.log('Type: Single folder sync');
                const stats = data.stats;

                if (stats.added > 0 || stats.updated > 0 || stats.removed > 0) {
                    shouldShowToast = true;
                    statsToShow = stats;
                    console.log('✅ Has changes, will show toast');
                } else {
                    console.log('⏭️ No changes (0,0,0), NOT showing toast');
                }
            }
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

            if (shouldShowToast && statsToShow) {
                console.log('🎨 Showing toast with stats:', statsToShow);
                showSyncToast(statsToShow);
            } else {
                console.log('🚫 NOT showing toast - no changes detected');
            }

            loadStats();
            loadFolders();
        };

        if (typeof window.electronAPI?.onSyncComplete === 'function') {
            const cleanup = window.electronAPI.onSyncComplete(handleSyncComplete);
            syncCompleteListenerRef.current = cleanup;
            console.log('✅ Listener de sync-complete registrado');
        }

        // ====== LISTENERS PARA IMPORTACIÓN EN LOTE ======
        let cleanupBulkStart = null;
        let cleanupBulkProgress = null;
        let cleanupBulkComplete = null;
        let cleanupBulkScan = null;

        if (typeof window.electronAPI?.onBulkImportStart === 'function') {
            cleanupBulkStart = window.electronAPI.onBulkImportStart((data) => {
                console.log('📀 Bulk import started:', data);
                setBulkImporting(true);
                setShowBulkModal(true);
                setBulkProgress({
                    phase: 'importing',
                    current: 0,
                    total: data.totalFolders,
                    folderName: '',
                    progress: 0,
                    drivePath: data.drivePath
                });
            });
        }

        if (typeof window.electronAPI?.onBulkImportProgress === 'function') {
            cleanupBulkProgress = window.electronAPI.onBulkImportProgress((data) => {
                console.log('📁 Bulk progress:', data);
                setBulkProgress(prev => ({
                    ...prev,
                    phase: 'importing',
                    current: data.current,
                    total: data.total,
                    folderName: data.folderName,
                    progress: data.progress
                }));
            });
        }

        if (typeof window.electronAPI?.onBulkImportComplete === 'function') {
            cleanupBulkComplete = window.electronAPI.onBulkImportComplete((data) => {
                console.log('✅ Bulk import complete:', data);
                setBulkProgress(prev => ({
                    ...prev,
                    phase: 'scanning',
                    results: data
                }));

                // Mostrar toast de resumen
                if (data.foldersAdded > 0) {
                    showToast(
                        `Importación completada: ${data.foldersAdded} carpetas nuevas, ${data.foldersUpdated} existentes`,
                        'success',
                        5000
                    );
                }

                loadFolders();
                loadStats();
            });
        }

        if (typeof window.electronAPI?.onBulkScanComplete === 'function') {
            cleanupBulkScan = window.electronAPI.onBulkScanComplete((data) => {
                console.log('✅ Bulk scan complete:', data);
                setBulkImporting(false);
                setBulkProgress(prev => ({
                    ...prev,
                    phase: 'complete'
                }));

                // Cerrar modal después de 2 segundos
                setTimeout(() => {
                    setShowBulkModal(false);
                    setBulkProgress(null);
                }, 2000);

                loadFolders();
                loadStats();
            });
        }

        return () => {
            if (syncCompleteListenerRef.current) {
                console.log('🧹 Limpiando listener de sync-complete');
                if (typeof syncCompleteListenerRef.current === 'function') {
                    syncCompleteListenerRef.current();
                }
                syncCompleteListenerRef.current = null;
            }

            // Limpiar listeners de bulk import
            if (cleanupBulkStart) cleanupBulkStart();
            if (cleanupBulkProgress) cleanupBulkProgress();
            if (cleanupBulkComplete) cleanupBulkComplete();
            if (cleanupBulkScan) cleanupBulkScan();
        };
    }, []);

    const showSyncToast = (stats) => {
        const { added = 0, updated = 0, removed = 0 } = stats;

        console.log('🎨 showSyncToast called with:', stats);

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

    // Agregar carpeta individual
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

    // NUEVO: Agregar carpetas desde unidad/disco
    const handleAddDrive = async () => {
        const folderPath = await window.electronAPI.selectFolder();
        if (folderPath) {
            try {
                console.log('📀 Adding drive/bulk:', folderPath);
                setBulkImporting(true);

                const result = await window.electronAPI.addWatchFolderBulk(folderPath);

                console.log('📀 Bulk result:', result);

                // Si fue modo single (no era raíz de unidad)
                if (result.mode === 'single') {
                    setBulkImporting(false);
                    showToast('Carpeta agregada exitosamente', 'success', 3000);
                }
                // Si fue modo bulk pero sin carpetas nuevas
                else if (result.mode === 'bulk' && result.foldersAdded === 0 && result.foldersUpdated === 0) {
                    setBulkImporting(false);
                    setShowBulkModal(false);

                    if (result.totalFolders === 0) {
                        showToast('No se encontraron subcarpetas en la unidad', 'warning', 3000);
                    } else {
                        showToast(`Todas las ${result.totalFolders} carpetas ya estaban registradas`, 'info', 3000);
                    }
                }

                loadFolders();
                loadStats();
            } catch (error) {
                console.error('Error agregando unidad:', error);
                setBulkImporting(false);
                setShowBulkModal(false);
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

    // Modal de progreso para importación en lote
    const BulkImportModal = () => {
        if (!showBulkModal || !bulkProgress) return null;

        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
            }}>
                <div style={{
                    backgroundColor: '#282828',
                    borderRadius: '16px',
                    padding: '32px',
                    width: '500px',
                    maxWidth: '90vw',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '24px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            backgroundColor: '#3ea6ff20',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <HardDrive size={24} color="#3ea6ff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                                {bulkProgress.phase === 'complete' ? 'Importación Completada' :
                                    bulkProgress.phase === 'scanning' ? 'Escaneando Videos...' :
                                        'Importando Carpetas...'}
                            </h2>
                            <p style={{ fontSize: '13px', color: '#aaa', margin: '4px 0 0 0' }}>
                                {bulkProgress.drivePath}
                            </p>
                        </div>
                    </div>

                    {/* Progress */}
                    {bulkProgress.phase !== 'complete' && (
                        <>
                            {/* Progress bar */}
                            <div style={{
                                backgroundColor: '#3f3f3f',
                                borderRadius: '8px',
                                height: '8px',
                                overflow: 'hidden',
                                marginBottom: '16px'
                            }}>
                                <div style={{
                                    width: `${bulkProgress.progress}%`,
                                    height: '100%',
                                    backgroundColor: '#3ea6ff',
                                    borderRadius: '8px',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>

                            {/* Current folder */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px',
                                backgroundColor: '#212121',
                                borderRadius: '8px',
                                marginBottom: '16px'
                            }}>
                                <Loader2
                                    size={18}
                                    color="#3ea6ff"
                                    style={{ animation: 'spin 1s linear infinite' }}
                                />
                                <span style={{
                                    flex: 1,
                                    fontSize: '14px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {bulkProgress.phase === 'scanning'
                                        ? 'Escaneando videos en carpetas importadas...'
                                        : bulkProgress.folderName || 'Preparando...'}
                                </span>
                                <span style={{ color: '#aaa', fontSize: '13px' }}>
                                    {bulkProgress.current} / {bulkProgress.total}
                                </span>
                            </div>
                        </>
                    )}

                    {/* Results */}
                    {bulkProgress.results && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '12px',
                            marginBottom: '16px'
                        }}>
                            <div style={{
                                backgroundColor: '#212121',
                                padding: '16px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <p style={{
                                    fontSize: '24px',
                                    fontWeight: '600',
                                    color: '#4caf50',
                                    margin: 0
                                }}>
                                    {bulkProgress.results.foldersAdded}
                                </p>
                                <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0 0 0' }}>
                                    Nuevas
                                </p>
                            </div>
                            <div style={{
                                backgroundColor: '#212121',
                                padding: '16px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <p style={{
                                    fontSize: '24px',
                                    fontWeight: '600',
                                    color: '#ff9800',
                                    margin: 0
                                }}>
                                    {bulkProgress.results.foldersUpdated}
                                </p>
                                <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0 0 0' }}>
                                    Existentes
                                </p>
                            </div>
                            <div style={{
                                backgroundColor: '#212121',
                                padding: '16px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <p style={{
                                    fontSize: '24px',
                                    fontWeight: '600',
                                    color: bulkProgress.results.foldersSkipped > 0 ? '#ff4444' : '#666',
                                    margin: 0
                                }}>
                                    {bulkProgress.results.foldersSkipped}
                                </p>
                                <p style={{ fontSize: '12px', color: '#aaa', margin: '4px 0 0 0' }}>
                                    Errores
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Complete message */}
                    {bulkProgress.phase === 'complete' && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '16px',
                            backgroundColor: '#4caf5020',
                            borderRadius: '8px',
                            color: '#4caf50'
                        }}>
                            <CheckCircle size={20} />
                            <span>¡Proceso completado exitosamente!</span>
                        </div>
                    )}

                    {/* Close button (only when complete) */}
                    {bulkProgress.phase === 'complete' && (
                        <button
                            onClick={() => {
                                setShowBulkModal(false);
                                setBulkProgress(null);
                            }}
                            style={{
                                width: '100%',
                                marginTop: '16px',
                                padding: '12px',
                                backgroundColor: '#3ea6ff',
                                border: 'none',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                fontWeight: '500',
                                cursor: 'pointer'
                            }}
                        >
                            Cerrar
                        </button>
                    )}
                </div>
            </div>
        );
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
                    {/* Botón para agregar carpeta individual */}
                    <button
                        onClick={handleAddFolder}
                        disabled={bulkImporting}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: '#3f3f3f',
                            border: 'none',
                            borderRadius: '18px',
                            color: '#fff',
                            cursor: bulkImporting ? 'not-allowed' : 'pointer',
                            fontWeight: '500',
                            opacity: bulkImporting ? 0.6 : 1
                        }}
                    >
                        <FolderPlus size={18} />
                        Agregar Carpeta
                    </button>

                    {/* NUEVO: Botón para agregar unidad/disco completo */}
                    <button
                        onClick={handleAddDrive}
                        disabled={bulkImporting}
                        title="Selecciona la raíz de una unidad (ej: F:\) para importar todas sus carpetas automáticamente"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: '#3ea6ff',
                            border: 'none',
                            borderRadius: '18px',
                            color: '#fff',
                            cursor: bulkImporting ? 'not-allowed' : 'pointer',
                            fontWeight: '500',
                            opacity: bulkImporting ? 0.6 : 1
                        }}
                    >
                        <HardDrive size={18} />
                        Agregar Unidad
                    </button>

                    <button
                        onClick={handleSyncAll}
                        disabled={syncing || bulkImporting}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            backgroundColor: '#3f3f3f',
                            border: 'none',
                            borderRadius: '18px',
                            color: '#fff',
                            cursor: (syncing || bulkImporting) ? 'not-allowed' : 'pointer',
                            fontWeight: '500',
                            opacity: (syncing || bulkImporting) ? 0.6 : 1
                        }}
                    >
                        <RefreshCw size={18} />
                        {syncing ? 'Sincronizando...' : 'Sincronizar Todo'}
                    </button>
                </div>
            </div>

            {/* Info card sobre la funcionalidad */}
            <div style={{
                backgroundColor: '#3ea6ff15',
                border: '1px solid #3ea6ff30',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
            }}>
                <HardDrive size={20} color="#3ea6ff" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                    <p style={{ margin: 0, fontSize: '14px', color: '#fff' }}>
                        <strong>Tip:</strong> Usa "Agregar Unidad" para importar automáticamente todas las carpetas
                        de un disco duro externo. Solo selecciona la raíz de la unidad (ej: <code style={{
                            backgroundColor: '#3f3f3f',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '13px'
                        }}>F:\</code>) y se agregarán todas las subcarpetas de primer nivel.
                    </p>
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
                <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>
                    Carpetas Monitoreadas ({folders.length})
                </h2>
                {folders.length === 0 ? (
                    <div style={{
                        backgroundColor: '#212121',
                        padding: '40px',
                        borderRadius: '12px',
                        textAlign: 'center'
                    }}>
                        <HardDrive size={48} color="#666" style={{ marginBottom: '16px' }} />
                        <p style={{ color: '#aaa', marginBottom: '8px' }}>
                            No hay carpetas configuradas.
                        </p>
                        <p style={{ color: '#666', fontSize: '14px' }}>
                            Agrega una carpeta individual o importa un disco completo para comenzar.
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
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                            {folder.is_active ? (
                                                <CheckCircle size={16} color="#3ea6ff" />
                                            ) : (
                                                <XCircle size={16} color="#ff4444" />
                                            )}
                                            <span style={{
                                                fontWeight: '500',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {folder.folder_path}
                                            </span>
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
                                            disabled={isSyncingThis || syncing || bulkImporting}
                                            title="Sincronizar esta carpeta"
                                            style={{
                                                padding: '8px 12px',
                                                backgroundColor: isSyncingThis ? '#555' : '#3ea6ff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: '#fff',
                                                cursor: (isSyncingThis || syncing || bulkImporting) ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                fontSize: '13px',
                                                fontWeight: '500',
                                                opacity: (isSyncingThis || syncing || bulkImporting) ? 0.6 : 1
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
                                            disabled={syncing || isSyncingThis || bulkImporting}
                                            title="Eliminar carpeta"
                                            style={{
                                                padding: '8px',
                                                backgroundColor: '#3f3f3f',
                                                border: 'none',
                                                borderRadius: '8px',
                                                color: '#ff4444',
                                                cursor: (syncing || isSyncingThis || bulkImporting) ? 'not-allowed' : 'pointer',
                                                opacity: (syncing || isSyncingThis || bulkImporting) ? 0.5 : 1
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

            {/* Modal de progreso de importación en lote */}
            <BulkImportModal />

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