import { createContext, useContext, useRef, useEffect } from 'react';
import { LRUCache } from '../utils/LRUCache';

/**
 * Contexto para compartir el caché de thumbnails entre componentes
 */
const ThumbnailCacheContext = createContext(null);

/**
 * Provider del contexto de caché de thumbnails
 * @param {Object} props
 * @param {React.ReactNode} props.children - Componentes hijos
 * @param {number} props.maxSize - Tamaño máximo del caché (default: 200)
 */
export function ThumbnailCacheProvider({ children, maxSize = 200 }) {
    const cacheRef = useRef(new LRUCache(maxSize));

    useEffect(() => {
        // Restaurar caché al montar
        cacheRef.current.restore();

        // Persistir caché al desmontar o cambiar visibilidad
        const handlePersist = () => {
            cacheRef.current.persist();
        };

        // Persistir cuando la página se oculta o antes de cerrar
        document.addEventListener('visibilitychange', handlePersist);
        window.addEventListener('beforeunload', handlePersist);

        // Limpiar listeners al desmontar
        return () => {
            handlePersist();
            document.removeEventListener('visibilitychange', handlePersist);
            window.removeEventListener('beforeunload', handlePersist);
        };
    }, []);

    return (
        <ThumbnailCacheContext.Provider value={cacheRef.current}>
            {children}
        </ThumbnailCacheContext.Provider>
    );
}

/**
 * Hook para acceder al caché de thumbnails
 * @returns {LRUCache} - Instancia del caché
 * @throws {Error} - Si se usa fuera del provider
 */
export function useThumbnailCache() {
    const cache = useContext(ThumbnailCacheContext);
    if (!cache) {
        throw new Error('useThumbnailCache must be used within ThumbnailCacheProvider');
    }
    return cache;
}

export default ThumbnailCacheContext;
