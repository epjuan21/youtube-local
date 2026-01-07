import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Settings as SettingsIcon, FolderSync, Tag, Plus, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import CategoryBadge from './CategoryBadge';
import CategoryManager from './CategoryManager';

function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    // Estados para categorías
    const [categories, setCategories] = useState([]);
    const [showManager, setShowManager] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // 🆕 Estado para favoritos
    const [favoritesCount, setFavoritesCount] = useState(0);

    const menuItems = [
        { path: '/', icon: Home, label: 'Inicio' },
        { path: '/favorites', icon: Star, label: 'Favoritos', badge: favoritesCount, badgeColor: '#ffc107' }, // 🆕
        { path: '/sync', icon: FolderSync, label: 'Sincronización' },
        { path: '/settings', icon: SettingsIcon, label: 'Configuración' }
    ];

    // Cargar categorías al montar el componente
    useEffect(() => {
        loadCategories();
        loadFavoritesCount(); // 🆕

        // Actualizar cada 10 segundos
        const interval = setInterval(() => {
            loadCategories();
            loadFavoritesCount(); // 🆕
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const loadCategories = async () => {
        try {
            setLoadingCategories(true);
            const data = await window.electronAPI.getAllCategories();
            const categoriesWithVideos = data.filter(cat => cat.video_count > 0);
            setCategories(categoriesWithVideos);
        } catch (error) {
            console.error('Error al cargar categorías:', error);
            setCategories([]);
        } finally {
            setLoadingCategories(false);
        }
    };

    // 🆕 Cargar contador de favoritos
    const loadFavoritesCount = async () => {
        try {
            const count = await window.electronAPI.getFavoritesCount();
            setFavoritesCount(count || 0);
        } catch (error) {
            console.error('Error al cargar contador de favoritos:', error);
            setFavoritesCount(0);
        }
    };

    const handleCloseManager = () => {
        setShowManager(false);
        loadCategories();
    };

    const handleNavigateToCategory = (categoryId) => {
        navigate(`/category/${categoryId}`);
    };

    return (
        <>
            <aside style={{
                width: '240px',
                backgroundColor: '#212121',
                padding: '12px 8px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {/* Menú principal */}
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    const isFavorites = item.path === '/favorites'; // 🆕

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '20px',
                                padding: '10px 12px',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                color: '#fff',
                                backgroundColor: isActive ? '#3f3f3f' : 'transparent',
                                transition: 'background-color 0.2s',
                                position: 'relative' // 🆕 Para el badge
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.backgroundColor = '#2a2a2a';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <Icon
                                size={20}
                                color={isFavorites ? '#ffc107' : '#fff'} // 🆕 Color especial para favoritos
                                fill={isFavorites && isActive ? '#ffc107' : 'none'} // 🆕
                            />
                            <span>{item.label}</span>

                            {/* 🆕 Badge de contador */}
                            {item.badge !== undefined && item.badge > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    right: '12px',
                                    backgroundColor: item.badgeColor || '#3b82f6',
                                    color: '#000',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    padding: '2px 6px',
                                    borderRadius: '999px',
                                    minWidth: '20px',
                                    textAlign: 'center'
                                }}>
                                    {item.badge > 99 ? '99+' : item.badge}
                                </div>
                            )}
                        </Link>
                    );
                })}

                {/* Separador */}
                <div style={{
                    height: '1px',
                    backgroundColor: '#3f3f3f',
                    margin: '8px 0'
                }} />

                {/* Sección de Categorías */}
                <div style={{
                    marginTop: '4px'
                }}>
                    {/* Header de categorías */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        marginBottom: '8px'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#999',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            <Tag size={16} />
                            <span>Categorías</span>
                        </div>

                        {/* Botón de gestionar */}
                        <button
                            onClick={() => setShowManager(true)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#999',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.backgroundColor = '#3f3f3f';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#999';
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="Gestionar categorías"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* Loading state */}
                    {loadingCategories && categories.length === 0 && (
                        <div style={{
                            padding: '12px',
                            fontSize: '12px',
                            color: '#666',
                            textAlign: 'center'
                        }}>
                            Cargando...
                        </div>
                    )}

                    {/* Empty state */}
                    {!loadingCategories && categories.length === 0 && (
                        <div style={{
                            padding: '12px',
                            fontSize: '12px',
                            color: '#666',
                            textAlign: 'center',
                            lineHeight: '1.5'
                        }}>
                            No hay categorías con videos.
                            <br />
                            <button
                                onClick={() => setShowManager(true)}
                                style={{
                                    marginTop: '8px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#3b82f6',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    textDecoration: 'underline'
                                }}
                            >
                                Crear primera categoría
                            </button>
                        </div>
                    )}

                    {/* Lista de categorías */}
                    {categories.length > 0 && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                        }}>
                            {categories.slice(0, 8).map(category => {
                                const isActive = location.pathname === `/category/${category.id}`;

                                return (
                                    <button
                                        key={category.id}
                                        onClick={() => handleNavigateToCategory(category.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            backgroundColor: isActive ? '#3f3f3f' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s',
                                            width: '100%'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.backgroundColor = '#2a2a2a';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        <CategoryBadge
                                            category={category}
                                            size="xs"
                                        />
                                        <span style={{
                                            fontSize: '12px',
                                            color: '#999',
                                            fontWeight: '500'
                                        }}>
                                            {category.video_count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Botón "Ver todas" si hay más de 8 */}
                    {categories.length > 8 && (
                        <button
                            onClick={() => setShowManager(true)}
                            style={{
                                width: '100%',
                                marginTop: '8px',
                                padding: '8px 12px',
                                background: 'none',
                                border: 'none',
                                color: '#3b82f6',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                borderRadius: '8px',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#2a2a2a';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            Ver todas las categorías ({categories.length})
                        </button>
                    )}
                </div>
            </aside>

            {/* Modal de gestión de categorías */}
            {showManager && (
                <CategoryManager onClose={handleCloseManager} />
            )}
        </>
    );
}

export default Sidebar;