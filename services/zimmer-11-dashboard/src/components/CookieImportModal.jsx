import React, { useState } from 'react';
import { surveyApi } from '../api/surveyApi';

function CookieImportModal({ platformId, platformName, onClose, onSuccess }) {
  const [cookieText, setCookieText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('paste');

  const parseNetscapeCookies = (text) => {
    const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    return lines.map(line => {
      const parts = line.split('\t');
      if (parts.length >= 7) {
        const [domain, , path, secure, expires, name, value] = parts;
        return { domain, path, secure: secure === 'TRUE', name, value, expires: parseInt(expires) };
      }
      return null;
    }).filter(c => c && c.name && c.value);
  };

  const handleImport = async () => {
    if (!cookieText.trim()) return;
    
    setLoading(true);
    setError(null);

    try {
      let cookies;
      try {
        cookies = JSON.parse(cookieText);
      } catch {
        cookies = parseNetscapeCookies(cookieText);
      }

      if (!Array.isArray(cookies) || cookies.length === 0) {
        throw new Error('No valid cookies found. Please check the format.');
      }

      const response = await surveyApi.importCookies(platformId, cookies);
      
      if (response.success) {
        onSuccess(response.imported || cookies.length);
      } else {
        throw new Error(response.error || 'Import failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      setCookieText(text);
    } catch (err) {
      setError(`Failed to read file: ${err.message}`);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🍪 Import Cookies - {platformName}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button
              className={`btn ${mode === 'paste' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('paste')}
            >
              Paste Cookies
            </button>
            <button
              className={`btn ${mode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('upload')}
            >
              Upload File
            </button>
          </div>

          {mode === 'paste' && (
            <textarea
              value={cookieText}
              onChange={(e) => setCookieText(e.target.value)}
              placeholder="Paste cookies here (JSON array or Netscape format)..."
              rows={10}
              style={{ resize: 'vertical' }}
            />
          )}

          {mode === 'upload' && (
            <div style={{ 
              border: '2px dashed var(--border-color)', 
              borderRadius: '8px', 
              padding: '40px', 
              textAlign: 'center' 
            }}>
              <input
                type="file"
                accept=".txt,.json"
                onChange={handleFileUpload}
                style={{ display: 'block', margin: '0 auto' }}
              />
              <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>
                Upload cookies.txt or cookies.json
              </p>
            </div>
          )}

          <div style={{ 
            marginTop: '20px', 
            padding: '16px', 
            background: 'var(--bg-card)', 
            borderRadius: '8px' 
          }}>
            <h4 style={{ marginBottom: '12px' }}>How to export cookies:</h4>
            <ol style={{ paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <li>Install "Cookie-Editor" browser extension</li>
              <li>Login to {platformName} in your browser</li>
              <li>Click Cookie-Editor icon → Export → JSON</li>
              <li>Paste here or save as file</li>
            </ol>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={loading || !cookieText.trim()}
          >
            {loading ? 'Importing...' : 'Import Cookies'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CookieImportModal;
