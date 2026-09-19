import { useState } from 'react';
import AppHeader from '../components/app/AppHeader';
import InputPanel from '../components/app/InputPanel';
import ExtractionStatus from '../components/app/ExtractionStatus';
import EventReviewCard from '../components/app/EventReviewCard';
import { extractText } from '../services/api';

export default function AppPage() {
  const [inputText, setInputText] = useState('');
  const [extractionStatus, setExtractionStatus] = useState('idle'); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const [events, setEvents] = useState([]);

  const handleExtract = async () => {
    if (!inputText.trim()) {
      setErrorMsg('Please enter some text to extract.');
      setExtractionStatus('error');
      return;
    }

    setExtractionStatus('loading');
    setErrorMsg('');
    setEvents([]);

    try {
      const response = await extractText(inputText);
      if (response.success) {
        setEvents(response.events || []);
        setExtractionStatus('success');
      } else {
        throw new Error('Extraction failed');
      }
    } catch (error) {
      setErrorMsg(error.message || 'An error occurred during extraction.');
      setExtractionStatus('error');
    }
  };

  return (
    <section className="app-container">
      <AppHeader />
      <InputPanel 
        inputText={inputText} 
        onInputChange={(e) => setInputText(e.target.value)} 
        onExtract={handleExtract} 
        disabled={extractionStatus === 'loading'}
      />
      
      {extractionStatus !== 'idle' && (
        <ExtractionStatus 
          status={extractionStatus} 
          error={errorMsg} 
          eventCount={events.length} 
        />
      )}
      
      {extractionStatus === 'success' && events.map((event, index) => (
        <EventReviewCard key={event.id || index} event={event} />
      ))}
    </section>
  );
}
