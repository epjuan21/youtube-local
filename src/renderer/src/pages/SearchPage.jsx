import { useState, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import SearchResults from '../components/SearchResults';

function SearchPage() {
    const { searchTerm } = useSearch();
    const [videos, setVideos] = useState([]);
    const [watchFolders, setWatchFolders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (searchTerm && searchTerm.trim()) {
            loadSearchResults();
        } else {
            setVideos([]);
            setLoading(false);
        }
    }, [searchTerm]);

    const loadSearchResults = async () => {
        try {
            setLoading(true);

            // Cargar todos los videos y carpetas
            const [videosResult, foldersResult] = await Promise.all([
                window.electronAPI.getVideos({ onlyAvailable: true }),
                window.electronAPI.getWatchFolders()
            ]);

            if (!searchTerm || !searchTerm.trim()) {
                setVideos([]);
                setWatchFolders([]);
                setLoading(false);
                return;
            }

            // Filtrar videos por término de búsqueda
            const term = searchTerm.toLowerCase();
            const filteredVideos = videosResult.filter(video => {
                // Buscar en título
                if (video.title && video.title.toLowerCase().includes(term)) {
                    return true;
                }

                // Buscar en descripción
                if (video.description && video.description.toLowerCase().includes(term)) {
                    return true;
                }

                // Buscar en nombre de archivo
                if (video.filename && video.filename.toLowerCase().includes(term)) {
                    return true;
                }

                // Buscar en la ruta (para encontrar por nombre de subcarpeta)
                if (video.filepath && video.filepath.toLowerCase().includes(term)) {
                    return true;
                }

                return false;
            });

            console.log('Término de búsqueda:', searchTerm);
            console.log('Videos totales:', videosResult.length);
            console.log('Videos filtrados:', filteredVideos.length);

            setVideos(filteredVideos);
            setWatchFolders(foldersResult);
        } catch (error) {
            console.error('Error cargando resultados de búsqueda:', error);
        } finally {
            setLoading(false);
        }
    };

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
                    <p style={{ color: '#aaa' }}>Buscando...</p>
                </div>
            </div>
        );
    }

    if (!searchTerm || !searchTerm.trim()) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '60px 20px'
            }}>
                <h2 style={{ marginBottom: '16px', fontSize: '24px' }}>
                    Buscar videos
                </h2>
                <p style={{ color: '#aaa' }}>
                    Escribe algo en el campo de búsqueda para encontrar videos
                </p>
            </div>
        );
    }

    return (
        <div>
            <SearchResults
                videos={videos}
                watchFolders={watchFolders}
                searchTerm={searchTerm}
            />

            <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

export default SearchPage;