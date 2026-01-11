import { useState, useEffect } from 'react';
import { X, Save, Star, FileText, Type, StickyNote, Loader2 } from 'lucide-react';
import { showToast } from './ToastNotifications';

/**
 * Modal para editar metadatos de un video individual
 * Campos: Título, Descripción, Rating (1-10), Notas privadas
 */
function MetadataEditor({ video, isOpen, onClose, onSave }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        rating: null,
        notes: ''
    });
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Cargar datos del video cuando se abre el modal
    useEffect(() => {
        if (video && isOpen) {
            setFormData({
                title: video.title || '',
                description: video.description || '',
                rating: video.rating || null,
                notes: video.notes || ''
            });
            setHasChanges(false);
        }
    }, [video, isOpen]);

    // Detectar cambios
    useEffect(() => {
        if (!video) return;

        const changed =
            formData.title !== (video.title || '') ||
            formData.description !== (video.description || '') ||
            formData.rating !== (video.rating || null) ||
            formData.notes !== (video.notes || '');

        setHasChanges(changed);
    }, [formData, video]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleRatingClick = (value) => {
        // Si hace clic en el mismo rating, lo deselecciona
        if (formData.rating === value) {
            setFormData(prev => ({ ...prev, rating: null }));
        } else {
            setFormData(prev => ({ ...prev, rating: value }));
        }
    };

    const handleSave = async () => {
        if (!video || !hasChanges) return;

        setSaving(true);

        try {
            const result = await window.electronAPI.updateVideoMetadata(video.id, {
                title: formData.title.trim(),
                description: formData.description.trim(),
                rating: formData.rating,
                notes: formData.notes.trim()
            });

            if (result.success) {
                showToast('Metadatos guardados correctamente', 'success', 3000);
                if (onSave) {
                    onSave(result.video);
                }
                onClose();
            } else {
                showToast(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error guardando metadatos:', error);
            showToast('Error al guardar metadatos', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleSave();
        }
    };

    if (!isOpen || !video) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
            onKeyDown={handleKeyDown}
        >
            <div
                style={{
                    backgroundColor: '#212121',
                    borderRadius: '16px',
                    width: '600px',
                    maxWidth: '100%',
                    maxHeight: '90vh',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: '#3ea6ff20',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FileText size={20} color="#3ea6ff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                                Editar Metadatos
                            </h2>
                            <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0 0' }}>
                                {video.filename}
                            </p>
                        </div>
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
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#3f3f3f';
                            e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#888';
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{
                    padding: '24px',
                    overflowY: 'auto',
                    flex: 1
                }}>
                    {/* Título */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '8px',
                            color: '#fff'
                        }}>
                            <Type size={16} color="#3ea6ff" />
                            Título
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            placeholder="Título del video"
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: '#181818',
                                border: '1px solid #303030',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3ea6ff'}
                            onBlur={(e) => e.target.style.borderColor = '#303030'}
                        />
                    </div>

                    {/* Rating */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '8px',
                            color: '#fff'
                        }}>
                            <Star size={16} color="#ffc107" />
                            Calificación Personal
                            {formData.rating && (
                                <span style={{
                                    marginLeft: '8px',
                                    padding: '2px 8px',
                                    backgroundColor: '#ffc10720',
                                    color: '#ffc107',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                }}>
                                    {formData.rating}/10
                                </span>
                            )}
                        </label>
                        <div style={{
                            display: 'flex',
                            gap: '4px',
                            padding: '12px',
                            backgroundColor: '#181818',
                            borderRadius: '8px',
                            border: '1px solid #303030'
                        }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                                <button
                                    key={value}
                                    onClick={() => handleRatingClick(value)}
                                    style={{
                                        flex: 1,
                                        padding: '8px 4px',
                                        backgroundColor: formData.rating >= value ? '#ffc107' : '#2a2a2a',
                                        border: 'none',
                                        borderRadius: '4px',
                                        color: formData.rating >= value ? '#000' : '#666',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (formData.rating < value) {
                                            e.currentTarget.style.backgroundColor = '#3f3f3f';
                                            e.currentTarget.style.color = '#fff';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (formData.rating < value) {
                                            e.currentTarget.style.backgroundColor = '#2a2a2a';
                                            e.currentTarget.style.color = '#666';
                                        }
                                    }}
                                >
                                    {value}
                                </button>
                            ))}
                        </div>
                        {formData.rating && (
                            <button
                                onClick={() => handleInputChange('rating', null)}
                                style={{
                                    marginTop: '8px',
                                    padding: '6px 12px',
                                    backgroundColor: 'transparent',
                                    border: '1px solid #404040',
                                    borderRadius: '6px',
                                    color: '#888',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                Quitar calificación
                            </button>
                        )}
                    </div>

                    {/* Descripción */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '8px',
                            color: '#fff'
                        }}>
                            <FileText size={16} color="#10b981" />
                            Descripción
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Agrega una descripción para este video..."
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: '#181818',
                                border: '1px solid #303030',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none',
                                resize: 'vertical',
                                minHeight: '80px',
                                fontFamily: 'inherit',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3ea6ff'}
                            onBlur={(e) => e.target.style.borderColor = '#303030'}
                        />
                    </div>

                    {/* Notas Privadas */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '8px',
                            color: '#fff'
                        }}>
                            <StickyNote size={16} color="#8b5cf6" />
                            Notas Privadas
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            placeholder="Escribe notas personales sobre este video..."
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: '#181818',
                                border: '1px solid #303030',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                outline: 'none',
                                resize: 'vertical',
                                minHeight: '100px',
                                fontFamily: 'inherit',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#3ea6ff'}
                            onBlur={(e) => e.target.style.borderColor = '#303030'}
                        />
                        <p style={{
                            marginTop: '6px',
                            fontSize: '12px',
                            color: '#666'
                        }}>
                            Las notas son privadas y solo tú puedes verlas.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #303030',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#1a1a1a'
                }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        {hasChanges ? (
                            <span style={{ color: '#ffc107' }}>● Cambios sin guardar</span>
                        ) : (
                            <span>Presiona Ctrl+S para guardar</span>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
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
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4f4f4f'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3f3f3f'}
                        >
                            Cancelar
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || saving}
                            style={{
                                padding: '10px 24px',
                                backgroundColor: hasChanges ? '#3ea6ff' : '#2a2a2a',
                                border: 'none',
                                borderRadius: '8px',
                                color: hasChanges ? '#000' : '#666',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: hasChanges && !saving ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                if (hasChanges && !saving) {
                                    e.currentTarget.style.backgroundColor = '#5ab5ff';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (hasChanges && !saving) {
                                    e.currentTarget.style.backgroundColor = '#3ea6ff';
                                }
                            }}
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Guardar
                                </>
                            )}
                        </button>
                    </div>
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

export default MetadataEditor;