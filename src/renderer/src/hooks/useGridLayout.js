import { useState, useEffect, useMemo } from 'react';

/**
 * Hook para calcular el layout del grid responsivo
 * @param {number} containerWidth - Ancho del contenedor
 * @param {number} minCardWidth - Ancho mínimo de cada card (default: 280px)
 * @param {number} gap - Espacio entre cards (default: 16px)
 * @returns {Object} - Objeto con columnCount y columnWidth calculados
 */
export function useGridLayout(containerWidth, minCardWidth = 280, gap = 16) {
    const [columnCount, setColumnCount] = useState(4);

    useEffect(() => {
        if (!containerWidth) return;

        const availableWidth = containerWidth - gap;
        const cardWithGap = minCardWidth + gap;
        const cols = Math.max(1, Math.floor(availableWidth / cardWithGap));

        setColumnCount(cols);
    }, [containerWidth, minCardWidth, gap]);

    const columnWidth = useMemo(() => {
        if (!containerWidth) return minCardWidth;

        const totalGapWidth = gap * (columnCount - 1);
        const availableWidth = containerWidth - totalGapWidth;
        return Math.floor(availableWidth / columnCount);
    }, [containerWidth, columnCount, gap, minCardWidth]);

    return { columnCount, columnWidth };
}

export default useGridLayout;
