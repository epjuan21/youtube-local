import React, { forwardRef } from 'react';
import { Grid } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import VideoCard from './VideoCard';

/**
 * Grid virtualizado para renderizar grandes cantidades de videos eficientemente
 * Solo renderiza los items visibles en el viewport
 */
const VirtualizedGrid = forwardRef(({
    videos,
    onUpdate,
    onFavoriteToggle,
    selectionMode = false,
    selectedVideos = new Set(),
    onSelectionChange = null,
    minCardWidth = 280,
    rowHeight = 380,
    gap = 16
}, ref) => {
    return (
        <AutoSizer>
            {({ height, width }) => {
                // Calcular número de columnas basado en el ancho disponible
                const availableWidth = width - gap;
                const cardWithGap = minCardWidth + gap;
                const columnCount = Math.max(1, Math.floor(availableWidth / cardWithGap));

                // Calcular ancho de columna
                const totalGapWidth = gap * (columnCount - 1);
                const availableWidthForCards = width - totalGapWidth;
                const columnWidth = Math.floor(availableWidthForCards / columnCount);

                // Calcular número de filas
                const rowCount = Math.ceil(videos.length / columnCount);

                // Componente de celda del grid (usando la nueva API de react-window 2.x)
                const GridCellComponent = ({ columnIndex, rowIndex, style }) => {
                    const index = rowIndex * columnCount + columnIndex;
                    const video = videos[index];

                    if (!video) return null;

                    // Ajustar estilo para incluir gap
                    const cellStyle = {
                        ...style,
                        left: style.left + gap,
                        top: style.top + gap,
                        width: style.width - gap,
                        height: style.height - gap
                    };

                    return (
                        <div style={cellStyle}>
                            <VideoCard
                                video={video}
                                onUpdate={onUpdate}
                                onFavoriteToggle={onFavoriteToggle}
                                selectionMode={selectionMode}
                                isSelected={selectedVideos.has(video.id)}
                                onSelectionChange={onSelectionChange}
                            />
                        </div>
                    );
                };

                return (
                    <Grid
                        gridRef={ref}
                        columnCount={columnCount}
                        columnWidth={columnWidth}
                        rowCount={rowCount}
                        rowHeight={rowHeight}
                        cellComponent={GridCellComponent}
                        cellProps={{}}
                        overscanCount={1}
                        style={{
                            height: height || 600,
                            width: width,
                            overflowX: 'hidden'
                        }}
                    />
                );
            }}
        </AutoSizer>
    );
});

VirtualizedGrid.displayName = 'VirtualizedGrid';

export default VirtualizedGrid;
