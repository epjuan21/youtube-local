import { NavLink } from 'react-router-dom';
import { Home, Search, Settings, RefreshCw, Star } from 'lucide-react';
import { useState, useEffect } from 'react';

function Sidebar() {
    const [favoritesCount, setFavoritesCount] = useState(0);

    useEffect(() => {
        loadFavoritesCount();

        // Actualizar contador periódicamente
        const interval = setInterval(loadFavoritesCount, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadFavoritesCount = async () => {
        try {
            const count = await window.electronAPI.getFavoritesCount();
            setFavoritesCount(count);
        } catch (error) {
            console.error('Error loading favorites count:', error);
        }
    };

    const navItems = [
        { path: '/', icon: Home, label: 'Inicio' },
        { path: '/search', icon: Search, label: 'Buscar' },
        { path: '/favorites', icon: Star, label: 'Favoritos', badge: favoritesCount },
        { path: '/sync', icon: RefreshCw, label: 'Sincronización' },
        { path: '/settings', icon: Settings, label: 'Configuración' }
    ];

    return (
        <div style={{
            width: '240px',
            backgroundColor: '#1a1a1a',
            padding: '20px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            borderRight: '1px solid #2a2a2a'
        }}>
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    style={({ isActive }) => ({
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        color: isActive ? '#fff' : '#aaa',
                        backgroundColor: isActive ? '#3f3f3f' : 'transparent',
                        transition: 'all 0.2s',
                        position: 'relative'
                    })}
                    onMouseEnter={(e) => {
                        if (!e.currentTarget.classList.contains('active')) {
                            e.currentTarget.style.backgroundColor = '#2a2a2a';
                            e.currentTarget.style.color = '#fff';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!e.currentTarget.classList.contains('active')) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#aaa';
                        }
                    }}
                >
                    <item.icon size={20} />
                    <span style={{ fontSize: '14px', fontWeight: '500', flex: 1 }}>
                        {item.label}
                    </span>

                    {/* Badge de contador */}
                    {item.badge !== undefined && item.badge > 0 && (
                        <div style={{
                            minWidth: '20px',
                            height: '20px',
                            padding: '0 6px',
                            backgroundColor: item.path === '/favorites' ? '#ffc107' : '#3ea6ff',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: item.path === '/favorites' ? '#000' : '#fff'
                        }}>
                            {item.badge > 99 ? '99+' : item.badge}
                        </div>
                    )}
                </NavLink>
            ))}
        </div>
    );
}

export default Sidebar;