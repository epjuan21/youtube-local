import { useEffect, useState } from 'react';
import { Image, CheckCircle, XCircle } from 'lucide-react';

function ThumbnailProgress() {
    const [progress, setProgress] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Escuchar eventos de sincronización para detectar generación de thumbnails
        const unsubscribe = window.electronAPI.onSyncProgress((data) => {
            if (data.type === 'generating_thumbnail') {
                setProgress({
                    filename: data.filename,
                    status: 'generating'
                });
                setVisible(true);
            } else if (data.type === 'added') {
                setProgress({
                    filename: data.filename,
                    status: 'success'
                });

                // Ocultar después de 2 segundos
                setTimeout(() => {
                    setVisible(false);
                }, 2000);
            }
        });

        return () => {
            unsubscribe();
        };
    }, []);

    if (!visible || !progress) return null;

    return (
        <div style={{
            position: 'fixed',
            bottom: '180px',
            right: '20px',
            backgroundColor: '#212121',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            minWidth: '280px',
            maxWidth: '400px',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid #3ea6ff',
            wordWrap: 'break-word',
            overflow: 'hidden'
        }}>
            <div style={{
                flexShrink: 0
            }}>
                {progress.status === 'generating' ? (
                    <div style={{
                        animation: 'pulse 1.5s ease-in-out infinite'
                    }}>
                        <Image size={20} color="#3ea6ff" />
                    </div>
                ) : progress.status === 'success' ? (
                    <CheckCircle size={20} color="#4caf50" />
                ) : (
                    <XCircle size={20} color="#ff4444" />
                )}
            </div>

            <div style={{
                flex: 1,
                minWidth: 0,
                overflow: 'hidden'
            }}>
                <div style={{
                    fontSize: '12px',
                    fontWeight: '500',
                    marginBottom: '4px',
                    color: '#fff',
                    whiteSpace: 'nowrap'
                }}>
                    {progress.status === 'generating' ? 'Generando thumbnail...' : '✓ Thumbnail generado'}
                </div>
                <div style={{
                    fontSize: '11px',
                    color: '#aaa',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    display: 'block'
                }}
                    title={progress.filename}>
                    {progress.filename}
                </div>
            </div>
        </div>
    );
}

export default ThumbnailProgress;