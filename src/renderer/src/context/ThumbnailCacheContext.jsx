import { createContext, useContext, useRef, useEffect, useCallback, useState } from 'react';
import { LRUCache } from '../utils/LRUCache';
import { useIdleDetection } from '../hooks/useIdleDetection';

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

    // Cargar configuración de limpieza desde localStorage
    const [cleanupConfig, setCleanupConfig] = useState(() => {
        const saved = localStorage.getItem('thumbnail_cache_cleanup_config');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to load cleanup config:', e);
            }
        }
        return {
            enabled: true,
            ttlHours: 24,
            idleMinutes: 5,
            preserveFavorites: true,
            aggressiveMode: false
        };
    });

    // Callback de limpieza cuando hay inactividad
    const handleIdleCleanup = useCallback(() => {
        if (!cleanupConfig.enabled) return;

        console.log('[ThumbnailCache] Inactividad detectada, ejecutando limpieza...');
        const cleaned = cacheRef.current._cleanupExpired();

        // Limpieza agresiva si está habilitada (forzar reducción a 70% si >80% uso)
        if (cleanupConfig.aggressiveMode) {
            const stats = cacheRef.current.getStats();
            const memoryUsagePercent = (stats.memoryUsed / stats.maxMemory) * 100;

            if (memoryUsagePercent > 80) {
                console.log('[ThumbnailCache] Uso de memoria >80%, limpieza agresiva...');
                const target = Math.floor(stats.maxSize * 0.7); // Objetivo: 70%

                let removed = 0;
                for (const [key, entry] of cacheRef.current.cache.entries()) {
                    if (cacheRef.current.cache.size <= target) break;
                    if (entry.isFavorite && cleanupConfig.preserveFavorites) continue;

                    cacheRef.current.cache.delete(key);
                    cacheRef.current.currentMemoryBytes -= entry.size;
                    removed++;
                }

                console.log(`[ThumbnailCache] Limpieza agresiva: ${removed} items removidos`);
            }
        }

        console.log(`[ThumbnailCache] Limpieza completa. ${cleaned} items expirados eliminados.`);
    }, [cleanupConfig]);

    // Integración de detección de inactividad
    const { isIdle } = useIdleDetection({
        idleThresholdMinutes: cleanupConfig.idleMinutes,
        enabled: cleanupConfig.enabled,
        onIdle: handleIdleCleanup
    });

    useEffect(() => {
        // Restaurar caché al montar
        cacheRef.current.restore();

        // Aplicar configuración de TTL y preserve favorites
        cacheRef.current.setTTL(cleanupConfig.ttlHours);
        cacheRef.current.setPreserveFavorites(cleanupConfig.preserveFavorites);

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
            cacheRef.current.destroy(); // Destruir para limpiar interval
            document.removeEventListener('visibilitychange', handlePersist);
            window.removeEventListener('beforeunload', handlePersist);
        };
    }, [cleanupConfig]);

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

    // Método para actualizar configuración de limpieza
    const updateCleanupConfig = useCallback((newConfig) => {
        const updated = { ...cleanupConfig, ...newConfig };
        setCleanupConfig(updated);
        localStorage.setItem('thumbnail_cache_cleanup_config', JSON.stringify(updated));

        // Actualizar TTL en el caché si cambió
        if (newConfig.ttlHours !== undefined) {
            cacheRef.current.setTTL(newConfig.ttlHours);
        }

        // Actualizar preserveFavorites si cambió
        if (newConfig.preserveFavorites !== undefined) {
            cacheRef.current.setPreserveFavorites(newConfig.preserveFavorites);
        }

        // Persistir cambios
        cacheRef.current.persist();
    }, [cleanupConfig]);

    // Value del contexto con el cache y los métodos
    const contextValue = {
        cache: cacheRef.current,
        updateMaxSize,
        updateMaxMemory,
        getCacheStats,
        clearCache,
        cleanupConfig,
        updateCleanupConfig,
        isIdle
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
 * @returns {Object} return.cleanupConfig - Configuración de limpieza
 * @returns {Function} return.updateCleanupConfig - Actualizar config de limpieza
 * @returns {boolean} return.isIdle - Estado de inactividad del usuario
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
