// =============================================================================
// SOTA WP CONTENT OPTIMIZER PRO - UTILITIES v12.0
// Enterprise-Grade Utility Functions with Robust JSON Parsing
// =============================================================================

// ==================== RETRY LOGIC ====================

/**
 * Calls an async function with exponential backoff retry logic
 * @param fn - The async function to call
 * @param maxRetries - Maximum number of retry attempts
 * @param baseDelay - Base delay in milliseconds between retries
 * @returns Promise resolving to the function result
 */
export const callAiWithRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on authentication errors
      if (error.status === 401 || error.status === 403) {
        throw error;
      }

      // Don't retry on rate limit if it's the last attempt
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[callAiWithRetry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All retry attempts failed');
};

// ==================== DEBOUNCE ====================

/**
 * Creates a debounced version of a function
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// ==================== THROTTLE ====================

/**
 * Creates a throttled version of a function
 * @param fn - The function to throttle
 * @param limit - Time limit in milliseconds
 * @returns Throttled function
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

// ==================== WORDPRESS FETCH ====================

/**
 * Fetches from WordPress with retry logic
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param maxRetries - Maximum retries
 * @returns Promise resolving to Response
 */
export const fetchWordPressWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      lastError = error;
      console.warn(`[fetchWordPressWithRetry] Attempt ${attempt + 1} failed:`, error.message);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('WordPress request failed after all retries');
};

// ==================== SLUG EXTRACTION ====================

/**
 * Extracts the slug from a URL
 * @param url - The URL to extract slug from
 * @returns The extracted slug
 */
export const extractSlugFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/^\/|\/$/g, '');
    const segments = pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] || segments[segments.length - 2] || '';
  } catch {
    // If not a valid URL, assume it's already a slug or path
    return url.replace(/^\/|\/$/g, '').split('/').filter(Boolean).pop() || url;
  }
};

// ==================== TITLE SANITIZATION ====================

/**
 * Sanitizes a title, providing fallback from slug if needed
 * @param title - The title to sanitize
 * @param fallbackSlug - Optional fallback slug
 * @returns Sanitized title
 */
export const sanitizeTitle = (title: string, fallbackSlug?: string): string => {
  if (!title || title === 'Untitled' || title.startsWith('http')) {
    if (fallbackSlug) {
      return fallbackSlug
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return 'Untitled Page';
  }
  return title;
};

// ==================== JSON PARSING - CRITICAL FIX ====================

/**
 * Strips markdown code block wrappers from AI responses
 * Handles: ```json ... ```, ```JSON ... ```, ``` ... ```, and raw JSON
 * @param text - The text to clean
 * @returns Cleaned text without markdown wrappers
 */
export const stripMarkdownCodeBlocks = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();

  // Remove ```json or ```JSON or ```javascript wrapper (case insensitive)
  const codeBlockStartRegex = /^```(?:json|JSON|javascript|Javascript|JS|js)?\s*\n?/;
  const codeBlockEndRegex = /\n?```\s*$/;

  if (codeBlockStartRegex.test(cleaned)) {
    cleaned = cleaned.replace(codeBlockStartRegex, '');
  }

  if (codeBlockEndRegex.test(cleaned)) {
    cleaned = cleaned.replace(codeBlockEndRegex, '');
  }

  return cleaned.trim();
};

/**
 * Extracts JSON from potentially messy AI response
 * Handles markdown wrappers, extra text before/after JSON, etc.
 * @param response - The raw response text
 * @returns Extracted JSON string
 */
export const extractJsonFromResponse = (response: string): string => {
  if (!response || typeof response !== 'string') {
    throw new Error('Empty or invalid response');
  }

  let cleaned = response.trim();

  // Step 1: Strip markdown code blocks
  cleaned = stripMarkdownCodeBlocks(cleaned);

  // Step 2: Try to find JSON boundaries
  // Look for JSON object { ... }
  const jsonObjectMatch = cleaned.match(/(\{[\s\S]*\})/);
  // Look for JSON array [ ... ]
  const jsonArrayMatch = cleaned.match(/(\[[\s\S]*\])/);

  // Determine which match to use
  if (jsonObjectMatch && jsonArrayMatch) {
    // Both exist - use whichever appears first
    const objectIndex = cleaned.indexOf(jsonObjectMatch);
    const arrayIndex = cleaned.indexOf(jsonArrayMatch);

    if (objectIndex !== -1 && arrayIndex !== -1) {
      cleaned = objectIndex < arrayIndex ? jsonObjectMatch : jsonArrayMatch;
    } else if (objectIndex !== -1) {
      cleaned = jsonObjectMatch;
    } else {
      cleaned = jsonArrayMatch;
    }
  } else if (jsonObjectMatch) {
    cleaned = jsonObjectMatch;
  } else if (jsonArrayMatch) {
    cleaned = jsonArrayMatch;
  }

  // Step 3: Final trim
  return cleaned.trim();
};

