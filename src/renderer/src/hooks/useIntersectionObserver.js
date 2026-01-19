import { useEffect, useRef, useState } from 'react';

/**
 * Hook para detectar cuando un elemento entra en el viewport usando IntersectionObserver
 * @param {Object} options - Opciones para el IntersectionObserver
 * @returns {Object} - Objeto con ref, estado de intersección y flag de intersección previa
 */
export function useIntersectionObserver(options = {}) {
    const [isIntersecting, setIsIntersecting] = useState(false);
    const [hasIntersected, setHasIntersected] = useState(false);
    const targetRef = useRef(null);

    useEffect(() => {
        const target = targetRef.current;
        if (!target || hasIntersected) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsIntersecting(entry.isIntersecting);
                if (entry.isIntersecting) {
                    setHasIntersected(true);
                }
            },
            {
                rootMargin: '200px', // Pre-cargar 200px antes del viewport
                threshold: 0.01,
                ...options
            }
        );

        observer.observe(target);
        return () => observer.disconnect();
    }, [hasIntersected, options]);

    return { targetRef, isIntersecting, hasIntersected };
}

export default useIntersectionObserver;
