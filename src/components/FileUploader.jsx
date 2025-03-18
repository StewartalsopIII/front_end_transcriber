import React from 'react';

function FileUploader() {
  return (
    <div style={{ border: '2px dashed #e5e7eb', borderRadius: '0.5rem', padding: '2rem', textAlign: 'center' }}>
      <div style={{ marginBottom: '1rem' }}>
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="currentColor"
          style={{ width: '48px', height: '48px', color: '#9ca3af', margin: '0 auto' }}
        >
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
        </svg>
      </div>
      <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>
        Drag & drop your audio file here
      </p>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
        Supported formats: .m4a, .mp3, .wav, .ogg, .webm
      </p>
    </div>
  );
}

export default FileUploader;