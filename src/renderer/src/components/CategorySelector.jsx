import React, { useState, useEffect } from 'react';
import { X, Check, Tag, Loader, AlertCircle } from 'lucide-react';
import CategoryBadge from './CategoryBadge';

/**
 * CategorySelector - Modal para asignar múltiples categorías a un video
 * 
 * @param {number} videoId - ID del video a editar
 * @param {function} onClose - Callback al cerrar el modal
 * @param {function} onSave - Callback al guardar cambios (opcional, para refresh)
 */
export default function CategorySelector({ videoId, onClose, onSave }) {
    const [allCategories, setAllCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [initialCategories, setInitialCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Cargar categorías y categorías actuales del video
    useEffect(() => {
        loadData();
    }, [videoId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Cargar todas las categorías disponibles
            const categories = await window.electronAPI.getAllCategories();
            setAllCategories(categories);

            // Cargar categorías actuales del video
            const videoCategories = await window.electronAPI.getVideoCategories(videoId);
            const categoryIds = videoCategories.map(cat => cat.id);

            setSelectedCategories(categoryIds);
            setInitialCategories(categoryIds);
        } catch (err) {
            console.error('Error al cargar categorías:', err);
            setError('Error al cargar las categorías. Por favor, intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    // Toggle selección de categoría
    const toggleCategory = (categoryId) => {
        setSelectedCategories(prev => {
            if (prev.includes(categoryId)) {
                // Remover si ya está seleccionada
                return prev.filter(id => id !== categoryId);
            } else {
                // Agregar si no está seleccionada
                return [...prev, categoryId];
            }
        });
    };

    // Guardar cambios
    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);

            // Enviar las categorías seleccionadas al backend
            await window.electronAPI.setVideoCategories(videoId, selectedCategories);

            // Mostrar notificación de éxito
            if (window.electronAPI.showToast) {
                window.electronAPI.showToast({
                    type: 'success',
                    message: `Categorías actualizadas: ${selectedCategories.length} asignadas`
                });
            }

            // Callback para refrescar datos en el componente padre
            if (onSave) {
                await onSave();
            }

            // Cerrar modal
            onClose();
        } catch (err) {
            console.error('Error al guardar categorías:', err);
            setError('Error al guardar las categorías. Por favor, intenta de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    // Verificar si hay cambios
    const hasChanges = () => {
        if (selectedCategories.length !== initialCategories.length) return true;
        return !selectedCategories.every(id => initialCategories.includes(id));
    };

    // Filtrar categorías por búsqueda
    const filteredCategories = allCategories.filter(category =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Cerrar con ESC
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

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
                    className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b">
                        <div className="flex items-center gap-3">
                            <Tag className="text-blue-600" size={24} />
                            <h2 className="text-2xl font-bold text-gray-900">
                                Asignar Categorías
                            </h2>
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
                                    onClick={loadData}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Reintentar
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Barra de búsqueda */}
                                <div className="mb-6">
                                    <input
                                        type="text"
                                        placeholder="Buscar categorías..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                {/* Categorías seleccionadas (preview) */}
                                {selectedCategories.length > 0 && (
                                    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                        <p className="text-sm font-semibold text-gray-700 mb-3">
                                            Categorías seleccionadas ({selectedCategories.length}):
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {allCategories
                                                .filter(cat => selectedCategories.includes(cat.id))
                                                .map(category => (
                                                    <CategoryBadge
                                                        key={category.id}
                                                        category={category}
                                                        size="sm"
                                                        removable
                                                        onRemove={toggleCategory}
                                                    />
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Lista de categorías disponibles */}
                                <div className="space-y-2">
                                    {filteredCategories.length === 0 ? (
                                        <p className="text-center text-gray-500 py-8">
                                            {searchTerm
                                                ? 'No se encontraron categorías con ese nombre'
                                                : 'No hay categorías disponibles. Crea una nueva categoría primero.'}
                                        </p>
                                    ) : (
                                        filteredCategories.map(category => {
                                            const isSelected = selectedCategories.includes(category.id);

                                            return (
                                                <button
                                                    key={category.id}
                                                    onClick={() => toggleCategory(category.id)}
                                                    className={`
                            w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all
                            ${isSelected
                                                            ? 'border-blue-500 bg-blue-50'
                                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                          `}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <CategoryBadge
                                                            category={category}
                                                            size="md"
                                                        />
                                                        {category.description && (
                                                            <span className="text-sm text-gray-500">
                                                                {category.description}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className={`
                            flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all
                            ${isSelected
                                                            ? 'border-blue-500 bg-blue-500'
                                                            : 'border-gray-300'}
                          `}>
                                                        {isSelected && <Check size={16} className="text-white" strokeWidth={3} />}
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between p-6 border-t bg-gray-50">
                        <div className="text-sm text-gray-600">
                            {selectedCategories.length === 0
                                ? 'Sin categorías seleccionadas'
                                : `${selectedCategories.length} categoría${selectedCategories.length !== 1 ? 's' : ''} seleccionada${selectedCategories.length !== 1 ? 's' : ''}`}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges() || saving}
                                className={`
                  px-5 py-2 rounded-lg font-medium transition-all flex items-center gap-2
                  ${!hasChanges() || saving
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'}
                `}
                            >
                                {saving ? (
                                    <>
                                        <Loader className="animate-spin" size={16} />
                                        Guardando...
                                    </>
                                ) : (
                                    'Guardar Cambios'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}