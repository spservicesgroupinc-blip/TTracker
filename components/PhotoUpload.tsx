import React, { useRef } from 'react';
import { Photo } from '../types';

interface PhotoUploadProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
}

const CameraIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PhotoUpload: React.FC<PhotoUploadProps> = ({ photos, onPhotosChange, maxPhotos = 10 }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remaining = maxPhotos - photos.length;
    const filesToProcess = Array.from(files).slice(0, remaining);

    filesToProcess.forEach((file: File) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 5 * 1024 * 1024) return; // 5MB limit

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) return;

        const newPhoto: Photo = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          dataUrl,
          caption: file.name,
          timestamp: new Date().toISOString(),
        };
        onPhotosChange([...photos, newPhoto]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (photoId: string) => {
    onPhotosChange(photos.filter(p => p.id !== photoId));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {photos.map(photo => (
          <div key={photo.id} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-fb-divider">
            <img src={photo.dataUrl} alt={photo.caption} className="w-full h-full object-cover" />
            <button
              onClick={() => removePhoto(photo.id)}
              className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < maxPhotos && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-fb-divider hover:border-fb-blue flex flex-col items-center justify-center text-fb-text-tertiary hover:text-fb-blue transition-colors"
          >
            <CameraIcon />
            <span className="text-[10px] mt-1">Add</span>
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default PhotoUpload;
