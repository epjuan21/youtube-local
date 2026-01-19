import { useState, useEffect } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { useThumbnailCache } from '../context/ThumbnailCacheContext';
import { Image } from 'lucide-react';

/**
 * Componente para carga lazy de thumbnails usando IntersectionObserver y caché LRU
 * @param {string} src - URL de la imagen
 * @param {string} alt - Texto alternativo
 * @param {Object} style - Estilos del contenedor
 * @param {Function} onError - Callback cuando falla la carga
 * @param {string} placeholderColor - Color de fondo del placeholder
 */
function LazyThumbnail({
    src,
    alt,
    style,
    onError,
    placeholderColor = '#1a1a1a'
}) {
    const { targetRef, hasIntersected } = useIntersectionObserver();
    const cache = useThumbnailCache();
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [cachedSrc, setCachedSrc] = useState(null);

    // Verificar caché al montar o cuando cambia src
    useEffect(() => {
        if (!src) return;

        const cached = cache.get(src);
        if (cached) {
            setCachedSrc(cached);
            setIsLoaded(true);
        }
    }, [src, cache]);

    const handleLoad = (e) => {
        setIsLoaded(true);
        // Cachear la URL cuando la imagen carga exitosamente
        if (src && e.target.complete) {
            cache.set(src, src);
        }
    };

    const handleError = (e) => {
        setHasError(true);
        setIsLoaded(false);
        if (onError) onError(e);
    };

    return (
        <div
            ref={targetRef}
            style={{
                ...style,
                position: 'relative',
                backgroundColor: placeholderColor,
                overflow: 'hidden'
            }}
        >
            {/* Placeholder mientras carga */}
            {!isLoaded && !hasError && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: 0.3
                }}>
                    <Image size={48} color="#666" />
                </div>
            )}

            {/* Estado de error */}
            {hasError && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: 0.5
                }}>
                    <Image size={48} color="#666" />
                </div>
            )}

            {/* Imagen real - cargar si está en caché o cuando intersecta */}
            {(cachedSrc || hasIntersected) && src && (
                <img
                    src={cachedSrc || src}
                    alt={alt}
                    onLoad={handleLoad}
                    onError={handleError}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: isLoaded ? 1 : 0,
                        transition: 'opacity 0.3s ease-in-out'
                    }}
                />
            )}
        </div>
    );
}

export default LazyThumbnail;
