import { Link, useLocation } from 'react-router-dom';
import { Home, Settings, FolderSync } from 'lucide-react';

function Sidebar() {
    const location = useLocation();

    const menuItems = [
        { path: '/', icon: Home, label: 'Inicio' },
        { path: '/sync', icon: FolderSync, label: 'Sincronización' },
        { path: '/settings', icon: Settings, label: 'Configuración' }
    ];

    return (
        <aside style={{
            width: '240px',
            backgroundColor: '#212121',
            padding: '12px 8px',
            overflowY: 'auto'
        }}>
            {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

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
                            marginBottom: '4px'
                        }}
                    >
                        <Icon size={20} />
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </aside>
    );
}

export default Sidebar;