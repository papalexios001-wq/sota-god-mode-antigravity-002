// =============================================================================
// SOTA BULK PUBLISH MODAL v2.0 - Enterprise Grade
// Complete Bulk Publishing Solution with Progress Tracking & Error Handling
// =============================================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ContentItem, WpConfig, GeneratedContent } from './types';

// ==================== TYPES ====================

export interface BulkPublishItem {
  id: string;
  title: string;
  status: 'pending' | 'publishing' | 'success' | 'error' | 'skipped';
  message?: string;
  publishedUrl?: string;
  progress?: number;
}

export interface BulkPublishConfig {
  publishStatus: 'publish' | 'draft' | 'pending';
  delayBetweenPosts: number; // milliseconds
  stopOnError: boolean;
  retryFailed: boolean;
  maxRetries: number;
  batchSize: number;
}

export interface BulkPublishModalProps {
  items: ContentItem[];
  onClose: () => void;
  publishItem: (
    item: ContentItem,
    password: string,
    status: 'publish' | 'draft' | 'pending'
  ) => Promise<{ success: boolean; message?: string; url?: string; postId?: number }>;
  wpConfig: WpConfig;
  wpPassword: string;
  onPublishSuccess?: (url: string) => void;
}

// ==================== DEFAULT CONFIG ====================

const DEFAULT_CONFIG: BulkPublishConfig = {
  publishStatus: 'publish',
  delayBetweenPosts: 2000,
  stopOnError: false,
  retryFailed: true,
  maxRetries: 2,
  batchSize: 5,
};

// ==================== UTILITY FUNCTIONS ====================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

// ==================== MAIN COMPONENT ====================

