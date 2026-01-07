import React from 'react';
import { X } from 'lucide-react';

/**
 * CategoryBadge - Badge visual para mostrar categorías
 * 
 * @param {Object} category - Objeto categoría con { id, name, color, icon }
 * @param {string} size - Tamaño del badge: 'xs' | 'sm' | 'md'
 * @param {boolean} removable - Si true, muestra botón X para remover
 * @param {function} onRemove - Callback cuando se hace click en X
 * @param {function} onClick - Callback cuando se hace click en el badge
 * @param {string} className - Clases CSS adicionales
 */
export default function CategoryBadge({
    category,
    size = 'sm',
    removable = false,
    onRemove,
    onClick,
    className = ''
}) {
    if (!category) return null;

    // Configuración de tamaños
    const sizeClasses = {
        xs: 'text-xs px-1.5 py-0.5 gap-1',
        sm: 'text-sm px-2 py-1 gap-1.5',
        md: 'text-base px-3 py-1.5 gap-2'
    };

    const iconSizes = {
        xs: '12px',
        sm: '14px',
        md: '16px'
    };

    const removeIconSizes = {
        xs: 10,
        sm: 12,
        md: 14
    };

    // Clases base del badge
    const baseClasses = `
    inline-flex items-center rounded-full font-medium
    transition-all duration-200 ease-in-out
    ${sizeClasses[size]}
    ${className}
  `;

    // Estilos dinámicos con el color de la categoría
    const badgeStyle = {
        backgroundColor: category.color ? `${category.color}20` : '#3b82f620',
        color: category.color || '#3b82f6',
        border: `1px solid ${category.color || '#3b82f6'}40`
    };

    // Si es clickeable, agregar estilos hover
    const hoverClasses = onClick ? 'cursor-pointer hover:scale-105 hover:shadow-sm' : '';

    const handleRemove = (e) => {
        e.stopPropagation(); // Prevenir propagación al onClick del badge
        if (onRemove) {
            onRemove(category.id);
        }
    };

    const handleClick = (e) => {
        if (onClick && !removable) {
            onClick(category);
        }
    };

    return (
        <span
            className={`${baseClasses} ${hoverClasses}`}
            style={badgeStyle}
            onClick={handleClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {/* Ícono de la categoría */}
            {category.icon && (
                <span
                    style={{ fontSize: iconSizes[size] }}
                    className="flex-shrink-0"
                >
                    {category.icon}
                </span>
            )}

            {/* Nombre de la categoría */}
            <span className="font-semibold whitespace-nowrap">
                {category.name}
            </span>

            {/* Botón de remover (opcional) */}
            {removable && (
                <button
                    onClick={handleRemove}
                    className="flex-shrink-0 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
                    aria-label={`Remover categoría ${category.name}`}
                    type="button"
                >
                    <X size={removeIconSizes[size]} strokeWidth={2.5} />
                </button>
            )}
        </span>
    );
}

/**
 * CategoryBadgeList - Componente helper para mostrar lista de badges
 */
export function CategoryBadgeList({
    categories,
    size = 'sm',
    removable = false,
    onRemove,
    onClick,
    maxVisible = null,
    className = ''
}) {
    if (!categories || categories.length === 0) return null;

    const visibleCategories = maxVisible
        ? categories.slice(0, maxVisible)
        : categories;

    const hiddenCount = maxVisible && categories.length > maxVisible
        ? categories.length - maxVisible
        : 0;

    return (
        <div className={`flex flex-wrap gap-1.5 ${className}`}>
            {visibleCategories.map(category => (
                <CategoryBadge
                    key={category.id}
                    category={category}
                    size={size}
                    removable={removable}
                    onRemove={onRemove}
                    onClick={onClick}
                />
            ))}

            {/* Mostrar contador de categorías ocultas */}
            {hiddenCount > 0 && (
                <span
                    className={`
            inline-flex items-center rounded-full font-medium
            bg-gray-100 text-gray-600 border border-gray-300
            ${sizeClasses[size]}
          `}
                >
                    +{hiddenCount}
                </span>
            )}
        </div>
    );
}