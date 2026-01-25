/**
 * ============================================================================
 * ENTERPRISE-GRADE UTILITY FUNCTIONS
 * ============================================================================
 * 
 * @fileoverview Production-ready utility functions with robust error handling,
 * retry logic, JSON parsing, and comprehensive helper methods.
 * 
 * @version 2.0.0
 * @license MIT
 * @author Enterprise Solutions Team
 * 
 * Features:
 * - Exponential backoff retry logic
 * - Robust JSON parsing with AI repair fallback
 * - Concurrent processing with controlled parallelism
 * - Type-safe storage helpers
 * - Comprehensive string/URL/array/object utilities
 * 
 * ============================================================================
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: Error) => boolean;
}

export interface ConcurrencyOptions<T, R> {
  concurrency?: number;
  onProgress?: (current: number, total: number, item: T) => void;
  shouldStop?: () => boolean;
  onError?: (error: Error, item: T, index: number) => R | null;
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Executes an async function with exponential backoff retry logic.
 */
export const callAiWithRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = () => true,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      const statusCode = (error as { status?: number })?.status;
      if (statusCode === 401 || statusCode === 403) {
        throw err;
      }

      if (!shouldRetry(err)) {
        throw err;
      }

      if (attempt < maxRetries - 1) {
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.1 * exponentialDelay;
        const delay = Math.min(exponentialDelay + jitter, maxDelay);
        
        console.warn(
          `[callAiWithRetry] Attempt ${attempt + 1}/${maxRetries} failed. ` +
          `Retrying in ${Math.round(delay)}ms...`,
          err.message
        );
        
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
};

// ============================================================================
// DEBOUNCE & THROTTLE
// ============================================================================

export const debounce = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = <T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
};

// ============================================================================
// WORDPRESS UTILITIES
// ============================================================================

export const fetchWordPressWithRetry = async (
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
): Promise<Response> => {
  return callAiWithRetry(
    async () => {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
      
      if (!response.ok && response.status >= 500) {
        throw new Error(`WordPress API error: ${response.status}`);
      }
      
      return response;
    },
    { maxRetries, baseDelay: 1000 }
  );
};

// ============================================================================
// SLUG EXTRACTION
// ============================================================================

export const extractSlugFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/\//g, "/");
    const segments = pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || segments[segments.length - 2] || "";
  } catch {
    return url
      .replace(/\//g, "/")
      .split("/")
      .filter(Boolean)
      .pop() || url;
  }
};

// ============================================================================
// TITLE SANITIZATION
// ============================================================================

export const sanitizeTitle = (title: string, fallbackSlug?: string): string => {
  const trimmedTitle = title?.trim();
  
  if (!trimmedTitle || trimmedTitle === "Untitled" || trimmedTitle.startsWith("http")) {
    if (fallbackSlug) {
      return fallbackSlug
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    }
    return "Untitled Page";
  }
  
  return trimmedTitle;
};

// ============================================================================
// JSON PARSING - ENTERPRISE GRADE (WITH SAFE PARSE FIX)
// ============================================================================

/**
 * Strips markdown code block wrappers from AI responses.
 */
