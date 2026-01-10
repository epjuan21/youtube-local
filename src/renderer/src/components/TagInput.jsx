// ============================================
// TAG INPUT COMPONENT
// ============================================
// Ubicación: src/renderer/src/components/TagInput.jsx
// Fecha: 08 de Enero de 2025
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { Hash, Plus, X } from 'lucide-react';
import TagBadge from './TagBadge';

/**
 * TagInput - Input con autocompletado para agregar tags
 * 
 * @param {Object} props
 * @param {number} props.videoId - ID del video
 * @param {Array} props.selectedTags - Tags actuales del video
 * @param {Function} props.onTagsChange - Callback cuando cambian los tags
 * @param {string} props.placeholder - Placeholder del input
 */
const TagInput = ({
    videoId,
    selectedTags = [],
    onTagsChange,
    placeholder = 'Agregar tags...'
}) => {
    const [inputValue, setInputValue] = useState('');
    const [allTags, setAllTags] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);

    // Cargar todos los tags disponibles
    useEffect(() => {
        loadAllTags();
    }, []);

    const loadAllTags = async () => {
        try {
            const result = await window.electronAPI.tag.getAll();
            if (result.success) {
                setAllTags(result.tags);
            }
        } catch (error) {
            console.error('Error loading tags:', error);
        }
    };

    // Actualizar sugerencias cuando cambia el input
    useEffect(() => {
        if (inputValue.trim() === '') {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        const query = inputValue.toLowerCase().trim();

        // Filtrar tags que coincidan y no estén ya seleccionados
        const filtered = allTags.filter(tag =>
            tag.name.toLowerCase().includes(query) &&
            !selectedTags.some(st => st.id === tag.id)
        );

        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0 || inputValue.trim() !== '');
        setSelectedIndex(-1);
    }, [inputValue, allTags, selectedTags]);

    // Cerrar sugerencias al hacer click fuera
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(e.target) &&
                !inputRef.current.contains(e.target)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Agregar tag existente o crear nuevo
    const addTag = async (tagName) => {
        if (!tagName || tagName.trim() === '') return;

        setLoading(true);
        try {
            // Buscar si el tag ya existe (case-insensitive)
            let tag = allTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());

            // Si no existe, crearlo
            if (!tag) {
                const createResult = await window.electronAPI.tag.create({
                    name: tagName.trim(),
                    color: '#6b7280' // Color por defecto
                });

                if (createResult.success) {
                    tag = createResult.tag;
                    // Actualizar lista de todos los tags
                    setAllTags(prev => [...prev, tag]);
                } else {
                    console.error('Error creating tag:', createResult.error);
                    return;
                }
            }

            // Asignar tag al video
            const assignResult = await window.electronAPI.tag.assignToVideo(videoId, tag.id);

            if (assignResult.success) {
                // Actualizar tags seleccionados
                const updatedTags = [...selectedTags, tag];
                onTagsChange(updatedTags);

                setInputValue('');
                setShowSuggestions(false);
                inputRef.current?.focus();
            }
        } catch (error) {
            console.error('Error adding tag:', error);
        } finally {
            setLoading(false);
        }
    };

    // Remover tag
    const removeTag = async (tagToRemove) => {
        setLoading(true);
        try {
            const result = await window.electronAPI.tag.removeFromVideo(videoId, tagToRemove.id);

            if (result.success) {
                const updatedTags = selectedTags.filter(t => t.id !== tagToRemove.id);
                onTagsChange(updatedTags);
            }
        } catch (error) {
            console.error('Error removing tag:', error);
        } finally {
            setLoading(false);
        }
    };

    // Manejar teclas especiales
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();

            if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                // Seleccionar sugerencia con teclado
                addTag(suggestions[selectedIndex].name);
            } else if (inputValue.trim() !== '') {
                // Crear nuevo tag
                addTag(inputValue.trim());
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev =>
                prev < suggestions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setInputValue('');
        }
    };

    return (
        <div className="space-y-2">
            {/* Tags seleccionados */}
            {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {selectedTags.map(tag => (
                        <TagBadge
                            key={tag.id}
                            name={tag.name}
                            color={tag.color}
                            size="sm"
                            removable={!loading}
                            onRemove={() => removeTag(tag)}
                        />
                    ))}
                </div>
            )}

            {/* Input con autocompletado */}
            <div className="relative">
                <div className="relative">
                    <Hash
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => inputValue && setShowSuggestions(true)}
                        placeholder={placeholder}
                        disabled={loading}
                        className="
              w-full pl-10 pr-10 py-2.5 
              bg-gray-800 border border-gray-700 rounded-lg
              text-white placeholder-gray-500
              focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
                    />
                    {inputValue && (
                        <button
                            onClick={() => {
                                setInputValue('');
                                inputRef.current?.focus();
                            }}
                            className="
                absolute right-3 top-1/2 -translate-y-1/2
                text-gray-400 hover:text-white transition-colors
              "
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Sugerencias */}
                {showSuggestions && (
                    <div
                        ref={suggestionsRef}
                        className="
              absolute z-50 w-full mt-1 
              bg-gray-800 border border-gray-700 rounded-lg
              shadow-xl max-h-64 overflow-y-auto
            "
                    >
                        {suggestions.length > 0 ? (
                            <>
                                {suggestions.map((tag, index) => (
                                    <button
                                        key={tag.id}
                                        onClick={() => addTag(tag.name)}
                                        className={`
                      w-full px-4 py-2.5 text-left flex items-center justify-between
                      hover:bg-gray-700 transition-colors
                      ${index === selectedIndex ? 'bg-gray-700' : ''}
                    `}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="text-white">#{tag.name}</span>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            {tag.usage_count || 0} videos
                                        </span>
                                    </button>
                                ))}
                            </>
                        ) : (
                            inputValue.trim() && (
                                <button
                                    onClick={() => addTag(inputValue.trim())}
                                    className="
                    w-full px-4 py-2.5 text-left flex items-center gap-2
                    hover:bg-gray-700 transition-colors
                  "
                                >
                                    <Plus size={16} className="text-green-400" />
                                    <span className="text-white">
                                        Crear tag "<span className="text-blue-400">#{inputValue.trim()}</span>"
                                    </span>
                                </button>
                            )
                        )}
                    </div>
                )}
            </div>

            {/* Hint */}
            <p className="text-xs text-gray-500">
                Escribe y presiona Enter para agregar. Usa # para buscar tags existentes.
            </p>
        </div>
    );
};

export default TagInput;