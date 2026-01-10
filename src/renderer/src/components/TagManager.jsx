// ============================================
// TAG MANAGER COMPONENT
// ============================================
// Ubicación: src/renderer/src/components/TagManager.jsx
// Fecha: 08 de Enero de 2025
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Edit2, Trash2, Save, Hash, Search } from 'lucide-react';
import TagBadge from './TagBadge';

/**
 * TagManager - Modal para gestionar todos los tags
 */
const TagManager = ({ isOpen, onClose, onUpdate }) => {
    const [tags, setTags] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingTag, setEditingTag] = useState(null);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('#6b7280');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const modalRef = useRef(null);

    const predefinedColors = [
        '#ef4444', '#f97316', '#f59e0b', '#eab308',
        '#84cc16', '#22c55e', '#10b981', '#14b8a6',
        '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
        '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
        '#f43f5e', '#6b7280'
    ];

    useEffect(() => {
        if (isOpen) loadTags();
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleBackdropClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose();
        }
    };

    const loadTags = async () => {
        setLoading(true);
        try {
            const result = await window.electronAPI.tag.getAll();
            if (result.success) setTags(result.tags || []);
        } catch (err) {
            console.error('Error loading tags:', err);
            setError('Error al cargar tags');
        } finally {
            setLoading(false);
        }
    };

    const createTag = async () => {
        if (!newTagName.trim()) {
            setError('El nombre del tag es requerido');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const result = await window.electronAPI.tag.create({
                name: newTagName.trim(),
                color: newTagColor
            });
            if (result.success) {
                setTags(prev => [...prev, result.tag]);
                setNewTagName('');
                setNewTagColor('#6b7280');
                if (onUpdate) onUpdate();
            } else {
                setError(result.error || 'Error al crear tag');
            }
        } catch (err) {
            setError('Error al crear tag');
        } finally {
            setLoading(false);
        }
    };

    const updateTag = async () => {
        if (!editingTag) return;
        setLoading(true);
        setError('');
        try {
            const result = await window.electronAPI.tag.update(editingTag.id, {
                name: editingTag.name,
                color: editingTag.color
            });
            if (result.success) {
                setTags(prev => prev.map(t => t.id === editingTag.id ? result.tag : t));
                setEditingTag(null);
                if (onUpdate) onUpdate();
            } else {
                setError(result.error || 'Error al actualizar tag');
            }
        } catch (err) {
            setError('Error al actualizar tag');
        } finally {
            setLoading(false);
        }
    };

    const deleteTag = async (tag) => {
        if (!confirm(`¿Eliminar el tag "#${tag.name}"? Se removerá de ${tag.video_count || 0} videos.`)) return;
        setLoading(true);
        setError('');
        try {
            const result = await window.electronAPI.tag.delete(tag.id);
            if (result.success) {
                setTags(prev => prev.filter(t => t.id !== tag.id));
                if (onUpdate) onUpdate();
            } else {
                setError(result.error || 'Error al eliminar tag');
            }
        } catch (err) {
            setError('Error al eliminar tag');
        } finally {
            setLoading(false);
        }
    };

    const filteredTags = tags.filter(tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div onClick={handleBackdropClick} style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)', padding: '16px'
        }}>
            <div ref={modalRef} style={{
                backgroundColor: '#1a1a1a', borderRadius: '16px',
                width: '100%', maxWidth: '700px', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid #2a2a2a', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 24px', borderBottom: '1px solid #2a2a2a',
                    background: 'linear-gradient(to bottom, #222, #1a1a1a)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Hash size={22} color="#fff" />
                        </div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff' }}>
                            Gestionar Tags
                        </h2>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', color: '#666',
                        cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex'
                    }}>
                        <X size={22} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {error && (
                        <div style={{
                            marginBottom: '16px', padding: '12px 16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '10px', color: '#f87171', fontSize: '14px'
                        }}>{error}</div>
                    )}

                    {/* Crear nuevo tag */}
                    <div style={{
                        marginBottom: '24px', padding: '20px',
                        backgroundColor: '#222', borderRadius: '12px', border: '1px solid #333'
                    }}>
                        <h3 style={{
                            margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600',
                            color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px'
                        }}>Crear nuevo tag</h3>

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: '#888' }}>
                                    Nombre
                                </label>
                                <input
                                    type="text"
                                    value={newTagName}
                                    onChange={(e) => { setNewTagName(e.target.value); setError(''); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') createTag(); }}
                                    placeholder="Ej: tutorial, favorito, pendiente..."
                                    style={{
                                        width: '100%', padding: '12px 14px',
                                        backgroundColor: '#1a1a1a', border: '2px solid #333',
                                        borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none'
                                    }}
                                />
                            </div>
                            <button
                                onClick={createTag}
                                disabled={loading || !newTagName.trim()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '12px 20px', backgroundColor: '#8b5cf6', color: '#fff',
                                    border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600',
                                    cursor: loading || !newTagName.trim() ? 'not-allowed' : 'pointer',
                                    opacity: loading || !newTagName.trim() ? 0.5 : 1
                                }}
                            >
                                <Plus size={18} /> Crear Tag
                            </button>
                        </div>

                        {/* Selector de colores */}
                        <div style={{ marginTop: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#888' }}>
                                Color
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {predefinedColors.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewTagColor(color)}
                                        style={{
                                            width: '28px', height: '28px', borderRadius: '6px',
                                            border: newTagColor === color ? '3px solid #fff' : '2px solid transparent',
                                            backgroundColor: color, cursor: 'pointer',
                                            transform: newTagColor === color ? 'scale(1.1)' : 'scale(1)'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {newTagName.trim() && (
                            <div style={{ marginTop: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: '#888' }}>
                                    Vista previa
                                </label>
                                <TagBadge name={newTagName.trim()} color={newTagColor} size="md" />
                            </div>
                        )}
                    </div>

                    {/* Búsqueda */}
                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <Search size={18} style={{
                            position: 'absolute', left: '14px', top: '50%',
                            transform: 'translateY(-50%)', color: '#555'
                        }} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar tags..."
                            style={{
                                width: '100%', padding: '12px 14px 12px 44px',
                                backgroundColor: '#252525', border: '2px solid #333',
                                borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none'
                            }}
                        />
                    </div>

                    {/* Lista de tags */}
                    <div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#888' }}>
                            Tags existentes ({filteredTags.length})
                        </h3>

                        {loading && tags.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                Cargando tags...
                            </div>
                        ) : filteredTags.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                                {searchQuery ? 'No se encontraron tags' : 'No hay tags creados'}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {filteredTags.map(tag => (
                                    <div key={tag.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '14px 16px', backgroundColor: '#252525',
                                        borderRadius: '10px', border: '1px solid #333'
                                    }}>
                                        {editingTag?.id === tag.id ? (
                                            <>
                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                    <input
                                                        type="text"
                                                        value={editingTag.name}
                                                        onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                                                        style={{
                                                            flex: 1, minWidth: '150px', padding: '8px 12px',
                                                            backgroundColor: '#1a1a1a', border: '2px solid #8b5cf6',
                                                            borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none'
                                                        }}
                                                    />
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        {predefinedColors.slice(0, 8).map(color => (
                                                            <button
                                                                key={color}
                                                                onClick={() => setEditingTag({ ...editingTag, color })}
                                                                style={{
                                                                    width: '24px', height: '24px', borderRadius: '4px',
                                                                    border: editingTag.color === color ? '2px solid #fff' : '1px solid transparent',
                                                                    backgroundColor: color, cursor: 'pointer'
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                                                    <button onClick={updateTag} disabled={loading} style={{
                                                        padding: '8px', backgroundColor: '#22c55e', color: '#fff',
                                                        border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex'
                                                    }}>
                                                        <Save size={16} />
                                                    </button>
                                                    <button onClick={() => setEditingTag(null)} style={{
                                                        padding: '8px', backgroundColor: '#555', color: '#fff',
                                                        border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex'
                                                    }}>
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <TagBadge name={tag.name} color={tag.color} size="sm" />
                                                    <span style={{ fontSize: '13px', color: '#888' }}>
                                                        {tag.video_count || 0} videos
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => setEditingTag({ ...tag })} disabled={loading} style={{
                                                        padding: '8px', backgroundColor: '#3b82f6', color: '#fff',
                                                        border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex'
                                                    }}>
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => deleteTag(tag)} disabled={loading} style={{
                                                        padding: '8px', backgroundColor: '#ef4444', color: '#fff',
                                                        border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex'
                                                    }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px 24px', borderTop: '1px solid #2a2a2a', backgroundColor: '#1f1f1f'
                }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                        Total: {tags.length} tags
                    </p>
                    <button onClick={onClose} style={{
                        padding: '10px 20px', backgroundColor: '#333', color: '#fff',
                        border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                    }}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TagManager;