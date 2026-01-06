import { useState, useEffect } from 'react';
import { FolderPlus, RefreshCw, Trash2, CheckCircle, XCircle, Video } from 'lucide-react';

function SyncManager() {
    const [folders, setFolders] = useState([]);
    const [syncing, setSyncing] = useState(false);
    const [syncingFolder, setSyncingFolder] = useState(null);
    const [stats, setStats] = useState(null);
    const [folderVideoCounts, setFolderVideoCounts] = useState({});

    useEffect(() => {
        loadFolders();
        loadStats();
    }, []);

    const loadFolders = async () => {
        const result = await window.electronAPI.getWatchFolders();
        setFolders(result);

        // Cargar conteo de videos para cada carpeta
        loadVideoCounts(result);
    };

    const loadVideoCounts = async (foldersData) => {
        const counts = {};

        for (const folder of foldersData) {
            const videos = await window.electronAPI.getVideos({
                onlyAvailable: false
            });

            // Contar videos de esta carpeta específica
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
            await window.electronAPI.addWatchFolder(folderPath);
            loadFolders();
            handleSyncAll();
        }
    };

    const handleRemoveFolder = async (id) => {
        if (confirm('¿Eliminar esta carpeta? Los videos se eliminarán permanentemente de la base de datos.')) {
            await window.electronAPI.removeWatchFolder(id);
            loadFolders();
            loadStats();
        }
    };

    const handleSyncAll = async () => {
        setSyncing(true);
        try {
            await window.electronAPI.scanAllFolders();
            loadStats();
            loadFolders();
        } finally {
            setSyncing(false);
        }
    };

    const handleSyncFolder = async (folderId) => {
        setSyncingFolder(folderId);
        try {
            await window.electronAPI.scanFolder(folderId);
            loadStats();
            loadFolders();
        } catch (error) {
            console.error('Error sincronizando carpeta:', error);
            alert('Error al sincronizar la carpeta');
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
                                        {/* Botón de Sincronizar Individual */}
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

                                        {/* Botón de Eliminar */}
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