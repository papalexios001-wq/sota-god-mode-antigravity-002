// =============================================================================
// ENTERPRISE EDITOR V2.0 - SOTA Post-Generation Blog Editor
// 10000000000x Quality Enhancement - Professional Internal Linking UI
// =============================================================================

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { UltraPremiumAnchorEngineV2, UltraAnchorCandidate, PageContext } from './UltraPremiumAnchorEngineV2';

// ==================== TYPES ====================

export interface InternalLinkSuggestion {
  id: string;
  anchorText: string;
  targetUrl: string;
  targetTitle: string;
  qualityScore: number;
  semanticScore: number;
  seoScore: number;
  contextSnippet: string;
  position: { start: number; end: number };
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
}

export interface EditorDocument {
  id: string;
  title: string;
  content: string;
  htmlContent: string;
  wordCount: number;
  internalLinks: InternalLinkSuggestion[];
  externalLinks: string[];
  headings: { level: number; text: string; position: number }[];
  paragraphs: { text: string; position: number; wordCount: number }[];
  metadata: {
    primaryKeyword: string;
    secondaryKeywords: string[];
    category: string;
    createdAt: Date;
    modifiedAt: Date;
  };
}

export interface EditorConfig {
  minLinksPerPost: number;
  maxLinksPerPost: number;
  minWordsPerLink: number;
  linkDistribution: 'even' | 'weighted' | 'natural';
  autoSuggest: boolean;
  highlightSuggestions: boolean;
  qualityThreshold: number;
}

const DEFAULT_CONFIG: EditorConfig = {
  minLinksPerPost: 5,
  maxLinksPerPost: 15,
  minWordsPerLink: 150,
  linkDistribution: 'natural',
  autoSuggest: true,
  highlightSuggestions: true,
  qualityThreshold: 75,
};

// ==================== CUSTOM HOOKS ====================

