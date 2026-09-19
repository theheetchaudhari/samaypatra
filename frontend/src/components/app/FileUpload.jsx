import { useRef, useState } from 'react';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf'];

export default function FileUpload({
  selectedFile,
  onFileSelect,
  onFileUpload,
  onResetFile,
  uploadStatus = 'idle',
  uploadError = '',
  uploadedS3Key = null,
  disabled = false,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileTypeLabel = (file) => {
    if (!file) return '';
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (ext === '.pdf') return 'PDF';
    if (ext === '.png') return 'PNG';
    if (ext === '.jpg' || ext === '.jpeg') return 'JPEG';
    return file.type || 'FILE';
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && uploadStatus !== 'uploading') {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || uploadStatus === 'uploading') return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current && !disabled && uploadStatus !== 'uploading') {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="file-upload-container">
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
        onChange={handleFileChange}
      />

      {/* Dropzone view when no file is chosen or after reset */}
      {!selectedFile ? (
        <div
          className={`file-dropzone ${isDragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleBrowseClick()}
        >
          <div className="file-dropzone-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="12" y2="12" />
              <line x1="15" y1="15" x2="12" y2="12" />
            </svg>
          </div>
          <div className="file-dropzone-title">
            Drop your syllabus, notice, or screenshot here
          </div>
          <div className="file-dropzone-subtitle">
            Supports PNG, JPEG, or PDF documents up to 5 MB
          </div>
          <button
            type="button"
            className="btn-browse-file"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}
          >
            Browse File
          </button>
        </div>
      ) : (
        /* Selected file details card */
        <div className="selected-file-card">
          <div className="selected-file-details">
            <div className="file-icon-badge">
              <span className="file-type-tag">{getFileTypeLabel(selectedFile)}</span>
            </div>
            <div className="selected-file-meta">
              <div className="selected-file-name" title={selectedFile.name}>
                {selectedFile.name}
              </div>
              <div className="selected-file-size">
                {formatFileSize(selectedFile.size)}
              </div>
            </div>
          </div>

          {uploadStatus !== 'uploading' && (
            <button
              type="button"
              className="btn-remove-file"
              onClick={onResetFile}
              title="Select a different file"
              disabled={disabled}
            >
              Change File
            </button>
          )}
        </div>
      )}

      {/* Error state alert */}
      {uploadStatus === 'error' && uploadError && (
        <div className="upload-alert-error" role="alert">
          <div className="upload-alert-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div className="upload-alert-message">{uploadError}</div>
        </div>
      )}

      {/* Uploading progress indicator */}
      {uploadStatus === 'uploading' && (
        <div className="upload-status-progress">
          <div className="upload-spinner" />
          <div className="upload-progress-text">
            Uploading document directly to secure S3 storage...
          </div>
        </div>
      )}

      {/* Success banner */}
      {uploadStatus === 'success' && uploadedS3Key && (
        <div className="upload-alert-success" role="status">
          <div className="upload-success-header">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="upload-success-title">Document Uploaded Successfully</span>
          </div>
          <p className="upload-success-desc">
            File staged securely in S3. Ready for Textract optical character recognition in T6.6.
          </p>
          <div className="s3-key-container">
            <span className="s3-key-label">S3 OBJECT KEY:</span>
            <code className="s3-key-val">{uploadedS3Key}</code>
          </div>
        </div>
      )}

      {/* Upload action CTA */}
      {selectedFile && uploadStatus !== 'success' && (
        <button
          type="button"
          className="extract-button upload-submit-button"
          onClick={onFileUpload}
          disabled={disabled || uploadStatus === 'uploading'}
        >
          {uploadStatus === 'uploading' ? 'Uploading to S3...' : 'Upload Document to S3'}
        </button>
      )}
    </div>
  );
}
