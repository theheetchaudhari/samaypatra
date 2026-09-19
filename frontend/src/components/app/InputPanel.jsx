import InputTypeTabs from './InputTypeTabs';
import TextInput from './TextInput';
import ExtractButton from './ExtractButton';
import FileUpload from './FileUpload';

export default function InputPanel({
  activeTab = 'text',
  onTabChange,
  inputText,
  onInputChange,
  onExtract,
  disabled,
  selectedFile,
  onFileSelect,
  onFileUpload,
  onResetFile,
  uploadStatus,
  uploadError,
  uploadedS3Key,
}) {
  return (
    <div className="input-panel">
      <InputTypeTabs activeTab={activeTab} onTabChange={onTabChange} />

      {activeTab === 'text' && (
        <>
          <TextInput value={inputText} onChange={onInputChange} disabled={disabled} />
          <ExtractButton onClick={onExtract} disabled={disabled} />
        </>
      )}

      {activeTab === 'file' && (
        <FileUpload
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
          onFileUpload={onFileUpload}
          onResetFile={onResetFile}
          uploadStatus={uploadStatus}
          uploadError={uploadError}
          uploadedS3Key={uploadedS3Key}
          disabled={disabled}
        />
      )}

      {activeTab === 'url' && (
        <div className="url-tab-placeholder">
          <p>URL &amp; web link ingestion will be enabled in a future update.</p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onTabChange && onTabChange('file')}
          >
            Switch to File Upload
          </button>
        </div>
      )}
    </div>
  );
}

