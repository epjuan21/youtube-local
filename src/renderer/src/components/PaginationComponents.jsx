import { ChevronDown, Loader2 } from 'lucide-react';

/**
 * Componente de botón "Cargar Más" con indicador de progreso
 */
export function LoadMoreButton({ onLoadMore, hasMore, loading, currentItems, totalItems }) {
    if (!hasMore) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '32px 20px',
                color: '#666',
                fontSize: '14px'
            }}>
                {totalItems > 0 ? (
                    <>
                        <p style={{ marginBottom: '8px', fontWeight: '500' }}>
                            ✓ Todos los videos cargados
                        </p>
                        <p style={{ fontSize: '13px' }}>
                            Mostrando {totalItems} de {totalItems} videos
                        </p>
                    </>
                ) : (
                    <p>No hay videos para mostrar</p>
                )}
            </div>
        );
    }

    return (
        <div style={{
            textAlign: 'center',
            padding: '32px 20px'
        }}>
            {/* Indicador de progreso */}
            <div style={{
                marginBottom: '16px',
                fontSize: '14px',
                color: '#aaa'
            }}>
                Mostrando {currentItems} de {totalItems} videos
            </div>

            {/* Barra de progreso */}
            <div style={{
                width: '100%',
                maxWidth: '400px',
                height: '4px',
                backgroundColor: '#2a2a2a',
                borderRadius: '2px',
                margin: '0 auto 20px',
                overflow: 'hidden'
            }}>
                <div style={{
                    width: `${(currentItems / totalItems) * 100}%`,
                    height: '100%',
                    backgroundColor: '#3ea6ff',
                    borderRadius: '2px',
                    transition: 'width 0.3s ease'
                }} />
            </div>

            {/* Botón de cargar más */}
            <button
                onClick={onLoadMore}
                disabled={loading}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 32px',
                    backgroundColor: loading ? '#3f3f3f' : '#3ea6ff',
                    border: 'none',
                    borderRadius: '24px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: loading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                    if (!loading) {
                        e.currentTarget.style.backgroundColor = '#5ab3ff';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                }}
                onMouseLeave={(e) => {
                    if (!loading) {
                        e.currentTarget.style.backgroundColor = '#3ea6ff';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }
                }}
            >
                {loading ? (
                    <>
                        <Loader2
                            size={18}
                            style={{
                                animation: 'spin 1s linear infinite'
                            }}
                        />
                        <span>Cargando...</span>
                    </>
                ) : (
                    <>
                        <ChevronDown size={18} />
                        <span>Cargar más videos</span>
                    </>
                )}
            </button>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

/**
 * Componente de paginación con números de página
 */
export function PageNumbers({ currentPage, totalPages, onPageChange, maxVisible = 5 }) {
    if (totalPages <= 1) return null;

    // Calcular rango de páginas visibles
    const getPageRange = () => {
        const pages = [];
        const halfVisible = Math.floor(maxVisible / 2);

        let startPage = Math.max(1, currentPage - halfVisible);
        let endPage = Math.min(totalPages, currentPage + halfVisible);

        // Ajustar si estamos cerca del inicio o fin
        if (currentPage <= halfVisible) {
            endPage = Math.min(totalPages, maxVisible);
        }
        if (currentPage > totalPages - halfVisible) {
            startPage = Math.max(1, totalPages - maxVisible + 1);
        }

        // Agregar primera página
        if (startPage > 1) {
            pages.push(1);
            if (startPage > 2) pages.push('...');
        }

        // Agregar páginas del rango
        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        // Agregar última página
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        }

        return pages;
    };

    const pages = getPageRange();

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            padding: '32px 20px',
            flexWrap: 'wrap'
        }}>
            {/* Botón anterior */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                    padding: '8px 16px',
                    backgroundColor: currentPage === 1 ? '#2a2a2a' : '#3f3f3f',
                    border: 'none',
                    borderRadius: '8px',
                    color: currentPage === 1 ? '#666' : '#fff',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                }}
            >
                Anterior
            </button>

            {/* Números de página */}
            {pages.map((page, index) => (
                page === '...' ? (
                    <span
                        key={`ellipsis-${index}`}
                        style={{
                            padding: '8px',
                            color: '#666'
                        }}
                    >
                        ...
                    </span>
                ) : (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        style={{
                            padding: '8px 12px',
                            minWidth: '40px',
                            backgroundColor: currentPage === page ? '#3ea6ff' : '#3f3f3f',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: currentPage === page ? '600' : '500',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (currentPage !== page) {
                                e.currentTarget.style.backgroundColor = '#4f4f4f';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (currentPage !== page) {
                                e.currentTarget.style.backgroundColor = '#3f3f3f';
                            }
                        }}
                    >
                        {page}
                    </button>
                )
            ))}

            {/* Botón siguiente */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                    padding: '8px 16px',
                    backgroundColor: currentPage === totalPages ? '#2a2a2a' : '#3f3f3f',
                    border: 'none',
                    borderRadius: '8px',
                    color: currentPage === totalPages ? '#666' : '#fff',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                }}
            >
                Siguiente
            </button>
        </div>
    );
}

/**
 * Componente de información de paginación
 */
export function PaginationInfo({ currentItems, totalItems, currentPage, totalPages }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
            fontSize: '14px',
            color: '#aaa',
            borderTop: '1px solid #2a2a2a',
            marginTop: '24px'
        }}>
            <span>
                Mostrando {currentItems} de {totalItems} videos
            </span>
            <span>
                Página {currentPage} de {totalPages}
            </span>
        </div>
    );
}

export default {
    LoadMoreButton,
    PageNumbers,
    PaginationInfo
};