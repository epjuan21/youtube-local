import { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export function SearchProvider({ children }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchHistory, setSearchHistory] = useState([]);

    const updateSearch = (term) => {
        setSearchTerm(term);

        // Agregar al historial si no está vacío y no es duplicado
        if (term.trim() && !searchHistory.includes(term.trim())) {
            const newHistory = [term.trim(), ...searchHistory].slice(0, 10); // Máximo 10
            setSearchHistory(newHistory);
            localStorage.setItem('search-history', JSON.stringify(newHistory));
        }
    };

    const clearSearch = () => {
        setSearchTerm('');
    };

    const clearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem('search-history');
    };

    // Cargar historial al iniciar
    useState(() => {
        const saved = localStorage.getItem('search-history');
        if (saved) {
            try {
                setSearchHistory(JSON.parse(saved));
            } catch (e) {
                console.error('Error cargando historial:', e);
            }
        }
    }, []);

    return (
        <SearchContext.Provider value={{
            searchTerm,
            searchHistory,
            updateSearch,
            clearSearch,
            clearHistory
        }}>
            {children}
        </SearchContext.Provider>
    );
}

export function useSearch() {
    const context = useContext(SearchContext);
    if (!context) {
        throw new Error('useSearch debe usarse dentro de SearchProvider');
    }
    return context;
}