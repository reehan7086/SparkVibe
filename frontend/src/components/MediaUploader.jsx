// frontend/src/components/MediaUploader.jsx
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { apiPost } from '../utils/safeUtils';

const MediaUploader = ({ onMediaSelect, maxSize = 10 }) => {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size must be less than ${maxSize}MB`);
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only JPG, PNG, GIF images and MP4 videos are allowed');
      return;
    }

    setError(null);
    setSelectedMedia(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const uploadMedia = async () => {
    if (!selectedMedia) return;

    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append('media', selectedMedia);

    try {
      const response = await apiPost('/upload-media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const percentComplete = (progressEvent.loaded / progressEvent.total) * 100;
            setUploadProgress(percentComplete);
          }
        }
      });

      if (response.success) {
        onMediaSelect(response.media);
        resetUploader();
      } else {
        setError('Failed to upload media');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setError('Failed to upload media. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resetUploader = () => {
    setSelectedMedia(null);
    setPreview(null);
    setUploadProgress(0);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="media-uploader">
      {error && <div className="text-red-400 text-center mb-4">{error}</div>}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4"
        onChange={handleFileSelect}
        className="hidden"
      />
      {!preview ? (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-4 border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 transition-colors"
        >
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-gray-400">Click to upload media</p>
            <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF, MP4 up to {maxSize}MB</p>
          </div>
        </motion.button>
      ) : (
        <div className="relative">
          {selectedMedia?.type.startsWith('image/') ? (
            <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
          ) : (
            <video src={preview} className="w-full h-48 object-cover rounded-lg" controls />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-white text-sm mt-2">{Math.round(uploadProgress)}%</p>
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={uploadMedia}
              disabled={uploading}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
            <button
              onClick={resetUploader}
              disabled={uploading}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUploader;