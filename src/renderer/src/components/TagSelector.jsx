// ============================================
// TAG SELECTOR COMPONENT
// ============================================
// Ubicación: src/renderer/src/components/TagSelector.jsx
// Fecha: 08 de Enero de 2025
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { X, Hash, Plus, Check, Search, Loader2 } from 'lucide-react';
import TagBadge from './TagBadge';

/**
 * TagSelector - Modal para asignar tags a un video
 * 
 * @param {Object} props
 * @param {number} props.videoId - ID del video
 * @param {Function} props.onClose - Callback al cerrar
 * @param {Function} props.onSave - Callback al guardar
 */
const TagSelector = ({ videoId, onClose, onSave }) => {
    // Estados
    const [allTags, setAllTags] = useState([]);
    const [selectedTagIds, setSelectedTagIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [newTagColor, setNewTagColor] = useState('#3b82f6');

    const searchInputRef = useRef(null);
    const modalRef = useRef(null);

    // Colores predefinidos para nuevos tags
    const presetColors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308',
        '#84cc16', '#22c55e', '#10b981', '#14b8a6',
        '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
        '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'
    ];

    // Cargar datos al montar
    useEffect(() => {
        loadData();
        // Focus en el input de búsqueda
        setTimeout(() => searchInputRef.current?.focus(), 100);
    }, [videoId]);

    // Cerrar con Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    // Cerrar al hacer clic fuera del modal
    const handleBackdropClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose();
        }
    };

    const loadData = async () => {
        setLoading(true);
        setError('');

        try {
            // Cargar todos los tags
            const allTagsResult = await window.electronAPI.tag.getAll();
            if (allTagsResult.success) {
                setAllTags(allTagsResult.tags || []);
            }

            // Cargar tags del video actual
            const videoTagsResult = await window.electronAPI.tag.getVideoTags(videoId);
            if (videoTagsResult.success) {
                const ids = (videoTagsResult.tags || []).map(t => t.id);
                setSelectedTagIds(ids);
            }
        } catch (err) {
            console.error('Error cargando datos de tags:', err);
            setError('Error al cargar los tags');
        } finally {
            setLoading(false);
        }
    };

    // Toggle selección de un tag
    const toggleTag = (tagId) => {
        setSelectedTagIds(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    // Crear un nuevo tag
    const createNewTag = async () => {
        const trimmedQuery = searchQuery.trim();
        if (!trimmedQuery) return;

        // Verificar si ya existe (case-insensitive)
        const exists = allTags.some(
            t => t.name.toLowerCase() === trimmedQuery.toLowerCase()
        );

        if (exists) {
            setError('Ya existe un tag con ese nombre');
            return;
        }

        setCreating(true);
        setError('');

        try {
            const result = await window.electronAPI.tag.create({
                name: trimmedQuery,
                color: newTagColor
            });

            if (result.success) {
                // Agregar el nuevo tag a la lista y seleccionarlo
                setAllTags(prev => [...prev, result.tag]);
                setSelectedTagIds(prev => [...prev, result.tag.id]);
                setSearchQuery('');
                // Cambiar a un color aleatorio para el próximo
                setNewTagColor(presetColors[Math.floor(Math.random() * presetColors.length)]);
            } else {
                setError(result.error || 'Error al crear el tag');
            }
        } catch (err) {
            console.error('Error creando tag:', err);
            setError('Error al crear el tag');
        } finally {
            setCreating(false);
        }
    };

    // Guardar los tags seleccionados
    const handleSave = async () => {
        setSaving(true);
        setError('');

        try {
            const result = await window.electronAPI.tag.setVideoTags(videoId, selectedTagIds);

            if (result.success) {
                if (onSave) onSave();
                onClose();
            } else {
                setError(result.error || 'Error al guardar los tags');
            }
        } catch (err) {
            console.error('Error guardando tags:', err);
            setError('Error al guardar los tags');
        } finally {
            setSaving(false);
        }
    };

    // Filtrar tags según búsqueda
    const filteredTags = allTags.filter(tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Verificar si el texto de búsqueda coincide exactamente con un tag existente
    const exactMatch = allTags.some(
        t => t.name.toLowerCase() === searchQuery.trim().toLowerCase()
    );

    // Tags seleccionados (para mostrar arriba)
    const selectedTags = allTags.filter(t => selectedTagIds.includes(t.id));

    return (
        <div
            onClick={handleBackdropClick}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(4px)',
                padding: '16px'
            }}
        >
            <div
                ref={modalRef}
                style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: '16px',
                    width: '100%',
                    maxWidth: '480px',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    border: '1px solid #2a2a2a',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: '1px solid #2a2a2a',
                    background: 'linear-gradient(to bottom, #222, #1a1a1a)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Hash size={22} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{
                                margin: 0,
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#fff'
                            }}>
                                Gestionar Tags
                            </h2>
                            <p style={{
                                margin: 0,
                                fontSize: '13px',
                                color: '#888'
                            }}>
                                {selectedTagIds.length} tags seleccionados
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#666',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.backgroundColor = '#333';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#666';
                            e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Tags seleccionados */}
                {selectedTags.length > 0 && (
                    <div style={{
                        padding: '16px 24px',
                        borderBottom: '1px solid #2a2a2a',
                        backgroundColor: '#1f1f1f'
                    }}>
                        <p style={{
                            margin: '0 0 10px 0',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#666',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            Tags asignados
                        </p>
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px'
                        }}>
                            {selectedTags.map(tag => (
                                <TagBadge
                                    key={tag.id}
                                    name={tag.name}
                                    color={tag.color}
                                    size="sm"
                                    removable
                                    onRemove={() => toggleTag(tag.id)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Buscador + Crear nuevo */}
                <div style={{ padding: '16px 24px' }}>
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'stretch'
                    }}>
                        {/* Input de búsqueda */}
                        <div style={{
                            flex: 1,
                            position: 'relative'
                        }}>
                            <Search
                                size={18}
                                style={{
                                    position: 'absolute',
                                    left: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#555'
                                }}
                            />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setError('');
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && searchQuery.trim() && !exactMatch) {
                                        createNewTag();
                                    }
                                }}
                                placeholder="Buscar o crear tag..."
                                style={{
                                    width: '100%',
                                    padding: '12px 12px 12px 42px',
                                    backgroundColor: '#252525',
                                    border: '2px solid #333',
                                    borderRadius: '10px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                onBlur={(e) => e.target.style.borderColor = '#333'}
                            />
                        </div>

                        {/* Botón crear nuevo (solo si hay texto y no existe) */}
                        {searchQuery.trim() && !exactMatch && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {/* Selector de color */}
                                <div style={{
                                    position: 'relative'
                                }}>
                                    <button
                                        style={{
                                            width: '46px',
                                            height: '46px',
                                            borderRadius: '10px',
                                            border: '2px solid #333',
                                            backgroundColor: newTagColor,
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        title="Color del nuevo tag"
                                        onClick={() => {
                                            const currentIndex = presetColors.indexOf(newTagColor);
                                            const nextIndex = (currentIndex + 1) % presetColors.length;
                                            setNewTagColor(presetColors[nextIndex]);
                                        }}
                                    />
                                </div>

                                {/* Botón crear */}
                                <button
                                    onClick={createNewTag}
                                    disabled={creating}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '0 16px',
                                        backgroundColor: '#3b82f6',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '10px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: creating ? 'wait' : 'pointer',
                                        opacity: creating ? 0.7 : 1,
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!creating) {
                                            e.currentTarget.style.backgroundColor = '#2563eb';
                                            e.currentTarget.style.transform = 'translateY(-1px)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#3b82f6';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    {creating ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <Plus size={16} />
                                    )}
                                    Crear
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mensaje de error */}
                    {error && (
                        <p style={{
                            margin: '10px 0 0 0',
                            padding: '10px 12px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            color: '#f87171',
                            fontSize: '13px'
                        }}>
                            {error}
                        </p>
                    )}
                </div>

                {/* Lista de tags disponibles */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '0 24px 16px'
                }}>
                    <p style={{
                        margin: '0 0 12px 0',
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#666',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        {searchQuery ? 'Resultados' : 'Todos los tags'} ({filteredTags.length})
                    </p>

                    {loading ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '40px',
                            color: '#666'
                        }}>
                            <Loader2 size={24} className="animate-spin" />
                        </div>
                    ) : filteredTags.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: '#666'
                        }}>
                            {searchQuery ? (
                                <>
                                    <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                                        No se encontró "{searchQuery}"
                                    </p>
                                    <p style={{ margin: 0, fontSize: '13px', color: '#555' }}>
                                        Presiona Enter o el botón Crear para agregarlo
                                    </p>
                                </>
                            ) : (
                                <p style={{ margin: 0, fontSize: '14px' }}>
                                    No hay tags creados aún
                                </p>
                            )}
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px'
                        }}>
                            {filteredTags.map(tag => {
                                const isSelected = selectedTagIds.includes(tag.id);
                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => toggleTag(tag.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '8px 12px',
                                            backgroundColor: isSelected ? `${tag.color}25` : '#252525',
                                            border: `2px solid ${isSelected ? tag.color : '#333'}`,
                                            borderRadius: '8px',
                                            color: isSelected ? tag.color : '#aaa',
                                            fontSize: '13px',
                                            fontWeight: '500',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.borderColor = '#555';
                                                e.currentTarget.style.backgroundColor = '#2a2a2a';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelected) {
                                                e.currentTarget.style.borderColor = '#333';
                                                e.currentTarget.style.backgroundColor = '#252525';
                                            }
                                        }}
                                    >
                                        {isSelected ? (
                                            <Check size={14} />
                                        ) : (
                                            <Hash size={14} style={{ opacity: 0.6 }} />
                                        )}
                                        <span>{tag.name}</span>
                                        {tag.video_count > 0 && (
                                            <span style={{
                                                fontSize: '11px',
                                                opacity: 0.6,
                                                marginLeft: '2px'
                                            }}>
                                                ({tag.video_count})
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '20px 24px',
                    borderTop: '1px solid #2a2a2a',
                    backgroundColor: '#1f1f1f'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: '#333',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#444'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#333'}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            flex: 2,
                            padding: '12px',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: saving ? 'wait' : 'pointer',
                            opacity: saving ? 0.7 : 1,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                        onMouseEnter={(e) => {
                            if (!saving) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {saving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Check size={18} />
                                Guardar Tags
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* CSS para animación de spinner */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default TagSelector;