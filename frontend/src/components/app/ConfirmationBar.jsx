import { useState } from 'react';
import { createCalendarEvent, API_BASE_URL } from '../../services/api';

/**
 * ConfirmationBar — T8.1
 *
 * Renders two actions per extracted event:
 *   "Connect Google Calendar" -> navigates to OAuth flow
 *   "Confirm & Sync"          -> POST /calendar/events with session cookie
 *
 * Behaviour:
 *   - Confirm & Sync is disabled if the event fails validation
 *   - Confirm & Sync is disabled while a sync is in progress
 *   - A sync is ONLY triggered by an explicit user click (never automatically)
 *   - On success: shows Google Calendar link
 *   - On 401 (no/invalid session): shows "Please connect Google Calendar first."
 *   - On other errors: shows the server error message
 */
export default function ConfirmationBar({ event, validationResult }) {
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | loading | success | error
  const [syncResult, setSyncResult] = useState(null);
  const [syncError,  setSyncError]  = useState('');

  const isValid = !validationResult || validationResult.valid;

  // Navigate to the OAuth initiation URL (browser navigation, not fetch)
  function handleConnectGoogle() {
    window.location.href = `${API_BASE_URL}/auth/google`;
  }

  // Explicit user action: call POST /calendar/events
  async function handleSync() {
    if (!event || !isValid || syncStatus === 'loading') return;

    setSyncStatus('loading');
    setSyncError('');
    setSyncResult(null);

    try {
      const result = await createCalendarEvent(event);
      setSyncResult(result);
      setSyncStatus('success');
    } catch (err) {
      // 401 = no session or session expired
      if (err.status === 401 || err.code === 'not_authenticated' || err.code === 'invalid_session') {
        setSyncError('Please connect Google Calendar first.');
      } else {
        setSyncError(err.message || 'Failed to create calendar event. Please try again.');
      }
      setSyncStatus('error');
    }
  }

  return (
    <div className="confirmation-bar">
      <div className="confirmation-bar-actions">
        <button
          id="btn-connect-google"
          className="btn-connect-google"
          onClick={handleConnectGoogle}
          type="button"
        >
          Connect Google Calendar
        </button>
        <button
          id="btn-confirm-sync"
          className="btn-primary"
          disabled={!isValid || syncStatus === 'loading' || syncStatus === 'success'}
          onClick={handleSync}
          type="button"
        >
          {syncStatus === 'loading' ? 'Syncing\u2026' : 'Confirm \u0026 Sync'}
        </button>
      </div>

      {syncStatus === 'loading' && (
        <div className="sync-loading" role="status" aria-live="polite">
          <div className="sync-spinner" aria-hidden="true" />
          Sending to Google Calendar&hellip;
        </div>
      )}

      {syncStatus === 'success' && syncResult && (
        <div className="sync-success-banner" role="status">
          <span className="sync-success-icon">&#10003;</span>
          Event created!{' '}
          <a
            href={syncResult.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="sync-calendar-link"
          >
            View in Google Calendar &rarr;
          </a>
        </div>
      )}

      {syncStatus === 'error' && (
        <div className="sync-error-banner" role="alert">
          <span className="sync-error-icon">&#9888;</span>
          {syncError}
        </div>
      )}
    </div>
  );
}
