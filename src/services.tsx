// =============================================================================
// SOTA WP CONTENT OPTIMIZER PRO - SERVICES v12.0
// Enterprise-Grade AI Services, Content Generation & God Mode Engine
// =============================================================================

import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

import { PROMPT_TEMPLATES, buildPrompt } from './prompts';
import {
  AI_MODELS,
  BLOCKED_REFERENCE_DOMAINS,
  BLOCKED_SPAM_DOMAINS,
  PROCESSING_LIMITS,
  TARGET_MIN_WORDS,
  TARGET_MAX_WORDS,
  MIN_INTERNAL_LINKS,
  MAX_INTERNAL_LINKS,
  REFERENCE_CATEGORIES
} from './constants';
import {
  ContentItem,
  GeneratedContent,
  SitemapPage,
  ExpandedGeoTargeting,
  ApiClients,
  GenerationContext,
  GapAnalysisSuggestion,
  WpConfig,
  ImageDetail
} from './types';
import {
  fetchWithProxies,
  smartCrawl,
  countWords,
  normalizeGeneratedContent,
  generateVerificationFooterHtml,
  performSurgicalUpdate,
  getGuaranteedYoutubeVideos,
  generateYoutubeEmbedHtml,
  isBlockedDomain,
  sanitizeContentHtml,
  removeDuplicateSections,
  processInternalLinkCandidates,
  extractImagesFromHtml,
  injectImagesIntoContent
} from './contentUtils';
import {
  extractSlugFromUrl,
  sanitizeTitle,
  processConcurrently,
  delay
} from './utils';
import { generateFullSchema } from './schema-generator';
import { fetchNeuronTerms } from './neuronwriter';


// HOTFIX: Clean AI Response helper
const cleanAIResponse = (response: string, expectedFormat: 'json' | 'html' = 'json'): string => {
  if (!response || typeof response !== 'string') return response;

  let cleaned = response.trim();

  if (expectedFormat === 'json') {
    // Remove markdown code blocks
    const codeBlockMatch = cleaned.match(/^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?```$/);
    if (codeBlockMatch) {
      cleaned = codeBlockMatch[1].trim();
    }

    // Handle partial code blocks
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '');
    }
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '');
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.replace(/\s*```$/, '');
    }
  }

  return cleaned;
};



function extractJsonFromResponse(response) {
  if (!response || typeof response !== 'string') {
    throw new Error('Empty response');
  }
  
  var trimmed = response.trim();
  
  if (trimmed.charAt(0) === '{' || trimmed.charAt(0) === '[') {
    return trimmed;
  }
  
  var match = trimmed.match(/```(?:json)?\s*\n?([\s\S]+?)\n?```/);
  if (match && match.length > 1) {
    var inside = match[1];
    if (inside) {
      var cleaned = inside.trim();
      if (cleaned.charAt(0) === '{' || cleaned.charAt(0) === '[') {
        return cleaned;
      }
    }
  }
  
  var bracePos = trimmed.indexOf('{');
  var bracketPos = trimmed.indexOf('[');
  var startPos = -1;
  var endChar = '}';
  
  if (bracePos !== -1 && (bracketPos === -1 || bracePos < bracketPos)) {
    startPos = bracePos;
    endChar = '}';
  } else if (bracketPos !== -1) {
    startPos = bracketPos;
    endChar = ']';
  }
  
  if (startPos !== -1) {
    var endPos = trimmed.lastIndexOf(endChar);
    if (endPos > startPos) {
      return trimmed.substring(startPos, endPos + 1);
    }
  }
  
  throw new Error('Cannot extract JSON: ' + trimmed.substring(0, 80));
}

function safeJsonParse(response, context) {
  try {
    var jsonStr = extractJsonFromResponse(response);
    return safeJsonParse(jsonStr);
  } catch (err) {
    console.error('JSON parse failed (' + context + '):', err);
    console.error('Response preview:', response ? response.substring(0, 300) : 'null');
    throw err;
  }
}

// ADD THIS NEAR THE TOP OF services.tsx (after imports)

/**
 * Sanitizes AI response by removing markdown code blocks
 */
