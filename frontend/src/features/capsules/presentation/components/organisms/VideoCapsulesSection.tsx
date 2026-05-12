import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../../../../../api/client';
import { VideoCard } from '../molecules/VideoCard';

interface VideoData {
  id: string;
  title: string;
  url: string;
  filename?: string;
}

export const VideoCapsulesSection = () => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoData | null>(null);

  useEffect(() => {
    apiRequest<VideoData[]>('/videos')
      .then((data) => setVideos(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 w-full animate-fade-in">
        <div className="w-10 h-10 border-4 border-surface-alt border-t-accent rounded-full animate-spin mb-4" />
        <p className="text-text-muted text-sm font-medium">Cargando cápsulas de aprendizaje...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 bg-red-500/10 border border-red-500/20 rounded-3xl text-red-500 text-sm flex items-center gap-3">
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        No se pudieron cargar las cápsulas de aprendizaje. Por favor, intenta nuevamente más tarde.
      </div>
    );
  }

  if (videos.length === 0) {
    return <div className="text-text-muted text-sm p-4 bg-surface-alt/20 rounded-2xl border border-border/30">No hay videos disponibles en este momento.</div>;
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        {videos.map(video => (
          <VideoCard 
            key={video.id} 
            id={video.id} 
            title={video.title} 
            url={video.url}
            filename={video.filename}
            onClick={() => setSelectedVideo(video)} 
          />
        ))}
      </div>

      {selectedVideo && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 animate-fade-in" style={{ position: 'fixed' }}>
          <div 
            className="absolute inset-0 bg-black/80 md:bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedVideo(null)}
          />
          <div className="relative w-full max-w-4xl max-h-[85vh] bg-surface border border-border/60 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-scale-in">
            <div className="flex justify-between items-center p-4 md:p-5 border-b border-border/40 bg-surface-alt/30 shrink-0">
              <h2 className="text-lg md:text-xl font-extrabold text-text truncate pr-4">{selectedVideo.title}</h2>
              <button
                onClick={() => setSelectedVideo(null)}
                className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-surface hover:bg-border/50 flex items-center justify-center transition-colors text-text-muted hover:text-accent border border-border/50 shrink-0"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="relative w-full flex-1 bg-black flex items-center justify-center min-h-[50vh]">
              <video
                src={selectedVideo.url}
                controls
                autoPlay
                muted
                playsInline
                className="w-full h-full object-contain outline-none max-h-[calc(85vh-80px)]"
              >
                Tu navegador no soporta la reproducción de videos.
              </video>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
