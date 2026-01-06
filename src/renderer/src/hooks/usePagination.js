import { useState, useMemo } from 'react';

/**
 * Hook personalizado para manejar paginación de videos
 * @param {Array} items - Array de items a paginar
 * @param {number} itemsPerPage - Número de items por página (default: 24)
 * @returns {Object} - Objeto con items paginados y funciones de control
 */
export function usePagination(items, itemsPerPage = 24) {
    const [currentPage, setCurrentPage] = useState(1);

    // Calcular total de páginas
    const totalPages = Math.ceil(items.length / itemsPerPage);

    // Obtener items de la página actual
    const paginatedItems = useMemo(() => {
        const startIndex = 0;
        const endIndex = currentPage * itemsPerPage;
        return items.slice(startIndex, endIndex);
    }, [items, currentPage, itemsPerPage]);

    // Verificar si hay más items
    const hasMore = currentPage < totalPages;

    // Cargar siguiente página
    const loadMore = () => {
        if (hasMore) {
            setCurrentPage(prev => prev + 1);
        }
    };

    // Resetear paginación
    const reset = () => {
        setCurrentPage(1);
    };

    // Ir a página específica
    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    return {
        items: paginatedItems,
        currentPage,
        totalPages,
        hasMore,
        loadMore,
        reset,
        goToPage,
        totalItems: items.length,
        displayedItems: paginatedItems.length
    };
}

/**
 * Hook para scroll infinito (alternativa)
 * @param {Function} loadMore - Función para cargar más items
 * @param {boolean} hasMore - Si hay más items disponibles
 * @param {boolean} loading - Si está cargando
 */
export function useInfiniteScroll(loadMore, hasMore, loading) {
    const handleScroll = () => {
        if (loading || !hasMore) return;

        const scrollHeight = document.documentElement.scrollHeight;
        const scrollTop = document.documentElement.scrollTop;
        const clientHeight = document.documentElement.clientHeight;

        // Si estamos cerca del final (200px antes)
        if (scrollTop + clientHeight >= scrollHeight - 200) {
            loadMore();
        }
    };

    // Agregar listener de scroll
    const enableInfiniteScroll = () => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    };

    return { enableInfiniteScroll };
}

export default usePagination;