export const stripMarkdownCodeBlocks = (text: string): string => {
  if (!text || typeof text !== "string") return "";

  let cleaned = text.trim();

  const codeBlockStartRegex = /^```(?:json|JSON|javascript|Javascript|JS|js|typescript|ts|html|HTML)?\s*/;
  const codeBlockEndRegex = /```\s*$/;

  if (codeBlockStartRegex.test(cleaned)) {
    cleaned = cleaned.replace(codeBlockStartRegex, "");
  }

  if (codeBlockEndRegex.test(cleaned)) {
    cleaned = cleaned.replace(codeBlockEndRegex, "");
  }

  // Also remove any backticks that might cause "Unexpected token '`'" errors
  cleaned = cleaned.replace(/`/g, "'");

  return cleaned.trim();
};

/**
 * Finds balanced JSON structure in text using bracket matching.
 */
const findBalancedJson = (
  text: string,
  openChar: string,
  closeChar: string
): string | null => {
  const startIndex = text.indexOf(openChar);
  if (startIndex === -1) return null;

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === openChar) depth++;
      if (char === closeChar) depth--;

      if (depth === 0) {
        return text.substring(startIndex, i + 1);
      }
    }
  }

  const simpleRegex = new RegExp(
    `\\${openChar}[\\s\\S]*\\${closeChar}`
  );
  const match = text.match(simpleRegex);
  return match ? match[0] : null;
};

/**
 * Extracts JSON from potentially messy AI response text.
 */
export const extractJsonFromResponse = (response: string): string => {
  if (!response || typeof response !== "string") {
    throw new Error("Empty or invalid response");
  }

  let cleaned = response.trim();

  // Step 1: Strip markdown code blocks
  cleaned = stripMarkdownCodeBlocks(cleaned);

  // Step 2: Find JSON boundaries using balanced bracket matching
  const jsonObjectMatch = findBalancedJson(cleaned, "{", "}");
  const jsonArrayMatch = findBalancedJson(cleaned, "[", "]");

  // Determine which match to use based on position
  if (jsonObjectMatch && jsonArrayMatch) {
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

  return cleaned.trim();
};

/**
 * Cleans up common JSON formatting issues from AI responses.
 */
const cleanupJsonString = (jsonString: string): string => {
  let cleaned = jsonString;

  // Remove backticks (main cause of "Unexpected token '`'" error)
  cleaned = cleaned.replace(/`/g, "'");

  // Remove trailing commas before closing brackets
  cleaned = cleaned.replace(/,\s*]/g, "]");
  cleaned = cleaned.replace(/,\s*}/g, "}");

  // Fix unquoted property names
  cleaned = cleaned.replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  // Remove problematic control characters
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return cleaned;
};

/**
 * ✅ CRITICAL FIX: Safe synchronous JSON parser
 * Handles AI responses with backticks, markdown, and malformed JSON
 */
export const safeParseJSON = <T>(text: string, fallback?: T): T | null => {
  if (!text || typeof text !== "string") {
    console.warn("[safeParseJSON] Invalid input: not a string");
    return fallback ?? null;
  }

  // Step 1: Clean the text
  let cleaned = text.trim();
  cleaned = stripMarkdownCodeBlocks(cleaned);
  
  // Remove backticks that cause "Unexpected token '`'" errors
  cleaned = cleaned.replace(/`/g, "'");

  // Step 2: Try direct parse
  try {
    return JSON.parse(cleaned) as T;
  } catch (e1) {
    // Continue to extraction
  }

  // Step 3: Try extracting JSON object
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const extractedCleaned = cleanupJsonString(objectMatch[0]);
      return JSON.parse(extractedCleaned) as T;
    } catch (e2) {
      // Continue to array extraction
    }
  }

  // Step 4: Try extracting JSON array
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const extractedCleaned = cleanupJsonString(arrayMatch[0]);
      return JSON.parse(extractedCleaned) as T;
    } catch (e3) {
      // Continue to cleanup
    }
  }

  // Step 5: Try with cleanup
  try {
    const furtherCleaned = cleanupJsonString(cleaned);
    return JSON.parse(furtherCleaned) as T;
  } catch (e4) {
    // All attempts failed
  }

  console.error("[safeParseJSON] All parsing attempts failed");
  return fallback ?? null;
};

/**
 * Parses JSON with multiple fallback strategies and optional AI repair.
 */
export const parseJsonWithAiRepair = async <T = unknown>(
  responseText: string,
  aiRepairer?: (brokenText: string) => Promise<string>
): Promise<T> => {
  if (!responseText || typeof responseText !== "string") {
    throw new Error("Invalid response text for JSON parsing");
  }

  // Try synchronous safe parse first
  const quickResult = safeParseJSON<T>(responseText);
  if (quickResult !== null) {
    return quickResult;
  }

  // Step 1: Extract and clean JSON
  let cleanedJson: string;
  try {
    cleanedJson = extractJsonFromResponse(responseText);
  } catch {
    console.warn("[parseJsonWithAiRepair] Extraction failed, using raw text");
    cleanedJson = responseText.trim();
  }

  // Step 2: Direct parse attempt
  try {
    return JSON.parse(cleanedJson) as T;
  } catch (firstError) {
    console.warn("[parseJsonWithAiRepair] Direct parse failed, attempting cleanup...");
  }

  // Step 3: Parse with cleanup
  try {
    const furtherCleaned = cleanupJsonString(cleanedJson);
    return JSON.parse(furtherCleaned) as T;
  } catch (secondError) {
    console.warn("[parseJsonWithAiRepair] Cleanup parse failed, trying AI repair...");
  }

  // Step 4: AI repair as last resort
  if (aiRepairer) {
    try {
      const repairedText = await aiRepairer(cleanedJson);
      const repairedCleaned = extractJsonFromResponse(repairedText);
      return JSON.parse(repairedCleaned) as T;
    } catch (repairError) {
      console.error("[parseJsonWithAiRepair] AI repair failed:", repairError);
    }
  }

  const preview = responseText.substring(0, 200).replace(/\n/g, " ");
  throw new Error(
    `JSON parsing failed after all attempts. ` +
    `Response preview: "${preview}..." ` +
    `(Length: ${responseText.length} chars)`
  );
};

// ============================================================================
// CONCURRENT PROCESSING
// ============================================================================

export const processConcurrently = async <T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: ConcurrencyOptions<T, R> = {}
): Promise<R[]> => {
  const {
    concurrency = 3,
    onProgress,
    shouldStop,
    onError,
  } = options;

  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  let completedCount = 0;
  const total = items.length;

  const processNext = async (): Promise<void> => {
    while (currentIndex < items.length) {
      if (shouldStop?.()) {
        console.log("[processConcurrently] Stop signal received, halting...");
        break;
      }

      const index = currentIndex++;
      const item = items[index];

      try {
        const result = await processor(item, index);
        results[index] = result;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(`[processConcurrently] Error at index ${index}:`, err.message);
        
        if (onError) {
          const fallback = onError(err, item, index);
          results[index] = fallback as R;
        } else {
          results[index] = null as R;
        }
      }

      completedCount++;
      onProgress?.(completedCount, total, item);
    }
  };

  const workerCount = Math.min(concurrency, items.length);
  const workers = Array.from({ length: workerCount }, () => processNext());
  await Promise.all(workers);

  return results;
};

// ============================================================================
// STORAGE HELPERS
// ============================================================================

export const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (item === null || item === undefined) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`[getStorageItem] Parse error for "${key}":`, error);
    return defaultValue;
  }
};

export const setStorageItem = <T>(key: string, value: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[setStorageItem] Failed to save "${key}":`, error);
    return false;
  }
};

export const removeStorageItem = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[removeStorageItem] Failed to remove "${key}":`, error);
    return false;
  }
};

// ============================================================================
// ID GENERATION
// ============================================================================

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

export const generateUUID = (): string => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ============================================================================
// TEXT UTILITIES
// ============================================================================

export const truncateText = (
  text: string,
  maxLength: number,
  ellipsis: string = "..."
): string => {
  if (!text || text.length <= maxLength) return text || "";
  return text.substring(0, maxLength - ellipsis.length) + ellipsis;
};

export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const toTitleCase = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const toSlug = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const stripHtmlTags = (html: string): string => {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
};

export const decodeHtmlEntities = (text: string): string => {
  if (!text) return "";
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": " ",
  };
  return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
};

// ============================================================================
// URL UTILITIES
// ============================================================================

export const isValidUrl = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const normalizeUrl = (url: string): string => {
  let normalized = url.trim();

  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = "https://" + normalized;
  }

  if (normalized.endsWith("/") && normalized.split("/").length > 4) {
    normalized = normalized.replace(/\/$/, "");
  }

  return normalized;
};

export const extractDomain = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

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

export const buildUrl = (
  baseUrl: string,
  params: Record<string, string | number | boolean>
): string => {
  const url = new URL(baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

// ============================================================================
// ASYNC UTILITIES
// ============================================================================

export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = "Operation timed out"
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
};

// ============================================================================
// OBJECT UTILITIES
// ============================================================================

export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== "object") return obj;
  
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(obj);
    } catch {
      // Fall through to JSON method
    }
  }
  
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return obj;
  }
};

export const isEmptyObject = (obj: Record<string, unknown>): boolean => {
  return obj !== null && typeof obj === "object" && Object.keys(obj).length === 0;
};

export const pick = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
  });
  return result;
};

export const omit = <T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach((key) => {
    delete result[key];
  });
  return result;
};

export const deepMerge = <T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T => {
  if (!sources.length) return target;
  
  const source = sources.shift();
  if (!source) return target;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue &&
        typeof sourceValue === "object" &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === "object" &&
        !Array.isArray(targetValue)
      ) {
        target[key] = deepMerge(
          { ...targetValue } as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        target[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return deepMerge(target, ...sources);
};

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

export const uniqueArray = <T>(arr: T[]): T[] => {
  return [...new Set(arr)];
};

export const uniqueByKey = <T extends Record<string, unknown>>(
  arr: T[],
  key: keyof T
): T[] => {
  const seen = new Set();
  return arr.filter((item) => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

export const chunkArray = <T>(arr: T[], size: number): T[][] => {
  if (size <= 0) return [arr];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

export const shuffleArray = <T>(arr: T[]): T[] => {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const groupBy = <T, K extends string | number | symbol>(
  arr: T[],
  keyFn: (item: T) => K
): Record<K, T[]> => {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
};

// ============================================================================
// DATE UTILITIES
// ============================================================================

export const formatDateISO = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

export const getCurrentYear = (): number => {
  return new Date().getFullYear();
};

export const daysBetween = (date1: Date, date2: Date): number => {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
};

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return formatDateISO(date) === formatDateISO(today);
};

export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  
  return formatDateISO(date);
};

// ============================================================================
// NUMBER UTILITIES
// ============================================================================

export const clamp = (num: number, min: number, max: number): number => {
  return Math.min(Math.max(num, min), max);
};

export const formatNumber = (num: number, locale: string = "en-US"): string => {
  return num.toLocaleString(locale);
};

export const roundTo = (num: number, decimals: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isNullish = (value: unknown): value is null | undefined => {
  return value === null || value === undefined;
};

export const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  callAiWithRetry,
  debounce,
  throttle,
  delay,
  withTimeout,
  fetchWordPressWithRetry,
  extractSlugFromUrl,
  sanitizeTitle,
  stripMarkdownCodeBlocks,
  extractJsonFromResponse,
  parseJsonWithAiRepair,
  safeParseJSON,
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
  decodeHtmlEntities,
  isValidUrl,
  normalizeUrl,
  extractDomain,
  getUrlParams,
  buildUrl,
  deepClone,
  isEmptyObject,
  pick,
  omit,
  deepMerge,
  uniqueArray,
  uniqueByKey,
  chunkArray,
  shuffleArray,
  groupBy,
  formatDateISO,
  getCurrentYear,
  daysBetween,
  isToday,
  formatRelativeTime,
  clamp,
  formatNumber,
  roundTo,
  formatBytes,
  isValidEmail,
  isNullish,
  isNonEmptyString,
};
