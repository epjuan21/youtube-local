import { useEffect, useRef, useState } from 'react';

/**
 * Hook para precarga inteligente de videos cercanos
 * Crea elementos <video> ocultos con atributo preload para mejorar el inicio de reproducción
 *
 * @param {Object} options - Configuración
 * @param {number|null} options.currentVideoId - ID del video actual
 * @param {Array} options.videoQueue - Array de videos en orden (playlist o folder)
 * @param {string} options.context - Contexto: 'playlist' | 'folder' | 'continue'
 * @param {Object} options.config - Configuración de preload
 * @param {number} options.config.lookahead - Cuántos videos adelante (default: 2)
 * @param {number} options.config.lookbehind - Cuántos videos atrás (default: 1)
 * @param {number} options.config.maxFileSizeMB - Límite de tamaño para preload completo (default: 100)
 * @param {boolean} options.config.enabled - Si está habilitado (default: true)
 * @param {string} options.config.preloadLevel - 'metadata' | 'auto' | 'none' (default: 'metadata')
 *
 * @returns {Object} - Estado del prefetch
 * @returns {Array} return.preloadedVideos - IDs de videos precargados
 * @returns {number} return.totalPreloadedMB - Tamaño total precargado
 * @returns {boolean} return.isPreloading - Si está precargando actualmente
 *
 * @example
 * ```jsx
 * const prefetchStats = useVideoPrefetch({
 *   currentVideoId: 123,
 *   videoQueue: playlistVideos,
 *   context: 'playlist',
 *   config: {
 *     lookahead: 2,
 *     lookbehind: 1,
 *     maxFileSizeMB: 100,
 *     enabled: true,
 *     preloadLevel: 'metadata'
 *   }
 * });
 * ```
 */
