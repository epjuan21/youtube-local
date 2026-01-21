import { useEffect, useRef } from 'react';
import { useThumbnailCache } from '../context/ThumbnailCacheContext';

/**
 * Hook para prefetching inteligente de thumbnails
 * Precarga thumbnails cercanos al índice actual para mejorar perceived performance
 *
 * @param {Array} videos - Lista completa de videos
 * @param {number} currentIndex - Índice del video/item visible actual
 * @param {Object} options - Configuración del prefetching
 * @param {number} options.lookahead - Cuántos videos adelante precargar (default: 3)
 * @param {number} options.lookbehind - Cuántos videos atrás precargar (default: 1)
 * @param {boolean} options.enabled - Si el prefetching está habilitado (default: true)
 *
 * @example
 * ```jsx
 * // En un componente con lista de videos
 * const [visibleIndex, setVisibleIndex] = useState(0);
 * useThumbnailPrefetch(videos, visibleIndex, {
 *   lookahead: 5,
 *   lookbehind: 2
 * });
 * ```
 */
export function useThumbnailPrefetch(videos, currentIndex, options = {}) {
    const {
        lookahead = 3,
        lookbehind = 1,
        enabled = true
    } = options;

    const { cache } = useThumbnailCache();
    const prefetchedRef = useRef(new Set());
    const abortControllerRef = useRef(null);

    useEffect(() => {
        if (!enabled || !videos || videos.length === 0 || currentIndex < 0) {
            return;
        }

        // Cancelar prefetch anterior si existe
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Nuevo abort controller para esta operación
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const prefetchThumbnails = async () => {
            try {
                // Calcular rango de prefetch
                const startIndex = Math.max(0, currentIndex - lookbehind);
                const endIndex = Math.min(videos.length - 1, currentIndex + lookahead);

                // Array de promesas de prefetch
                const prefetchPromises = [];

                // Prefetch en background
                for (let i = startIndex; i <= endIndex; i++) {
                    const video = videos[i];

                    // Validaciones
                    if (!video || !video.thumbnail_path) continue;
                    if (prefetchedRef.current.has(video.id)) continue;

                    // Si ya está en caché, marcar como prefetched y skip
                    if (cache.has(video.thumbnail_path)) {
                        prefetchedRef.current.add(video.id);
                        continue;
                    }

                    // Crear promesa de prefetch
                    const prefetchPromise = new Promise((resolve, reject) => {
                        if (signal.aborted) {
                            reject(new Error('Aborted'));
                            return;
                        }

                        const img = new Image();
                        const thumbnailSrc = video.thumbnail_path.startsWith('file://')
                            ? video.thumbnail_path
                            : `file://${video.thumbnail_path}`;

                        img.onload = () => {
                            if (signal.aborted) {
                                reject(new Error('Aborted'));
                                return;
                            }

                            try {
                                // Guardar en caché
                                cache.set(video.thumbnail_path, thumbnailSrc);
                                prefetchedRef.current.add(video.id);
                                resolve(video.id);
                            } catch (error) {
                                console.warn(`Failed to cache thumbnail for video ${video.id}:`, error);
                                reject(error);
                            }
                        };

                        img.onerror = () => {
                            console.warn(`Prefetch failed for video ${video.id}`);
                            reject(new Error(`Failed to load ${thumbnailSrc}`));
                        };

                        // Iniciar carga
                        img.src = thumbnailSrc;
                    });

                    prefetchPromises.push(prefetchPromise);
                }

                // Esperar a que todas las promesas se resuelvan (sin bloquear)
                if (prefetchPromises.length > 0) {
                    await Promise.allSettled(prefetchPromises);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.warn('Prefetch error:', error);
                }
            }
        };

        // Debounce para evitar demasiados prefetch seguidos
        const timeoutId = setTimeout(prefetchThumbnails, 100);

        return () => {
            clearTimeout(timeoutId);
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [videos, currentIndex, lookahead, lookbehind, enabled, cache]);

    // Limpiar set de prefetched cuando cambia la lista de videos
    useEffect(() => {
        prefetchedRef.current.clear();
    }, [videos]);

    return {
        prefetchedCount: prefetchedRef.current.size
    };
}

export default useThumbnailPrefetch;
