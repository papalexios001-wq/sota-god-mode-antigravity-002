// SOTA URL BATCH OPTIMIZER - Enterprise-Grade URL Input Component
// Allows users to add single or multiple URLs to optimize with God Mode

import React, { useState, useCallback } from 'react';

export interface URLBatchItem {
  id: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  priority: 'high' | 'medium' | 'low';
  addedAt: number;
  error?: string;
}

interface URLBatchOptimizerProps {
  onURLsAdded: (urls: URLBatchItem[]) => void;
  existingURLs?: URLBatchItem[];
  onRemoveURL?: (id: string) => void;
  wpConfig: { url: string };
}

// URL Validation & Normalization
export const validateAndNormalizeURL = (urlString: string): { valid: boolean; normalizedURL?: string; error?: string } => {
  try {
    urlString = urlString.trim();
    if (!urlString) return { valid: false, error: 'URL cannot be empty' };
    
    // Add protocol if missing
    if (!urlString.match(/^https?:\/\//)) {
      urlString = 'https://' + urlString;
    }
    
    const url = new URL(urlString);
    
    // Validate URL structure
    if (!url.hostname) return { valid: false, error: 'Invalid URL format' };
    
    // Remove trailing slash and query params for consistency
    const normalizedURL = url.protocol + '//' + url.hostname + url.pathname.replace(/\/+$/, '');
    
    return { valid: true, normalizedURL };
  } catch (e: any) {
    return { valid: false, error: 'Invalid URL: ' + e.message };
  }
};

export const URLBatchOptimizer: React.FC<URLBatchOptimizerProps> = ({ 
  onURLsAdded, 
  existingURLs = [], 
  onRemoveURL,
  wpConfig 
}) => {
  const [inputMode, setInputMode] = useState<'single' | 'bulk'>('single');
  const [singleURL, setSingleURL] = useState('');
  const [bulkURLs, setBulkURLs] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleAddSingleURL = useCallback(() => {
    setValidationErrors([]);
    const validation = validateAndNormalizeURL(singleURL);
    
    if (!validation.valid) {
      setValidationErrors([validation.error || 'Invalid URL']);
      return;
    }
    
    const newItem: URLBatchItem = {
      id: 'url_' + Date.now(),
      url: validation.normalizedURL!,
      status: 'pending',
      priority: selectedPriority,
      addedAt: Date.now()
    };
    
    onURLsAdded([newItem]);
    setSingleURL('');
  }, [singleURL, selectedPriority, onURLsAdded]);

  const handleAddBulkURLs = useCallback(() => {
    setValidationErrors([]);
    const urlLines = bulkURLs.split('\n').filter(line => line.trim());
    
    if (urlLines.length === 0) {
      setValidationErrors(['Please enter at least one URL']);
      return;
    }
    
    const newItems: URLBatchItem[] = [];
    const errors: string[] = [];
    
    urlLines.forEach((urlString, index) => {
      const validation = validateAndNormalizeURL(urlString);
      if (validation.valid) {
        newItems.push({
          id: 'url_' + Date.now() + '_' + index,
          url: validation.normalizedURL!,
          status: 'pending',
          priority: selectedPriority,
          addedAt: Date.now()
        });
      } else {
        errors.push(`Line ${index + 1}: ${validation.error}`);
      }
    });
    
    if (errors.length > 0) setValidationErrors(errors);
    if (newItems.length > 0) {
      onURLsAdded(newItems);
      setBulkURLs('');
    }
  }, [bulkURLs, selectedPriority, onURLsAdded]);

  return (
    <div className="url-batch-optimizer-container" style={{padding: '2rem', background: '#0F172A', borderRadius: '12px', border: '1px solid #1E293B'}}>
      <h3 style={{color: '#E2E8F0', marginBottom: '1.5rem', fontSize: '1.1rem'}}>🔗 Add URLs to Optimize</h3>
      
      {/* Mode Selection */}
      <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
        <button 
          onClick={() => setInputMode('single')}
          style={{
            padding: '0.75rem 1.5rem',
            background: inputMode === 'single' ? 'var(--accent-primary)' : 'transparent',
            border: '1px solid' + (inputMode === 'single' ? 'var(--accent-primary)' : '#334155'),
            color: inputMode === 'single' ? 'white' : '#94A3B8',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Single URL
        </button>
        <button 
          onClick={() => setInputMode('bulk')}
          style={{
            padding: '0.75rem 1.5rem',
            background: inputMode === 'bulk' ? 'var(--accent-primary)' : 'transparent',
            border: '1px solid' + (inputMode === 'bulk' ? 'var(--accent-primary)' : '#334155'),
            color: inputMode === 'bulk' ? 'white' : '#94A3B8',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Bulk URLs
        </button>
      </div>

      {/* Input Area */}
      {inputMode === 'single' ? (
        <div className="single-url-input" style={{marginBottom: '1.5rem'}}>
          <input 
            type="text" 
            placeholder="https://example.com/page" 
            value={singleURL}
            onChange={(e) => setSingleURL(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSingleURL()}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#1E293B',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#E2E8F0',
              marginBottom: '1rem'
            }}
          />
        </div>
      ) : (
        <div className="bulk-url-input" style={{marginBottom: '1.5rem'}}>
          <textarea 
            placeholder="Paste URLs (one per line):\nhttps://example.com/page1\nhttps://example.com/page2"
            value={bulkURLs}
            onChange={(e) => setBulkURLs(e.target.value)}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#1E293B',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#E2E8F0',
              minHeight: '150px',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              marginBottom: '1rem'
            }}
          />
        </div>
      )}

      {/* Priority Selector */}
      <div style={{marginBottom: '1.5rem'}}>
        <label style={{color: '#94A3B8', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem'}}>Priority</label>
        <select 
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value as any)}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#1E293B',
            border: '1px solid #334155',
            borderRadius: '8px',
            color: '#E2E8F0',
            cursor: 'pointer'
          }}
        >
          <option value="high">🔴 High Priority</option>
          <option value="medium">🟡 Medium Priority</option>
          <option value="low">🟢 Low Priority</option>
        </select>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div style={{background: '#7F1D1D', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #DC2626'}}>
          {validationErrors.map((err, i) => <div key={i} style={{color: '#FCA5A5', fontSize: '0.9rem', marginBottom: i === validationErrors.length - 1 ? 0 : '0.5rem'}}>⚠️ {err}</div>)}
        </div>
      )}

      {/* Action Button */}
      <button 
        onClick={inputMode === 'single' ? handleAddSingleURL : handleAddBulkURLs}
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: 'var(--accent-primary)',
          border: 'none',
          borderRadius: '8px',
          color: 'white',
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.5 : 1
        }}
      >
        {loading ? 'Processing...' : (inputMode === 'single' ? '+ Add URL' : '+ Add All URLs')}
      </button>

      {/* Existing URLs List */}
      {existingURLs.length > 0 && (
        <div style={{marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #334155'}}>
          <h4 style={{color: '#E2E8F0', marginBottom: '1rem'}}>Queued URLs ({existingURLs.length})</h4>
          <div style={{display: 'grid', gap: '0.5rem'}}>
            {existingURLs.map(item => (
              <div key={item.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                background: '#1E293B',
                borderRadius: '6px',
                border: '1px solid #334155'
              }}>
                <div style={{flex: 1, minWidth: 0}}>
                  <div style={{color: '#E2E8F0', fontSize: '0.9rem', wordBreak: 'break-word'}}>{item.url}</div>
                  <div style={{color: '#64748B', fontSize: '0.75rem', marginTop: '0.25rem'}}>Priority: {item.priority.toUpperCase()} | Status: {item.status}</div>
                </div>
                {onRemoveURL && (
                  <button 
                    onClick={() => onRemoveURL(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      padding: '0.5rem',
                      marginLeft: '1rem'
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default URLBatchOptimizer;
