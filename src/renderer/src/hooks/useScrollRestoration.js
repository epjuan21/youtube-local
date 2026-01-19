import { useEffect, useRef } from 'react';

/**
 * Hook para restaurar la posición de scroll al navegar entre páginas
 * @param {string} key - Clave única para identificar la posición (ej: página actual)
 * @returns {React.RefObject} - Ref para el contenedor de scroll
 */
export function useScrollRestoration(key) {
    const scrollPositions = useRef(new Map());
    const scrollContainerRef = useRef(null);

    // Guardar posición al desmontar o cambiar key
    useEffect(() => {
        return () => {
            if (scrollContainerRef.current) {
                const scrollTop = scrollContainerRef.current.scrollTop || 0;
                const scrollLeft = scrollContainerRef.current.scrollLeft || 0;
                scrollPositions.current.set(key, { scrollTop, scrollLeft });
            }
        };
    }, [key]);

    // Restaurar posición al montar o cambiar key
    useEffect(() => {
        const savedPosition = scrollPositions.current.get(key);
        if (savedPosition && scrollContainerRef.current) {
            // Usar setTimeout para asegurar que el contenido esté renderizado
            setTimeout(() => {
                if (scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = savedPosition.scrollTop;
                    scrollContainerRef.current.scrollLeft = savedPosition.scrollLeft;
                }
            }, 100);
        }
    }, [key]);

    return scrollContainerRef;
}

export default useScrollRestoration;
