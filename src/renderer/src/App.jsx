import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SearchProvider } from './context/SearchContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import SyncStatus from './components/SyncStatus';
import ThumbnailProgress from './components/ThumbnailProgress';
import { ToastContainer } from './components/ToastNotifications';
import Home from './pages/Home';
import SearchPage from './pages/SearchPage';
import FolderView from './pages/FolderView';
import Video from './pages/Video';
import FavoritesPage from './pages/FavoritesPage';
import Settings from './pages/Settings';
import SyncManager from './pages/SyncManager';
import CategoryPage from './pages/CategoryPage';
import TagPage from './pages/TagPage';
import './styles/global.css';

function App() {
    return (
        <SearchProvider>
            <Router>
                <div className="app">
                    <Header />
                    <div className="main-container">
                        <Sidebar />
                        <div className="content">
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/search" element={<SearchPage />} />
                                <Route path="/folder/:id" element={<FolderView />} />
                                <Route path="/folder/:id/:subpath" element={<FolderView />} />
                                <Route path="/video/:id" element={<Video />} />
                                <Route path="/favorites" element={<FavoritesPage />} />
                                <Route path="/settings" element={<Settings />} />
                                <Route path="/sync" element={<SyncManager />} />1
                                <Route path="/category/:categoryId" element={<CategoryPage />} />
                                <Route path="/tag/:tagId" element={<TagPage />} />
                            </Routes>
                        </div>
                    </div>

                    {/* Widgets flotantes */}
                    <SyncStatus />
                    <ThumbnailProgress />

                    {/* Sistema de notificaciones Toast */}
                    <ToastContainer />
                </div>
            </Router>
        </SearchProvider>
    );
}

export default App;