/**
 * Cleans up common JSON formatting issues from AI responses
 * @param jsonString - The JSON string to clean
 * @returns Cleaned JSON string
 */
const cleanupJsonString = (jsonString: string): string => {
  let cleaned = jsonString;

  // Remove trailing commas before ] or }
  cleaned = cleaned.replace(/,\s*]/g, ']');
  cleaned = cleaned.replace(/,\s*}/g, '}');

  // Fix unquoted property names (simple cases)
  cleaned = cleaned.replace(/({|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  // Remove control characters that break JSON
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (char) => {
    // Keep newlines and tabs as escaped versions
    if (char === '\n') return '\\n';
    if (char === '\r') return '\\r';
    if (char === '\t') return '\\t';
    return ' ';
  });

  // Fix single quotes used instead of double quotes for strings
  // This is tricky - only do it if it looks like the pattern "key": 'value'
  cleaned = cleaned.replace(/:\s*'([^']*)'/g, ': "$1"');

  return cleaned;
};

/**
 * Parse JSON with AI repair fallback
 * Strips markdown wrappers before parsing
 * @param responseText - The raw response text from AI
 * @param aiRepairer - Optional function to repair broken JSON using AI
 * @returns Parsed JSON object
 */
export const parseJsonWithAiRepair = async (
  responseText: string,
  aiRepairer?: (brokenText: string) => Promise<string>
): Promise<any> => {
  if (!responseText || typeof responseText !== 'string') {
    throw new Error('Invalid response text for JSON parsing');
  }

  // Step 1: Extract and clean JSON
  let cleanedJson: string;
  try {
    cleanedJson = extractJsonFromResponse(responseText);
  } catch (e) {
    console.error('[parseJsonWithAiRepair] Failed to extract JSON:', e);
    cleanedJson = responseText.trim();
  }

  // Step 2: Try direct parse
  try {
    return JSON.parse(cleanedJson);
  } catch (firstError) {
    console.warn('[parseJsonWithAiRepair] First parse attempt failed, trying cleanup...');

    // Step 3: Try with cleanup
    try {
      const furtherCleaned = cleanupJsonString(cleanedJson);
      return JSON.parse(furtherCleaned);
    } catch (secondError) {
      console.warn('[parseJsonWithAiRepair] Second parse attempt failed, trying AI repair...');

      // Step 4: AI repair as last resort
      if (aiRepairer) {
        try {
          const repairedText = await aiRepairer(cleanedJson);
          const repairedCleaned = extractJsonFromResponse(repairedText);
          return JSON.parse(repairedCleaned);
        } catch (repairError) {
          console.error('[parseJsonWithAiRepair] AI repair also failed:', repairError);
        }
      }

      // Final fallback: throw with context
      const preview = responseText.substring(0, 150).replace(/\n/g, ' ');
      throw new Error(
        `Could not extract valid JSON from AI response. Response starts with: "${preview}..." (Total length: ${responseText.length} chars)`
      );
    }
  }
};

// ==================== CONCURRENT PROCESSING ====================

/**
 * Processes items concurrently with controlled parallelism
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param concurrency - Maximum concurrent operations
 * @param onProgress - Optional progress callback
 * @param shouldStop - Optional function to check if processing should stop
 * @returns Array of results
 */
export const processConcurrently = async <T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 3,
  onProgress?: (current: number, total: number) => void,
  shouldStop?: () => boolean
): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  let completedCount = 0;
  const total = items.length;

  const processNext = async (): Promise<void> => {
    while (currentIndex < items.length) {
      if (shouldStop?.()) {
        console.log('[processConcurrently] Stop signal received');
        break;
      }

      const index = currentIndex++;
      const item = items[index];

      try {
        const result = await processor(item, index);
        results[index] = result;
      } catch (error) {
        console.error(`[processConcurrently] Error processing item ${index}:`, error);
        results[index] = null as any;
      }

      completedCount++;
      onProgress?.(completedCount, total);
    }
  };

  // Start worker promises
  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, () => processNext());

  await Promise.all(workers);

  return results;
};

// ==================== STORAGE HELPERS ====================

/**
 * Gets an item from localStorage with JSON parsing and default value
 * @param key - Storage key
 * @param defaultValue - Default value if key not found
 * @returns Stored value or default
 */
