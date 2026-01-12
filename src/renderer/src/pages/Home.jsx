import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Folder } from 'lucide-react';
import FolderCard from '../components/FolderCard';
import ContinueWatching from '../components/ContinueWatching';
import { useSearch } from '../context/SearchContext';

function Home() {
    const navigate = useNavigate();
    const [watchFolders, setWatchFolders] = useState([]);
    const [allSubfolders, setAllSubfolders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { searchTerm } = useSearch();

    useEffect(() => {
        loadFolders();
    }, []);

    // Extraer subcarpetas únicas de los videos de una carpeta
    const extractSubfolders = (videos, folder) => {
        const subfolderMap = new Map();
        const folderPath = folder.folder_path.replace(/\\/g, '/');

        videos.forEach(video => {
            const videoPath = video.filepath.replace(/\\/g, '/');

            if (videoPath.startsWith(folderPath)) {
                const relativePath = videoPath.replace(folderPath, '').replace(/^\//, '');
                const pathParts = relativePath.split('/');

                // Si tiene más de una parte, significa que está en una subcarpeta
                if (pathParts.length > 1) {
                    // Recorrer todas las subcarpetas en la ruta
                    let currentPath = '';
                    for (let i = 0; i < pathParts.length - 1; i++) {
                        const subfolderName = pathParts[i];
                        currentPath = currentPath ? `${currentPath}/${subfolderName}` : subfolderName;
                        const fullSubfolderPath = `${folderPath}/${currentPath}`;

                        if (!subfolderMap.has(fullSubfolderPath)) {
                            subfolderMap.set(fullSubfolderPath, {
                                id: `${folder.id}-${currentPath.replace(/\//g, '-')}`,
                                name: subfolderName,
                                fullPath: fullSubfolderPath,
                                relativePath: currentPath,
                                parentFolderId: folder.id,
                                parentFolderName: getFolderName(folder.folder_path),
                                videos: [],
                                isSubfolder: true
                            });
                        }

                        // Solo agregar el video a la subcarpeta directa (no a las padres)
                        if (i === pathParts.length - 2) {
                            subfolderMap.get(fullSubfolderPath).videos.push(video);
                        }
                    }
                }
            }
        });

        // Convertir a array y agregar contadores
        return Array.from(subfolderMap.values()).map(sf => ({
            ...sf,
            totalVideos: sf.videos.length,
            availableVideos: sf.videos.filter(v => v.is_available === 1).length
        }));
    };

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

            // Extraer todas las subcarpetas
            const subfolders = [];
            foldersResult.forEach(folder => {
                const folderVideos = videosResult.filter(v => v.watch_folder_id === folder.id);
                const folderSubfolders = extractSubfolders(folderVideos, folder);
                subfolders.push(...folderSubfolders);
            });

            setWatchFolders(foldersWithCount);
            setAllSubfolders(subfolders);
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

    // Filtrar carpetas principales por nombre
    const filteredFolders = searchTerm
        ? watchFolders.filter(folder =>
            folder.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : watchFolders;

    // Filtrar subcarpetas por nombre (solo cuando hay búsqueda)
    const filteredSubfolders = searchTerm
        ? allSubfolders.filter(sf =>
            sf.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : [];

    // Navegar a una subcarpeta
    const handleSubfolderClick = (subfolder) => {
        const encodedPath = encodeURIComponent(subfolder.relativePath);
        navigate(`/folder/${subfolder.parentFolderId}/${encodedPath}`);
    };

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
            {!isSearching && (
                <ContinueWatching limit={10} />
            )}
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                {/* ← MODIFICADO: Añadido indicador visual de sección */}
                <h2 style={{
                    fontSize: '24px',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    {/* ← NUEVO: Indicador de color */}
                    <div style={{
                        width: '4px',
                        height: '24px',
                        backgroundColor: '#3ea6ff',
                        borderRadius: '2px'
                    }} />
                    {isSearching ? `Resultados para "${searchTerm}"` : 'Biblioteca de Videos'}
                </h2>
                <p style={{ fontSize: '14px', color: '#aaa' }}>
                    {isSearching ? (
                        <>
                            {filteredFolders.length} carpeta{filteredFolders.length !== 1 ? 's' : ''}
                            {filteredSubfolders.length > 0 && ` y ${filteredSubfolders.length} subcarpeta${filteredSubfolders.length !== 1 ? 's' : ''}`}
                        </>
                    ) : (
                        <>{totalVideos} video{totalVideos !== 1 ? 's' : ''} en {filteredFolders.length} carpeta{filteredFolders.length !== 1 ? 's' : ''}</>
                    )}
                </p>
            </div>

            {/* Grid de carpetas principales */}
            {filteredFolders.length > 0 && (
                <div style={{ marginBottom: isSearching && filteredSubfolders.length > 0 ? '32px' : '0' }}>
                    {isSearching && (
                        <h3 style={{
                            fontSize: '16px',
                            marginBottom: '16px',
                            color: '#aaa',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Folder size={18} />
                            Carpetas principales ({filteredFolders.length})
                        </h3>
                    )}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '20px'
                    }}>
                        {filteredFolders.map((folder) => (
                            <FolderCard key={folder.id} folder={folder} />
                        ))}
                    </div>
                </div>
            )}

            {/* Grid de subcarpetas encontradas (solo en búsqueda) */}
            {isSearching && filteredSubfolders.length > 0 && (
                <div>
                    <h3 style={{
                        fontSize: '16px',
                        marginBottom: '16px',
                        color: '#aaa',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Folder size={18} color="#f59e0b" />
                        Subcarpetas ({filteredSubfolders.length})
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: '20px'
                    }}>
                        {filteredSubfolders.map((subfolder) => (
                            <div
                                key={subfolder.id}
                                onClick={() => handleSubfolderClick(subfolder)}
                                style={{ cursor: 'pointer' }}
                            >
                                <FolderCard
                                    folder={{
                                        ...subfolder,
                                        path: subfolder.fullPath
                                    }}
                                />
                                <p style={{
                                    fontSize: '11px',
                                    color: '#666',
                                    marginTop: '4px',
                                    paddingLeft: '8px'
                                }}>
                                    en {subfolder.parentFolderName}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Mensaje cuando no hay resultados */}
            {isSearching && filteredFolders.length === 0 && filteredSubfolders.length === 0 && (
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
                        No hay carpetas ni subcarpetas que coincidan con "{searchTerm}"
                    </p>
                    <p style={{ color: '#666', fontSize: '13px' }}>
                        Intenta con otros términos de búsqueda
                    </p>
                </div>
            )}

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