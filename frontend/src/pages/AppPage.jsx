import { useState } from 'react';
import AppHeader from '../components/app/AppHeader';
import InputPanel from '../components/app/InputPanel';
import ExtractionStatus from '../components/app/ExtractionStatus';
import EventReviewCard from '../components/app/EventReviewCard';
import { extractText, requestUploadUrl, uploadFileToS3 } from '../services/api';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.pdf'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function validateSelectedFile(file) {
  if (!file) return 'Please select a file to upload.';

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return `File size (${sizeMb} MB) exceeds the 5 MB limit. Please select a smaller file.`;
  }

  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const mime = file.type ? file.type.toLowerCase() : '';

  const mimeValid = ALLOWED_MIME_TYPES.includes(mime);
  const extValid = ALLOWED_EXTENSIONS.includes(ext);

  if (!mimeValid && !extValid) {
    return 'Unsupported file type. Please upload a PNG, JPEG, or PDF.';
  }

  return null;
}

function resolveContentType(file) {
  if (file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return file.type.toLowerCase();
  }
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
}

export default function AppPage() {
  const [activeTab, setActiveTab] = useState('text'); // 'text' | 'file' | 'url'
  const [inputText, setInputText] = useState('');
  const [extractionStatus, setExtractionStatus] = useState('idle'); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const [events, setEvents] = useState([]);
  const [validation, setValidation] = useState(null);

  // File upload state (T6.5)
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [uploadError, setUploadError] = useState('');
  const [uploadedS3Key, setUploadedS3Key] = useState(null);

  const handleExtract = async () => {
    if (!inputText.trim()) {
      setErrorMsg('Please enter some text to extract.');
      setExtractionStatus('error');
      return;
    }

    setExtractionStatus('loading');
    setErrorMsg('');
    setEvents([]);
    setValidation(null);

    try {
      const response = await extractText(inputText);
      if (response.success) {
        setEvents(response.events || []);
        setValidation(response.validation || null);
        setExtractionStatus('success');
      } else {
        throw new Error('Extraction failed');
      }
    } catch (error) {
      setErrorMsg(error.message || 'An error occurred during extraction.');
      setExtractionStatus('error');
    }
  };

  const handleFileSelect = (file) => {
    const err = validateSelectedFile(file);
    if (err) {
      setSelectedFile(null);
      setUploadError(err);
      setUploadStatus('error');
      return;
    }
    setSelectedFile(file);
    setUploadError('');
    setUploadStatus('idle');
    setUploadedS3Key(null);
  };

  const handleResetFile = () => {
    setSelectedFile(null);
    setUploadError('');
    setUploadStatus('idle');
    setUploadedS3Key(null);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file first.');
      setUploadStatus('error');
      return;
    }

    const validationErr = validateSelectedFile(selectedFile);
    if (validationErr) {
      setUploadError(validationErr);
      setUploadStatus('error');
      return;
    }

    setUploadStatus('uploading');
    setUploadError('');

    try {
      const contentType = resolveContentType(selectedFile);
      const urlResponse = await requestUploadUrl(selectedFile.name, contentType);

      if (!urlResponse.success || !urlResponse.uploadUrl) {
        throw new Error(urlResponse.error || 'Server did not return a valid upload URL.');
      }

      await uploadFileToS3(urlResponse.uploadUrl, selectedFile);

      setUploadedS3Key(urlResponse.s3Key);
      setUploadStatus('success');
    } catch (err) {
      console.error('File upload failed:', err);
      setUploadError(err.message || 'Failed to upload file to S3. Please try again.');
      setUploadStatus('error');
    }
  };

  return (
    <section className="app-container">
      <AppHeader />
      <InputPanel 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        inputText={inputText} 
        onInputChange={(e) => setInputText(e.target.value)} 
        onExtract={handleExtract} 
        disabled={extractionStatus === 'loading' || uploadStatus === 'uploading'}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        onFileUpload={handleFileUpload}
        onResetFile={handleResetFile}
        uploadStatus={uploadStatus}
        uploadError={uploadError}
        uploadedS3Key={uploadedS3Key}
      />
      
      {activeTab === 'text' && extractionStatus !== 'idle' && (
        <ExtractionStatus 
          status={extractionStatus} 
          error={errorMsg} 
          eventCount={events.length} 
        />
      )}
      
      {activeTab === 'text' && extractionStatus === 'success' && events.map((event, index) => {
        const validationResult = validation?.results?.find(r => r.event.id === event.id);
        return (
          <EventReviewCard 
            key={event.id || index} 
            event={event} 
            validationResult={validationResult} 
          />
        );
      })}
    </section>
  );
}

