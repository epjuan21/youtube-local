import { Search, X, Clock } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useSearch } from '../context/SearchContext';
import { useNavigate, useLocation } from 'react-router-dom';

function Header() {
    const { searchTerm, searchHistory, updateSearch, clearSearch, clearHistory } = useSearch();
    const [localSearch, setLocalSearch] = useState(searchTerm);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        setLocalSearch(searchTerm);
    }, [searchTerm]);

    // Cerrar sugerencias al hacer clic fuera
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = (term) => {
        updateSearch(term);
        setShowSuggestions(false);

        // Navegar a la página de búsqueda si hay término
        if (term.trim()) {
            navigate('/search');
        } else {
            // Si se limpia la búsqueda, volver a home
            if (location.pathname === '/search') {
                navigate('/');
            }
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setLocalSearch(value);
        updateSearch(value);
    };

    const handleClear = () => {
        setLocalSearch('');
        clearSearch();
        setShowSuggestions(false);

        // Si estamos en la página de búsqueda, volver a home
        if (location.pathname === '/search') {
            navigate('/');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSearch(localSearch);
        }
    };

    const handleFocus = () => {
        if (searchHistory.length > 0) {
            setShowSuggestions(true);
        }
    };

    const handleHistoryClick = (term) => {
        setLocalSearch(term);
        handleSearch(term);
    };

    return (
        <header style={{
            height: '56px',
            backgroundColor: '#212121',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '20px',
            borderBottom: '1px solid #303030',
            position: 'relative',
            zIndex: 100
        }}>
            <h1 style={{
                fontSize: '20px',
                fontWeight: '500',
                color: '#fff',
                margin: 0,
                cursor: 'pointer'
            }}
                onClick={() => {
                    clearSearch();
                    navigate('/');
                }}>
                YouTube Local
            </h1>

            <div
                ref={searchRef}
                style={{
                    flex: 1,
                    maxWidth: '600px',
                    display: 'flex',
                    gap: '8px',
                    position: 'relative'
                }}>
                <div style={{
                    position: 'relative',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <input
                        type="text"
                        placeholder="Buscar videos..."
                        value={localSearch}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={handleFocus}
                        style={{
                            width: '100%',
                            padding: '8px 40px 8px 12px',
                            backgroundColor: '#121212',
                            border: '1px solid #303030',
                            borderRadius: '20px',
                            color: '#fff',
                            outline: 'none',
                            fontSize: '14px'
                        }}
                    />

                    {localSearch && (
                        <button
                            onClick={handleClear}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                background: 'none',
                                border: 'none',
                                color: '#aaa',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                <button
                    onClick={() => handleSearch(localSearch)}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#303030',
                        border: 'none',
                        borderRadius: '20px',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                    <Search size={20} />
                </button>

                {/* Sugerencias de búsqueda */}
                {showSuggestions && searchHistory.length > 0 && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: '50px',
                        marginTop: '8px',
                        backgroundColor: '#212121',
                        border: '1px solid #303030',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        zIndex: 1000
                    }}>
                        <div style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid #303030',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '12px', color: '#aaa', fontWeight: '500' }}>
                                HISTORIAL DE BÚSQUEDA
                            </span>
                            <button
                                onClick={clearHistory}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#3ea6ff',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    padding: '4px 8px'
                                }}
                            >
                                Limpiar
                            </button>
                        </div>

                        {searchHistory.map((term, index) => (
                            <div
                                key={index}
                                onClick={() => handleHistoryClick(term)}
                                style={{
                                    padding: '12px 16px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <Clock size={16} color="#aaa" />
                                <span style={{ fontSize: '14px' }}>{term}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </header>
    );
}

export default Header;