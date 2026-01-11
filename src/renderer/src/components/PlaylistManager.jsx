// ============================================
// PLAYLIST MANAGER COMPONENT
// ============================================
// Ubicación: src/renderer/src/components/PlaylistManager.jsx
// Fecha: 09 de Enero de 2025
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Edit2, Trash2, Save, ListMusic, Search, Copy, Download, Upload } from 'lucide-react';

const PlaylistManager = ({ isOpen, onClose, onUpdate }) => {
    const [playlists, setPlaylists] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingPlaylist, setEditingPlaylist] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newColor, setNewColor] = useState('#10b981');

    const modalRef = useRef(null);
    const fileInputRef = useRef(null);

    const presetColors = [
        '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
        '#f59e0b', '#ef4444', '#06b6d4', '#84cc16',
        '#6366f1', '#14b8a6', '#f97316', '#a855f7'
    ];

    useEffect(() => {
        if (isOpen) loadPlaylists();
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) onClose();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleBackdropClick = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };

    const loadPlaylists = async () => {
        setLoading(true);
        try {
            const result = await window.electronAPI.playlist.getAll();
            if (result.success) setPlaylists(result.playlists || []);
        } catch (err) {
            setError('Error al cargar playlists');
        } finally {
            setLoading(false);
        }
    };

    const createPlaylist = async () => {
        if (!newName.trim()) { setError('El nombre es requerido'); return; }
        setLoading(true); setError('');
        try {
            const result = await window.electronAPI.playlist.create({
                name: newName.trim(), description: newDescription.trim(), color: newColor
            });
            if (result.success) {
                setPlaylists(prev => [result.playlist, ...prev]);
                setNewName(''); setNewDescription('');
                setNewColor(presetColors[Math.floor(Math.random() * presetColors.length)]);
                if (onUpdate) onUpdate();
            } else setError(result.error || 'Error al crear');
        } catch (err) { setError('Error al crear playlist'); }
        finally { setLoading(false); }
    };

    const updatePlaylist = async () => {
        if (!editingPlaylist) return;
        setLoading(true); setError('');
        try {
            const result = await window.electronAPI.playlist.update(editingPlaylist.id, {
                name: editingPlaylist.name, description: editingPlaylist.description, color: editingPlaylist.color
            });
            if (result.success) {
                setPlaylists(prev => prev.map(p => p.id === editingPlaylist.id ? { ...p, ...result.playlist } : p));
                setEditingPlaylist(null);
                if (onUpdate) onUpdate();
            } else setError(result.error || 'Error al actualizar');
        } catch (err) { setError('Error al actualizar'); }
        finally { setLoading(false); }
    };

    const deletePlaylist = async (playlist) => {
        if (!confirm(`¿Eliminar "${playlist.name}"?`)) return;
        setLoading(true); setError('');
        try {
            const result = await window.electronAPI.playlist.delete(playlist.id);
            if (result.success) {
                setPlaylists(prev => prev.filter(p => p.id !== playlist.id));
                if (onUpdate) onUpdate();
            } else setError(result.error);
        } catch (err) { setError('Error al eliminar'); }
        finally { setLoading(false); }
    };

    const duplicatePlaylist = async (playlist) => {
        setLoading(true);
        try {
            const result = await window.electronAPI.playlist.duplicate(playlist.id);
            if (result.success) { setPlaylists(prev => [result.playlist, ...prev]); if (onUpdate) onUpdate(); }
        } catch (err) { setError('Error al duplicar'); }
        finally { setLoading(false); }
    };

    const exportPlaylist = async (playlist) => {
        try {
            const result = await window.electronAPI.playlist.export(playlist.id);
            if (result.success) {
                const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `${playlist.name.replace(/[^a-z0-9]/gi, '_')}.json`;
                a.click(); URL.revokeObjectURL(url);
            }
        } catch (err) { setError('Error al exportar'); }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const data = JSON.parse(await file.text());
            const result = await window.electronAPI.playlist.import(data);
            if (result.success) {
                loadPlaylists(); if (onUpdate) onUpdate();
                alert(`Importado: ${result.addedCount} videos, ${result.notFoundCount} no encontrados`);
            } else setError(result.error);
        } catch (err) { setError('Archivo inválido'); }
        e.target.value = '';
    };

    const formatDuration = (s) => {
        if (!s) return '0 min';
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m} min`;
    };

    const filteredPlaylists = playlists.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div onClick={handleBackdropClick} style={{
            position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', padding: '16px'
        }}>
            <div ref={modalRef} style={{
                backgroundColor: '#1a1a1a', borderRadius: '16px', width: '100%', maxWidth: '750px', maxHeight: '90vh',
                display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                border: '1px solid #2a2a2a', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px',
                    borderBottom: '1px solid #2a2a2a', background: 'linear-gradient(to bottom, #222, #1a1a1a)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}><ListMusic size={22} color="#fff" /></div>
                        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff' }}>Gestionar Playlists</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => fileInputRef.current?.click()} style={{
                            padding: '8px 12px', backgroundColor: '#333', border: 'none', borderRadius: '8px',
                            color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px'
                        }}><Upload size={16} /> Importar</button>
                        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                        <button onClick={onClose} style={{
                            background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex'
                        }}><X size={22} /></button>
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {error && <div style={{
                        marginBottom: '16px', padding: '12px 16px', backgroundColor: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#f87171', fontSize: '14px'
                    }}>{error}</div>}

                    {/* Crear nueva */}
                    <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#222', borderRadius: '12px', border: '1px solid #333' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase' }}>Crear nueva playlist</h3>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                            <input type="text" value={newName} onChange={(e) => { setNewName(e.target.value); setError(''); }}
                                onKeyDown={(e) => e.key === 'Enter' && createPlaylist()} placeholder="Nombre..."
                                style={{ flex: 1, padding: '12px 14px', backgroundColor: '#1a1a1a', border: '2px solid #333', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                            <button onClick={createPlaylist} disabled={loading || !newName.trim()} style={{
                                padding: '12px 20px', backgroundColor: '#10b981', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600',
                                cursor: loading || !newName.trim() ? 'not-allowed' : 'pointer', opacity: loading || !newName.trim() ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '8px'
                            }}><Plus size={18} /> Crear</button>
                        </div>
                        <input type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Descripción (opcional)"
                            style={{ width: '100%', padding: '10px 14px', backgroundColor: '#1a1a1a', border: '2px solid #333', borderRadius: '10px', color: '#fff', fontSize: '13px', outline: 'none', marginBottom: '12px' }} />
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {presetColors.map(color => (
                                <button key={color} onClick={() => setNewColor(color)} style={{
                                    width: '28px', height: '28px', borderRadius: '6px', backgroundColor: color,
                                    border: newColor === color ? '3px solid #fff' : '2px solid transparent', cursor: 'pointer', transform: newColor === color ? 'scale(1.1)' : 'scale(1)'
                                }} />
                            ))}
                        </div>
                    </div>

                    {/* Búsqueda */}
                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Buscar playlists..."
                            style={{ width: '100%', padding: '12px 14px 12px 44px', backgroundColor: '#252525', border: '2px solid #333', borderRadius: '10px', color: '#fff', fontSize: '14px', outline: 'none' }} />
                    </div>

                    {/* Lista */}
                    <div>
                        <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '600', color: '#888' }}>Mis Playlists ({filteredPlaylists.length})</h3>
                        {loading && playlists.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Cargando...</div>
                        ) : filteredPlaylists.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>{searchQuery ? 'No encontradas' : 'No hay playlists'}</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {filteredPlaylists.map(playlist => (
                                    <div key={playlist.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                                        backgroundColor: '#252525', borderRadius: '10px', border: '1px solid #333'
                                    }}>
                                        {editingPlaylist?.id === playlist.id ? (
                                            <>
                                                <div style={{ width: '6px', height: '48px', backgroundColor: editingPlaylist.color, borderRadius: '3px', flexShrink: 0 }} />
                                                <div style={{ flex: 1 }}>
                                                    <input type="text" value={editingPlaylist.name}
                                                        onChange={(e) => setEditingPlaylist({ ...editingPlaylist, name: e.target.value })}
                                                        style={{ width: '100%', padding: '8px 10px', backgroundColor: '#1a1a1a', border: '2px solid #10b981', borderRadius: '6px', color: '#fff', fontSize: '14px', outline: 'none', marginBottom: '6px' }} />
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        {presetColors.slice(0, 8).map(color => (
                                                            <button key={color} onClick={() => setEditingPlaylist({ ...editingPlaylist, color })} style={{
                                                                width: '20px', height: '20px', borderRadius: '4px', backgroundColor: color,
                                                                border: editingPlaylist.color === color ? '2px solid #fff' : '1px solid transparent', cursor: 'pointer'
                                                            }} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={updatePlaylist} style={{ padding: '8px', backgroundColor: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', display: 'flex' }}><Save size={16} /></button>
                                                    <button onClick={() => setEditingPlaylist(null)} style={{ padding: '8px', backgroundColor: '#555', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ width: '6px', height: '48px', backgroundColor: playlist.color || '#10b981', borderRadius: '3px', flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ margin: 0, fontSize: '15px', fontWeight: '500', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{playlist.name}</p>
                                                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>{playlist.video_count || 0} videos • {formatDuration(playlist.total_duration)}</p>
                                                </div>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button onClick={() => setEditingPlaylist({ ...playlist })} title="Editar" style={{ padding: '8px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', display: 'flex' }}><Edit2 size={16} /></button>
                                                    <button onClick={() => duplicatePlaylist(playlist)} title="Duplicar" style={{ padding: '8px', backgroundColor: '#6366f1', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', display: 'flex' }}><Copy size={16} /></button>
                                                    <button onClick={() => exportPlaylist(playlist)} title="Exportar" style={{ padding: '8px', backgroundColor: '#8b5cf6', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', display: 'flex' }}><Download size={16} /></button>
                                                    <button onClick={() => deletePlaylist(playlist)} title="Eliminar" style={{ padding: '8px', backgroundColor: '#ef4444', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', display: 'flex' }}><Trash2 size={16} /></button>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid #2a2a2a', backgroundColor: '#1f1f1f' }}>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>Total: {playlists.length} playlists</p>
                    <button onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default PlaylistManager;