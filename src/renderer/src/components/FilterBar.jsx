import { ArrowUpDown, Grid, List, Filter } from 'lucide-react';
import { useState } from 'react';

function FilterBar({ onSortChange, onViewChange, onFilterChange, currentSort, currentView }) {
    const [showFilters, setShowFilters] = useState(false);

    const sortOptions = [
        { value: 'date-desc', label: 'Más recientes primero' },
        { value: 'date-asc', label: 'Más antiguos primero' },
        { value: 'name-asc', label: 'Nombre (A-Z)' },
        { value: 'name-desc', label: 'Nombre (Z-A)' },
        { value: 'views-desc', label: 'Más vistos' },
        { value: 'views-asc', label: 'Menos vistos' },
        { value: 'size-desc', label: 'Más grandes' },
        { value: 'size-asc', label: 'Más pequeños' },
        { value: 'duration-desc', label: 'Más largos' },
        { value: 'duration-asc', label: 'Más cortos' }
    ];

    const filterOptions = [
        { value: 'all', label: 'Todos los videos' },
        { value: 'available', label: 'Solo disponibles' },
        { value: 'unavailable', label: 'Solo no disponibles' }
    ];

    const getCurrentSortLabel = () => {
        const option = sortOptions.find(opt => opt.value === currentSort);
        return option ? option.label : 'Ordenar';
    };

    return (
        <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            padding: '12px 16px',
            backgroundColor: '#212121',
            borderRadius: '12px'
        }}>
            {/* Dropdown de Ordenamiento */}
            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        backgroundColor: '#3f3f3f',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}
                >
                    <ArrowUpDown size={16} />
                    <span>{getCurrentSortLabel()}</span>
                </button>

                {showFilters && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '8px',
                        backgroundColor: '#2a2a2a',
                        border: '1px solid #3f3f3f',
                        borderRadius: '8px',
                        minWidth: '220px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        zIndex: 100,
                        overflow: 'hidden'
                    }}>
                        {sortOptions.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => {
                                    onSortChange(option.value);
                                    setShowFilters(false);
                                }}
                                style={{
                                    padding: '10px 16px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    backgroundColor: currentSort === option.value ? '#3ea6ff' : 'transparent',
                                    color: currentSort === option.value ? '#fff' : '#ddd',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (currentSort !== option.value) {
                                        e.currentTarget.style.backgroundColor = '#3f3f3f';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (currentSort !== option.value) {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                {option.label}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Selector de Filtro */}
            <select
                onChange={(e) => onFilterChange(e.target.value)}
                style={{
                    padding: '8px 14px',
                    backgroundColor: '#3f3f3f',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '14px',
                    outline: 'none'
                }}
            >
                {filterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Selector de Vista */}
            <div style={{
                display: 'flex',
                gap: '4px',
                backgroundColor: '#3f3f3f',
                borderRadius: '8px',
                padding: '4px'
            }}>
                <button
                    onClick={() => onViewChange('grid')}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: currentView === 'grid' ? '#3ea6ff' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    title="Vista Grid"
                >
                    <Grid size={18} />
                </button>
                <button
                    onClick={() => onViewChange('list')}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: currentView === 'list' ? '#3ea6ff' : 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'background-color 0.2s'
                    }}
                    title="Vista Lista"
                >
                    <List size={18} />
                </button>
            </div>
        </div>
    );
}

export default FilterBar;