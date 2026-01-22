import MetadataExtractor from "../components/MetadataExtractor";
import CacheStatsPanel from "../components/CacheStatsPanel";
import VideoPrefetchPanel from "../components/VideoPrefetchPanel";

function Settings() {
    return (
        <div style={{ maxWidth: '1200px' }}>
            <h1 style={{ marginBottom: '24px', fontSize: '24px' }}>Configuración</h1>

            {/* Sección de Caché de Thumbnails */}
            <div style={{ marginBottom: '32px' }}>
                <CacheStatsPanel />
            </div>

            {/* Sección de Precarga de Videos */}
            <div style={{ marginBottom: '32px' }}>
                <VideoPrefetchPanel />
            </div>

            {/* Sección de Extractor de Metadatos */}
            <div style={{ marginBottom: '32px' }}>
                <MetadataExtractor />
            </div>
        </div>
    );
}

export default Settings;