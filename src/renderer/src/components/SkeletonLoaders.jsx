import React from 'react';

/**
 * Skeleton Loader para VideoCard en vista Grid
 */
export function VideoCardSkeleton() {
    return (
        <div style={{
            backgroundColor: '#212121',
            borderRadius: '12px',
            overflow: 'hidden',
            animation: 'pulse 1.5s ease-in-out infinite'
        }}>
            {/* Thumbnail skeleton */}
            <div style={{
                width: '100%',
                paddingTop: '56.25%', // 16:9
                backgroundColor: '#2a2a2a',
                position: 'relative'
            }} />

            {/* Info skeleton */}
            <div style={{ padding: '12px' }}>
                {/* Título */}
                <div style={{
                    height: '16px',
                    backgroundColor: '#2a2a2a',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    width: '85%'
                }} />

                {/* Stats */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '8px'
                }}>
                    <div style={{
                        height: '12px',
                        backgroundColor: '#2a2a2a',
                        borderRadius: '4px',
                        width: '60px'
                    }} />
                    <div style={{
                        height: '12px',
                        backgroundColor: '#2a2a2a',
                        borderRadius: '4px',
                        width: '50px'
                    }} />
                </div>

                {/* Duración */}
                <div style={{
                    height: '12px',
                    backgroundColor: '#2a2a2a',
                    borderRadius: '4px',
                    width: '40px'
                }} />
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.6;
                    }
                }
            `}</style>
        </div>
    );
}

/**
 * Skeleton Loader para VideoCard en vista Lista
 */
export function VideoCardListSkeleton() {
    return (
        <div style={{
            display: 'flex',
            gap: '16px',
            padding: '12px',
            backgroundColor: '#212121',
            borderRadius: '8px',
            alignItems: 'center',
            animation: 'pulse 1.5s ease-in-out infinite'
        }}>
            {/* Thumbnail skeleton */}
            <div style={{
                width: '160px',
                height: '90px',
                backgroundColor: '#2a2a2a',
                borderRadius: '6px',
                flexShrink: 0
            }} />

            {/* Info skeleton */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Título */}
                <div style={{
                    height: '15px',
                    backgroundColor: '#2a2a2a',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    width: '70%'
                }} />

                {/* Stats */}
                <div style={{
                    display: 'flex',
                    gap: '16px',
                    flexWrap: 'wrap'
                }}>
                    <div style={{
                        height: '13px',
                        backgroundColor: '#2a2a2a',
                        borderRadius: '4px',
                        width: '80px'
                    }} />
                    <div style={{
                        height: '13px',
                        backgroundColor: '#2a2a2a',
                        borderRadius: '4px',
                        width: '60px'
                    }} />
                    <div style={{
                        height: '13px',
                        backgroundColor: '#2a2a2a',
                        borderRadius: '4px',
                        width: '120px'
                    }} />
                </div>
            </div>

            {/* Estado skeleton */}
            <div style={{
                width: '90px',
                height: '28px',
                backgroundColor: '#2a2a2a',
                borderRadius: '12px'
            }} />

            <style>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.6;
                    }
                }
            `}</style>
        </div>
    );
}

/**
 * Skeleton Loader para FolderCard
 */
export function FolderCardSkeleton() {
    return (
        <div style={{
            backgroundColor: '#212121',
            borderRadius: '12px',
            padding: '20px',
            animation: 'pulse 1.5s ease-in-out infinite'
        }}>
            {/* Ícono skeleton */}
            <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#2a2a2a',
                borderRadius: '50%',
                margin: '0 auto 16px'
            }} />

            {/* Nombre skeleton */}
            <div style={{
                height: '18px',
                backgroundColor: '#2a2a2a',
                borderRadius: '4px',
                marginBottom: '8px',
                width: '80%',
                margin: '0 auto 8px'
            }} />

            {/* Stats skeleton */}
            <div style={{
                height: '14px',
                backgroundColor: '#2a2a2a',
                borderRadius: '4px',
                width: '60%',
                margin: '0 auto'
            }} />

            <style>{`
                @keyframes pulse {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.6;
                    }
                }
            `}</style>
        </div>
    );
}

/**
 * Grid de Skeleton Loaders para VideoCards
 */
export function VideoGridSkeleton({ count = 12 }) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px'
        }}>
            {Array.from({ length: count }).map((_, index) => (
                <VideoCardSkeleton key={index} />
            ))}
        </div>
    );
}

/**
 * Lista de Skeleton Loaders para VideoCards
 */
export function VideoListSkeleton({ count = 8 }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Array.from({ length: count }).map((_, index) => (
                <VideoCardListSkeleton key={index} />
            ))}
        </div>
    );
}

/**
 * Grid de Skeleton Loaders para FolderCards
 */
export function FolderGridSkeleton({ count = 6 }) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
            gap: '20px'
        }}>
            {Array.from({ length: count }).map((_, index) => (
                <FolderCardSkeleton key={index} />
            ))}
        </div>
    );
}

/**
 * Skeleton Loader genérico con spinner
 */
export function LoadingSpinner({ message = 'Cargando...' }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '60vh'
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid #3ea6ff',
                    borderTop: '4px solid transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                }} />
                <p style={{ color: '#aaa' }}>{message}</p>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

export default {
    VideoCardSkeleton,
    VideoCardListSkeleton,
    FolderCardSkeleton,
    VideoGridSkeleton,
    VideoListSkeleton,
    FolderGridSkeleton,
    LoadingSpinner
};