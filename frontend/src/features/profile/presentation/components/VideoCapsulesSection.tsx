import { useEffect, useState } from 'react';
import axios from 'axios';
import { VideoCard } from './VideoCard';

interface VideoData {
  id: string;
  title: string;
  url: string;
}

export const VideoCapsulesSection = () => {
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios.get<VideoData[]>('http://localhost:8000/videos')
      .then(res => setVideos(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-text-muted">Cargando videos...</div>;
  if (error) return <div className="text-text-muted">Error al cargar videos.</div>;
  if (videos.length === 0) return <div className="text-text-muted">No hay videos disponibles.</div>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
      {videos.map(video => (
        <VideoCard key={video.id} {...video} />
      ))}
    </div>
  );
};
