import { createContext, useContext, useRef, useEffect, useCallback } from 'react';
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
 * @param {number} props.maxMemoryMB - Límite de memoria en MB (default: 100)
 */
export function ThumbnailCacheProvider({ children, maxSize = 200, maxMemoryMB = 100 }) {
    const cacheRef = useRef(new LRUCache(maxSize, maxMemoryMB));

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

    // Métodos de configuración
    const updateMaxSize = useCallback((newMaxSize) => {
        cacheRef.current.setMaxSize(newMaxSize);
        cacheRef.current.persist(); // Persistir cambio de config
    }, []);

    const updateMaxMemory = useCallback((newMaxMemoryMB) => {
        cacheRef.current.setMaxMemory(newMaxMemoryMB);
        cacheRef.current.persist(); // Persistir cambio de config
    }, []);

    const getCacheStats = useCallback(() => {
        return cacheRef.current.getStats();
    }, []);

    const clearCache = useCallback(() => {
        cacheRef.current.clear();
        cacheRef.current.persist();
    }, []);

    // Value del contexto con el cache y los métodos
    const contextValue = {
        cache: cacheRef.current,
        updateMaxSize,
        updateMaxMemory,
        getCacheStats,
        clearCache
    };

    return (
        <ThumbnailCacheContext.Provider value={contextValue}>
            {children}
        </ThumbnailCacheContext.Provider>
    );
}

/**
 * Hook para acceder al caché de thumbnails y sus métodos
 * @returns {Object} - Objeto con cache y métodos de configuración
 * @returns {LRUCache} return.cache - Instancia del caché
 * @returns {Function} return.updateMaxSize - Actualizar límite de items
 * @returns {Function} return.updateMaxMemory - Actualizar límite de memoria
 * @returns {Function} return.getCacheStats - Obtener estadísticas
 * @returns {Function} return.clearCache - Limpiar el caché
 * @throws {Error} - Si se usa fuera del provider
 */
export function useThumbnailCache() {
    const context = useContext(ThumbnailCacheContext);
    if (!context) {
        throw new Error('useThumbnailCache must be used within ThumbnailCacheProvider');
    }
    return context;
}

export default ThumbnailCacheContext;