export const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (item === null || item === undefined) return defaultValue;
    return JSON.parse(item);
  } catch (error) {
    console.warn(`[getStorageItem] Failed to parse ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Sets an item in localStorage with JSON stringification
 * @param key - Storage key
 * @param value - Value to store
 */
export const setStorageItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`[setStorageItem] Failed to save ${key}:`, error);
  }
};

/**
 * Removes an item from localStorage
 * @param key - Storage key to remove
 */
export const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`[removeStorageItem] Failed to remove ${key}:`, error);
  }
};

// ==================== ID GENERATION ====================

/**
 * Generates a unique ID
 * @returns Unique ID string
 */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

/**
 * Generates a UUID v4
 * @returns UUID string
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ==================== TEXT UTILITIES ====================

/**
 * Truncates text to a maximum length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Escapes special regex characters in a string
 * @param string - String to escape
 * @returns Escaped string
 */
export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Converts a string to title case
 * @param str - String to convert
 * @returns Title case string
 */
export const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Converts a string to slug format
 * @param str - String to convert
 * @returns Slug string
 */
export const toSlug = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Strips HTML tags from a string
 * @param html - HTML string
 * @returns Plain text string
 */
export const stripHtmlTags = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};

// ==================== URL UTILITIES ====================

/**
 * Validates if a string is a valid URL
 * @param urlString - String to validate
 * @returns True if valid URL
 */
export const isValidUrl = (urlString: string): boolean => {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
};

/**
 * Normalizes a URL by removing trailing slashes and standardizing protocol
 * @param url - URL to normalize
 * @returns Normalized URL
 */
export const normalizeUrl = (url: string): string => {
  let normalized = url.trim();

  // Add https if no protocol
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  // Remove trailing slash
  normalized = normalized.replace(/\/+$/, '');

  return normalized;
};

/**
 * Extracts the domain from a URL
 * @param url - URL to extract domain from
 * @returns Domain string
 */
export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return '';
  }
};

/**
 * Gets URL parameters as an object
 * @param url - URL to parse
 * @returns Object with URL parameters
 */
export const getUrlParams = (url: string): Record<string, string> => {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
};

// ==================== DELAY UTILITY ====================

/**
 * Returns a promise that resolves after a specified delay
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after delay
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ==================== DEEP CLONE ====================

/**
 * Creates a deep clone of an object
 * @param obj - Object to clone
 * @returns Cloned object
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;

  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
};

// ==================== OBJECT UTILITIES ====================

/**
 * Checks if an object is empty
 * @param obj - Object to check
 * @returns True if empty
 */
export const isEmptyObject = (obj: Record<string, any>): boolean => {
  return Object.keys(obj).length === 0;
};

/**
 * Picks specified keys from an object
 * @param obj - Source object
 * @param keys - Keys to pick
 * @returns New object with only picked keys
 */
export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

/**
 * Omits specified keys from an object
 * @param obj - Source object
 * @param keys - Keys to omit
 * @returns New object without omitted keys
 */
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
};

// ==================== ARRAY UTILITIES ====================

/**
 * Removes duplicate values from an array
 * @param arr - Array to deduplicate
 * @returns Array with unique values
 */
export const uniqueArray = <T>(arr: T[]): T[] => {
  return [...new Set(arr)];
};

/**
 * Chunks an array into smaller arrays
 * @param arr - Array to chunk
 * @param size - Chunk size
 * @returns Array of chunks
 */
export const chunkArray = <T>(arr: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/**
 * Shuffles an array randomly
 * @param arr - Array to shuffle
 * @returns Shuffled array
 */
export const shuffleArray = <T>(arr: T[]): T[] => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// ==================== DATE UTILITIES ====================

/**
 * Formats a date to ISO string (date only)
 * @param date - Date to format
 * @returns ISO date string (YYYY-MM-DD)
 */
export const formatDateISO = (date: Date): string => {
  return date.toISOString().split('T');
};

/**
 * Gets the current year
 * @returns Current year number
 */
export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Calculates days between two dates
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days between dates
 */
export const daysBetween = (date1: Date, date2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
};

// ==================== NUMBER UTILITIES ====================

/**
 * Clamps a number between min and max values
 * @param num - Number to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped number
 */
export const clamp = (num: number, min: number, max: number): number => {
  return Math.min(Math.max(num, min), max);
};

/**
 * Formats a number with thousand separators
 * @param num - Number to format
 * @returns Formatted number string
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US');
};

/**
 * Rounds a number to specified decimal places
 * @param num - Number to round
 * @param decimals - Number of decimal places
 * @returns Rounded number
 */
export const roundTo = (num: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

// ==================== EXPORTS ====================

export default {
  callAiWithRetry,
  debounce,
  throttle,
  fetchWordPressWithRetry,
  extractSlugFromUrl,
  sanitizeTitle,
  stripMarkdownCodeBlocks,
  extractJsonFromResponse,
  parseJsonWithAiRepair,
  processConcurrently,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  generateId,
  generateUUID,
  truncateText,
  escapeRegExp,
  toTitleCase,
  toSlug,
  stripHtmlTags,
  isValidUrl,
  normalizeUrl,
  extractDomain,
  getUrlParams,
  delay,
  deepClone,
  isEmptyObject,
  pick,
  omit,
  uniqueArray,
  chunkArray,
  shuffleArray,
  formatDateISO,
  getCurrentYear,
  daysBetween,
  clamp,
  formatNumber,
  roundTo,
};
