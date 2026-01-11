import { useState, useEffect } from 'react';
import { 
    X, Save, Star, Type, Tag, Hash, Loader2, 
    CheckSquare, Minus, Plus, AlertCircle 
} from 'lucide-react';
import { showToast } from './ToastNotifications';

/**
 * Modal para edición en lote de múltiples videos
 * Permite: Cambiar categorías, tags, rating, agregar prefijo/sufijo al título
 */
function BulkEditor({ videos, isOpen, onClose, onSave }) {
    // Tabs disponibles
    const [activeTab, setActiveTab] = useState('title');
    
    // Estados para cada tipo de edición
    const [titleMode, setTitleMode] = useState('prefix'); // prefix, suffix, replace
    const [titleValue, setTitleValue] = useState('');
    const [rating, setRating] = useState(null);
    
    // Estados para categorías y tags
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [categoryMode, setCategoryMode] = useState('add'); // add, replace
    
    const [tags, setTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [tagMode, setTagMode] = useState('add'); // add, replace

    // Estado de guardado
    const [saving, setSaving] = useState(false);

    // Cargar categorías y tags al abrir
    useEffect(() => {
        if (isOpen) {
            loadCategories();
            loadTags();
            // Reset estados
            setTitleValue('');
            setTitleMode('prefix');
            setRating(null);
            setSelectedCategories([]);
            setSelectedTags([]);
        }
    }, [isOpen]);

    const loadCategories = async () => {
        try {
            const data = await window.electronAPI.getAllCategories();
            setCategories(data || []);
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    };

    const loadTags = async () => {
        try {
            const result = await window.electronAPI.tag.getAll();
            if (result.success) {
                setTags(result.tags || []);
            }
        } catch (error) {
            console.error('Error cargando tags:', error);
        }
    };

    const handleSave = async () => {
        if (!videos || videos.length === 0) return;

        setSaving(true);
        const videoIds = videos.map(v => v.id);

        try {
            let results = { updated: 0, failed: 0 };

            // Aplicar cambios según la pestaña activa
            if (activeTab === 'title' && titleValue.trim()) {
                const metadata = {};
                if (titleMode === 'prefix') {
                    metadata.titlePrefix = titleValue;
                } else if (titleMode === 'suffix') {
                    metadata.titleSuffix = titleValue;
                } else if (titleMode === 'replace') {
                    metadata.title = titleValue;
                }

                const result = await window.electronAPI.bulkUpdateMetadata(videoIds, metadata);
                results = result;
            }

            if (activeTab === 'rating' && rating !== null) {
                const result = await window.electronAPI.bulkUpdateMetadata(videoIds, { rating });
                results = result;
            }

            if (activeTab === 'categories' && selectedCategories.length > 0) {
                const result = await window.electronAPI.bulkSetCategories(
                    videoIds, 
                    selectedCategories, 
                    categoryMode
                );
                results = result;
            }

            if (activeTab === 'tags' && selectedTags.length > 0) {
                const result = await window.electronAPI.bulkSetTags(
                    videoIds, 
                    selectedTags, 
                    tagMode
                );
                results = result;
            }

            if (results.updated > 0) {
                showToast(
                    `${results.updated} video${results.updated !== 1 ? 's' : ''} actualizado${results.updated !== 1 ? 's' : ''}`,
                    'success',
                    3000
                );
                if (onSave) onSave();
                onClose();
            } else if (results.failed > 0) {
                showToast(`Error actualizando ${results.failed} videos`, 'error');
            } else {
                showToast('No se realizaron cambios', 'info');
            }

        } catch (error) {
            console.error('Error en edición en lote:', error);
            showToast('Error al aplicar cambios', 'error');
        } finally {
            setSaving(false);
        }
    };

    const toggleCategory = (categoryId) => {
        setSelectedCategories(prev => 
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const toggleTag = (tagId) => {
        setSelectedTags(prev => 
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const canSave = () => {
        if (activeTab === 'title') return titleValue.trim().length > 0;
        if (activeTab === 'rating') return rating !== null;
        if (activeTab === 'categories') return selectedCategories.length > 0;
        if (activeTab === 'tags') return selectedTags.length > 0;
        return false;
    };

    if (!isOpen || !videos || videos.length === 0) return null;

    const tabs = [
        { id: 'title', label: 'Título', icon: Type, color: '#3ea6ff' },
        { id: 'rating', label: 'Rating', icon: Star, color: '#ffc107' },
        { id: 'categories', label: 'Categorías', icon: Tag, color: '#3b82f6' },
        { id: 'tags', label: 'Tags', icon: Hash, color: '#8b5cf6' }
    ];

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                style={{
                    backgroundColor: '#212121',
                    borderRadius: '16px',
                    width: '650px',
                    maxWidth: '100%',
                    maxHeight: '85vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #303030',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                            Edición en Lote
                        </h2>
                        <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0 0' }}>
                            {videos.length} video{videos.length !== 1 ? 's' : ''} seleccionado{videos.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            cursor: 'pointer',
                            padding: '8px',
                            borderRadius: '8px',
                            display: 'flex'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    gap: '4px',
                    padding: '12px 24px',
                    borderBottom: '1px solid #303030',
                    backgroundColor: '#1a1a1a'
                }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '10px 16px',
                                    backgroundColor: isActive ? `${tab.color}20` : 'transparent',
                                    border: isActive ? `1px solid ${tab.color}50` : '1px solid transparent',
                                    borderRadius: '8px',
                                    color: isActive ? tab.color : '#888',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div style={{
                    padding: '24px',
                    overflowY: 'auto',
                    flex: 1,
                    minHeight: '300px'
                }}>
                    {/* Tab: Título */}
                    {activeTab === 'title' && (
                        <div>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    marginBottom: '12px',
                                    color: '#fff'
                                }}>
                                    Modo de modificación
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {[
                                        { id: 'prefix', label: 'Agregar prefijo', icon: Plus },
                                        { id: 'suffix', label: 'Agregar sufijo', icon: Plus },
                                        { id: 'replace', label: 'Reemplazar todo', icon: Minus }
                                    ].map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setTitleMode(mode.id)}
                                            style={{
                                                flex: 1,
                                                padding: '12px',
                                                backgroundColor: titleMode === mode.id ? '#3ea6ff20' : '#2a2a2a',
                                                border: titleMode === mode.id ? '1px solid #3ea6ff50' : '1px solid #404040',
                                                borderRadius: '8px',
                                                color: titleMode === mode.id ? '#3ea6ff' : '#aaa',
                                                fontSize: '13px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    marginBottom: '8px',
                                    color: '#fff'
                                }}>
                                    {titleMode === 'prefix' ? 'Texto a agregar al inicio' :
                                     titleMode === 'suffix' ? 'Texto a agregar al final' :
                                     'Nuevo título para todos'}
                                </label>
                                <input
                                    type="text"
                                    value={titleValue}
                                    onChange={(e) => setTitleValue(e.target.value)}
                                    placeholder={
                                        titleMode === 'prefix' ? 'Ej: [HD] ' :
                                        titleMode === 'suffix' ? 'Ej:  (2024)' :
                                        'Nuevo título...'
                                    }
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        backgroundColor: '#181818',
                                        border: '1px solid #303030',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {titleMode === 'replace' && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px',
                                    backgroundColor: '#ff980020',
                                    border: '1px solid #ff980050',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    <AlertCircle size={18} color="#ff9800" />
                                    <span style={{ fontSize: '13px', color: '#ff9800' }}>
                                        Esto reemplazará el título de todos los videos seleccionados
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Rating */}
                    {activeTab === 'rating' && (
                        <div>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '500',
                                marginBottom: '16px',
                                color: '#fff'
                            }}>
                                Calificación para todos los videos
                                {rating && (
                                    <span style={{
                                        marginLeft: '12px',
                                        padding: '4px 12px',
                                        backgroundColor: '#ffc10720',
                                        color: '#ffc107',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                        fontWeight: '600'
                                    }}>
                                        {rating}/10
                                    </span>
                                )}
                            </label>

                            <div style={{
                                display: 'flex',
                                gap: '6px',
                                padding: '16px',
                                backgroundColor: '#181818',
                                borderRadius: '12px',
                                border: '1px solid #303030'
                            }}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                                    <button
                                        key={value}
                                        onClick={() => setRating(rating === value ? null : value)}
                                        style={{
                                            flex: 1,
                                            padding: '16px 8px',
                                            backgroundColor: rating >= value ? '#ffc107' : '#2a2a2a',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: rating >= value ? '#000' : '#666',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>

                            {rating && (
                                <button
                                    onClick={() => setRating(null)}
                                    style={{
                                        marginTop: '12px',
                                        padding: '8px 16px',
                                        backgroundColor: 'transparent',
                                        border: '1px solid #404040',
                                        borderRadius: '6px',
                                        color: '#888',
                                        fontSize: '13px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Quitar calificación
                                </button>
                            )}
                        </div>
                    )}

                    {/* Tab: Categorías */}
                    {activeTab === 'categories' && (
                        <div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    marginBottom: '8px',
                                    color: '#fff'
                                }}>
                                    Modo
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setCategoryMode('add')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            backgroundColor: categoryMode === 'add' ? '#3b82f620' : '#2a2a2a',
                                            border: categoryMode === 'add' ? '1px solid #3b82f650' : '1px solid #404040',
                                            borderRadius: '8px',
                                            color: categoryMode === 'add' ? '#3b82f6' : '#aaa',
                                            fontSize: '13px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Agregar a existentes
                                    </button>
                                    <button
                                        onClick={() => setCategoryMode('replace')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            backgroundColor: categoryMode === 'replace' ? '#3b82f620' : '#2a2a2a',
                                            border: categoryMode === 'replace' ? '1px solid #3b82f650' : '1px solid #404040',
                                            borderRadius: '8px',
                                            color: categoryMode === 'replace' ? '#3b82f6' : '#aaa',
                                            fontSize: '13px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Reemplazar todas
                                    </button>
                                </div>
                            </div>

                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '500',
                                marginBottom: '12px',
                                color: '#fff'
                            }}>
                                Seleccionar categorías ({selectedCategories.length})
                            </label>

                            {categories.length === 0 ? (
                                <div style={{
                                    padding: '40px',
                                    textAlign: 'center',
                                    color: '#666'
                                }}>
                                    No hay categorías creadas
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    padding: '12px',
                                    backgroundColor: '#181818',
                                    borderRadius: '8px',
                                    border: '1px solid #303030'
                                }}>
                                    {categories.map(category => {
                                        const isSelected = selectedCategories.includes(category.id);
                                        return (
                                            <button
                                                key={category.id}
                                                onClick={() => toggleCategory(category.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '8px 14px',
                                                    backgroundColor: isSelected ? `${category.color}30` : '#2a2a2a',
                                                    border: isSelected ? `2px solid ${category.color}` : '2px solid transparent',
                                                    borderRadius: '20px',
                                                    color: isSelected ? category.color : '#aaa',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{
                                                    width: '10px',
                                                    height: '10px',
                                                    borderRadius: '50%',
                                                    backgroundColor: category.color
                                                }} />
                                                {category.name}
                                                {isSelected && <CheckSquare size={14} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Tags */}
                    {activeTab === 'tags' && (
                        <div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    marginBottom: '8px',
                                    color: '#fff'
                                }}>
                                    Modo
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setTagMode('add')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            backgroundColor: tagMode === 'add' ? '#8b5cf620' : '#2a2a2a',
                                            border: tagMode === 'add' ? '1px solid #8b5cf650' : '1px solid #404040',
                                            borderRadius: '8px',
                                            color: tagMode === 'add' ? '#8b5cf6' : '#aaa',
                                            fontSize: '13px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Agregar a existentes
                                    </button>
                                    <button
                                        onClick={() => setTagMode('replace')}
                                        style={{
                                            flex: 1,
                                            padding: '10px',
                                            backgroundColor: tagMode === 'replace' ? '#8b5cf620' : '#2a2a2a',
                                            border: tagMode === 'replace' ? '1px solid #8b5cf650' : '1px solid #404040',
                                            borderRadius: '8px',
                                            color: tagMode === 'replace' ? '#8b5cf6' : '#aaa',
                                            fontSize: '13px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Reemplazar todos
                                    </button>
                                </div>
                            </div>

                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '500',
                                marginBottom: '12px',
                                color: '#fff'
                            }}>
                                Seleccionar tags ({selectedTags.length})
                            </label>

                            {tags.length === 0 ? (
                                <div style={{
                                    padding: '40px',
                                    textAlign: 'center',
                                    color: '#666'
                                }}>
                                    No hay tags creados
                                </div>
                            ) : (
                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    padding: '12px',
                                    backgroundColor: '#181818',
                                    borderRadius: '8px',
                                    border: '1px solid #303030'
                                }}>
                                    {tags.map(tag => {
                                        const isSelected = selectedTags.includes(tag.id);
                                        return (
                                            <button
                                                key={tag.id}
                                                onClick={() => toggleTag(tag.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 12px',
                                                    backgroundColor: isSelected ? `${tag.color}30` : '#2a2a2a',
                                                    border: isSelected ? `2px solid ${tag.color}` : '2px solid transparent',
                                                    borderRadius: '6px',
                                                    color: isSelected ? tag.color : '#aaa',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <span style={{ color: tag.color }}>#</span>
                                                {tag.name}
                                                {isSelected && <CheckSquare size={12} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #303030',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    backgroundColor: '#1a1a1a'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#3f3f3f',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={!canSave() || saving}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: canSave() ? '#3ea6ff' : '#2a2a2a',
                            border: 'none',
                            borderRadius: '8px',
                            color: canSave() ? '#000' : '#666',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: canSave() && !saving ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {saving ? (
                            <>
                                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                Aplicando...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Aplicar a {videos.length} video{videos.length !== 1 ? 's' : ''}
                            </>
                        )}
                    </button>
                </div>
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

export default BulkEditor;