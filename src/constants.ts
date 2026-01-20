// =============================================================================
// SOTA WP CONTENT OPTIMIZER PRO - CONSTANTS v12.0
// Centralized Configuration & Constants
// =============================================================================

// ==================== AI MODEL IDENTIFIERS ====================

export const AI_MODELS = {
  // Google Gemini
  GEMINI_FLASH: 'gemini-2.5-flash',
  GEMINI_PRO: 'gemini-2.5-pro',
  GEMINI_IMAGEN: 'imagen-4.0-generate-001',
  
  // OpenAI
  OPENAI_GPT4_TURBO: 'gpt-4o',
  OPENAI_GPT4_MINI: 'gpt-4o-mini',
  OPENAI_DALLE3: 'dall-e-3',
  
  // Anthropic
  ANTHROPIC_OPUS: 'claude-sonnet-4-20250514',
  ANTHROPIC_SONNET: 'claude-3-5-sonnet-20241022',
  ANTHROPIC_HAIKU: 'claude-3-haiku-20240307',
  
  // OpenRouter Fallback Chain
  OPENROUTER_DEFAULT: [
    'google/gemini-2.5-flash',
    'anthropic/claude-3-haiku',
    'microsoft/wizardlm-2-8x22b',
    'openrouter/auto',
  ],
  
  // Groq Models
  GROQ_MODELS: [
    'llama3-70b-8192',
    'llama3-8b-8192',
    'mixtral-8x7b-32768',
    'gemma-7b-it',
  ],
} as const;

// ==================== CONTENT REQUIREMENTS ====================

// Word count targets (SOTA quality standards)
export const TARGET_MIN_WORDS = 2500;
export const TARGET_MAX_WORDS = 3200;
export const TARGET_MIN_WORDS_PILLAR = 4000;
export const TARGET_MAX_WORDS_PILLAR = 5500;

// Content structure requirements
export const MIN_INTERNAL_LINKS = 8;
export const MAX_INTERNAL_LINKS = 15;
export const MIN_TABLES = 1;
export const MAX_TABLES = 3;
export const FAQ_COUNT = 8;
export const KEY_TAKEAWAYS = 8;
export const YOUTUBE_EMBED_COUNT = 2;

// SEO metadata limits
export const TITLE_MIN_LENGTH = 50;
export const TITLE_MAX_LENGTH = 60;
export const META_DESC_MIN_LENGTH = 135;
export const META_DESC_MAX_LENGTH = 150;

// ==================== API CONFIGURATION ====================

export const IMGUR_CLIENT_ID = '546c25a59c58ad7';

// Cache TTL values (milliseconds)
export const CACHE_TTL = {
  SERP: 86400000,        // 24 hours
  VIDEOS: 259200000,     // 72 hours
  REFERENCES: 604800000, // 7 days
  NEURON: 3600000,       // 1 hour
} as const;

// API timeouts (milliseconds)
export const API_TIMEOUTS = {
  DEFAULT: 30000,        // 30 seconds
  LONG: 60000,           // 60 seconds
  CRAWL: 45000,          // 45 seconds
  IMAGE: 120000,         // 2 minutes
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY: 1000,
  MAX_DELAY: 10000,
} as const;

// ==================== PROCESSING LIMITS ====================

export const PROCESSING_LIMITS = {
  MAX_CONCURRENT_AI_CALLS: 5,
  MAX_URLS_PER_BATCH: 25,
  MAX_SITEMAP_PAGES: 500,
  MAX_BULK_PUBLISH: 50,
  MAX_GOD_MODE_NODES: 50,
  GOD_MODE_BATCH_SIZE: 6,
} as const;

// ==================== STORAGE KEYS ====================

export const STORAGE_KEYS = {
  API_KEYS: 'apiKeys',
  WP_CONFIG: 'wpConfig',
  WP_PASSWORD: 'wpPassword',
  SITE_INFO: 'siteInfo',
  GEO_TARGETING: 'geoTargeting',
  NEURON_CONFIG: 'neuronConfig',
  SELECTED_MODEL: 'selectedModel',
  SELECTED_GROQ_MODEL: 'selectedGroqModel',
  GOD_MODE: 'sota_god_mode',
  EXCLUDED_URLS: 'excludedUrls',
  EXCLUDED_CATEGORIES: 'excludedCategories',
  PRIORITY_URLS: 'priorityUrls',
  PRIORITY_ONLY_MODE: 'priorityOnlyMode',
  HAS_SEEN_LANDING: 'hasSeenLanding',
  ITEMS: 'sota_items',
  PERFORMANCE_METRICS: 'sota_performance_metrics',
  OPTIMIZATION_HISTORY: 'sota_optimization_history',
} as const;

// ==================== DOMAIN BLOCKLISTS ====================