export const BulkPublishModal: React.FC<BulkPublishModalProps> = ({
  items,
  onClose,
  publishItem,
  wpConfig,
  wpPassword,
  onPublishSuccess,
}) => {
  // State
  const [config, setConfig] = useState<BulkPublishConfig>(DEFAULT_CONFIG);
  const [publishItems, setPublishItems] = useState<BulkPublishItem[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Refs for controlling the publish loop
  const pauseRef = useRef(false);
  const stopRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize publish items from content items
  useEffect(() => {
    const validItems = items.filter(item => 
      item.generatedContent && 
      item.status === 'done'
    );
    
    setPublishItems(validItems.map(item => ({
      id: item.id,
      title: item.generatedContent?.title || item.title,
      status: 'pending' as const,
    })));
    
    if (validItems.length === 0) {
      addLog('⚠️ No valid items to publish. Items must have generated content and status "done".');
    } else {
      addLog(`📋 Loaded ${validItems.length} items ready for publishing`);
    }
  }, [items]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Add log message
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  // Update single item status
  const updateItemStatus = useCallback((
    id: string, 
    status: BulkPublishItem['status'], 
    message?: string,
    publishedUrl?: string
  ) => {
    setPublishItems(prev => prev.map(item => 
      item.id === id ? { ...item, status, message, publishedUrl } : item
    ));
  }, []);

  // Calculate statistics
  const stats = React.useMemo(() => {
    const total = publishItems.length;
    const success = publishItems.filter(i => i.status === 'success').length;
    const error = publishItems.filter(i => i.status === 'error').length;
    const pending = publishItems.filter(i => i.status === 'pending').length;
    const skipped = publishItems.filter(i => i.status === 'skipped').length;
    const progress = total > 0 ? ((total - pending) / total) * 100 : 0;
    
    return { total, success, error, pending, skipped, progress };
  }, [publishItems]);

  // Estimate remaining time
  const estimatedTime = React.useMemo(() => {
    if (!startTime || stats.pending === 0) return null;
    
    const elapsed = (Date.now() - startTime) / 1000;
    const completed = stats.total - stats.pending;
    if (completed === 0) return null;
    
    const avgTimePerItem = elapsed / completed;
    const remaining = avgTimePerItem * stats.pending;
    
    return formatTime(Math.round(remaining));
  }, [startTime, stats]);

  // Main publish function
  const publishSingleItem = async (
    item: ContentItem, 
    retryCount: number = 0
  ): Promise<boolean> => {
    const publishItem_ = publishItems.find(p => p.id === item.id);
    if (!publishItem_) return false;

    updateItemStatus(item.id, 'publishing');
    addLog(`🚀 Publishing: ${item.generatedContent?.title || item.title}`);

    try {
      const result = await publishItem(item, wpPassword, config.publishStatus);
      
      if (result.success) {
        updateItemStatus(item.id, 'success', 'Published successfully', result.url);
        addLog(`✅ SUCCESS: ${item.generatedContent?.title} → ${result.url}`);
        if (result.url && onPublishSuccess) {
          onPublishSuccess(result.url);
        }
        return true;
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to publish';
      
      // Retry logic
      if (config.retryFailed && retryCount < config.maxRetries) {
        addLog(`⚠️ Retry ${retryCount + 1}/${config.maxRetries}: ${item.generatedContent?.title}`);
        await sleep(1000);
        return publishSingleItem(item, retryCount + 1);
      }
      
      updateItemStatus(item.id, 'error', errorMsg);
      addLog(`❌ FAILED: ${item.generatedContent?.title} - ${errorMsg}`);
      return false;
    }
  };

  // Start bulk publishing
  const startPublishing = async () => {
    if (!wpConfig.url || !wpConfig.username || !wpPassword) {
      addLog('❌ WordPress credentials not configured!');
      return;
    }

    setIsPublishing(true);
    setStartTime(Date.now());
    stopRef.current = false;
    pauseRef.current = false;
    
    addLog(`🏁 Starting bulk publish - ${stats.pending} items`);
    addLog(`📝 Status: ${config.publishStatus} | Delay: ${config.delayBetweenPosts}ms`);

    const pendingItems = items.filter(item => {
      const publishItem_ = publishItems.find(p => p.id === item.id);
      return publishItem_?.status === 'pending' && item.generatedContent;
    });

    for (let i = 0; i < pendingItems.length; i++) {
      // Check for stop
      if (stopRef.current) {
        addLog('🛑 Publishing stopped by user');
        break;
      }

      // Check for pause
      while (pauseRef.current && !stopRef.current) {
        await sleep(500);
      }

      const item = pendingItems[i];
      setCurrentIndex(i);

      const success = await publishSingleItem(item);

      // Stop on error if configured
      if (!success && config.stopOnError) {
        addLog('⛔ Stopping due to error (stopOnError enabled)');
        break;
      }

      // Delay between posts (except for last item)
      if (i < pendingItems.length - 1 && !stopRef.current) {
        await sleep(config.delayBetweenPosts);
      }
    }

    setIsPublishing(false);
    const finalStats = {
      success: publishItems.filter(i => i.status === 'success').length,
      error: publishItems.filter(i => i.status === 'error').length,
    };
    addLog(`🏁 Bulk publish complete! Success: ${finalStats.success}, Failed: ${finalStats.error}`);
  };

  // Pause/Resume
  const togglePause = () => {
    pauseRef.current = !pauseRef.current;
    setIsPaused(pauseRef.current);
    addLog(pauseRef.current ? '⏸️ Publishing paused' : '▶️ Publishing resumed');
  };

  // Stop publishing
  const stopPublishing = () => {
    stopRef.current = true;
    pauseRef.current = false;
    setIsPaused(false);
  };

  // Retry failed items
  const retryFailed = async () => {
    const failedItems = publishItems.filter(i => i.status === 'error');
    if (failedItems.length === 0) return;

    // Reset failed items to pending
    failedItems.forEach(item => updateItemStatus(item.id, 'pending'));
    addLog(`🔄 Retrying ${failedItems.length} failed items...`);
    
    await startPublishing();
  };

  // ==================== RENDER ====================

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(8px)',
    }}>
      <div className="bulk-publish-modal" style={{
        background: 'linear-gradient(180deg, #0F172A 0%, #020617 100%)',
        borderRadius: '20px',
        width: '95%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'hidden',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem',
          background: 'linear-gradient(135deg, #1E40AF 0%, #7C3AED 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, color: 'white', fontSize: '1.5rem', fontWeight: 700 }}>
              🚀 Bulk Publish to WordPress
            </h2>
            <p style={{ margin: '0.5rem 0 0', color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
              Enterprise-Grade Publishing Engine • {stats.total} items
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isPublishing}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              color: 'white',
              fontSize: '1.5rem',
              cursor: isPublishing ? 'not-allowed' : 'pointer',
              opacity: isPublishing ? 0.5 : 1,
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', maxHeight: 'calc(90vh - 200px)' }}>
          {/* Progress Section */}
          <div style={{
            background: 'rgba(59, 130, 246, 0.1)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid rgba(59, 130, 246, 0.2)',
          }}>
            {/* Progress Bar */}
            <div style={{
              height: '12px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '1rem',
            }}>
              <div style={{
                height: '100%',
                width: `${stats.progress}%`,
                background: 'linear-gradient(90deg, #10B981 0%, #3B82F6 50%, #8B5CF6 100%)',
                borderRadius: '6px',
                transition: 'width 0.5s ease',
              }} />
            </div>

            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '1rem',
              textAlign: 'center',
            }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3B82F6' }}>{stats.total}</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Total</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#10B981' }}>{stats.success}</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Success</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#EF4444' }}>{stats.error}</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Failed</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#F59E0B' }}>{stats.pending}</div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Pending</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8B5CF6' }}>
                  {estimatedTime || '--'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>ETA</div>
              </div>
            </div>
          </div>

          {/* Configuration */}
          {!isPublishing && (
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <h4 style={{ color: '#E2E8F0', margin: '0 0 1rem', fontSize: '0.9rem' }}>
                ⚙️ Publishing Configuration
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div>
                  <label style={{ color: '#94A3B8', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
                    Publish Status
                  </label>
                  <select
                    value={config.publishStatus}
                    onChange={e => setConfig(prev => ({ ...prev, publishStatus: e.target.value as any }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#E2E8F0',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="publish">Publish (Live)</option>
                    <option value="draft">Draft</option>
                    <option value="pending">Pending Review</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: '#94A3B8', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
                    Delay Between Posts
                  </label>
                  <select
                    value={config.delayBetweenPosts}
                    onChange={e => setConfig(prev => ({ ...prev, delayBetweenPosts: Number(e.target.value) }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#E2E8F0',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value={1000}>1 second</option>
                    <option value={2000}>2 seconds</option>
                    <option value={3000}>3 seconds</option>
                    <option value={5000}>5 seconds</option>
                    <option value={10000}>10 seconds</option>
                  </select>
                </div>
                <div>
                  <label style={{ color: '#94A3B8', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
                    Error Handling
                  </label>
                  <select
                    value={config.stopOnError ? 'stop' : 'continue'}
                    onChange={e => setConfig(prev => ({ ...prev, stopOnError: e.target.value === 'stop' }))}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#1E293B',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#E2E8F0',
                      fontSize: '0.9rem',
                    }}
                  >
                    <option value="continue">Continue on Error</option>
                    <option value="stop">Stop on Error</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Items List */}
          <div style={{
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            maxHeight: '250px',
            overflowY: 'auto',
          }}>
            <h4 style={{ color: '#E2E8F0', margin: '0 0 1rem', fontSize: '0.9rem' }}>
              📄 Items to Publish
            </h4>
            {publishItems.map((item, index) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: item.status === 'success' ? 'rgba(16, 185, 129, 0.1)' :
                             item.status === 'error' ? 'rgba(239, 68, 68, 0.1)' :
                             item.status === 'publishing' ? 'rgba(59, 130, 246, 0.1)' :
                             'rgba(255,255,255,0.02)',
                  borderRadius: '8px',
                  marginBottom: '0.5rem',
                  border: `1px solid ${
                    item.status === 'success' ? 'rgba(16, 185, 129, 0.3)' :
                    item.status === 'error' ? 'rgba(239, 68, 68, 0.3)' :
                    item.status === 'publishing' ? 'rgba(59, 130, 246, 0.5)' :
                    'rgba(255,255,255,0.05)'
                  }`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', width: '24px' }}>
                    #{index + 1}
                  </span>
                  <span style={{
                    fontSize: '1.25rem',
                    width: '24px',
                  }}>
                    {item.status === 'success' ? '✅' :
                     item.status === 'error' ? '❌' :
                     item.status === 'publishing' ? '⏳' :
                     item.status === 'skipped' ? '⏭️' : '⏸️'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: '#E2E8F0',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {item.title}
                    </div>
                    {item.message && (
                      <div style={{
                        color: item.status === 'error' ? '#FCA5A5' : '#94A3B8',
                        fontSize: '0.7rem',
                        marginTop: '2px',
                      }}>
                        {item.message}
                      </div>
                    )}
                  </div>
                </div>
                {item.publishedUrl && (
                  <a
                    href={item.publishedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#3B82F6',
                      fontSize: '0.75rem',
                      textDecoration: 'none',
                    }}
                  >
                    View →
                  </a>
                )}
              </div>
            ))}
          </div>

          {/* Logs */}
          <div style={{
            background: '#000',
            borderRadius: '12px',
            padding: '1rem',
            maxHeight: '150px',
            overflowY: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
            fontSize: '0.75rem',
          }}>
            <h4 style={{ color: '#10B981', margin: '0 0 0.75rem', fontSize: '0.8rem' }}>
              📋 Publish Logs
            </h4>
            {logs.map((log, i) => (
              <div
                key={i}
                style={{
                  color: log.includes('✅') ? '#10B981' :
                         log.includes('❌') ? '#EF4444' :
                         log.includes('⚠️') ? '#F59E0B' :
                         log.includes('🚀') ? '#3B82F6' :
                         '#94A3B8',
                  marginBottom: '4px',
                }}
              >
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1.25rem 2rem',
          background: 'rgba(0,0,0,0.3)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {!isPublishing ? (
              <>
                <button
                  onClick={startPublishing}
                  disabled={stats.pending === 0}
                  style={{
                    padding: '0.75rem 2rem',
                    background: stats.pending === 0 ? '#334155' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: stats.pending === 0 ? 'not-allowed' : 'pointer',
                    opacity: stats.pending === 0 ? 0.5 : 1,
                  }}
                >
                  🚀 Start Publishing ({stats.pending})
                </button>
                {stats.error > 0 && (
                  <button
                    onClick={retryFailed}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                      border: 'none',
                      borderRadius: '10px',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                    }}
                  >
                    🔄 Retry Failed ({stats.error})
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={togglePause}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: isPaused ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)' : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                </button>
                <button
                  onClick={stopPublishing}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                  }}
                >
                  🛑 Stop
                </button>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={isPublishing}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '10px',
              color: '#94A3B8',
              fontWeight: 500,
              fontSize: '0.95rem',
              cursor: isPublishing ? 'not-allowed' : 'pointer',
              opacity: isPublishing ? 0.5 : 1,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkPublishModal;

