// ============================================
// PLAYLIST SELECTOR COMPONENT
// ============================================
// Ubicación: src/renderer/src/components/PlaylistSelector.jsx
// Fecha: 09 de Enero de 2025
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Check, ListMusic, Search, Loader2 } from 'lucide-react';

/**
 * PlaylistSelector - Modal para agregar un video a playlists
 */
const PlaylistSelector = ({ videoId, videoTitle, onClose, onSave }) => {
    const [playlists, setPlaylists] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [originalIds, setOriginalIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [error, setError] = useState('');

    const modalRef = useRef(null);
    const searchInputRef = useRef(null);

    // Colores para nuevas playlists
    const presetColors = [
        '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
        '#f59e0b', '#ef4444', '#06b6d4', '#84cc16'
    ];
    const [newPlaylistColor, setNewPlaylistColor] = useState(presetColors[0]);

    useEffect(() => {
        loadData();
        setTimeout(() => searchInputRef.current?.focus(), 100);
    }, [videoId]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    const handleBackdropClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            onClose();
        }
    };

    const loadData = async () => {
        setLoading(true);
        setError('');

        try {
            // Cargar todas las playlists
            const allResult = await window.electronAPI.playlist.getAll();
            if (allResult.success) {
                setPlaylists(allResult.playlists || []);
            }

            // Cargar playlists donde está el video
            const videoResult = await window.electronAPI.playlist.getVideoPlaylists(videoId);
            if (videoResult.success) {
                const ids = (videoResult.playlists || []).map(p => p.id);
                setSelectedIds(ids);
                setOriginalIds(ids);
            }
        } catch (err) {
            console.error('Error loading playlists:', err);
            setError('Error al cargar las playlists');
        } finally {
            setLoading(false);
        }
    };

    const togglePlaylist = (playlistId) => {
        setSelectedIds(prev =>
            prev.includes(playlistId)
                ? prev.filter(id => id !== playlistId)
                : [...prev, playlistId]
        );
    };

    const createNewPlaylist = async () => {
        if (!newPlaylistName.trim()) {
            setError('El nombre es requerido');
            return;
        }

        setCreating(true);
        setError('');

        try {
            const result = await window.electronAPI.playlist.create({
                name: newPlaylistName.trim(),
                color: newPlaylistColor
            });

            if (result.success) {
                // Agregar a la lista y seleccionar
                setPlaylists(prev => [result.playlist, ...prev]);
                setSelectedIds(prev => [...prev, result.playlist.id]);
                setNewPlaylistName('');
                setShowCreateForm(false);
                // Cambiar color para la próxima
                setNewPlaylistColor(presetColors[Math.floor(Math.random() * presetColors.length)]);
            } else {
                setError(result.error || 'Error al crear la playlist');
            }
        } catch (err) {
            setError('Error al crear la playlist');
        } finally {
            setCreating(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError('');

        try {
            // Determinar qué agregar y qué quitar
            const toAdd = selectedIds.filter(id => !originalIds.includes(id));
            const toRemove = originalIds.filter(id => !selectedIds.includes(id));

            // Agregar a nuevas playlists
            for (const playlistId of toAdd) {
                await window.electronAPI.playlist.addVideo(playlistId, videoId);
            }

            // Quitar de playlists deseleccionadas
            for (const playlistId of toRemove) {
                await window.electronAPI.playlist.removeVideo(playlistId, videoId);
            }

            if (onSave) onSave();
            onClose();
        } catch (err) {
            console.error('Error saving:', err);
            setError('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    // Filtrar playlists
    const filteredPlaylists = playlists.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    maxWidth: '450px',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ListMusic size={22} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#fff' }}>
                                Guardar en playlist
                            </h2>
                            <p style={{
                                margin: 0,
                                fontSize: '12px',
                                color: '#888',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {videoTitle}
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
                            display: 'flex'
                        }}
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Crear nueva playlist */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid #2a2a2a'
                }}>
                    {!showCreateForm ? (
                        <button
                            onClick={() => setShowCreateForm(true)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                backgroundColor: '#252525',
                                border: '2px dashed #444',
                                borderRadius: '10px',
                                color: '#aaa',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#10b981';
                                e.currentTarget.style.color = '#10b981';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#444';
                                e.currentTarget.style.color = '#aaa';
                            }}
                        >
                            <Plus size={18} />
                            Crear nueva playlist
                        </button>
                    ) : (
                        <div style={{
                            backgroundColor: '#252525',
                            borderRadius: '10px',
                            padding: '14px'
                        }}>
                            <input
                                type="text"
                                value={newPlaylistName}
                                onChange={(e) => setNewPlaylistName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') createNewPlaylist();
                                    if (e.key === 'Escape') setShowCreateForm(false);
                                }}
                                placeholder="Nombre de la playlist..."
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    backgroundColor: '#1a1a1a',
                                    border: '2px solid #333',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '14px',
                                    outline: 'none',
                                    marginBottom: '10px'
                                }}
                            />
                            {/* Selector de color */}
                            <div style={{
                                display: 'flex',
                                gap: '6px',
                                marginBottom: '12px'
                            }}>
                                {presetColors.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewPlaylistColor(color)}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '6px',
                                            backgroundColor: color,
                                            border: newPlaylistColor === color ? '2px solid #fff' : '2px solid transparent',
                                            cursor: 'pointer',
                                            transition: 'transform 0.15s'
                                        }}
                                    />
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        backgroundColor: '#333',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        fontSize: '13px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={createNewPlaylist}
                                    disabled={creating || !newPlaylistName.trim()}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        backgroundColor: '#10b981',
                                        border: 'none',
                                        borderRadius: '6px',
                                        color: '#fff',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        cursor: creating ? 'wait' : 'pointer',
                                        opacity: creating || !newPlaylistName.trim() ? 0.6 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {creating && <Loader2 size={14} className="animate-spin" />}
                                    Crear
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Búsqueda */}
                {playlists.length > 5 && (
                    <div style={{ padding: '12px 24px 0' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{
                                position: 'absolute',
                                left: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: '#555'
                            }} />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar playlist..."
                                style={{
                                    width: '100%',
                                    padding: '10px 12px 10px 38px',
                                    backgroundColor: '#252525',
                                    border: '1px solid #333',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div style={{
                        margin: '12px 24px 0',
                        padding: '10px 12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '8px',
                        color: '#f87171',
                        fontSize: '13px'
                    }}>
                        {error}
                    </div>
                )}

                {/* Lista de playlists */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px 24px'
                }}>
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
                    ) : filteredPlaylists.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '40px 20px',
                            color: '#666'
                        }}>
                            {searchQuery
                                ? 'No se encontraron playlists'
                                : 'No hay playlists. ¡Crea una nueva!'
                            }
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {filteredPlaylists.map(playlist => {
                                const isSelected = selectedIds.includes(playlist.id);
                                return (
                                    <button
                                        key={playlist.id}
                                        onClick={() => togglePlaylist(playlist.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '12px',
                                            backgroundColor: isSelected ? `${playlist.color}15` : '#252525',
                                            border: `2px solid ${isSelected ? playlist.color : 'transparent'}`,
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            width: '100%',
                                            textAlign: 'left'
                                        }}
                                    >
                                        {/* Color indicator */}
                                        <div style={{
                                            width: '4px',
                                            height: '36px',
                                            backgroundColor: playlist.color || '#10b981',
                                            borderRadius: '2px',
                                            flexShrink: 0
                                        }} />

                                        {/* Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{
                                                margin: 0,
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                color: '#fff',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {playlist.name}
                                            </p>
                                            <p style={{
                                                margin: '2px 0 0',
                                                fontSize: '12px',
                                                color: '#888'
                                            }}>
                                                {playlist.video_count || 0} videos
                                            </p>
                                        </div>

                                        {/* Checkbox */}
                                        <div style={{
                                            width: '22px',
                                            height: '22px',
                                            borderRadius: '6px',
                                            backgroundColor: isSelected ? playlist.color : '#333',
                                            border: isSelected ? 'none' : '2px solid #555',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            {isSelected && <Check size={14} color="#fff" />}
                                        </div>
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
                    padding: '16px 24px',
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
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            flex: 2,
                            padding: '12px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#fff',
                            fontSize: '14px',
                            fontWeight: '700',
                            cursor: saving ? 'wait' : 'pointer',
                            opacity: saving ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
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
                                Guardar
                            </>
                        )}
                    </button>
                </div>

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
        </div>
    );
};

export default PlaylistSelector;