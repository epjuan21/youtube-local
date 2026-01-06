import { useState, useEffect } from 'react';
import FolderCard from '../components/FolderCard';
import { useSearch } from '../context/SearchContext';

function Home() {
    const [watchFolders, setWatchFolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { searchTerm } = useSearch();

    useEffect(() => {
        loadFolders();
    }, []);

    const loadFolders = async () => {
        try {
            setLoading(true);

            // Cargar carpetas y contar videos por carpeta
            const foldersResult = await window.electronAPI.getWatchFolders();
            const videosResult = await window.electronAPI.getVideos({ onlyAvailable: false });

            // Agregar contador de videos a cada carpeta
            const foldersWithCount = foldersResult.map(folder => {
                const folderVideos = videosResult.filter(v => v.watch_folder_id === folder.id);
                return {
                    ...folder,
                    name: getFolderName(folder.folder_path),
                    path: folder.folder_path,
                    totalVideos: folderVideos.length,
                    availableVideos: folderVideos.filter(v => v.is_available === 1).length
                };
            });

            setWatchFolders(foldersWithCount);
        } catch (error) {
            console.error('Error cargando carpetas:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFolderName = (path) => {
        const normalized = path.replace(/\\/g, '/');
        const parts = normalized.split('/').filter(p => p.length > 0);
        return parts[parts.length - 1] || path;
    };

    // Filtrar carpetas por nombre
    const filteredFolders = searchTerm
        ? watchFolders.filter(folder =>
            folder.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : watchFolders;

    const totalVideos = watchFolders.reduce((sum, folder) => sum + folder.totalVideos, 0);
    const isSearching = searchTerm.trim().length > 0;

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60vh'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid #3ea6ff',
                        borderTop: '4px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 16px'
                    }} />
                    <p style={{ color: '#aaa' }}>Cargando carpetas...</p>
                </div>
            </div>
        );
    }

    if (watchFolders.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>
                    No hay carpetas configuradas
                </h2>
                <p style={{ color: '#aaa', marginBottom: '24px' }}>
                    Agrega una carpeta de videos en Sincronización para comenzar
                </p>
                <a
                    href="/sync"
                    style={{
                        display: 'inline-block',
                        padding: '12px 24px',
                        backgroundColor: '#3ea6ff',
                        color: '#fff',
                        textDecoration: 'none',
                        borderRadius: '20px',
                        fontWeight: '500'
                    }}
                >
                    Ir a Sincronización
                </a>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>
                    {isSearching ? `Resultados para "${searchTerm}"` : 'Biblioteca de Videos'}
                </h2>
                <p style={{ fontSize: '14px', color: '#aaa' }}>
                    {totalVideos} video{totalVideos !== 1 ? 's' : ''} en {filteredFolders.length} carpeta{filteredFolders.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* Grid de carpetas */}
            {filteredFolders.length > 0 ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: '20px'
                }}>
                    {filteredFolders.map((folder) => (
                        <FolderCard key={folder.id} folder={folder} />
                    ))}
                </div>
            ) : isSearching ? (
                <div style={{
                    textAlign: 'center',
                    padding: '60px 20px',
                    backgroundColor: '#212121',
                    borderRadius: '12px'
                }}>
                    <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>
                        No se encontraron carpetas
                    </h3>
                    <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '16px' }}>
                        No hay carpetas que coincidan con "{searchTerm}"
                    </p>
                    <p style={{ color: '#666', fontSize: '13px' }}>
                        Intenta con otros términos de búsqueda
                    </p>
                </div>
            ) : null}

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

export default Home;