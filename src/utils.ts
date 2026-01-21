// =============================================================================
// SOTA WP CONTENT OPTIMIZER PRO - UTILITIES v12.0 (FIXED)
// Enterprise-Grade Utility Functions with Robust JSON Parsing
// =============================================================================

// ==================== DEBOUNCE ====================
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// ==================== RETRY WITH EXPONENTIAL BACKOFF ====================
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

      // Don't retry on non-retryable errors
      if (error.status === 400 || error.status === 401 || error.status === 403) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000);
      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
};

// ==================== WORDPRESS FETCH WITH RETRY ====================
export const fetchWordPressWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries: number = 3
): Promise<Response> => {
  return callAiWithRetry(
    async () => {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(60000), // 60 second timeout
      });

      if (!response.ok && response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }

      return response;
    },
    maxRetries,
    2000
  );
};

// ==================== SANITIZE TITLE ====================
export const sanitizeTitle = (title: string, slug?: string): string => {
  if (!title || title === 'undefined' || title === 'null') {
    if (slug) {
      return slug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim();
    }
    return 'Untitled';
  }

  return title
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
};

// ==================== EXTRACT SLUG FROM URL ====================
export const extractSlugFromUrl = (url: string): string => {
  if (!url) return '';

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/\/+$/, ''); // Remove trailing slashes
    const parts = pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || '';
  } catch {
    // If URL parsing fails, try to extract manually
    const parts = url.replace(/\/+$/, '').split('/');
    return parts[parts.length - 1] || '';
  }
};

// ==================== ROBUST JSON EXTRACTION (CRITICAL FIX) ====================
/**
 * Extracts JSON from AI response, handling markdown code blocks and other wrappers.
 * This is the CRITICAL FIX for the "Could not extract valid JSON" error.
 */
