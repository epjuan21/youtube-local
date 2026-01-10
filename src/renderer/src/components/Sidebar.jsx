import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Settings as SettingsIcon, FolderSync, Tag, Plus, Star, Hash } from 'lucide-react';
import { useState, useEffect } from 'react';
import CategoryBadge from './CategoryBadge';
import CategoryManager from './CategoryManager';
import TagBadge from './TagBadge';
import TagManager from './TagManager';

function Sidebar() {
    const location = useLocation();
    const navigate = useNavigate();

    // Estados para categorías
    const [categories, setCategories] = useState([]);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [loadingCategories, setLoadingCategories] = useState(false);

    // 🆕 Estados para tags
    const [tags, setTags] = useState([]);
    const [showTagManager, setShowTagManager] = useState(false);
    const [loadingTags, setLoadingTags] = useState(false);

    // Estado para favoritos
    const [favoritesCount, setFavoritesCount] = useState(0);

    const menuItems = [
        { path: '/', icon: Home, label: 'Inicio' },
        { path: '/favorites', icon: Star, label: 'Favoritos', badge: favoritesCount, badgeColor: '#ffc107' },
        { path: '/sync', icon: FolderSync, label: 'Sincronización' },
        { path: '/settings', icon: SettingsIcon, label: 'Configuración' }
    ];

    // Cargar datos al montar el componente
    useEffect(() => {
        loadCategories();
        loadTags(); // 🆕
        loadFavoritesCount();

        // Actualizar cada 10 segundos
        const interval = setInterval(() => {
            loadCategories();
            loadTags(); // 🆕
            loadFavoritesCount();
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

    // 🆕 Cargar tags
    const loadTags = async () => {
        try {
            setLoadingTags(true);
            const result = await window.electronAPI.tag.getAll();
            if (result.success) {
                // Filtrar tags que tienen videos y ordenar por uso
                const tagsWithVideos = (result.tags || [])
                    .filter(tag => tag.video_count > 0)
                    .sort((a, b) => b.usage_count - a.usage_count);
                setTags(tagsWithVideos);
            }
        } catch (error) {
            console.error('Error al cargar tags:', error);
            setTags([]);
        } finally {
            setLoadingTags(false);
        }
    };

    const loadFavoritesCount = async () => {
        try {
            const count = await window.electronAPI.getFavoritesCount();
            setFavoritesCount(count || 0);
        } catch (error) {
            console.error('Error al cargar contador de favoritos:', error);
            setFavoritesCount(0);
        }
    };

    const handleCloseCategoryManager = () => {
        setShowCategoryManager(false);
        loadCategories();
    };

    // 🆕 Cerrar TagManager
    const handleCloseTagManager = () => {
        setShowTagManager(false);
        loadTags();
    };

    const handleNavigateToCategory = (categoryId) => {
        navigate(`/category/${categoryId}`);
    };

    // 🆕 Navegar a página de tag
    const handleNavigateToTag = (tagId) => {
        navigate(`/tag/${tagId}`);
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
                    const isFavorites = item.path === '/favorites';

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
                                position: 'relative'
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
                                color={isFavorites ? '#ffc107' : '#fff'}
                                fill={isFavorites && isActive ? '#ffc107' : 'none'}
                            />
                            <span>{item.label}</span>

                            {/* Badge de contador */}
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
                <div style={{ marginTop: '4px' }}>
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

                        <button
                            onClick={() => setShowCategoryManager(true)}
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

                    {/* Loading state categorías */}
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

                    {/* Empty state categorías */}
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
                                onClick={() => setShowCategoryManager(true)}
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

                    {/* Botón "Ver todas" categorías */}
                    {categories.length > 8 && (
                        <button
                            onClick={() => setShowCategoryManager(true)}
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

                {/* 🆕 Separador antes de Tags */}
                <div style={{
                    height: '1px',
                    backgroundColor: '#3f3f3f',
                    margin: '8px 0'
                }} />

                {/* 🆕 Sección de Tags */}
                <div style={{ marginTop: '4px' }}>
                    {/* Header de tags */}
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
                            <Hash size={16} />
                            <span>Tags</span>
                        </div>

                        <button
                            onClick={() => setShowTagManager(true)}
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
                            title="Gestionar tags"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* Loading state tags */}
                    {loadingTags && tags.length === 0 && (
                        <div style={{
                            padding: '12px',
                            fontSize: '12px',
                            color: '#666',
                            textAlign: 'center'
                        }}>
                            Cargando...
                        </div>
                    )}

                    {/* Empty state tags */}
                    {!loadingTags && tags.length === 0 && (
                        <div style={{
                            padding: '12px',
                            fontSize: '12px',
                            color: '#666',
                            textAlign: 'center',
                            lineHeight: '1.5'
                        }}>
                            No hay tags con videos.
                            <br />
                            <button
                                onClick={() => setShowTagManager(true)}
                                style={{
                                    marginTop: '8px',
                                    background: 'none',
                                    border: 'none',
                                    color: '#8b5cf6',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    textDecoration: 'underline'
                                }}
                            >
                                Gestionar tags
                            </button>
                        </div>
                    )}

                    {/* Lista de tags */}
                    {tags.length > 0 && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                        }}>
                            {tags.slice(0, 8).map(tag => {
                                const isActive = location.pathname === `/tag/${tag.id}`;

                                return (
                                    <button
                                        key={tag.id}
                                        onClick={() => handleNavigateToTag(tag.id)}
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
                                        <TagBadge
                                            name={tag.name}
                                            color={tag.color}
                                            size="xs"
                                        />
                                        <span style={{
                                            fontSize: '12px',
                                            color: '#999',
                                            fontWeight: '500'
                                        }}>
                                            {tag.video_count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Botón "Ver todos" tags */}
                    {tags.length > 8 && (
                        <button
                            onClick={() => setShowTagManager(true)}
                            style={{
                                width: '100%',
                                marginTop: '8px',
                                padding: '8px 12px',
                                background: 'none',
                                border: 'none',
                                color: '#8b5cf6',
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
                            Ver todos los tags ({tags.length})
                        </button>
                    )}
                </div>
            </aside>

            {/* Modal de gestión de categorías */}
            {showCategoryManager && (
                <CategoryManager onClose={handleCloseCategoryManager} />
            )}

            {/* 🆕 Modal de gestión de tags */}
            {showTagManager && (
                <TagManager 
                    isOpen={showTagManager} 
                    onClose={handleCloseTagManager}
                    onUpdate={loadTags}
                />
            )}
        </>
    );
}

export default Sidebar;