export const useInternalLinkAnalysis = (
  content: string,
  availablePages: PageContext[],
  config: EditorConfig = DEFAULT_CONFIG
) => {
  const [suggestions, setSuggestions] = useState<InternalLinkSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const engineRef = useRef<UltraPremiumAnchorEngineV2 | null>(null);

  useEffect(() => {
    engineRef.current = new UltraPremiumAnchorEngineV2({
      minQualityScore: config.qualityThreshold,
    });
  }, [config.qualityThreshold]);

  const analyzeContent = useCallback(async () => {
    if (!content || !engineRef.current) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    engineRef.current.reset();

    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 50);
    const newSuggestions: InternalLinkSuggestion[] = [];
    
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      setAnalysisProgress(Math.round((i / paragraphs.length) * 100));
      
      for (const page of availablePages) {
        if (newSuggestions.length >= config.maxLinksPerPost) break;
        
        const candidate = engineRef.current.findBestAnchor(paragraph, page);
        if (candidate && candidate.qualityScore >= config.qualityThreshold) {
          const position = content.indexOf(candidate.text);
          newSuggestions.push({
            id: `link-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            anchorText: candidate.text,
            targetUrl: `/${page.slug}/`,
            targetTitle: page.title,
            qualityScore: candidate.qualityScore,
            semanticScore: candidate.semanticScore,
            seoScore: candidate.seoValue,
            contextSnippet: paragraph.slice(0, 150) + '...',
            position: { start: position, end: position + candidate.text.length },
            status: 'pending',
          });
        }
      }
    }
    
    setSuggestions(newSuggestions);
    setIsAnalyzing(false);
    setAnalysisProgress(100);
  }, [content, availablePages, config]);

  return { suggestions, setSuggestions, isAnalyzing, analysisProgress, analyzeContent };
};

// ==================== UI COMPONENTS ====================

const QualityBadge: React.FC<{ score: number }> = ({ score }) => {
  const getColor = () => {
    if (score >= 90) return '#22c55e';
    if (score >= 75) return '#84cc16';
    if (score >= 60) return '#eab308';
    return '#ef4444';
  };
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '12px',
      backgroundColor: getColor(),
      color: 'white',
      fontSize: '12px',
      fontWeight: 600,
    }}>
      {Math.round(score)}%
    </span>
  );
};

const LinkSuggestionCard: React.FC<{
  suggestion: InternalLinkSuggestion;
  onAccept: () => void;
  onReject: () => void;
  onModify: (newAnchor: string) => void;
}> = ({ suggestion, onAccept, onReject, onModify }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnchor, setEditedAnchor] = useState(suggestion.anchorText);
  
  const cardStyle: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    backgroundColor: suggestion.status === 'accepted' ? '#f0fdf4' :
                     suggestion.status === 'rejected' ? '#fef2f2' : '#ffffff',
    transition: 'all 0.2s ease',
  };
  
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <QualityBadge score={suggestion.qualityScore} />
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              SEO: {Math.round(suggestion.seoScore)}% | Semantic: {Math.round(suggestion.semanticScore)}%
            </span>
          </div>
          
          {isEditing ? (
            <input
              type="text"
              value={editedAnchor}
              onChange={(e) => setEditedAnchor(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #3b82f6',
                borderRadius: '4px',
                fontSize: '14px',
              }}
              autoFocus
            />
          ) : (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: '#1f2937' }}>
                "{suggestion.anchorText}"
              </span>
              <span style={{ color: '#6b7280' }}> → </span>
              <span style={{ color: '#3b82f6' }}>{suggestion.targetTitle}</span>
            </div>
          )}
          
          <div style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
            ...{suggestion.contextSnippet}
          </div>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        {suggestion.status === 'pending' && (
          <>
            <button
              onClick={onAccept}
              style={{
                padding: '6px 16px',
                backgroundColor: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              ✓ Accept
            </button>
            <button
              onClick={onReject}
              style={{
                padding: '6px 16px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              ✕ Reject
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                padding: '6px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              ✎ Edit
            </button>
            {isEditing && (
              <button
                onClick={() => { onModify(editedAnchor); setIsEditing(false); }}
                style={{
                  padding: '6px 16px',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                }}
              >
                Save
              </button>
            )}
          </>
        )}
        {suggestion.status !== 'pending' && (
          <span style={{
            padding: '6px 16px',
            backgroundColor: suggestion.status === 'accepted' ? '#dcfce7' : '#fee2e2',
            color: suggestion.status === 'accepted' ? '#166534' : '#991b1b',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 500,
          }}>
            {suggestion.status === 'accepted' ? '✓ Accepted' : '✕ Rejected'}
          </span>
        )}
      </div>
    </div>
  );
};

// ==================== MAIN EDITOR COMPONENT ====================

export interface EnterpriseEditorV2Props {
  initialContent: string;
  availablePages: PageContext[];
  onSave?: (content: string, links: InternalLinkSuggestion[]) => void;
  config?: Partial<EditorConfig>;
}

export const EnterpriseEditorV2: React.FC<EnterpriseEditorV2Props> = ({
  initialContent,
  availablePages,
  onSave,
  config: customConfig,
}) => {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const [content, setContent] = useState(initialContent);
  const [activeTab, setActiveTab] = useState<'editor' | 'links' | 'preview'>('editor');
  const contentRef = useRef<HTMLDivElement>(null);
  
  const {
    suggestions,
    setSuggestions,
    isAnalyzing,
    analysisProgress,
    analyzeContent,
  } = useInternalLinkAnalysis(content, availablePages, config);

  const stats = useMemo(() => {
    const accepted = suggestions.filter(s => s.status === 'accepted').length;
    const rejected = suggestions.filter(s => s.status === 'rejected').length;
    const pending = suggestions.filter(s => s.status === 'pending').length;
    const avgQuality = suggestions.length > 0
      ? suggestions.reduce((acc, s) => acc + s.qualityScore, 0) / suggestions.length
      : 0;
    return { accepted, rejected, pending, total: suggestions.length, avgQuality };
  }, [suggestions]);

  const handleAccept = useCallback((id: string) => {
    setSuggestions(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'accepted' as const } : s
    ));
  }, [setSuggestions]);

  const handleReject = useCallback((id: string) => {
    setSuggestions(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'rejected' as const } : s
    ));
  }, [setSuggestions]);

  const handleModify = useCallback((id: string, newAnchor: string) => {
    setSuggestions(prev => prev.map(s =>
      s.id === id ? { ...s, anchorText: newAnchor, status: 'modified' as const } : s
    ));
  }, [setSuggestions]);

  const handleAcceptAll = useCallback(() => {
    setSuggestions(prev => prev.map(s =>
      s.status === 'pending' ? { ...s, status: 'accepted' as const } : s
    ));
  }, [setSuggestions]);

  const handleSave = useCallback(() => {
    const acceptedLinks = suggestions.filter(s => s.status === 'accepted');
    onSave?.(content, acceptedLinks);
  }, [content, suggestions, onSave]);

  const containerStyle: React.CSSProperties = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  };

  const tabsStyle: React.CSSProperties = {
    display: 'flex',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '12px 24px',
    border: 'none',
    background: isActive ? '#ffffff' : 'transparent',
    borderBottom: isActive ? '2px solid #667eea' : '2px solid transparent',
    color: isActive ? '#667eea' : '#6b7280',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  });

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>
          Enterprise Blog Editor V2.0
        </h1>
        <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '14px' }}>
          SOTA Internal Linking with Contextual Rich Anchor Text
        </p>
      </div>

      <div style={tabsStyle}>
        <button style={tabStyle(activeTab === 'editor')} onClick={() => setActiveTab('editor')}>
          Editor
        </button>
        <button style={tabStyle(activeTab === 'links')} onClick={() => setActiveTab('links')}>
          Internal Links ({stats.total})
        </button>
        <button style={tabStyle(activeTab === 'preview')} onClick={() => setActiveTab('preview')}>
          Preview
        </button>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Stats Bar */}
        <div style={{
          display: 'flex',
          gap: '16px',
          padding: '16px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#667eea' }}>{stats.total}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Total Links</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#22c55e' }}>{stats.accepted}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Accepted</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#eab308' }}>{stats.pending}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Pending</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>{stats.rejected}</div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Rejected</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#8b5cf6' }}>
              {Math.round(stats.avgQuality)}%
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>Avg Quality</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <button
            onClick={analyzeContent}
            disabled={isAnalyzing}
            style={{
              padding: '10px 20px',
              backgroundColor: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isAnalyzing ? 'wait' : 'pointer',
              fontWeight: 500,
              opacity: isAnalyzing ? 0.7 : 1,
            }}
          >
            {isAnalyzing ? `Analyzing... ${analysisProgress}%` : 'Analyze Content'}
          </button>
          <button
            onClick={handleAcceptAll}
            disabled={stats.pending === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              opacity: stats.pending === 0 ? 0.5 : 1,
            }}
          >
            Accept All ({stats.pending})
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '10px 20px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Save & Export
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'editor' && (
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={(e) => setContent(e.currentTarget.textContent || '')}
            style={{
              minHeight: '400px',
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              outline: 'none',
              lineHeight: 1.7,
              fontSize: '15px',
            }}
            dangerouslySetInnerHTML={{ __html: initialContent }}
          />
        )}

        {activeTab === 'links' && (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {suggestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                No link suggestions yet. Click "Analyze Content" to generate suggestions.
              </div>
            ) : (
              suggestions.map(suggestion => (
                <LinkSuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onAccept={() => handleAccept(suggestion.id)}
                  onReject={() => handleReject(suggestion.id)}
                  onModify={(newAnchor) => handleModify(suggestion.id, newAnchor)}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'preview' && (
          <div
            style={{
              padding: '24px',
              backgroundColor: '#fafafa',
              borderRadius: '8px',
              lineHeight: 1.8,
            }}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </div>
    </div>
  );
};

export default EnterpriseEditorV2;