export const extractJsonFromResponse = (text: string): string => {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty or invalid response');
  }

  let cleaned = text.trim();

  // Step 1: Remove markdown code blocks (```json ... ``` or ``` ... ```)
  // This handles: ```json\n{...}\n``` and ```\n{...}\n```
  const codeBlockRegex = /^```(?:json|JSON|Javascript|javascript|JS|js)?\s*\n?([\s\S]*?)\n?```$/;
  const codeBlockMatch = cleaned.match(codeBlockRegex);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
    console.log('[JSON Extract] Removed markdown code block wrapper');
  }

  // Step 2: Handle inline code blocks (`{...}`)
  if (cleaned.startsWith('`') && cleaned.endsWith('`')) {
    cleaned = cleaned.slice(1, -1).trim();
    // Remove language identifier if present
    if (cleaned.toLowerCase().startsWith('json')) {
      cleaned = cleaned.slice(4).trim();
    }
    console.log('[JSON Extract] Removed inline code block');
  }

  // Step 3: Find JSON object or array boundaries
  const jsonStartObject = cleaned.indexOf('{');
  const jsonStartArray = cleaned.indexOf('[');

  let jsonStart = -1;
  let isArray = false;

  if (jsonStartObject === -1 && jsonStartArray === -1) {
    throw new Error('No JSON object or array found in response');
  } else if (jsonStartObject === -1) {
    jsonStart = jsonStartArray;
    isArray = true;
  } else if (jsonStartArray === -1) {
    jsonStart = jsonStartObject;
    isArray = false;
  } else {
    // Both exist, take the first one
    jsonStart = Math.min(jsonStartObject, jsonStartArray);
    isArray = jsonStartArray < jsonStartObject;
  }

  // Find the matching closing bracket
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  let depth = 0;
  let jsonEnd = -1;
  let inString = false;
  let escapeNext = false;

  for (let i = jsonStart; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === openBracket) {
        depth++;
      } else if (char === closeBracket) {
        depth--;
        if (depth === 0) {
          jsonEnd = i;
          break;
        }
      }
    }
  }

  if (jsonEnd === -1) {
    // Fallback: try to find the last occurrence of the closing bracket
    jsonEnd = cleaned.lastIndexOf(closeBracket);
    if (jsonEnd === -1 || jsonEnd < jsonStart) {
      throw new Error(`Unclosed JSON ${isArray ? 'array' : 'object'}`);
    }
  }

  const jsonString = cleaned.slice(jsonStart, jsonEnd + 1);

  // Step 4: Clean up common JSON issues
  let finalJson = jsonString
    // Fix trailing commas before closing brackets
    .replace(/,\s*([}\]])/g, '$1')
    // Fix single quotes to double quotes (careful with apostrophes)
    .replace(/({|\[|,)\s*'([^']+)'\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*?)'/g, ':"$1"')
    // Remove JavaScript-style comments
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Fix unquoted keys
    .replace(/(\{|\[|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  return finalJson;
};

// ==================== PARSE JSON WITH AI REPAIR ====================
export const parseJsonWithAiRepair = async (
  text: string,
  aiRepairer?: (brokenText: string) => Promise<string>
): Promise<any> => {
  // Step 1: Try to extract and parse directly
  try {
    const extracted = extractJsonFromResponse(text);
    const parsed = JSON.parse(extracted);
    console.log('[JSON Parse] Successfully parsed on first attempt');
    return parsed;
  } catch (firstError: any) {
    console.log('[JSON Parse] First attempt failed:', firstError.message);
  }

  // Step 2: Try more aggressive cleaning
  try {
    let cleaned = text
      .replace(/```(?:json|JSON)?\s*/g, '')
      .replace(/```/g, '')
      .trim();

    // Find JSON boundaries
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const start = firstBrace === -1 ? firstBracket :
                  firstBracket === -1 ? firstBrace :
                  Math.min(firstBrace, firstBracket);

    if (start !== -1) {
      const isArray = cleaned[start] === '[';
      const lastBracket = cleaned.lastIndexOf(isArray ? ']' : '}');

      if (lastBracket > start) {
        cleaned = cleaned.slice(start, lastBracket + 1);
        const parsed = JSON.parse(cleaned);
        console.log('[JSON Parse] Successfully parsed with aggressive cleaning');
        return parsed;
      }
    }
  } catch (secondError: any) {
    console.log('[JSON Parse] Second attempt failed:', secondError.message);
  }

  // Step 3: Use AI repairer if available
  if (aiRepairer) {
    try {
      console.log('[JSON Parse] Attempting AI repair...');
      const repairedText = await aiRepairer(text);
      const extracted = extractJsonFromResponse(repairedText);
      const parsed = JSON.parse(extracted);
      console.log('[JSON Parse] AI repair successful');
      return parsed;
    } catch (repairError: any) {
      console.error('[JSON Parse] AI repair failed:', repairError.message);
    }
  }

  // Step 4: Final fallback - return a default structure or throw
  const truncated = text.substring(0, 200).replace(/\n/g, ' ');
  throw new Error(
    `Could not extract valid JSON from AI response. ` +
    `Response starts with: "${truncated}..." ` +
    `(Total length: ${text.length} chars)`
  );
};

// ==================== CONCURRENT PROCESSING ====================
export const processConcurrently = async <T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  concurrency: number = 3,
  onProgress?: (current: number, total: number) => void,
  shouldStop?: () => boolean
): Promise<R[]> => {
  const results: R[] = [];
  const queue = [...items.map((item, index) => ({ item, index }))];
  let completed = 0;

  const worker = async (): Promise<void> => {
    while (queue.length > 0) {
      if (shouldStop?.()) break;

      const task = queue.shift();
      if (!task) break;

      try {
        const result = await processor(task.item, task.index);
        results[task.index] = result;
      } catch (error) {
        console.error(`[Concurrent] Error processing item ${task.index}:`, error);
        results[task.index] = null as any;
      }

      completed++;
      onProgress?.(completed, items.length);
    }
  };

  // Start concurrent workers
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);

  return results;
};

// ==================== LOCAL STORAGE HELPERS ====================
export const getStorageItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item);
  } catch {
    return defaultValue;
  }
};

export const setStorageItem = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('[Storage] Failed to save:', key, error);
  }
};

// ==================== GENERATE UNIQUE ID ====================
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// ==================== DELAY UTILITY ====================
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ==================== ESCAPE REGEX ====================
export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// ==================== URL VALIDATION ====================
export const isValidUrl = (string: string): boolean => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};

// ==================== TRUNCATE TEXT ====================
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// ==================== EXPORTS ====================
export default {
  debounce,
  callAiWithRetry,
  fetchWordPressWithRetry,
  sanitizeTitle,
  extractSlugFromUrl,
  extractJsonFromResponse,
  parseJsonWithAiRepair,
  processConcurrently,
  getStorageItem,
  setStorageItem,
  generateId,
  delay,
  escapeRegExp,
  isValidUrl,
  truncateText,
};