const sanitizeAIResponse = (response: string, format: 'json' | 'html'): string => {
  if (!response || typeof response !== 'string') return '';
  
  let cleaned = response.trim();
  
  if (format === 'json') {
    // Remove markdown code blocks
    if (cleaned.startsWith('```json') || cleaned.startsWith('```JSON')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    
    cleaned = cleaned.trim();
    
    // Try to extract JSON boundaries
    const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/);
    const jsonArrayMatch = cleaned.match(/\[[\s\S]*\]/);
    
    if (jsonObjectMatch && jsonArrayMatch) {
      const objectIndex = cleaned.indexOf(jsonObjectMatch[0]);
      const arrayIndex = cleaned.indexOf(jsonArrayMatch[0]);
      cleaned = objectIndex < arrayIndex ? jsonObjectMatch[0] : jsonArrayMatch[0];
    } else if (jsonObjectMatch) {
      cleaned = jsonObjectMatch[0];
    } else if (jsonArrayMatch) {
      cleaned = jsonArrayMatch[0];
    }
  }
  
  if (format === 'html') {
    // Remove markdown html blocks
    if (cleaned.startsWith('```html') || cleaned.startsWith('```HTML')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
  }
  
  return cleaned.trim();
};



// =============================================================================
// SECTION 1: SOTA JSON EXTRACTION - ENTERPRISE GRADE ERROR HANDLING
// =============================================================================

/**
 * Safely extracts JSON from AI responses that may contain markdown or text wrapping.
 * Handles: ```json blocks, raw JSON, JSON within text, and error responses.
 *
 * @param response - Raw response string from AI or API
 * @returns Extracted JSON string ready for parsing
 * @throws Error with descriptive message if extraction fails
 */
const extractJsonFromResponse = (response: string): string => {
  if (!response || typeof response !== 'string') {
    throw new Error('Empty or invalid response received from AI service');
  }

  const trimmed = response.trim();

  // Case 1: Already valid JSON (starts with { or [)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  // Case 2: Markdown code block with json/JSON tag
  const jsonBlockRegex = /(?:json|JSON)?\s*\n?([\s\S]+?)\n?/;
  const jsonBlockMatch = trimmed.match(jsonBlockRegex);

  if (jsonBlockMatch && jsonBlockMatch[1]) {
    const extracted = jsonBlockMatch[1].trim();
    // Verify it looks like JSON
    if (extracted.startsWith('{') || extracted.startsWith('[')) {
      return extracted;
    }
  }

  // Case 3: Try to find JSON object/array anywhere in the text
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');

  let startIndex = -1;
  let isObject = true;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    isObject = true;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    isObject = false;
  }

  if (startIndex !== -1) {
    const endChar = isObject ? '}' : ']';
    const lastEnd = trimmed.lastIndexOf(endChar);

    if (lastEnd > startIndex) {
      const extracted = trimmed.substring(startIndex, lastEnd + 1);
      // Validate it parses
      try {
        safeJsonParse(extracted);
        return extracted;
      } catch {
        // Fall through to error handling
      }
    }
  }

  // Case 4: Check for common error responses
  const errorPatterns = [
    { pattern: /^Bad Request/i, msg: 'API returned Bad Request' },
    { pattern: /^Blocked/i, msg: 'Request was blocked' },
    { pattern: /^Error/i, msg: 'API returned an error' },
    { pattern: /^<!DOCTYPE/i, msg: 'API returned HTML instead of JSON' },
    { pattern: /^<html/i, msg: 'API returned HTML page' },
    { pattern: /^Unauthorized/i, msg: 'Authentication failed' },
    { pattern: /^Forbidden/i, msg: 'Access forbidden' },
    { pattern: /^Not Found/i, msg: 'Resource not found' },
    { pattern: /^Internal Server Error/i, msg: 'Server error' },
    { pattern: /^Rate limit/i, msg: 'Rate limit exceeded' },
  ];

  for (const { pattern, msg } of errorPatterns) {
    if (pattern.test(trimmed)) {
      throw new Error(`${msg}: "${trimmed.substring(0, 100)}..."`);
    }
  }

  // Case 5: AI conversational prefix - try harder to find JSON
  const conversationalPrefixes = [
    /^Based on/i,
    /^Here(?:'s| is)/i,
    /^Below/i,
    /^The following/i,
    /^I(?:'ve| have)/i,
    /^Let me/i,
    /^Sure/i,
    /^Certainly/i,
  ];

  for (const prefix of conversationalPrefixes) {
    if (prefix.test(trimmed)) {
      // Find first { or [ after the prefix
      const afterPrefix = trimmed.substring(20); // Skip prefix
      const braceIdx = afterPrefix.indexOf('{');
      const bracketIdx = afterPrefix.indexOf('[');

      let jsonStartIdx = -1;
      let endChar = '}';

      if (braceIdx !== -1 && (bracketIdx === -1 || braceIdx < bracketIdx)) {
        jsonStartIdx = braceIdx + 20;
        endChar = '}';
      } else if (bracketIdx !== -1) {
        jsonStartIdx = bracketIdx + 20;
        endChar = ']';
      }

      if (jsonStartIdx !== -1) {
        const lastEnd = trimmed.lastIndexOf(endChar);
        if (lastEnd > jsonStartIdx) {
          return trimmed.substring(jsonStartIdx, lastEnd + 1);
        }
      }
    }
  }

  // Final: Cannot extract - throw descriptive error
  throw new Error(
    `Could not extract valid JSON from AI response. Response starts with: "${trimmed.substring(0, 80)}..." (Length: ${trimmed.length} chars)`
  );
};

/**
 * Safe JSON parse with extraction and context-aware error messages.
 */
const safeJsonParse = <T = unknown>(response: string, context: string = 'Unknown'): T => {
  try {
    const jsonString = extractJsonFromResponse(response);
    return safeJsonParse(jsonString) as T;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[safeJsonParse] Context: ${context}`);
    console.error(`[safeJsonParse] Error: ${errMsg}`);
    console.error(`[safeJsonParse] Response preview: ${response?.substring(0, 500)}`);
    throw new Error(`JSON parse failed (${context}): ${errMsg}`);
  }
};

/**
 * Sanitizes AI-generated HTML by removing markdown artifacts.
 */
const surgicalSanitizer = (html: string): string => {
  if (!html || typeof html !== 'string') return '';

  return html
    .replace(/^html\s*\n?/gi, '')
    .replace(/\n?\s*$/gi, '')
    .replace(/^```\s*\n?/gi, '')
    .replace(/^(?:Here(?:'s| is) the|Below is|The following)[^<]*</i, '<')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// =============================================================================
// SECTION 2: AI CLIENT WRAPPER - MULTI-PROVIDER SUPPORT
// =============================================================================

export const callAI = async (
  apiClients: ApiClients,
  selectedModel: string,
  geoTargeting: ExpandedGeoTargeting,
  openrouterModels: string[],
  selectedGroqModel: string,
  promptKey: keyof typeof PROMPT_TEMPLATES | string,
  args: unknown[],
  format: 'json' | 'html' = 'json',
  useGrounding: boolean = false
): Promise<string> => {
  // Get prompt template
  const promptTemplate = PROMPT_TEMPLATES[promptKey as keyof typeof PROMPT_TEMPLATES];
  if (!promptTemplate) {
    throw new Error(`Unknown prompt template: ${promptKey}`);
  }

  const systemInstruction = promptTemplate.systemInstruction;
  const userPrompt = typeof promptTemplate.userPrompt === 'function' 
    ? (promptTemplate.userPrompt as (...a: unknown[]) => string)(...args) 
    : promptTemplate.userPrompt;

  // Add geo-targeting context if enabled
  let enhancedPrompt = userPrompt;
  if (geoTargeting.enabled && geoTargeting.location) {
    enhancedPrompt = `[GEO-TARGET: ${geoTargeting.location}, ${geoTargeting.region}, ${geoTargeting.country}]\n\n${userPrompt}`;
  }

  // Build fallback chain
  const modelPriority = [selectedModel];
  if (selectedModel !== 'gemini' && apiClients.gemini) modelPriority.push('gemini');
  if (selectedModel !== 'openai' && apiClients.openai) modelPriority.push('openai');
  if (selectedModel !== 'anthropic' && apiClients.anthropic) modelPriority.push('anthropic');
  if (selectedModel !== 'openrouter' && apiClients.openrouter) modelPriority.push('openrouter');
  if (selectedModel !== 'groq' && apiClients.groq) modelPriority.push('groq');

  let lastError: Error | null = null;

  for (const modelKey of modelPriority) {
    const client = apiClients[modelKey as keyof ApiClients];
    if (!client) continue;

    try {
      let response: string;

      switch (modelKey) {
        case 'gemini':
          response = await callGemini(
            client as GoogleGenAI,
            systemInstruction,
            enhancedPrompt,
            format,
            useGrounding
          );
          break;

        case 'openai':
          response = await callOpenAI(
            client as OpenAI,
            systemInstruction,
            enhancedPrompt,
            format
          );
          break;

        case 'anthropic':
          response = await callAnthropic(
            client as Anthropic,
            systemInstruction,
            enhancedPrompt,
            format
          );
          break;

        case 'openrouter':
          response = await callOpenRouter(
            client as OpenAI,
            systemInstruction,
            enhancedPrompt,
            openrouterModels,
            format
          );
          break;

        case 'groq':
          response = await callGroq(
            client as OpenAI,
            systemInstruction,
            enhancedPrompt,
            selectedGroqModel,
            format
          );
          break;

        default:
          continue;
      }

      // For HTML format, just sanitize and return
      if (format === 'html') {
        return surgicalSanitizer(response);
      }

      // For JSON format, validate extraction works (but return raw)
      try {
        extractJsonFromResponse(response);
      } catch (e) {
        console.warn(`[callAI] ${modelKey} returned invalid JSON, trying next...`);
        lastError = e as Error;
        continue;
      }

      return response;

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[callAI] ${modelKey} failed:`, errMsg);
      lastError = error instanceof Error ? error : new Error(errMsg);
      continue;
    }
  }

  throw lastError || new Error('All AI providers failed. Check API keys.');
};

// =============================================================================
// SECTION 3: INDIVIDUAL AI PROVIDER IMPLEMENTATIONS
// =============================================================================

async function callGemini(
  client: GoogleGenAI,
  systemInstruction: string,
  userPrompt: string,
  format: 'json' | 'html',
  useGrounding: boolean
): Promise<string> {
  const model = AI_MODELS.GEMINI_FLASH;
  const generationConfig: Record<string, unknown> = {
    temperature: format === 'json' ? 0.3 : 0.7,
    topP: 0.95,
    maxOutputTokens: 16384,
  };

  if (format === 'json') {
    generationConfig.responseMimeType = 'application/json';
  }

  const response = await client.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction,
      ...generationConfig,
      ...(useGrounding && { tools: [{ googleSearch: {} }] }),
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini returned empty response');
  }
  return text;
}

async function callOpenAI(
  client: OpenAI,
  systemInstruction: string,
  userPrompt: string,
  format: 'json' | 'html'
): Promise<string> {
  const response = await client.chat.completions.create({
    model: AI_MODELS.OPENAI_GPT4_TURBO,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt },
    ],
    temperature: format === 'json' ? 0.3 : 0.7,
    max_tokens: 16384,
    ...(format === 'json' && { response_format: { type: 'json_object' } }),
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error('OpenAI returned empty response');
  }
  return text;
}

async function callAnthropic(
  client: Anthropic,
  systemInstruction: string,
  userPrompt: string,
  format: 'json' | 'html'
): Promise<string> {
  const response = await client.messages.create({
    model: AI_MODELS.ANTHROPIC_SONNET,
    system: systemInstruction,
    messages: [{ role: 'user', content: userPrompt }],
    max_tokens: 16384,
    temperature: format === 'json' ? 0.3 : 0.7,
  });

  const textBlock = response.content.find(
    (block: { type: string }) => block.type === 'text'
  );
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Anthropic returned no text content');
  }
  return (textBlock as { type: 'text'; text: string }).text;
}

async function callOpenRouter(
  client: OpenAI,
  systemInstruction: string,
  userPrompt: string,
  models: string[],
  format: 'json' | 'html'
): Promise<string> {
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt },
        ],
        temperature: format === 'json' ? 0.3 : 0.7,
        max_tokens: 16384,
      });

      const text = response.choices[0]?.message?.content;
      if (text) return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[OpenRouter] ${model} failed, trying next...`);
      continue;
    }
  }
  throw lastError || new Error('All OpenRouter models failed');
}

async function callGroq(
  client: OpenAI,
  systemInstruction: string,
  userPrompt: string,
  model: string,
  format: 'json' | 'html'
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt },
    ],
    temperature: format === 'json' ? 0.3 : 0.7,
    max_tokens: 32768,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error('Groq returned empty response');
  }
  return text;
}

// =============================================================================
// SECTION 4: REFERENCE VALIDATION ENGINE
// =============================================================================

/**
 * Detects content category from keywords for topic-aware reference search.
 */
function detectCategory(keyword: string, semanticKeywords: string[]): string {
  const allKeywords = [keyword, ...semanticKeywords].join(' ').toLowerCase();

  const categoryPatterns: Record<string, string[]> = {
    health: ['health', 'medical', 'disease', 'treatment', 'symptom', 'doctor', 'patient', 'diagnosis'],
    fitness: ['fitness', 'workout', 'exercise', 'gym', 'training', 'muscle', 'cardio', 'running'],
    nutrition: ['nutrition', 'diet', 'food', 'calorie', 'protein', 'vitamin', 'meal', 'weight loss'],
    technology: ['software', 'app', 'programming', 'code', 'developer', 'tech', 'computer', 'ai'],
    business: ['business', 'startup', 'entrepreneur', 'marketing', 'sales', 'revenue', 'investment'],
    science: ['research', 'study', 'scientific', 'experiment', 'data', 'analysis', 'journal'],
  };

  let bestCategory = 'general';
  let bestScore = 0;

  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    const score = patterns.filter(p => allKeywords.includes(p)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

/**
 * Generates beautiful reference section HTML.
 */
function generateReferenceHTML(
  links: Array<{ title: string; url: string; source: string; category: string }>,
  category: string
): string {
  const linksHtml = links
    .map(
      (link) => `
      <li style="margin-bottom: 1rem; padding: 1rem; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <a href="${link.url}" target="_blank" rel="noopener noreferrer" style="color: #1e40af; font-weight: 600; text-decoration: none; display: block; margin-bottom: 0.25rem;">
          ${link.title}
        </a>
        <span style="font-size: 0.85rem; color: #64748b;">${link.source}</span>
        <span style="display: inline-block; margin-left: 0.5rem; padding: 2px 8px; background: #e0f2fe; color: #0369a1; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
          ✅ Verified
        </span>
      </li>
    `
    )
    .join('');

  return `
    <div class="sota-references-section" style="margin-top: 3rem; padding: 2rem; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 16px; border: 1px solid #cbd5e1;">
      <h2 style="margin: 0 0 1.5rem 0; font-size: 1.5rem; color: #1e293b;">
        📚 Trusted References & Further Reading
      </h2>
      <p style="margin-bottom: 1rem; color: #64748b; font-size: 0.9rem;">
        All sources verified and accessible (200 status). Category: ${category.charAt(0).toUpperCase() + category.slice(1)}
      </p>
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${linksHtml}
      </ul>
    </div>`;
}

/**
 * Fetch and validate references with category-aware search.
 */
export const fetchVerifiedReferences = async (
  keyword: string,
  semanticKeywords: string[],
  serperApiKey: string,
  wpUrl?: string
): Promise<string> => {
  if (!serperApiKey) {
    console.warn('[fetchVerifiedReferences] No Serper API key provided');
    return '';
  }

  try {
    const category = detectCategory(keyword, semanticKeywords);
    const categoryConfig = REFERENCE_CATEGORIES[category as keyof typeof REFERENCE_CATEGORIES];
    const currentYear = new Date().getFullYear();

    let userDomain = '';
    if (wpUrl) {
      try {
        userDomain = new URL(wpUrl).hostname.replace('www.', '');
      } catch {
        // Invalid URL, ignore
      }
    }

    let query: string;
    if (categoryConfig) {
      const modifiers = categoryConfig.searchModifiers.slice(0, 2).join(' OR ');
      const domainFilters = categoryConfig.authorityDomains
        .slice(0, 3)
        .map((d: string) => `site:${d}`)
        .join(' OR ');
      query = `${keyword} "${modifiers}" (${domainFilters}) ${currentYear}`;
    } else {
      query = `${keyword} "research" "data" ${currentYear} -site:youtube.com -site:reddit.com`;
    }

    const response = await fetchWithProxies('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 20 }),
    });

    const responseText = await response.text();
    let data: { organic?: Array<{ link: string; title?: string }> };

    try {
      data = safeJsonParse(responseText, 'Serper API Response');
    } catch {
      console.error('[fetchVerifiedReferences] Serper response parse error');
      return '';
    }

    const potentialLinks = data.organic || [];
    const validLinks: Array<{
      title: string;
      url: string;
      source: string;
      category: string;
    }> = [];

    for (const link of potentialLinks) {
      if (validLinks.length >= 8) break;

      try {
        const urlObj = new URL(link.link);
        const domain = urlObj.hostname.replace('www.', '').toLowerCase();

        if (userDomain && domain.includes(userDomain)) continue;
        if (isBlockedDomain(link.link)) continue;
        if (BLOCKED_SPAM_DOMAINS.some(spam => domain.includes(spam))) continue;

        const checkRes = await Promise.race([
          fetchWithProxies(link.link, {
            method: 'HEAD',
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
          }),
          new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 5000)
          ),
        ]) as Response;

        if (checkRes.status === 200) {
          validLinks.push({
            title: link.title || 'Reference',
            url: link.link,
            source: domain,
            category,
          });
        }
      } catch {
        continue;
      }
    }

    if (validLinks.length === 0) return '';

    return generateReferenceHTML(validLinks, category, keyword);
  } catch (e) {
    console.error('[fetchVerifiedReferences] Error:', e);
    return '';
  }
};

// =============================================================================
// SECTION 5: CONTENT GENERATION ENGINE
// =============================================================================

export const generateContent = {
  /**
   * Generate items (articles) from content plan.
   */
  async generateItems(
    items: ContentItem[],
    callAIFn: (promptKey: string, args: unknown[], format?: 'json' | 'html', grounding?: boolean) => Promise<string>,
    generateImageFn: (prompt: string) => Promise<string | null>,
    context: GenerationContext,
    onProgress: (progress: { current: number; total: number }) => void,
    stopRef: React.MutableRefObject<Set<string>>
  ): Promise<void> {
    const { existingPages, siteInfo, wpConfig, geoTargeting, serperApiKey, neuronConfig } = context;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (stopRef.current.has(item.id)) {
        context.dispatch({
          type: 'UPDATE_STATUS',
          payload: { id: item.id, status: 'idle', statusText: 'Stopped' },
        });
        continue;
      }

      onProgress({ current: i + 1, total: items.length });

      context.dispatch({
        type: 'UPDATE_STATUS',
        payload: { id: item.id, status: 'generating', statusText: 'Researching...' },
      });

      try {
        // Step 1: Generate semantic keywords
        context.dispatch({
          type: 'UPDATE_STATUS',
          payload: { id: item.id, status: 'generating', statusText: 'Generating keywords...' },
        });

        const keywordsResponse = await callAIFn('semantic_keyword_generator', [item.title], 'json');
        const { semanticKeywords } = safeJsonParse<{ semanticKeywords: string[] }>(
          keywordsResponse,
          'semantic_keyword_generator'
        );

        // Step 2: Fetch NeuronWriter terms if enabled
        let neuronData: string | null = null;
        if (neuronConfig?.enabled && neuronConfig.apiKey && neuronConfig.projectId) {
          context.dispatch({
            type: 'UPDATE_STATUS',
            payload: { id: item.id, status: 'generating', statusText: 'Fetching NLP terms...' },
          });
          try {
            const neuronTerms = await fetchNeuronTerms(
              neuronConfig.apiKey,
              neuronConfig.projectId,
              item.title
            );
            if (neuronTerms) {
              neuronData = Object.entries(neuronTerms)
                .map(([key, val]) => `${key}: ${val}`)
                .join('\n');
            }
          } catch (e) {
            console.warn('[NeuronWriter] Failed to fetch terms:', e);
          }
        }

        // Step 3: Analyze competitors
        let serpData: unknown[] = [];
        let competitorGaps: string[] = [];

        if (serperApiKey) {
          context.dispatch({
            type: 'UPDATE_STATUS',
            payload: { id: item.id, status: 'generating', statusText: 'Analyzing competitors...' },
          });

          try {
            const serpResponse = await fetchWithProxies('https://google.serper.dev/search', {
              method: 'POST',
              headers: {
                'X-API-KEY': serperApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ q: item.title, num: 10 }),
            });

            const serpText = await serpResponse.text();
            const serpJson = safeJsonParse<{ organic?: unknown[] }>(serpText, 'Serper SERP Data');
            serpData = serpJson.organic || [];

            const gapResponse = await callAIFn(
              'competitor_gap_analyzer',
              [item.title, (serpData as unknown[]).slice(0, 5)],
              'json'
            );
            const gapResult = safeJsonParse<{ gaps: string[] }>(gapResponse, 'competitor_gap_analyzer');
            competitorGaps = gapResult.gaps || [];
          } catch (e) {
            console.warn('[generateItems] SERP analysis failed:', e);
          }
        }

        // Step 4: Generate content strategy
        context.dispatch({
          type: 'UPDATE_STATUS',
          payload: { id: item.id, status: 'generating', statusText: 'Planning strategy...' },
        });

        const strategyResponse = await callAIFn(
          'content_strategy_generator',
          [item.title, semanticKeywords, serpData, item.type],
          'json'
        );
        const strategy = safeJsonParse<Record<string, unknown>>(strategyResponse, 'content_strategy_generator');

        // Step 5: Generate main content
        context.dispatch({
          type: 'UPDATE_STATUS',
          payload: { id: item.id, status: 'generating', statusText: 'Writing content...' },
        });

        const contentResponse = await callAIFn(
          'ultra_sota_article_writer',
          [
            item.title,
            semanticKeywords,
            strategy,
            existingPages.slice(0, 50),
            competitorGaps,
            geoTargeting.enabled ? geoTargeting.location : null,
            neuronData,
          ],
          'html'
        );

        let generatedHtml = surgicalSanitizer(contentResponse);

        // Step 6: Generate SEO metadata
        context.dispatch({
          type: 'UPDATE_STATUS',
          payload: { id: item.id, status: 'generating', statusText: 'Optimizing SEO...' },
        });

        const metaResponse = await callAIFn(
          'seo_metadata_generator',
          [
            item.title,
            generatedHtml.substring(0, 1000),
            (strategy as { targetAudience?: string }).targetAudience || 'General',
            (serpData as Array<{ title?: string }>).map((s) => s.title).slice(0, 5),
            geoTargeting.enabled ? geoTargeting.location : null,
          ],
          'json'
        );
        const { seoTitle, metaDescription, slug } = safeJsonParse<{
          seoTitle: string;
          metaDescription: string;
          slug: string;
        }>(metaResponse, 'seo_metadata_generator');

        // Step 7: Generate FAQ section
        context.dispatch({
          type: 'UPDATE_STATUS',
          payload: { id: item.id, status: 'generating', statusText: 'Creating FAQ...' },
        });

        const faqResponse = await callAIFn('sota_faq_generator', [item.title, semanticKeywords], 'html');
        const faqHtml = surgicalSanitizer(faqResponse);

        // Step 8: Generate key takeaways
        const takeawaysResponse = await callAIFn(
          'sota_takeaways_generator',
          [item.title, generatedHtml],
          'html'
        );
        const takeawaysHtml = surgicalSanitizer(takeawaysResponse);

        // Step 9: Generate references
        context.dispatch({
          type: 'UPDATE_STATUS',
          payload: { id: item.id, status: 'generating', statusText: 'Validating references...' },
        });

        const referencesHtml = await fetchVerifiedReferences(
          item.title,
          semanticKeywords,
          serperApiKey,
          wpConfig.url
        );

        // Step 10: Add YouTube videos
        let videosHtml = '';
        if (serperApiKey) {
          const videos = await getGuaranteedYoutubeVideos(item.title, serperApiKey, 2);
          videosHtml = generateYoutubeEmbedHtml(videos);
        }

        // Step 11: Process internal links
        generatedHtml = processInternalLinkCandidates(
          generatedHtml,
          existingPages.map((p) => ({ title: p.title, slug: p.slug })),
          wpConfig.url,
          MAX_INTERNAL_LINKS
        );

        // Step 12: Assemble final content
        const verificationFooter = generateVerificationFooterHtml();

        const finalContent = performSurgicalUpdate(generatedHtml, {
          keyTakeawaysHtml: takeawaysHtml,
          faqHtml,
          referencesHtml,
        });

        let cleanContent = removeDuplicateSections(finalContent);
        cleanContent = cleanContent + videosHtml + verificationFooter;

        // Step 13: Generate schema
        const schemaJson = generateFullSchema({
          title: seoTitle,
          description: metaDescription,
          content: cleanContent,
          datePublished: new Date().toISOString(),
          dateModified: new Date().toISOString(),
          author: siteInfo.authorName || 'Expert Author',
          siteInfo,
          faqItems: [],
        });

        const generatedContent: GeneratedContent = {
          title: seoTitle,
          metaDescription,
          slug,
          primaryKeyword: item.title,
          semanticKeywords,
          content: cleanContent,
          strategy,
          serpData,
          schemaMarkup: schemaJson,
          imageDetails: [],
          wordCount: countWords(cleanContent),
          socialMediaCopy: {
            twitter: `Just published: ${seoTitle} #seo #content`,
            linkedIn: `New article on ${seoTitle}. Read more here.`
          },
          faqSection: [],
          keyTakeaways: [],
          outline: [],
          references: [],
          neuronAnalysis: neuronData ? { terms_txt: { content_basic: neuronData } } : undefined
        };

        context.dispatch({
          type: 'SET_CONTENT',
          payload: { id: item.id, content: generatedContent },
        });

        context.dispatch({
          type: 'UPDATE_STATUS',
          payload: { id: item.id, status: 'done', statusText: 'Complete!' },
        });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`[generateItems] Error for ${item.title}:`, error);
        context.dispatch({
          type: 'UPDATE_STATUS',
          payload: { id: item.id, status: 'error', statusText: errMsg },
        });
      }

      await delay(500);
    }
  },

  /**
   * Refresh existing content.
   */
  async refreshItem(
    item: ContentItem,
    callAIFn: (promptKey: string, args: unknown[], format?: 'json' | 'html', grounding?: boolean) => Promise<string>,
    context: GenerationContext,
    aiRepairer: (brokenText: string) => Promise<string>
  ): Promise<void> {
    const { existingPages, wpConfig, serperApiKey, geoTargeting } = context;

    try {
      let crawledContent = item.crawledContent;
      if (!crawledContent && item.originalUrl) {
        context.dispatch({
          type: 'UPDATE_STATUS',
          payload: { id: item.id, status: 'generating', statusText: 'Crawling page...' },
        });
        crawledContent = await smartCrawl(item.originalUrl);
      }

      if (!crawledContent || crawledContent.length < 500) {
        throw new Error('Content too short to refresh');
      }

      const existingImages = extractImagesFromHtml(crawledContent);
      console.log(`[refreshItem] Preserving ${existingImages.length} images`);

      const parser = new DOMParser();
      const doc = parser.parseFromString(crawledContent, 'text/html');
      const existingTitle =
        doc.querySelector('h1')?.textContent?.trim() ||
        item.title ||
        extractSlugFromUrl(item.originalUrl || '').replace(/-/g, ' ');

      context.dispatch({
        type: 'UPDATE_STATUS',
        payload: { id: item.id, status: 'generating', statusText: 'Analyzing content...' },
      });

      const keywordsResponse = await callAIFn('semantic_keyword_generator', [existingTitle], 'json');
      const { semanticKeywords } = safeJsonParse<{ semanticKeywords: string[] }>(
        keywordsResponse,
        'semantic_keyword_generator'
      );

      context.dispatch({
        type: 'UPDATE_STATUS',
        payload: { id: item.id, status: 'generating', statusText: 'Optimizing content...' },
      });

      const optimizedResponse = await callAIFn(
        'god_mode_structural_guardian',
        [crawledContent, semanticKeywords, existingTitle],
        'html'
      );

      let optimizedContent = surgicalSanitizer(optimizedResponse);

      if (existingImages.length > 0) {
        optimizedContent = injectImagesIntoContent(optimizedContent, existingImages);
      }

      const referencesHtml = await fetchVerifiedReferences(
        existingTitle,
        semanticKeywords,
        serperApiKey,
        wpConfig.url
      );

      const verificationFooter = generateVerificationFooterHtml();
      optimizedContent = optimizedContent + referencesHtml + verificationFooter;
      optimizedContent = removeDuplicateSections(optimizedContent);

      const metaResponse = await callAIFn(
        'seo_metadata_generator',
        [existingTitle, optimizedContent.substring(0, 1000), 'General audience', [], null],
        'json'
      );
      const { seoTitle, metaDescription, slug } = safeJsonParse<{
        seoTitle: string;
        metaDescription: string;
        slug: string;
      }>(metaResponse, 'seo_metadata_generator');

      const generatedContent: GeneratedContent = {
        title: seoTitle,
        metaDescription,
        slug: extractSlugFromUrl(item.originalUrl || '') || slug,
        primaryKeyword: existingTitle,
        semanticKeywords,
        content: optimizedContent,
        strategy: { targetAudience: 'General', searchIntent: 'Informational', competitorAnalysis: '', contentAngle: '' },
        serpData: [],
        jsonLdSchema: {},
        socialMediaCopy: { twitter: '', linkedIn: '' },
        faqSection: [],
        keyTakeaways: [],
        outline: [],
        references: [],
        imageDetails: [],
        wordCount: countWords(optimizedContent),
      };

      context.dispatch({
        type: 'SET_CONTENT',
        payload: { id: item.id, content: generatedContent },
      });

      context.dispatch({
        type: 'UPDATE_STATUS',
        payload: { id: item.id, status: 'done', statusText: 'Refreshed!' },
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[refreshItem] Error:`, error);
      context.dispatch({
        type: 'UPDATE_STATUS',
        payload: { id: item.id, status: 'error', statusText: errMsg },
      });
    }
  },

  /**
   * Analyze content gaps.
   */
  async analyzeContentGaps(
    existingPages: SitemapPage[],
    topic: string,
    callAIFn: (promptKey: string, args: unknown[], format?: 'json' | 'html', grounding?: boolean) => Promise<string>,
    context: GenerationContext
  ): Promise<GapAnalysisSuggestion[]> {
    try {
      const existingTitles = existingPages.map((p) => p.title).slice(0, 100);

      const gapResponse = await callAIFn(
        'competitor_gap_analyzer',
        [topic || 'General content', [], existingTitles.join('\n')],
        'json'
      );

      const responseParsed = safeJsonParse<any>(gapResponse, 'competitor_gap_analyzer');
      return Array.isArray(responseParsed) ? responseParsed : (responseParsed.gaps || []);
    } catch (error) {
      console.error('[analyzeContentGaps] Error:', error);
      return [];
    }
  },

  /**
   * Analyze pages for health check.
   */
  async analyzePages(
    pages: SitemapPage[],
    callAIFn: (promptKey: string, args: unknown[], format?: 'json' | 'html', grounding?: boolean) => Promise<string>,
    setPages: React.Dispatch<React.SetStateAction<SitemapPage[]>>,
    onProgress: (progress: { current: number; total: number }) => void,
    shouldStop: () => boolean
  ): Promise<void> {
    const analyzePage = async (page: SitemapPage, index: number) => {
      if (shouldStop()) return;

      setPages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, status: 'analyzing' as const } : p))
      );

      try {
        const crawledContent = await smartCrawl(page.id);
        const wordCount = countWords(crawledContent);

        const analysisResponse = await callAIFn(
          'health_analyzer',
          [page.id, crawledContent, page.title || page.slug],
          'json'
        );

        const analysis = safeJsonParse<{
          healthScore: number;
          wordCount: number;
          issues: any[];
          recommendations: string[];
        }>(analysisResponse, 'health_analyzer');

        const updatePriority = analysis.healthScore < 50 ? 'Critical' : 
                               analysis.healthScore < 70 ? 'High' : 
                               analysis.healthScore < 90 ? 'Medium' : 'Healthy';

        setPages((prev) =>
          prev.map((p) =>
            p.id === page.id
              ? {
                  ...p,
                  status: 'analyzed' as const,
                  crawledContent,
                  wordCount,
                  healthScore: analysis.healthScore,
                  updatePriority,
                  justification: analysis.recommendations?.[0] || 'Analysis complete',
                  analysis: {
                    critique: "Automated analysis complete",
                    strengths: [],
                    weaknesses: analysis.issues.map((i: any) => i.issue) || [],
                    recommendations: analysis.recommendations || [],
                    seoScore: analysis.healthScore,
                    readabilityScore: 0
                  },
                }
              : p
          )
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        setPages((prev) =>
          prev.map((p) =>
            p.id === page.id ? { ...p, status: 'error' as const, justification: errMsg } : p
          )
        );
      }

      onProgress({ current: index + 1, total: pages.length });
    };

    await processConcurrently(pages, analyzePage, 3, () => {}, shouldStop);
  },
};

// =============================================================================
// SECTION 6: IMAGE GENERATION
// =============================================================================

export const generateImageWithFallback = async (
  apiClients: ApiClients,
  prompt: string
): Promise<string | null> => {
  if (apiClients.gemini) {
    try {
      const response = await (apiClients.gemini as GoogleGenAI).models.generateImages({
        model: AI_MODELS.GEMINI_IMAGEN,
        prompt,
        config: {
          numberOfImages: 1,
          outputOptions: { mimeType: 'image/png' },
        },
      });

      const imageData = (
        response as { generatedImages?: Array<{ image?: { imageBytes?: string } }> }
      ).generatedImages?.[0]?.image?.imageBytes;

      if (imageData) {
        return `data:image/png;base64,${imageData}`;
      }
    } catch (e) {
      console.warn('[generateImage] Gemini failed:', e);
    }
  }

  if (apiClients.openai) {
    try {
      const response = await (apiClients.openai as OpenAI).images.generate({
        model: AI_MODELS.OPENAI_DALLE3,
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'b64_json',
      });

      const imageData = response.data[0]?.b64_json;
      if (imageData) {
        return `data:image/png;base64,${imageData}`;
      }
    } catch (e) {
      console.warn('[generateImage] DALL-E failed:', e);
    }
  }

  return null;
};

// =============================================================================
// SECTION 7: WORDPRESS PUBLISHING
// =============================================================================

export const publishItemToWordPress = async (
  item: ContentItem,
  wpPassword: string,
  status: 'publish' | 'draft',
  fetchFn: typeof fetch,
  wpConfig: WpConfig
): Promise<{ success: boolean; message: React.ReactNode; link?: string; postId?: number }> => {
  if (!item.generatedContent) {
    return { success: false, message: 'No content to publish' };
  }

  const { title, metaDescription, slug, content, schemaMarkup } = item.generatedContent;
  const baseUrl = wpConfig.url.replace(/\/+$/, '');
  const authHeader = `Basic ${btoa(`${wpConfig.username}:${wpPassword}`)}`;

  const schemaString = schemaMarkup ? JSON.stringify(schemaMarkup) : '';
  const contentWithSchema = schemaString 
    ? `${content}\n<script type="application/ld+json">${schemaString}</script>` 
    : content;

  try {
    const isUpdate = !!item.originalUrl;
    let postId: number | null = null;

    if (isUpdate) {
      const postsRes = await fetchFn(
        `${baseUrl}/wp-json/wp/v2/posts?slug=${slug}&status=any`,
        { method: 'GET', headers: { Authorization: authHeader } }
      );

      const postsText = await postsRes.text();

      try {
        const posts = safeJsonParse<Array<{ id: number }>>(postsText, 'WP Posts Lookup');
        if (posts.length > 0) {
          postId = posts[0].id;
        }
      } catch {
        // Not found
      }
    }

    const endpoint = postId
      ? `${baseUrl}/wp-json/wp/v2/posts/${postId}`
      : `${baseUrl}/wp-json/wp/v2/posts`;

    const method = postId ? 'PUT' : 'POST';

    const payload = {
      title,
      content: contentWithSchema,
      status,
      slug,
      excerpt: metaDescription,
      meta: {
        _yoast_wpseo_title: title,
        _yoast_wpseo_metadesc: metaDescription,
      },
    };

    const response = await fetchFn(endpoint, {
      method,
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      try {
        const errorData = safeJsonParse<{ message?: string }>(responseText, 'WP Error');
        return { success: false, message: errorData.message || `HTTP ${response.status}` };
      } catch {
        return {
          success: false,
          message: `WordPress returned ${response.status}: ${responseText.substring(0, 100)}`,
        };
      }
    }

    const result = safeJsonParse<{ id: number; link: string }>(responseText, 'WP Publish');

    return {
      success: true,
      message: postId ? 'Updated successfully!' : 'Published successfully!',
      link: result.link,
      postId: result.id
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[publishItemToWordPress] Error:', error);
    return { success: false, message: errMsg };
  }
};

// =============================================================================
// SECTION 8: GOD MODE MAINTENANCE ENGINE
// =============================================================================

class MaintenanceEngine {
  isRunning = false;
  logCallback: (msg: string) => void = console.log;
  private context: GenerationContext | null = null;
  private intervalId: ReturnType<typeof setTimeout> | null = null;

  start(context: GenerationContext): void {
    if (!context.apiClients) {
      this.logCallback('❌ CRITICAL ERROR: AI API Clients not configured!');
      this.logCallback('🔧 REQUIRED: Configure API keys in Settings tab');
      this.logCallback('🛑 STOPPING: God Mode requires valid AI API clients');
      return;
    }

    const selectedClient = context.apiClients[context.selectedModel as keyof ApiClients];
    if (!selectedClient) {
      const availableProvider = Object.entries(context.apiClients).find(
        ([, client]) => client !== null
      );

      if (!availableProvider) {
        this.logCallback('❌ CRITICAL ERROR: No AI API Client initialized!');
        this.logCallback('🔧 REQUIRED: Configure at least one API key');
        this.logCallback('🛑 STOPPING: God Mode requires a valid AI API client');
        return;
      }

      this.logCallback(`⚠️ WARNING: ${context.selectedModel} not available, using ${availableProvider[0]} instead`);
    }

    if (context.existingPages.length === 0) {
      this.logCallback('⚠️ WARNING: No pages in sitemap. Crawl sitemap first.');
      return;
    }

    this.isRunning = true;
    this.context = context;
    this.logCallback('🚀 God Mode Activated: Autonomous Maintenance Engine starting...');
    this.logCallback(`📊 Found ${context.existingPages.length} pages to monitor`);

    this.runMaintenanceCycle();
  }

  stop(): void {
    this.isRunning = false;
    this.context = null;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.logCallback('🛑 God Mode Deactivated');
  }

  updateContext(context: GenerationContext): void {
    this.context = context;
  }

  private async runMaintenanceCycle(): Promise<void> {
    if (!this.isRunning || !this.context) return;

    try {
      const page = this.getNextPageToOptimize();

      if (!page) {
        this.logCallback('💤 All pages recently optimized. Waiting...');
        this.scheduleCycle(60000);
        return;
      }

      this.logCallback(`🎯 Target Acquired: "${page.title || page.slug}"`);
      await this.optimizePage(page);

      this.scheduleCycle(5000);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logCallback(`❌ GOD MODE ERROR: ${errMsg}`);
      console.error('[MaintenanceEngine] Error:', error);
      this.scheduleCycle(30000);
    }
  }

  private scheduleCycle(delayMs: number): void {
    if (!this.isRunning) return;
    this.intervalId = setTimeout(() => this.runMaintenanceCycle(), delayMs);
  }

  private getNextPageToOptimize(): SitemapPage | null {
    if (!this.context) return null;

    const { existingPages, excludedUrls, excludedCategories, priorityUrls, priorityOnlyMode } = this.context;

    const eligiblePages = existingPages.filter((page) => {
      if (excludedUrls?.some((url) => page.id.includes(url))) return false;
      if (excludedCategories?.some((cat) => page.id.toLowerCase().includes(cat.toLowerCase()))) return false;

      const lastProcessed = localStorage.getItem(`sota_last_proc_${page.id}`);
      if (lastProcessed) {
        const daysSince = (Date.now() - parseInt(lastProcessed)) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) return false;
      }

      return true;
    });

    if (priorityOnlyMode && priorityUrls && priorityUrls.length > 0) {
      const priorityPage = eligiblePages.find((p) => priorityUrls.includes(p.id));
      return priorityPage || null;
    }

    eligiblePages.sort((a, b) => {
      const aIsPriority = priorityUrls?.includes(a.id) || false;
      const bIsPriority = priorityUrls?.includes(b.id) || false;

      if (aIsPriority && !bIsPriority) return -1;
      if (!aIsPriority && bIsPriority) return 1;

      return (b.daysOld || 0) - (a.daysOld || 0);
    });

    return eligiblePages[0] || null;
  }

  private async optimizePage(page: SitemapPage): Promise<void> {
    if (!this.context) return;

    const {
      apiClients,
      selectedModel,
      geoTargeting,
      openrouterModels,
      selectedGroqModel,
      wpConfig,
      serperApiKey,
    } = this.context;

    try {
      this.logCallback(`📄 Crawling: ${page.id}`);
      const crawledContent = await smartCrawl(page.id);

      if (!crawledContent || crawledContent.length < 300) {
        this.logCallback(`⚠️ Content too short (${crawledContent?.length || 0} chars). Skipping.`);
        return;
      }

      this.logCallback('🔑 Generating semantic keywords...');
      const keywordsResponse = await callAI(
        apiClients,
        selectedModel,
        geoTargeting,
        openrouterModels,
        selectedGroqModel,
        'semantic_keyword_generator',
        [page.title || page.slug],
        'json'
      );

      const { semanticKeywords } = safeJsonParse<{ semanticKeywords: string[] }>(
        keywordsResponse,
        'semantic_keyword_generator (God Mode)'
      );

      this.logCallback('⚡ Optimizing content with SOTA engine...');

      let changesMade = 0;
      let schemaInjected = false;

      try {
        const optimizedResponse = await callAI(
          apiClients,
          selectedModel,
          geoTargeting,
          openrouterModels,
          selectedGroqModel,
          'god_mode_structural_guardian',
          [crawledContent, semanticKeywords, page.title || page.slug],
          'html'
        );

        let optimizedContent = surgicalSanitizer(optimizedResponse);

        if (optimizedContent && optimizedContent.length > crawledContent.length * 0.6) {
          changesMade++;
        }

        if (!optimizedContent.includes('verification-footer-sota')) {
          const footer = generateVerificationFooterHtml();
          optimizedContent += footer;
          changesMade++;
        }

        if (!optimizedContent.includes('sota-references-section') && serperApiKey) {
          this.logCallback('📚 Adding verified references...');
          const referencesHtml = await fetchVerifiedReferences(
            page.title || page.slug,
            semanticKeywords,
            serperApiKey,
            wpConfig.url
          );
          if (referencesHtml) {
            optimizedContent += referencesHtml;
            changesMade++;
          }
        }

        if (!optimizedContent.includes('application/ld+json')) {
          this.logCallback('📋 Generating schema markup...');
          schemaInjected = true;
          changesMade++;
        }

        if (changesMade > 0 || schemaInjected) {
          this.logCallback(`💾 Publishing ${changesMade} improvements...`);

          const item: ContentItem = {
            id: page.id,
            title: page.title,
            type: 'refresh',
            originalUrl: page.id,
            status: 'done',
            statusText: 'Optimized',
            generatedContent: {
              title: page.title,
              slug: page.slug,
              content: optimizedContent,
              metaDescription: '',
              primaryKeyword: page.title,
              semanticKeywords,
              strategy: { targetAudience: '', searchIntent: '', competitorAnalysis: '', contentAngle: '' },
              jsonLdSchema: {},
              socialMediaCopy: { twitter: '', linkedIn: '' },
              faqSection: [],
              keyTakeaways: [],
              outline: [],
              references: [],
              imageDetails: []
            }
          };

          const wpPassword = localStorage.getItem('wpPassword') || '';
          const result = await publishItemToWordPress(item, wpPassword, 'publish', fetchWithProxies, wpConfig);

          if (result.success) {
            this.logCallback(`✅ SUCCESS|${page.title}|${page.id}`);
            localStorage.setItem(`sota_last_proc_${page.id}`, Date.now().toString());
          } else {
            this.logCallback(`❌ Publish failed for ${page.title}: ${result.message}`);
          }
        } else {
          this.logCallback(`⚠️ No optimization needed for ${page.title}. Will retry later.`);
        }
      } catch (optimizeError) {
        const errMsg = optimizeError instanceof Error ? optimizeError.message : String(optimizeError);
        if (errMsg.includes('not initialized')) {
          this.logCallback(`❌ FATAL: API Client error - ${errMsg}`);
          this.stop();
          return;
        }
        throw optimizeError;
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logCallback(`❌ Failed to optimize ${page.title || page.id}: ${errMsg}`);
    }
  }
}

export const maintenanceEngine = new MaintenanceEngine();

// =============================================================================
// SECTION 9: EXPORTS
// =============================================================================

export { safeJsonParse, extractJsonFromResponse, surgicalSanitizer };

export default {
  callAI,
  generateContent,
  generateImageWithFallback,
  publishItemToWordPress,
  maintenanceEngine,
  fetchVerifiedReferences,
  safeJsonParse,
  extractJsonFromResponse,
  surgicalSanitizer,
};
