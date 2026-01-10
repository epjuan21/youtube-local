// ============================================
// TAG BADGE COMPONENT
// ============================================
// Ubicación: src/renderer/src/components/TagBadge.jsx
// Fecha: 08 de Enero de 2025
// ============================================

import React from 'react';
import { Hash } from 'lucide-react';

/**
 * TagBadge - Componente visual para mostrar un tag
 * 
 * @param {Object} props
 * @param {string} props.name - Nombre del tag
 * @param {string} props.color - Color del tag (hex)
 * @param {string} props.size - Tamaño: 'xs' | 'sm' | 'md' | 'lg'
 * @param {boolean} props.showHash - Mostrar ícono de hash
 * @param {boolean} props.removable - Mostrar botón de eliminar
 * @param {Function} props.onRemove - Callback al eliminar
 * @param {Function} props.onClick - Callback al hacer clic
 * @param {boolean} props.selected - Si está seleccionado
 * @param {boolean} props.interactive - Si tiene efectos hover
 */
const TagBadge = ({
    name,
    color = '#6b7280',
    size = 'sm',
    showHash = true,
    removable = false,
    onRemove,
    onClick,
    selected = false,
    interactive = false
}) => {
    // Configuración de tamaños
    const sizeConfig = {
        xs: {
            padding: '2px 6px',
            fontSize: '10px',
            iconSize: 10,
            gap: '2px',
            borderRadius: '4px'
        },
        sm: {
            padding: '3px 8px',
            fontSize: '11px',
            iconSize: 12,
            gap: '3px',
            borderRadius: '5px'
        },
        md: {
            padding: '4px 10px',
            fontSize: '12px',
            iconSize: 14,
            gap: '4px',
            borderRadius: '6px'
        },
        lg: {
            padding: '6px 12px',
            fontSize: '14px',
            iconSize: 16,
            gap: '5px',
            borderRadius: '8px'
        }
    };

    const config = sizeConfig[size] || sizeConfig.sm;

    // Función para determinar si el color de fondo es claro u oscuro
    const isLightColor = (hexColor) => {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.6;
    };

    // Colores calculados
    const textColor = isLightColor(color) ? '#1f2937' : '#ffffff';
    const bgColor = `${color}25`; // 25 = ~15% opacidad
    const borderColor = `${color}50`; // 50 = ~30% opacidad

    const handleClick = (e) => {
        if (onClick) {
            e.stopPropagation();
            onClick();
        }
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        if (onRemove) {
            onRemove();
        }
    };

    const baseStyles = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: config.gap,
        padding: config.padding,
        fontSize: config.fontSize,
        fontWeight: '600',
        borderRadius: config.borderRadius,
        backgroundColor: selected ? color : bgColor,
        color: selected ? (isLightColor(color) ? '#1f2937' : '#ffffff') : color,
        border: `1.5px solid ${selected ? color : borderColor}`,
        transition: 'all 0.2s ease',
        cursor: onClick || interactive ? 'pointer' : 'default',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        letterSpacing: '0.01em'
    };

    const hoverStyles = interactive || onClick ? {
        transform: 'translateY(-1px)',
        boxShadow: `0 2px 8px ${color}40`,
        backgroundColor: selected ? color : `${color}35`
    } : {};

    return (
        <span
            style={baseStyles}
            onClick={handleClick}
            onMouseEnter={(e) => {
                if (interactive || onClick) {
                    Object.assign(e.currentTarget.style, hoverStyles);
                }
            }}
            onMouseLeave={(e) => {
                if (interactive || onClick) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.backgroundColor = selected ? color : bgColor;
                }
            }}
            title={`#${name}`}
        >
            {showHash && (
                <Hash 
                    size={config.iconSize} 
                    style={{ 
                        opacity: 0.8,
                        flexShrink: 0
                    }} 
                />
            )}
            <span style={{ 
                maxWidth: '120px', 
                overflow: 'hidden', 
                textOverflow: 'ellipsis' 
            }}>
                {name}
            </span>
            {removable && (
                <button
                    onClick={handleRemove}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: '2px',
                        padding: '0',
                        width: config.iconSize + 2,
                        height: config.iconSize + 2,
                        border: 'none',
                        borderRadius: '50%',
                        backgroundColor: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        opacity: 0.7,
                        transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.2)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.7';
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title="Quitar tag"
                >
                    <svg
                        width={config.iconSize - 2}
                        height={config.iconSize - 2}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            )}
        </span>
    );
};

export default TagBadge;