export const BLOCKED_REFERENCE_DOMAINS = [
  'reddit.com',
  'quora.com',
  'pinterest.com',
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'medium.com',
  'wordpress.com',
  'blogspot.com',
  'tumblr.com',
  'scribd.com',
  'slideshare.net',
] as const;

export const BLOCKED_SPAM_DOMAINS = [
  'polishedrx.com',
  'spamsite.com',
] as const;

// ==================== AI BANNED PHRASES ====================

export const AI_BANNED_PHRASES = [
  'delve into',
  'delve',
  'tapestry',
  'landscape',
  'testament',
  'realm',
  'symphony',
  'unlock',
  'leverage',
  'robust',
  'holistic',
  'paradigm',
  'game-changer',
  'fostering',
  'in conclusion',
  'it is important to note',
  'basically',
  'actually',
  'in this article',
  'as mentioned above',
  'without further ado',
  'needless to say',
  'it goes without saying',
] as const;

// ==================== REFERENCE CATEGORIES ====================

export const REFERENCE_CATEGORIES = {
  health: {
    name: 'Health & Medical',
    authorityDomains: ['nih.gov', 'cdc.gov', 'who.int', 'mayoclinic.org', 'healthline.com', 'webmd.com'],
    searchModifiers: ['research', 'study', 'clinical', 'medical', 'health'],
    excludeDomains: ['reddit.com', 'quora.com'],
  },
  fitness: {
    name: 'Fitness & Exercise',
    authorityDomains: ['acsm.org', 'nsca.com', 'runnersworld.com', 'menshealth.com', 'self.com'],
    searchModifiers: ['workout', 'training', 'exercise', 'fitness', 'athletic'],
    excludeDomains: ['reddit.com', 'quora.com'],
  },
  nutrition: {
    name: 'Nutrition & Diet',
    authorityDomains: ['nutrition.gov', 'eatright.org', 'examine.com', 'usda.gov', 'fda.gov'],
    searchModifiers: ['nutrition', 'diet', 'food', 'dietary', 'calorie'],
    excludeDomains: ['reddit.com', 'quora.com'],
  },
  technology: {
    name: 'Technology',
    authorityDomains: ['ieee.org', 'acm.org', 'techcrunch.com', 'wired.com', 'arstechnica.com', 'theverge.com'],
    searchModifiers: ['technology', 'software', 'hardware', 'digital', 'tech'],
    excludeDomains: ['reddit.com', 'quora.com', 'medium.com'],
  },
  business: {
    name: 'Business & Finance',
    authorityDomains: ['hbr.org', 'forbes.com', 'bloomberg.com', 'wsj.com', 'economist.com'],
    searchModifiers: ['business', 'finance', 'market', 'economic', 'strategy'],
    excludeDomains: ['reddit.com', 'quora.com', 'medium.com'],
  },
  science: {
    name: 'Science & Research',
    authorityDomains: ['nature.com', 'science.org', 'sciencedirect.com', 'plos.org', 'ncbi.nlm.nih.gov'],
    searchModifiers: ['research', 'study', 'scientific', 'peer-reviewed', 'journal'],
    excludeDomains: ['reddit.com', 'quora.com'],
  },
} as const;

// ==================== VISUAL DESIGN TOKENS ====================

export const DESIGN_TOKENS = {
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    success: '#059669',
    warning: '#D97706',
    danger: '#DC2626',
    bgDeep: '#020203',
    bgSurface: '#08080A',
    textPrimary: '#E2E8F0',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 50%, #8B5CF6 100%)',
    success: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    warning: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  },
  borderRadius: {
    sm: '6px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  shadows: {
    sm: '0 2px 8px rgba(0,0,0,0.4)',
    lg: '0 20px 50px -12px rgba(0,0,0,0.9)',
    glow: '0 0 20px rgba(59, 130, 246, 0.25)',
  },
} as const;

// ==================== CONTENT SCORING WEIGHTS ====================

export const SCORING_WEIGHTS = {
  wordCount: 15,
  keywordDensity: 10,
  readability: 15,
  internalLinks: 15,
  externalLinks: 5,
  headingStructure: 10,
  imageOptimization: 5,
  metaQuality: 10,
  schemaMarkup: 5,
  freshness: 5,
  engagement: 5,
} as const;

// ==================== FEATURE FLAGS ====================

export const FEATURE_FLAGS = {
  ENABLE_GOD_MODE: true,
  ENABLE_NEURONWRITER: true,
  ENABLE_IMAGE_GENERATION: true,
  ENABLE_VIDEO_EMBEDDING: true,
  ENABLE_BULK_PUBLISH: true,
  ENABLE_GAP_ANALYSIS: true,
  ENABLE_PERFORMANCE_TRACKING: true,
  ENABLE_AEO_OPTIMIZATION: true,
  DEBUG_MODE: process.env.NODE_ENV === 'development',
} as const;

