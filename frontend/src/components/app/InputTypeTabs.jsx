

export default function InputTypeTabs({ activeTab = 'text', onTabChange = () => {} }) {
  return (
    <div className="input-type-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'text'}
        className={`input-tab ${activeTab === 'text' ? 'active' : ''}`}
        onClick={() => onTabChange('text')}
      >
        Raw Text
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'file'}
        className={`input-tab ${activeTab === 'file' ? 'active' : ''}`}
        onClick={() => onTabChange('file')}
      >
        File Upload
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'url'}
        className={`input-tab ${activeTab === 'url' ? 'active' : ''}`}
        onClick={() => onTabChange('url')}
      >
        URL / Link
      </button>
    </div>
  );
}

