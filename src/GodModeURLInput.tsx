'use client';

import React, { useState, useCallback, memo } from 'react';

interface URLItem {
  id: string;
  url: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface GodModeURLInputProps {
  onURLsAdded?: (urls: URLItem[]) => void;
  onAnalysisStart?: (urls: string[]) => void;
  isProcessing?: boolean;
}

export const GodModeURLInput = memo(({
  onURLsAdded,
  onAnalysisStart,
  isProcessing = false,
}: GodModeURLInputProps) => {
  const [inputMode, setInputMode] = useState<'single' | 'bulk'>('single');
  const [singleURL, setSingleURL] = useState('');
  const [bulkURLs, setBulkURLs] = useState('');
  const [queuedURLs, setQueuedURLs] = useState<URLItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  const generateID = useCallback(() => `url-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, []);

  const handleAddSingleURL = useCallback(() => {
    const cleanURL = singleURL.trim();
    if (!cleanURL) {
      alert('Please enter a URL');
      return;
    }

    const urlItem: URLItem = {
      id: generateID(),
      url: cleanURL.startsWith('http') ? cleanURL : `https://${cleanURL}`,
      priority: 'high',
      status: 'pending',
    };

    const newURLs = [urlItem, ...queuedURLs];
    setQueuedURLs(newURLs);
    setSingleURL('');
    onURLsAdded?.(newURLs);
  }, [singleURL, queuedURLs, onURLsAdded, generateID]);

  const handleAddBulkURLs = useCallback(() => {
    const urls = bulkURLs
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urls.length === 0) {
      alert('Please enter at least one URL');
      return;
    }

    const newItems: URLItem[] = urls.map((url, idx) => ({
      id: generateID(),
      url: url.startsWith('http') ? url : `https://${url}`,
      priority: idx === 0 ? 'high' : 'medium',
      status: 'pending',
    }));

    const combined = [...newItems, ...queuedURLs];
    setQueuedURLs(combined);
    setBulkURLs('');
    onURLsAdded?.(combined);
  }, [bulkURLs, queuedURLs, onURLsAdded, generateID]);

  const handleRemoveURL = useCallback((id: string) => {
    const updated = queuedURLs.filter(item => item.id !== id);
    setQueuedURLs(updated);
    onURLsAdded?.(updated);
  }, [queuedURLs, onURLsAdded]);

  const handleStartAnalysis = useCallback(() => {
    const urls = queuedURLs.map(u => u.url);
    if (urls.length === 0) {
      alert('Add URLs first');
      return;
    }
    onAnalysisStart?.(urls);
  }, [queuedURLs, onAnalysisStart]);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      border: '2px solid #334155',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
    }}>
      {/* HEADER */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        cursor: 'pointer',
        padding: '12px',
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: '12px',
      }} onClick={() => setExpanded(!expanded)}>
        <div>
          <h3 style={{
            margin: '0 0 6px 0',
            fontSize: '18px',
            fontWeight: '700',
            background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          }}>
            GOD MODE URL OPTIMIZER
          </h3>
          <p style={{
            margin: '0',
            fontSize: '13px',
            color: '#94A3B8',
            fontWeight: '500',
          }}>
            Add specific URLs for instant optimization
          </p>
        </div>
        <span style={{
          fontSize: '24px',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease',
        }}>
          ⚡
        </span>
      </div>

      {/* EXPANDED CONTENT */}
      {expanded && (
        <>
          {/* INPUT MODE TOGGLE */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            padding: '12px',
            background: 'rgba(51, 65, 85, 0.2)',
            borderRadius: '10px',
          }}>
            <button
              onClick={() => setInputMode('single')}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: inputMode === 'single' ? '#3B82F6' : 'transparent',
                border: inputMode === 'single' ? 'none' : '1px solid #475569',
                color: inputMode === 'single' ? 'white' : '#CBD5E1',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.2s ease',
              }}
            >
              Single URL
            </button>
            <button
              onClick={() => setInputMode('bulk')}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: inputMode === 'bulk' ? '#3B82F6' : 'transparent',
                border: inputMode === 'bulk' ? 'none' : '1px solid #475569',
                color: inputMode === 'bulk' ? 'white' : '#CBD5E1',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.2s ease',
              }}
            >
              Bulk Import
            </button>
          </div>

          {/* INPUT FIELDS */}
          {inputMode === 'single' ? (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#E2E8F0',
                fontSize: '13px',
                fontWeight: '600',
              }}>Enter Single URL</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={singleURL}
                  onChange={(e) => setSingleURL(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSingleURL()}
                  placeholder="https://example.com/page"
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    background: '#020617',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    color: '#E2E8F0',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleAddSingleURL}
                  disabled={isProcessing}
                  style={{
                    padding: '12px 20px',
                    background: '#10B981',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: '600',
                    cursor: isProcessing ? 'not-allowed' : 'pointer',
                    opacity: isProcessing ? 0.5 : 1,
                    fontSize: '13px',
                  }}
                >
                  + Add
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#E2E8F0',
                fontSize: '13px',
                fontWeight: '600',
              }}>Enter URLs (one per line)</label>
              <textarea
                value={bulkURLs}
                onChange={(e) => setBulkURLs(e.target.value)}
                placeholder="https://example.com/page1\nhttps://example.com/page2\nhttps://example.com/page3"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: '#020617',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#E2E8F0',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  minHeight: '100px',
                  outline: 'none',
                  marginBottom: '8px',
                }}
              />
              <button
                onClick={handleAddBulkURLs}
                disabled={isProcessing}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: '#10B981',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'white',
                  fontWeight: '600',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  opacity: isProcessing ? 0.5 : 1,
                  fontSize: '13px',
                }}
              >
                + Add All URLs
              </button>
            </div>
          )}

          {/* QUEUED URLS LIST */}
          {queuedURLs.length > 0 && (
            <div style={{
              marginTop: '20px',
              padding: '16px',
              background: 'rgba(51, 65, 85, 0.2)',
              borderRadius: '10px',
              maxHeight: '300px',
              overflowY: 'auto',
            }}>
              <h4 style={{
                margin: '0 0 12px 0',
                color: '#E2E8F0',
                fontSize: '13px',
                fontWeight: '700',
              }}>Queued URLs ({queuedURLs.length})</h4>
              {queuedURLs.map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  marginBottom: '8px',
                  background: '#1E293B',
                  borderLeft: `3px solid ${item.priority === 'high' ? '#EF4444' : '#F59E0B'}`,
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#CBD5E1',
                }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.url}
                  </span>
                  <button
                    onClick={() => handleRemoveURL(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#EF4444',
                      cursor: 'pointer',
                      fontSize: '16px',
                      marginLeft: '8px',
                    }}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ACTION BUTTON */}
          {queuedURLs.length > 0 && (
            <button
              onClick={handleStartAnalysis}
              disabled={isProcessing}
              style={{
                width: '100%',
                marginTop: '20px',
                padding: '14px 20px',
                background: isProcessing ? '#6B7280' : 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                border: 'none',
                borderRadius: '10px',
                color: 'white',
                fontWeight: '700',
                fontSize: '14px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
              }}
            >
              {isProcessing ? 'ANALYZING...' : 'START GOD MODE OPTIMIZATION'}
            </button>
          )}
        </>
      )}
    </div>
  );
});

GodModeURLInput.displayName = 'GodModeURLInput';

export default GodModeURLInput;
