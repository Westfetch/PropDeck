import React, { useRef } from 'react';

const PhotoGrid = ({ photoUrl, onUpload, canEdit }) => {
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onUpload) onUpload(file);
    e.target.value = '';
  };

  if (photoUrl) {
    return (
      <div className="photo-hero">
        <img
          src={photoUrl}
          alt="Build photo"
          className="photo-hero-img"
        />
        {canEdit && (
          <button
            className="photo-change-btn"
            onClick={() => fileRef.current?.click()}
          >
            Change photo
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="photo-file-input"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <div className="photo-hero">
      <div
        className="photo-slot-main"
        onClick={() => canEdit && fileRef.current?.click()}
        role={canEdit ? 'button' : undefined}
        tabIndex={canEdit ? 0 : undefined}
        aria-label={canEdit ? 'Upload build photo' : 'No photo'}
      >
        {canEdit ? (
          <>
            <span className="photo-slot-icon">+</span>
            <span className="photo-slot-text">Add build photo</span>
          </>
        ) : (
          <span className="photo-slot-text">No photo</span>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="photo-file-input"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default PhotoGrid;
