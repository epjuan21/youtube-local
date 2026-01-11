// ============================================
// PLAYLIST PAGE COMPONENT
// ============================================
// Ubicación: src/renderer/src/pages/PlaylistPage.jsx
// Fecha: 09 de Enero de 2025
// ============================================

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, Play, Clock, Film, ListMusic, Shuffle,
    MoreVertical, Trash2, GripVertical, Edit2, Download
} from 'lucide-react';

const PlaylistPage = () => {
    const { playlistId } = useParams();
    const navigate = useNavigate();

    const [playlist, setPlaylist] = useState(null);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [showMenu, setShowMenu] = useState(null);

    useEffect(() => {
        if (playlistId) loadPlaylistData();
    }, [playlistId]);

    const loadPlaylistData = async () => {
        setLoading(true);
        setError('');
        try {
            const playlistResult = await window.electronAPI.playlist.getById(parseInt(playlistId));
            if (playlistResult.success) {
                setPlaylist(playlistResult.playlist);
            } else {
                setError('Playlist no encontrada');
                return;
            }

            const videosResult = await window.electronAPI.playlist.getVideos(parseInt(playlistId));
            if (videosResult.success) {
                setVideos(videosResult.videos || []);
            }
        } catch (err) {
            console.error('Error loading playlist:', err);
            setError('Error al cargar la playlist');
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const formatTotalDuration = (seconds) => {
        if (!seconds) return '0 min';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m} min`;
    };

    const getThumbnailUrl = (video) => {
        if (video.thumbnail) {
            return `file://${video.thumbnail.replace(/\\/g, '/')}`;
        }
        return null;
    };

    const playPlaylist = (startIndex = 0) => {
        if (videos.length === 0) return;
        const video = videos[startIndex];
        navigate(`/video/${video.id}?playlist=${playlistId}&index=${startIndex}`);
    };

    const shufflePlay = () => {
        if (videos.length === 0) return;
        const randomIndex = Math.floor(Math.random() * videos.length);
        playPlaylist(randomIndex);
    };

    const removeVideo = async (videoId) => {
        try {
            const result = await window.electronAPI.playlist.removeVideo(parseInt(playlistId), videoId);
            if (result.success) {
                setVideos(prev => prev.filter(v => v.id !== videoId));
                setPlaylist(prev => ({
                    ...prev,
                    video_count: (prev.video_count || 1) - 1
                }));
            }
        } catch (err) {
            console.error('Error removing video:', err);
        }
        setShowMenu(null);
    };

    // Drag and drop handlers
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newVideos = [...videos];
        const draggedVideo = newVideos[draggedIndex];
        newVideos.splice(draggedIndex, 1);
        newVideos.splice(index, 0, draggedVideo);
        setVideos(newVideos);
        setDraggedIndex(index);
    };

    const handleDragEnd = async () => {
        if (draggedIndex === null) return;

        try {
            const videoIds = videos.map(v => v.id);
            await window.electronAPI.playlist.reorder(parseInt(playlistId), videoIds);
        } catch (err) {
            console.error('Error reordering:', err);
            loadPlaylistData(); // Reload on error
        }
        setDraggedIndex(null);
    };

    const exportPlaylist = async () => {
        try {
            const result = await window.electronAPI.playlist.export(parseInt(playlistId));
            if (result.success) {
                const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${playlist.name.replace(/[^a-z0-9]/gi, '_')}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error('Error exporting:', err);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#181818' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px', height: '48px', border: '3px solid #333',
                        borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ color: '#888', fontSize: '14px' }}>Cargando playlist...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    // Error state
    if (error || !playlist) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#181818' }}>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <ListMusic size={64} color="#666" style={{ marginBottom: '16px' }} />
                    <h2 style={{ color: '#fff', marginBottom: '8px' }}>{error || 'Playlist no encontrada'}</h2>
                    <button onClick={() => navigate('/playlists')} style={{
                        marginTop: '16px', padding: '10px 20px', backgroundColor: '#10b981',
                        color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600'
                    }}>Ver todas las playlists</button>
                </div>
            </div>
        );
    }

    const totalDuration = videos.reduce((acc, v) => acc + (v.duration || 0), 0);

    return (
        <div style={{ flex: 1, backgroundColor: '#181818', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{
                padding: '24px 32px', borderBottom: '1px solid #2a2a2a',
                background: `linear-gradient(to bottom, ${playlist.color}30, #181818)`
            }}>
                <button onClick={() => navigate(-1)} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                    backgroundColor: 'transparent', border: '1px solid #333', borderRadius: '8px',
                    color: '#aaa', cursor: 'pointer', fontSize: '13px', marginBottom: '20px'
                }}><ArrowLeft size={16} /> Volver</button>

                <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                    {/* Playlist thumbnail */}
                    <div style={{
                        width: '200px', height: '200px', borderRadius: '12px', flexShrink: 0,
                        background: videos.length > 0 && videos[0].thumbnail
                            ? `url(${getThumbnailUrl(videos[0])}) center/cover`
                            : `linear-gradient(135deg, ${playlist.color}90, ${playlist.color}50)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                    }}>
                        {(!videos.length || !videos[0].thumbnail) && <ListMusic size={64} color="#fff" opacity={0.8} />}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, paddingTop: '12px' }}>
                        <p style={{ margin: '0 0 8px', fontSize: '12px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Playlist
                        </p>
                        <h1 style={{ margin: '0 0 16px', fontSize: '36px', fontWeight: '800', color: '#fff' }}>
                            {playlist.name}
                        </h1>
                        {playlist.description && (
                            <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#aaa', lineHeight: '1.5' }}>
                                {playlist.description}
                            </p>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#888', fontSize: '14px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Film size={16} /> {videos.length} videos
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={16} /> {formatTotalDuration(totalDuration)}
                            </span>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button onClick={() => playPlaylist(0)} disabled={videos.length === 0} style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 28px',
                                background: `linear-gradient(135deg, ${playlist.color}, ${playlist.color}cc)`,
                                border: 'none', borderRadius: '30px', color: '#fff', fontSize: '15px', fontWeight: '700',
                                cursor: videos.length === 0 ? 'not-allowed' : 'pointer', opacity: videos.length === 0 ? 0.5 : 1
                            }}><Play size={20} fill="#fff" /> Reproducir</button>
                            <button onClick={shufflePlay} disabled={videos.length === 0} style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 20px',
                                backgroundColor: '#333', border: 'none', borderRadius: '30px',
                                color: '#fff', fontSize: '14px', fontWeight: '600',
                                cursor: videos.length === 0 ? 'not-allowed' : 'pointer', opacity: videos.length === 0 ? 0.5 : 1
                            }}><Shuffle size={18} /> Aleatorio</button>
                            <button onClick={exportPlaylist} style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 20px',
                                backgroundColor: '#333', border: 'none', borderRadius: '30px',
                                color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                            }}><Download size={18} /> Exportar</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Videos list */}
            <div style={{ padding: '24px 32px' }}>
                {videos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
                        <Film size={64} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <h3 style={{ color: '#888', marginBottom: '8px' }}>Playlist vacía</h3>
                        <p style={{ fontSize: '14px' }}>Agrega videos desde sus tarjetas usando el botón de playlist</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {/* Header row */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '40px 60px 1fr 100px 60px',
                            gap: '16px', padding: '8px 16px', color: '#666', fontSize: '12px',
                            fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px',
                            borderBottom: '1px solid #333', marginBottom: '8px'
                        }}>
                            <span>#</span>
                            <span></span>
                            <span>Título</span>
                            <span>Duración</span>
                            <span></span>
                        </div>

                        {videos.map((video, index) => (
                            <div
                                key={video.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={handleDragEnd}
                                onClick={() => playPlaylist(index)}
                                style={{
                                    display: 'grid', gridTemplateColumns: '40px 60px 1fr 100px 60px',
                                    gap: '16px', padding: '12px 16px', alignItems: 'center',
                                    backgroundColor: draggedIndex === index ? '#333' : '#252525',
                                    borderRadius: '8px', cursor: 'pointer',
                                    opacity: !video.is_available ? 0.5 : 1,
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => { if (draggedIndex === null) e.currentTarget.style.backgroundColor = '#2a2a2a'; }}
                                onMouseLeave={(e) => { if (draggedIndex === null) e.currentTarget.style.backgroundColor = '#252525'; }}
                            >
                                {/* Position / Drag handle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666' }}>
                                    <GripVertical size={16} style={{ cursor: 'grab' }} />
                                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{index + 1}</span>
                                </div>

                                {/* Thumbnail */}
                                <div style={{
                                    width: '60px', height: '34px', borderRadius: '4px',
                                    backgroundColor: '#333', overflow: 'hidden'
                                }}>
                                    {video.thumbnail && (
                                        <img src={getThumbnailUrl(video)} alt="" style={{
                                            width: '100%', height: '100%', objectFit: 'cover'
                                        }} />
                                    )}
                                </div>

                                {/* Title */}
                                <div style={{ minWidth: 0 }}>
                                    <p style={{
                                        margin: 0, fontSize: '14px', fontWeight: '500', color: '#fff',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>{video.title}</p>
                                    {!video.is_available && (
                                        <span style={{
                                            fontSize: '11px', color: '#ef4444', fontWeight: '500'
                                        }}>No disponible</span>
                                    )}
                                </div>

                                {/* Duration */}
                                <span style={{ fontSize: '13px', color: '#888' }}>
                                    {formatDuration(video.duration)}
                                </span>

                                {/* Menu */}
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShowMenu(showMenu === video.id ? null : video.id); }}
                                        style={{
                                            padding: '6px', backgroundColor: 'transparent', border: 'none',
                                            color: '#888', cursor: 'pointer', borderRadius: '4px', display: 'flex'
                                        }}
                                    ><MoreVertical size={18} /></button>

                                    {showMenu === video.id && (
                                        <div style={{
                                            position: 'absolute', top: '32px', right: '0',
                                            backgroundColor: '#2a2a2a', borderRadius: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)', overflow: 'hidden', zIndex: 10, minWidth: '150px'
                                        }}>
                                            <button onClick={(e) => { e.stopPropagation(); navigate(`/video/${video.id}`); }} style={{
                                                width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px',
                                                backgroundColor: 'transparent', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer', textAlign: 'left'
                                            }}><Play size={16} /> Reproducir</button>
                                            <button onClick={(e) => { e.stopPropagation(); removeVideo(video.id); }} style={{
                                                width: '100%', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px',
                                                backgroundColor: 'transparent', border: 'none', color: '#ef4444', fontSize: '13px', cursor: 'pointer', textAlign: 'left'
                                            }}><Trash2 size={16} /> Quitar</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlaylistPage;