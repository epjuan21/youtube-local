import { forwardRef, useEffect, useRef } from 'react';
import VideoCard from './VideoCard';

/**
 * Grid responsivo con CSS Grid para renderizar videos
 * Usa LazyThumbnail (Intersection Observer) para lazy loading de imágenes
 */
const VirtualizedGrid = forwardRef(({
    videos,
    onUpdate,
    onFavoriteToggle,
    selectionMode = false,
    selectedVideos = new Set(),
    onSelectionChange = null,
    onVisibleIndexChange = null,
    onVideoClick = null,
    minCardWidth = 220,
    gap = 16
}, ref) => {
    const containerRef = useRef(null);
    const scrollContainerRef = ref || containerRef;

    // Track scroll position para video prefetch
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !onVisibleIndexChange) return;

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            const containerWidth = container.clientWidth;

            // Calcular columnas
            const cardWithGap = minCardWidth + gap;
            const columnCount = Math.max(1, Math.floor(containerWidth / cardWithGap));

            // Estimar índice visible (aproximado pero suficiente para prefetch)
            const estimatedRowHeight = 320; // Altura aproximada de card
            const visibleRow = Math.floor(scrollTop / estimatedRowHeight);
            const estimatedIndex = visibleRow * columnCount;

            onVisibleIndexChange(Math.max(0, estimatedIndex));
        };

        container.addEventListener('scroll', handleScroll, { passive: true });

        // Initial call
        handleScroll();

        return () => container.removeEventListener('scroll', handleScroll);
    }, [onVisibleIndexChange, minCardWidth, gap]);

    return (
        <div
            ref={scrollContainerRef}
            style={{
                width: '100%',
                height: '100%',
                overflow: 'auto',
                paddingRight: '8px'
            }}
        >
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
                gap: `${gap}px`,
                width: '100%'
            }}>
                {videos.map((video) => (
                    <VideoCard
                        key={video.id}
                        video={video}
                        onUpdate={onUpdate}
                        onFavoriteToggle={onFavoriteToggle}
                        selectionMode={selectionMode}
                        isSelected={selectedVideos.has(video.id)}
                        onSelectionChange={onSelectionChange}
                        onClick={onVideoClick}
                    />
                ))}
            </div>
        </div>
    );
});

VirtualizedGrid.displayName = 'VirtualizedGrid';

export default VirtualizedGrid;