export function useVideoPrefetch({ currentVideoId, videoQueue = [], context = 'playlist', config = {} }) {
    const {
        lookahead = 2,
        lookbehind = 1,
        maxFileSizeMB = 100,
        enabled = true,
        preloadLevel = 'metadata'
    } = config;

    // Map de elementos de video precargados: Map<videoId, HTMLVideoElement>
    const preloadElementsRef = useRef(new Map());

    // Estadísticas del prefetch
    const [stats, setStats] = useState({
        preloadedVideos: [],
        totalPreloadedMB: 0,
        isPreloading: false
    });

    /**
     * Calcula la cola de videos a precargar basado en el video actual
     * @param {number} currentVideoId - ID del video actual
     * @param {Array} videoQueue - Array de videos
     * @param {number} lookahead - Videos adelante
     * @param {number} lookbehind - Videos atrás
     * @returns {Array} - Array de {video, priority}
     */
    const calculatePreloadQueue = (currentVideoId, videoQueue, lookahead, lookbehind) => {
        if (!currentVideoId || !videoQueue || videoQueue.length === 0) {
            return [];
        }

        const currentIndex = videoQueue.findIndex(v => v.id === currentVideoId);
        if (currentIndex === -1) return [];

        const toPreload = [];

        // Priority 1: Siguiente video (siempre primero)
        if (currentIndex + 1 < videoQueue.length) {
            toPreload.push({
                video: videoQueue[currentIndex + 1],
                priority: 1
            });
        }

        // Priority 2: Video anterior
        if (currentIndex - 1 >= 0 && lookbehind > 0) {
            toPreload.push({
                video: videoQueue[currentIndex - 1],
                priority: 2
            });
        }

        // Priority 3: Resto en rango (lookahead)
        for (let i = currentIndex + 2; i <= Math.min(currentIndex + lookahead, videoQueue.length - 1); i++) {
            toPreload.push({
                video: videoQueue[i],
                priority: 3
            });
        }

        // Priority 4: Resto en lookbehind
        for (let i = currentIndex - 2; i >= Math.max(0, currentIndex - lookbehind); i--) {
            toPreload.push({
                video: videoQueue[i],
                priority: 4
            });
        }

        return toPreload;
    };

    /**
     * Crea un elemento de video oculto para preload
     * @param {Object} video - Objeto de video
     * @param {string} preloadLevel - Nivel: 'metadata' | 'auto' | 'none'
     * @param {number} maxFileSizeMB - Límite de tamaño
     * @returns {HTMLVideoElement|null}
     */
    const createPreloadElement = (video, preloadLevel, maxFileSizeMB) => {
        // Verificaciones de seguridad
        if (!video || !video.filepath) {
            console.warn(`[useVideoPrefetch] Video sin filepath:`, video);
            return null;
        }

        if (!video.is_available) {
            console.warn(`[useVideoPrefetch] Video no disponible (${video.id}): ${video.title}`);
            return null;
        }

        const fileSizeMB = video.file_size / (1024 * 1024);

        // Decisión de nivel de preload basado en tamaño
        let actualPreloadLevel = preloadLevel;
        if (preloadLevel === 'auto' && fileSizeMB > maxFileSizeMB) {
            actualPreloadLevel = 'metadata'; // Downgrade para archivos grandes
            console.info(`[useVideoPrefetch] Downgrade a metadata para video ${video.id} (${fileSizeMB.toFixed(1)} MB)`);
        }

        try {
            // Construir URL del video
            const videoUrl = `file://${video.filepath.replace(/\\/g, '/')}`;

            // Crear elemento de video
            const videoElement = document.createElement('video');
            videoElement.src = videoUrl;
            videoElement.preload = actualPreloadLevel;
            videoElement.style.display = 'none';
            videoElement.style.position = 'absolute';
            videoElement.style.left = '-9999px';
            videoElement.dataset.videoId = video.id;
            videoElement.dataset.context = context;

            // Event listeners para debugging
            videoElement.addEventListener('loadedmetadata', () => {
                console.debug(`[useVideoPrefetch] Metadata loaded for video ${video.id}: ${video.title}`);
            });

            videoElement.addEventListener('error', (e) => {
                console.error(`[useVideoPrefetch] Error loading video ${video.id}:`, e);
            });

            return videoElement;
        } catch (error) {
            console.error(`[useVideoPrefetch] Error creating preload element for video ${video.id}:`, error);
            return null;
        }
    };

    /**
     * Agrega un elemento de preload al DOM
     * @param {Object} video - Video a precargar
     * @param {Object} config - Configuración
     */
    const addPreloadElement = (video, config) => {
        if (!video || !video.id) return;

        // Si ya existe, skip
        if (preloadElementsRef.current.has(video.id)) {
            return;
        }

        const element = createPreloadElement(video, config.preloadLevel, config.maxFileSizeMB);
        if (!element) return;

        try {
            document.body.appendChild(element);
            preloadElementsRef.current.set(video.id, element);
            console.debug(`[useVideoPrefetch] Preloading video ${video.id}: ${video.title}`);
        } catch (error) {
            console.error(`[useVideoPrefetch] Error appending preload element:`, error);
        }
    };

    /**
     * Remueve un elemento de preload del DOM
     * @param {number} videoId - ID del video
     */
    const removePreloadElement = (videoId) => {
        const element = preloadElementsRef.current.get(videoId);
        if (element) {
            try {
                element.remove();
                preloadElementsRef.current.delete(videoId);
                console.debug(`[useVideoPrefetch] Removed preload element for video ${videoId}`);
            } catch (error) {
                console.error(`[useVideoPrefetch] Error removing preload element:`, error);
            }
        }
    };

    // Effect principal: Gestionar preload basado en video actual
    useEffect(() => {
        // Si deshabilitado o nivel 'none', limpiar todo
        if (!enabled || preloadLevel === 'none') {
            preloadElementsRef.current.forEach((element) => {
                try {
                    element.remove();
                } catch (error) {
                    console.error('[useVideoPrefetch] Error removing element:', error);
                }
            });
            preloadElementsRef.current.clear();
            return;
        }

        // Si no hay video actual, limpiar
        if (!currentVideoId) {
            return;
        }

        // Calcular cola de preload
        const queue = calculatePreloadQueue(currentVideoId, videoQueue, lookahead, lookbehind);

        // IDs que deberían estar precargados
        const shouldPreloadSet = new Set(queue.map(item => item.video.id));

        // Remover elementos que ya no están en rango
        preloadElementsRef.current.forEach((element, videoId) => {
            if (!shouldPreloadSet.has(videoId)) {
                removePreloadElement(videoId);
            }
        });

        // Agregar elementos nuevos con prioridad escalonada
        queue.forEach(({ video, priority }) => {
            const delay = priority * 500; // 500ms, 1000ms, 1500ms, 2000ms
            setTimeout(() => {
                addPreloadElement(video, { preloadLevel, maxFileSizeMB });
            }, delay);
        });

        // Cleanup al desmontar
        return () => {
            preloadElementsRef.current.forEach((element) => {
                try {
                    element.remove();
                } catch (error) {
                    console.error('[useVideoPrefetch] Cleanup error:', error);
                }
            });
            preloadElementsRef.current.clear();
        };
    }, [currentVideoId, videoQueue, lookahead, lookbehind, enabled, preloadLevel, maxFileSizeMB, context]);

    // Effect para actualizar estadísticas
    useEffect(() => {
        const preloadedVideos = Array.from(preloadElementsRef.current.keys());
        const totalPreloadedMB = preloadedVideos.reduce((sum, videoId) => {
            const video = videoQueue.find(v => v.id === videoId);
            return sum + (video ? video.file_size / (1024 * 1024) : 0);
        }, 0);

        setStats({
            preloadedVideos,
            totalPreloadedMB: parseFloat(totalPreloadedMB.toFixed(2)),
            isPreloading: preloadElementsRef.current.size > 0
        });
    }, [videoQueue, preloadElementsRef.current.size]);

    return stats;
}

export default useVideoPrefetch;
