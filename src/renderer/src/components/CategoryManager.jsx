import React, { useState, useEffect } from 'react';
import {
    X, Plus, Edit2, Trash2, Save, Loader, AlertCircle,
    Tag, Check, Settings
} from 'lucide-react';
import CategoryBadge from './CategoryBadge';

/**
 * CategoryManager - Modal completo para CRUD de categorías
 * 
 * @param {function} onClose - Callback al cerrar el modal
 */
export default function CategoryManager({ onClose }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [showNewForm, setShowNewForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        color: '#3b82f6',
        icon: '📁',
        description: ''
    });
    const [formError, setFormError] = useState('');
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Paleta de colores predefinidos
    const colorPalette = [
        '#3b82f6', // Azul
        '#ef4444', // Rojo
        '#10b981', // Verde
        '#8b5cf6', // Púrpura
        '#f59e0b', // Naranja
        '#06b6d4', // Cyan
        '#ec4899', // Rosa
        '#84cc16', // Lima
        '#6366f1', // Índigo
        '#14b8a6', // Teal
        '#f97316', // Naranja oscuro
        '#6b7280', // Gris
    ];

    // Emojis/íconos sugeridos
    const iconSuggestions = [
        '📁', '🎯', '⭐', '🎬', '🎵', '🎮', '📚', '🏆',
        '💼', '🎓', '🎨', '🔧', '🌟', '💡', '🎭', '🎪'
    ];

    // Cargar categorías
    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await window.electronAPI.getAllCategories();
            setCategories(data);
        } catch (err) {
            console.error('Error al cargar categorías:', err);
            setError('Error al cargar las categorías');
        } finally {
            setLoading(false);
        }
    };

    // Resetear formulario
    const resetForm = () => {
        setFormData({
            name: '',
            color: '#3b82f6',
            icon: '📁',
            description: ''
        });
        setFormError('');
        setEditingId(null);
        setShowNewForm(false);
    };

    // Validar formulario
    const validateForm = () => {
        if (!formData.name.trim()) {
            setFormError('El nombre es obligatorio');
            return false;
        }

        if (formData.name.length > 50) {
            setFormError('El nombre no puede tener más de 50 caracteres');
            return false;
        }

        // Verificar nombre duplicado (excepto si estamos editando)
        const duplicate = categories.find(
            cat => cat.name.toLowerCase() === formData.name.toLowerCase().trim()
                && cat.id !== editingId
        );

        if (duplicate) {
            setFormError('Ya existe una categoría con ese nombre');
            return false;
        }

        return true;
    };

    // Crear nueva categoría
    const handleCreate = async () => {
        if (!validateForm()) return;

        try {
            setSaving(true);
            setFormError('');

            const result = await window.electronAPI.createCategory({
                name: formData.name.trim(),
                color: formData.color,
                icon: formData.icon,
                description: formData.description.trim()
            });

            if (result.success) {
                await loadCategories();
                resetForm();

                if (window.electronAPI.showToast) {
                    window.electronAPI.showToast({
                        type: 'success',
                        message: `Categoría "${formData.name}" creada exitosamente`
                    });
                }
            } else {
                setFormError(result.error || 'Error al crear categoría');
            }
        } catch (err) {
            console.error('Error al crear categoría:', err);
            setFormError('Error al crear la categoría');
        } finally {
            setSaving(false);
        }
    };

    // Editar categoría existente
    const handleEdit = (category) => {
        setEditingId(category.id);
        setFormData({
            name: category.name,
            color: category.color || '#3b82f6',
            icon: category.icon || '📁',
            description: category.description || ''
        });
        setShowNewForm(true);
        setFormError('');
    };

    // Actualizar categoría
    const handleUpdate = async () => {
        if (!validateForm()) return;

        try {
            setSaving(true);
            setFormError('');

            const result = await window.electronAPI.updateCategory(editingId, {
                name: formData.name.trim(),
                color: formData.color,
                icon: formData.icon,
                description: formData.description.trim()
            });

            if (result.success) {
                await loadCategories();
                resetForm();

                if (window.electronAPI.showToast) {
                    window.electronAPI.showToast({
                        type: 'success',
                        message: `Categoría actualizada exitosamente`
                    });
                }
            } else {
                setFormError(result.error || 'Error al actualizar categoría');
            }
        } catch (err) {
            console.error('Error al actualizar categoría:', err);
            setFormError('Error al actualizar la categoría');
        } finally {
            setSaving(false);
        }
    };

    // Eliminar categoría
    const handleDelete = async (categoryId) => {
        const category = categories.find(cat => cat.id === categoryId);

        if (!category) return;

        // Mostrar advertencia si tiene videos
        if (category.video_count > 0) {
            setDeleteConfirm(categoryId);
            return;
        }

        // Eliminar directamente si no tiene videos
        await performDelete(categoryId);
    };

    const performDelete = async (categoryId) => {
        try {
            setSaving(true);
            const category = categories.find(cat => cat.id === categoryId);

            const result = await window.electronAPI.deleteCategory(categoryId);

            if (result.success) {
                await loadCategories();
                setDeleteConfirm(null);

                if (window.electronAPI.showToast) {
                    window.electronAPI.showToast({
                        type: 'success',
                        message: `Categoría "${category?.name}" eliminada`
                    });
                }
            } else {
                setFormError(result.error || 'Error al eliminar categoría');
            }
        } catch (err) {
            console.error('Error al eliminar categoría:', err);
            setFormError('Error al eliminar la categoría');
        } finally {
            setSaving(false);
        }
    };

    // Cerrar con ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showNewForm) {
                    resetForm();
                } else if (deleteConfirm) {
                    setDeleteConfirm(null);
                } else {
                    onClose();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showNewForm, deleteConfirm, onClose]);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <div className="flex items-center gap-3">
                            <Settings className="text-blue-600" size={28} />
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Gestionar Categorías
                                </h2>
                                <p className="text-sm text-gray-500">
                                    {categories.length} categoría{categories.length !== 1 ? 's' : ''} total{categories.length !== 1 ? 'es' : ''}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="Cerrar"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            // Loading state
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader className="animate-spin text-blue-600 mb-4" size={48} />
                                <p className="text-gray-600">Cargando categorías...</p>
                            </div>
                        ) : error ? (
                            // Error state
                            <div className="flex flex-col items-center justify-center py-12">
                                <AlertCircle className="text-red-500 mb-4" size={48} />
                                <p className="text-red-600 mb-4">{error}</p>
                                <button
                                    onClick={loadCategories}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Reintentar
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Botón crear nueva categoría */}
                                {!showNewForm && (
                                    <button
                                        onClick={() => setShowNewForm(true)}
                                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
                                    >
                                        <Plus size={20} />
                                        <span className="font-medium">Nueva Categoría</span>
                                    </button>
                                )}

                                {/* Formulario de creación/edición */}
                                {showNewForm && (
                                    <div className="p-6 bg-gray-50 rounded-lg border-2 border-blue-200">
                                        <h3 className="text-lg font-semibold mb-4">
                                            {editingId ? 'Editar Categoría' : 'Nueva Categoría'}
                                        </h3>

                                        {/* Nombre */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nombre *
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Ej: Tutoriales, Entretenimiento..."
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                maxLength={50}
                                            />
                                        </div>

                                        {/* Descripción */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Descripción (opcional)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                placeholder="Breve descripción de la categoría"
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                maxLength={100}
                                            />
                                        </div>

                                        {/* Color */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Color
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {colorPalette.map(color => (
                                                    <button
                                                        key={color}
                                                        onClick={() => setFormData({ ...formData, color })}
                                                        className={`w-10 h-10 rounded-lg transition-all ${formData.color === color
                                                                ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                                                                : 'hover:scale-105'
                                                            }`}
                                                        style={{ backgroundColor: color }}
                                                        title={color}
                                                    >
                                                        {formData.color === color && (
                                                            <Check size={20} className="text-white mx-auto" strokeWidth={3} />
                                                        )}
                                                    </button>
                                                ))}
                                                {/* Color personalizado */}
                                                <div className="relative">
                                                    <input
                                                        type="color"
                                                        value={formData.color}
                                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                        className="w-10 h-10 rounded-lg cursor-pointer"
                                                        title="Color personalizado"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Ícono */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Ícono
                                            </label>
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {iconSuggestions.map(icon => (
                                                    <button
                                                        key={icon}
                                                        onClick={() => setFormData({ ...formData, icon })}
                                                        className={`w-12 h-12 text-2xl rounded-lg transition-all ${formData.icon === icon
                                                                ? 'bg-blue-100 ring-2 ring-blue-500 scale-110'
                                                                : 'bg-gray-100 hover:bg-gray-200 hover:scale-105'
                                                            }`}
                                                    >
                                                        {icon}
                                                    </button>
                                                ))}
                                            </div>
                                            <input
                                                type="text"
                                                value={formData.icon}
                                                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                                placeholder="O escribe un emoji..."
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                maxLength={4}
                                            />
                                        </div>

                                        {/* Preview */}
                                        <div className="mb-4 p-4 bg-white rounded-lg border">
                                            <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
                                            <CategoryBadge
                                                category={{
                                                    id: 0,
                                                    name: formData.name || 'Nombre de categoría',
                                                    color: formData.color,
                                                    icon: formData.icon
                                                }}
                                                size="md"
                                            />
                                        </div>

                                        {/* Error */}
                                        {formError && (
                                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                                                <AlertCircle size={18} />
                                                <span className="text-sm">{formError}</span>
                                            </div>
                                        )}

                                        {/* Botones */}
                                        <div className="flex gap-3 justify-end">
                                            <button
                                                onClick={resetForm}
                                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                                disabled={saving}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={editingId ? handleUpdate : handleCreate}
                                                disabled={saving || !formData.name.trim()}
                                                className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${saving || !formData.name.trim()
                                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                                    }`}
                                            >
                                                {saving ? (
                                                    <>
                                                        <Loader className="animate-spin" size={18} />
                                                        Guardando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save size={18} />
                                                        {editingId ? 'Actualizar' : 'Crear'}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Lista de categorías */}
                                <div className="space-y-3">
                                    {categories.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <Tag size={48} className="mx-auto mb-4 opacity-50" />
                                            <p className="text-lg">No hay categorías creadas</p>
                                            <p className="text-sm mt-2">Crea tu primera categoría para empezar</p>
                                        </div>
                                    ) : (
                                        categories.map(category => (
                                            <div
                                                key={category.id}
                                                className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex items-center gap-4 flex-1">
                                                    <CategoryBadge category={category} size="md" />
                                                    <div className="flex-1">
                                                        {category.description && (
                                                            <p className="text-sm text-gray-500">
                                                                {category.description}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {category.video_count} video{category.video_count !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleEdit(category)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(category.id)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t bg-gray-50">
                        <button
                            onClick={onClose}
                            className="w-full px-5 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de confirmación de eliminación */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setDeleteConfirm(null)} />
                    <div className="relative bg-white rounded-lg shadow-2xl p-6 max-w-md w-full">
                        <AlertCircle className="text-red-500 mb-4 mx-auto" size={48} />
                        <h3 className="text-xl font-bold text-center mb-2">
                            ¿Eliminar categoría?
                        </h3>
                        <p className="text-gray-600 text-center mb-6">
                            Esta categoría tiene {categories.find(c => c.id === deleteConfirm)?.video_count} video(s) asignado(s).
                            Se removerá la categoría de todos estos videos.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => performDelete(deleteConfirm)}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                                disabled={saving}
                            >
                                {saving ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}