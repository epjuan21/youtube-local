import { useEffect, useRef, useState, useCallback } from 'react';

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

    // Set de videos que fallaron al cargar (para no reintentar)
    const failedVideosRef = useRef(new Set());

    // Ref para el contexto (para evitar que cause re-renders)
    const contextRef = useRef(context);

    // Actualizar contextRef cuando cambie el contexto
    useEffect(() => {
        contextRef.current = context;
    }, [context]);

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

        // Verificar formato de video compatible
        const fileExtension = video.filepath.split('.').pop().toLowerCase();
        const compatibleFormats = ['mp4', 'webm', 'ogg', 'mkv', 'avi', 'mov', 'm4v'];
        const problematicFormats = ['flv', 'wmv', 'vob', 'rm', 'rmvb'];

        if (problematicFormats.includes(fileExtension)) {
            console.debug(`[useVideoPrefetch] Skipping video ${video.id} - format .${fileExtension} may not be compatible with browser preload`);
            // Marcar como fallido para no reintentar
            failedVideosRef.current.add(video.id);
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
            // Construir URL del video con codificación adecuada para caracteres especiales
            const normalizedPath = video.filepath.replace(/\\/g, '/');
            // Codificar la ruta pero dejar las barras sin codificar
            const encodedPath = normalizedPath.split('/').map(part => encodeURIComponent(part)).join('/');
            const videoUrl = `file:///${encodedPath}`;

            console.debug(`[useVideoPrefetch] Creating preload for video ${video.id}:`, {
                originalPath: video.filepath,
                normalizedPath,
                encodedPath,
                finalUrl: videoUrl
            });

            // Crear elemento de video
            const videoElement = document.createElement('video');
            videoElement.src = videoUrl;
            videoElement.preload = actualPreloadLevel;
            videoElement.style.display = 'none';
            videoElement.style.position = 'absolute';
            videoElement.style.left = '-9999px';
            videoElement.dataset.videoId = video.id;
            videoElement.dataset.context = contextRef.current;

            // Event listeners para debugging
            videoElement.addEventListener('loadedmetadata', () => {
                console.debug(`[useVideoPrefetch] Metadata loaded for video ${video.id}: ${video.title}`);
            });

            videoElement.addEventListener('error', (e) => {
                // Marcar este video como fallido para no reintentarlo
                failedVideosRef.current.add(video.id);

                // Obtener detalles del error del elemento de video
                const mediaError = videoElement.error;
                let errorMessage = 'Unknown error';
                let errorCode = 'UNKNOWN';

                if (mediaError) {
                    switch (mediaError.code) {
                        case mediaError.MEDIA_ERR_ABORTED:
                            errorCode = 'MEDIA_ERR_ABORTED';
                            errorMessage = 'Video loading was aborted';
                            break;
                        case mediaError.MEDIA_ERR_NETWORK:
                            errorCode = 'MEDIA_ERR_NETWORK';
                            errorMessage = 'Network error while loading video';
                            break;
                        case mediaError.MEDIA_ERR_DECODE:
                            errorCode = 'MEDIA_ERR_DECODE';
                            errorMessage = 'Video decoding error (corrupted file or unsupported codec)';
                            break;
                        case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                            errorCode = 'MEDIA_ERR_SRC_NOT_SUPPORTED';
                            errorMessage = 'Video format not supported or file not found';
                            break;
                        default:
                            errorCode = `CODE_${mediaError.code}`;
                            errorMessage = mediaError.message || 'Unknown media error';
                    }
                }

                console.warn(`[useVideoPrefetch] Video ${video.id} failed to load (will not retry):`, {
                    errorCode,
                    errorMessage,
                    videoId: video.id,
                    title: video.title,
                    filepath: video.filepath,
                    videoUrl,
                    fileExists: video.is_available,
                    fileSize: video.file_size,
                    mediaError: mediaError ? {
                        code: mediaError.code,
                        message: mediaError.message
                    } : null
                });

                // Remover el elemento fallido del DOM
                removePreloadElement(video.id);
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
     * @returns {boolean} - true si se agregó exitosamente, false si no
     */
    const addPreloadElement = useCallback((video, config) => {
        if (!video || !video.id) return false;

        // Si ya existe, skip
        if (preloadElementsRef.current.has(video.id)) {
            return false;
        }

        // Si este video ya falló anteriormente, no reintentar
        if (failedVideosRef.current.has(video.id)) {
            console.debug(`[useVideoPrefetch] Skipping video ${video.id} (previously failed)`);
            return false;
        }

        const element = createPreloadElement(video, config.preloadLevel, config.maxFileSizeMB);
        if (!element) return false;

        try {
            document.body.appendChild(element);
            preloadElementsRef.current.set(video.id, element);
            console.debug(`[useVideoPrefetch] Preloading video ${video.id}: ${video.title}`);
            return true;
        } catch (error) {
            console.error(`[useVideoPrefetch] Error appending preload element:`, error);
            return false;
        }
    }, []);

    /**
     * Remueve un elemento de preload del DOM
     * @param {number} videoId - ID del video
     */
    const removePreloadElement = useCallback((videoId) => {
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
    }, []);

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
            setStats({
                preloadedVideos: [],
                totalPreloadedMB: 0,
                isPreloading: false
            });
            return;
        }

        // Si no hay video actual, no precargar pero no limpiar
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
        const timeouts = [];
        queue.forEach(({ video, priority }) => {
            const delay = priority * 500; // 500ms, 1000ms, 1500ms, 2000ms
            const timeoutId = setTimeout(() => {
                addPreloadElement(video, { preloadLevel, maxFileSizeMB });
            }, delay);
            timeouts.push(timeoutId);
        });

        // Cleanup: cancelar timeouts pendientes al cambiar de video
        return () => {
            timeouts.forEach(timeoutId => clearTimeout(timeoutId));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentVideoId, lookahead, lookbehind, enabled, preloadLevel, maxFileSizeMB, context]);

    // Effect separado para limpiar al desmontar el componente
    useEffect(() => {
        return () => {
            preloadElementsRef.current.forEach((element) => {
                try {
                    element.remove();
                } catch (error) {
                    console.error('[useVideoPrefetch] Cleanup error:', error);
                }
            });
            preloadElementsRef.current.clear();

            // Limpiar lista de videos fallidos cuando cambia el contexto
            failedVideosRef.current.clear();

            // Resetear stats al desmontar
            setStats({
                preloadedVideos: [],
                totalPreloadedMB: 0,
                isPreloading: false
            });
        };
    }, []);

    // Effect separado para actualizar stats cuando cambian los elementos precargados
    useEffect(() => {
        // Crear un intervalo para verificar y actualizar stats periódicamente
        const updateInterval = setInterval(() => {
            const preloadedVideos = Array.from(preloadElementsRef.current.keys());
            const totalPreloadedMB = preloadedVideos.reduce((sum, videoId) => {
                const video = videoQueue.find(v => v.id === videoId);
                return sum + (video ? video.file_size / (1024 * 1024) : 0);
            }, 0);

            const newStats = {
                preloadedVideos,
                totalPreloadedMB: parseFloat(totalPreloadedMB.toFixed(2)),
                isPreloading: preloadElementsRef.current.size > 0
            };

            // Solo actualizar si realmente cambió algo (comparación superficial)
            setStats(prevStats => {
                if (
                    prevStats.preloadedVideos.length !== newStats.preloadedVideos.length ||
                    prevStats.totalPreloadedMB !== newStats.totalPreloadedMB ||
                    prevStats.isPreloading !== newStats.isPreloading
                ) {
                    return newStats;
                }
                return prevStats;
            });
        }, 1000); // Actualizar cada segundo

        return () => clearInterval(updateInterval);
    }, [videoQueue]);

    return stats;
}

export default useVideoPrefetch;
