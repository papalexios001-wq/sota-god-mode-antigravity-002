// Enterprise-Grade AI Services, Content Generation & God Mode Engine
// Version 12.2 - Robust JSON Parsing with Truncation Recovery

import { GoogleGenAI } from "@anthropic-ai/sdk";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { PROMPT_TEMPLATES, buildPrompt } from "./prompts";
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
} from "./constants";
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
} from "./types";
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
} from "./contentUtils";
import { extractSlugFromUrl, sanitizeTitle, processConcurrently, delay } from "./utils";
import { generateFullSchema } from "./schema-generator";
import { fetchNeuronTerms } from "./neuronwriter";

// ============================================================================
// SECTION 1: SOTA JSON EXTRACTION - ENTERPRISE GRADE WITH TRUNCATION RECOVERY
// ============================================================================

/**
 * Strips markdown code block wrappers from AI responses.
 */
const stripMarkdownCodeBlocks = (text: string): string => {
  if (!text || typeof text !== "string") return "";
  
  let cleaned = text.trim();
  
  const patterns = [
    /^```json\s*/i,
    /^```JSON\s*/i,
    /^```javascript\s*/i,
    /^```js\s*/i,
    /^```html\s*/i,
    /^```HTML\s*/i,
    /^```\s*/,
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, "");
      break;
    }
  }
  
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  
  return cleaned.trim();
};

/**
 * ENTERPRISE-GRADE: Repairs truncated JSON from AI responses.
 * Handles unterminated strings, missing brackets, and partial arrays.
 */
const repairTruncatedJson = (json: string): string | null => {
  if (!json || typeof json !== "string") return null;
  
  let repaired = json.trim();
  
  // Quick check: if it parses, return as-is
  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    // Continue with repair
  }
  
  // Strategy 1: Find the last complete array element for keyword arrays
  if (repaired.includes('"semanticKeywords"') || repaired.startsWith('[')) {
    // Extract all complete quoted strings
    const keywords: string[] = [];
    const regex = /"([^"\\]*(\\.[^"\\]*)*)"/g;
    let match;
    
    while ((match = regex.exec(repaired)) !== null) {
      const kw = match[1];
      // Filter out JSON keys and keep only keyword-like values
      if (kw && 
          kw.length > 1 && 
          kw.length < 60 && 
          !kw.includes(':') && 
          !kw.includes('{') &&
          kw !== 'semanticKeywords' &&
          kw !== 'keywords' &&
          kw !== 'primaryVariations' &&
          kw !== 'lsiKeywords' &&
          kw !== 'questionKeywords' &&
          kw !== 'longTailKeywords') {
        keywords.push(kw);
      }
    }
    
    if (keywords.length >= 5) {
      console.log(`[repairTruncatedJson] Extracted ${keywords.length} keywords from truncated response`);
      return JSON.stringify({ semanticKeywords: keywords.slice(0, 40) });
    }
  }
  
  // Strategy 2: Try to close brackets properly
  let bracketStack: string[] = [];
  let inString = false;
  let escapeNext = false;
  let lastGoodPosition = 0;
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      if (!inString) lastGoodPosition = i;
      continue;
    }
    
    if (!inString) {
      if (char === '{') bracketStack.push('}');
      else if (char === '[') bracketStack.push(']');
      else if (char === '}' || char === ']') {
        if (bracketStack.length > 0 && bracketStack[bracketStack.length - 1] === char) {
          bracketStack.pop();
          lastGoodPosition = i;
        }
      } else if (char === ',' || char === ':') {
        lastGoodPosition = i;
      }
    }
  }
  
  // If we ended inside a string, truncate to last good position
  if (inString && lastGoodPosition > 0) {
    repaired = repaired.substring(0, lastGoodPosition + 1);
    // Recalculate bracket stack
    bracketStack = [];
    inString = false;
    escapeNext = false;
    
    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      if (escapeNext) { escapeNext = false; continue; }
      if (char === '\\') { escapeNext = true; continue; }
      if (char === '"' && !escapeNext) { inString = !inString; continue; }
      if (!inString) {
        if (char === '{') bracketStack.push('}');
        else if (char === '[') bracketStack.push(']');
        else if (char === '}' || char === ']') {
          if (bracketStack.length > 0) bracketStack.pop();
        }
      }
    }
  }
  
  // Remove trailing comma if present
  repaired = repaired.replace(/,\s*$/, '');
  
  // Close any open brackets
  while (bracketStack.length > 0) {
    repaired += bracketStack.pop();
  }
  
  // Validate
  try {
    JSON.parse(repaired);
    console.log("[repairTruncatedJson] Successfully repaired JSON");
    return repaired;
  } catch (e) {
    console.warn("[repairTruncatedJson] Repair failed:", e);
    return null;
  }
};

/**
 * Safely extracts JSON from AI responses with truncation recovery.
 */
const extractJsonFromResponse = (response: string): string => {
  if (!response || typeof response !== "string") {
    throw new Error("Empty or invalid response received from AI service");
  }

  let trimmed = response.trim();
  trimmed = stripMarkdownCodeBlocks(trimmed);

  // Try direct parse first
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      JSON.parse(trimmed);
      return trimmed;
    } catch {
      // Try repair
      const repaired = repairTruncatedJson(trimmed);
      if (repaired) return repaired;
    }
  }

  // Try to find JSON in text
  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  let startIndex = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }

  if (startIndex !== -1) {
    const substring = trimmed.substring(startIndex);
    const repaired = repairTruncatedJson(substring);
    if (repaired) return repaired;
  }

  // Check for error responses
  const errorPatterns = [
    { pattern: /Bad Request/i, msg: "API returned Bad Request" },
    { pattern: /Blocked/i, msg: "Request was blocked" },
    { pattern: /<!DOCTYPE/i, msg: "API returned HTML instead of JSON" },
    { pattern: /Unauthorized/i, msg: "Authentication failed" },
    { pattern: /Rate limit/i, msg: "Rate limit exceeded" },
  ];

  for (const { pattern, msg } of errorPatterns) {
    if (pattern.test(trimmed)) {
      throw new Error(`${msg}: ${trimmed.substring(0, 100)}...`);
    }
  }

  // Last resort: extract keywords from raw text
  const extractedKeywords: string[] = [];
  const kwMatches = trimmed.matchAll(/["']([a-zA-Z][a-zA-Z0-9\s-]{2,40})["']/g);
  for (const match of kwMatches) {
    if (match[1] && !extractedKeywords.includes(match[1])) {
      extractedKeywords.push(match[1]);
    }
    if (extractedKeywords.length >= 30) break;
  }
  
  if (extractedKeywords.length >= 5) {
    console.warn(`[extractJsonFromResponse] Fallback: Extracted ${extractedKeywords.length} keywords`);
    return JSON.stringify({ semanticKeywords: extractedKeywords });
  }

  throw new Error(
    `Could not extract valid JSON. Response: "${trimmed.substring(0, 100)}..." (${trimmed.length} chars)`
  );
};

/**
 * Safe JSON parse with extraction.
 */
const safeJsonParse = <T = unknown>(response: string, context: string = "Unknown"): T => {
  try {
    const jsonString = extractJsonFromResponse(response);
    return JSON.parse(jsonString) as T;
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`[safeJsonParse] Context: ${context}, Error: ${errMsg}`);
    console.error(`[safeJsonParse] Response preview:`, response?.substring(0, 300));
    throw new Error(`JSON parse failed (${context}): ${errMsg}`);
  }
};

/**
 * Safe JSON parse with fallback value on failure.
 */
const safeJsonParseWithRecovery = <T = unknown>(
  response: string, 
  context: string, 
  fallback: T
): T => {
  try {
    return safeJsonParse<T>(response, context);
  } catch (error) {
    console.warn(`[safeJsonParseWithRecovery] Using fallback for ${context}`);
    return fallback;
  }
};

/**
 * ROBUST: Extracts semantic keywords with multiple fallback strategies.
 */
const extractSemanticKeywords = (response: string, context: string): string[] => {
  // Strategy 1: Try normal JSON parse
  try {
    const parsed = safeJsonParse<any>(response, context);
    
    if (parsed && Array.isArray(parsed.semanticKeywords)) {
      return parsed.semanticKeywords.filter((k: unknown) => typeof k === "string").slice(0, 40);
    }
    
    if (Array.isArray(parsed)) {
      return parsed.filter((k: unknown) => typeof k === "string").slice(0, 40);
    }
    
    // Check for nested arrays
    if (parsed && typeof parsed === "object") {
      for (const value of Object.values(parsed)) {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
          return (value as string[]).slice(0, 40);
        }
      }
    }
  } catch {
    // Continue to fallback strategies
  }
  
  // Strategy 2: Extract quoted strings directly from response
  console.log(`[extractSemanticKeywords] Falling back to regex extraction for ${context}`);
  const extracted: string[] = [];
  const regex = /["']([a-zA-Z][a-zA-Z0-9\s-]{2,45})["']/g;
  let match;
  
  while ((match = regex.exec(response)) !== null) {
    const kw = match[1].trim();
    if (kw && 
        kw.length > 2 && 
        !extracted.includes(kw) &&
        !kw.includes(':') &&
        !kw.includes('{') &&
        kw.toLowerCase() !== 'semantickeywords' &&
        kw.toLowerCase() !== 'keywords') {
      extracted.push(kw);
    }
    if (extracted.length >= 35) break;
  }
  
  if (extracted.length >= 5) {
    console.log(`[extractSemanticKeywords] Recovered ${extracted.length} keywords via regex`);
    return extracted;
  }
  
  // Strategy 3: Return empty array (content will still generate)
  console.warn(`[extractSemanticKeywords] Could not extract keywords for ${context}`);
  return [];
};

/**
 * Sanitizes AI-generated HTML.
 */
const surgicalSanitizer = (html: string): string => {
  if (!html || typeof html !== "string") return "";
  
  return html
    .replace(/^```html\s*/gi, "")
    .replace(/^```HTML\s*/gi, "")
    .replace(/```$/gi, "")
    .replace(/^```\s*/gi, "")
    .replace(/^(Here(?:'s| is) the|Below is|The following)/i, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

// ============================================================================
// SECTION 2: AI CLIENT WRAPPER - MULTI-PROVIDER SUPPORT
// ============================================================================

export const callAI = async (
  apiClients: ApiClients,
  selectedModel: string,
  geoTargeting: ExpandedGeoTargeting,
  openrouterModels: string[],
  selectedGroqModel: string,
  promptKey: keyof typeof PROMPT_TEMPLATES | string,
  args: unknown[],
  format: "json" | "html" = "json",
  useGrounding: boolean = false
): Promise<string> => {
  const promptTemplate = PROMPT_TEMPLATES[promptKey as keyof typeof PROMPT_TEMPLATES];
  
  if (!promptTemplate) {
    throw new Error(`Unknown prompt template: ${promptKey}`);
  }

  const systemInstruction = promptTemplate.systemInstruction;
  const userPrompt = typeof promptTemplate.userPrompt === "function"
    ? (promptTemplate.userPrompt as (...a: unknown[]) => string)(...args)
    : promptTemplate.userPrompt;

  let enhancedPrompt = userPrompt;
  if (geoTargeting.enabled && geoTargeting.location) {
    enhancedPrompt = `[GEO-TARGET: ${geoTargeting.location}]\n${userPrompt}`;
  }

  const modelPriority: string[] = [selectedModel];
  if (selectedModel !== "gemini" && apiClients.gemini) modelPriority.push("gemini");
  if (selectedModel !== "openai" && apiClients.openai) modelPriority.push("openai");
  if (selectedModel !== "anthropic" && apiClients.anthropic) modelPriority.push("anthropic");
  if (selectedModel !== "openrouter" && apiClients.openrouter) modelPriority.push("openrouter");
  if (selectedModel !== "groq" && apiClients.groq) modelPriority.push("groq");

  let lastError: Error | null = null;

  for (const modelKey of modelPriority) {
    const client = apiClients[modelKey as keyof ApiClients];
    if (!client) continue;

    try {
      let response: string;

      switch (modelKey) {
        case "gemini":
          response = await callGemini(client as GoogleGenAI, systemInstruction, enhancedPrompt, format, useGrounding);
          break;
        case "openai":
          response = await callOpenAI(client as OpenAI, systemInstruction, enhancedPrompt, format);
          break;
        case "anthropic":
          response = await callAnthropic(client as Anthropic, systemInstruction, enhancedPrompt, format);
          break;
        case "openrouter":
          response = await callOpenRouter(client as OpenAI, systemInstruction, enhancedPrompt, openrouterModels, format);
          break;
        case "groq":
          response = await callGroq(client as OpenAI, systemInstruction, enhancedPrompt, selectedGroqModel, format);
          break;
        default:
          continue;
      }

      if (format === "html") {
        return surgicalSanitizer(response);
      }

      // Validate JSON extraction works
      try {
        extractJsonFromResponse(response);
        return response;
      } catch (e) {
        console.warn(`[callAI] ${modelKey} returned invalid JSON, trying next...`);
        lastError = e as Error;
        continue;
      }
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[callAI] ${modelKey} failed:`, errMsg);
      lastError = error instanceof Error ? error : new Error(errMsg);
      continue;
    }
  }

  throw lastError || new Error("All AI providers failed. Check API keys.");
};

// ============================================================================
// SECTION 3: INDIVIDUAL AI PROVIDER IMPLEMENTATIONS
// ============================================================================

async function callGemini(
  client: GoogleGenAI,
  systemInstruction: string,
  userPrompt: string,
  format: "json" | "html",
  useGrounding: boolean
): Promise<string> {
  const model = AI_MODELS.GEMINI_FLASH;
  
  const generationConfig: Record<string, unknown> = {
    temperature: format === "json" ? 0.2 : 0.7,
    topP: 0.95,
    maxOutputTokens: 8192, // Reduced to prevent truncation
  };

  if (format === "json") {
    generationConfig.responseMimeType = "application/json";
  }

  const response = await client.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction,
      ...generationConfig,
      ...(useGrounding ? { tools: [{ googleSearch: {} }] } : {}),
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

async function callOpenAI(
  client: OpenAI,
  systemInstruction: string,
  userPrompt: string,
  format: "json" | "html"
): Promise<string> {
  const response = await client.chat.completions.create({
    model: AI_MODELS.OPENAI_GPT4_TURBO,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userPrompt },
    ],
    temperature: format === "json" ? 0.2 : 0.7,
    max_tokens: 8192,
    ...(format === "json" ? { response_format: { type: "json_object" } } : {}),
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("OpenAI returned empty response");
  return text;
}

async function callAnthropic(
  client: Anthropic,
  systemInstruction: string,
  userPrompt: string,
  format: "json" | "html"
): Promise<string> {
  const response = await client.messages.create({
    model: AI_MODELS.ANTHROPIC_SONNET,
    system: systemInstruction,
    messages: [{ role: "user", content: userPrompt }],
    max_tokens: 8192,
    temperature: format === "json" ? 0.2 : 0.7,
  });

  const textBlock = response.content.find((block: { type: string }) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic returned no text content");
  }
  return (textBlock as { type: "text"; text: string }).text;
}

async function callOpenRouter(
  client: OpenAI,
  systemInstruction: string,
  userPrompt: string,
  models: string[],
  format: "json" | "html"
): Promise<string> {
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt },
        ],
        temperature: format === "json" ? 0.2 : 0.7,
        max_tokens: 8192,
      });

      const text = response.choices[0]?.message?.content;
      if (text) return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      continue;
    }
  }

  throw lastError || new Error("All OpenRouter models failed");
}

async function callGroq(
  client: OpenAI,
  systemInstruction: string,
  userPrompt: string,
  model: string,
  format: "json" | "html"
): Promise<string> {
  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: userPrompt },
    ],
    temperature: format === "json" ? 0.2 : 0.7,
    max_tokens: 8192,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Groq returned empty response");
  return text;
}

// ============================================================================
// SECTION 4: REFERENCE VALIDATION ENGINE
// ============================================================================

function detectCategory(keyword: string, semanticKeywords: string[]): string {
  const allKeywords = [keyword, ...semanticKeywords].join(" ").toLowerCase();

  const categoryPatterns: Record<string, string[]> = {
    health: ["health", "medical", "disease", "treatment", "symptom", "doctor"],
    fitness: ["fitness", "workout", "exercise", "gym", "training", "muscle"],
    nutrition: ["nutrition", "diet", "food", "calorie", "protein", "vitamin"],
    technology: ["software", "app", "programming", "code", "developer", "tech"],
    business: ["business", "startup", "entrepreneur", "marketing", "sales"],
    science: ["research", "study", "scientific", "experiment", "data"],
  };

  let bestCategory = "general";
  let bestScore = 0;

  for (const [category, patterns] of Object.entries(categoryPatterns)) {
    const score = patterns.filter((p) => allKeywords.includes(p)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
}

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
          Verified
        </span>
      </li>`
    )
    .join("");

  return `
    <div class="sota-references-section" style="margin-top: 3rem; padding: 2rem; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 16px; border: 1px solid #cbd5e1;">
      <h2 style="margin: 0 0 1.5rem 0; font-size: 1.5rem; color: #1e293b;">Trusted References</h2>
      <ul style="list-style: none; padding: 0; margin: 0;">${linksHtml}</ul>
    </div>
  `;
}

export const fetchVerifiedReferences = async (
  keyword: string,
  semanticKeywords: string[],
  serperApiKey: string,
  wpUrl?: string
): Promise<string> => {
  if (!serperApiKey) return "";

  try {
    const category = detectCategory(keyword, semanticKeywords);
    const categoryConfig = REFERENCE_CATEGORIES[category as keyof typeof REFERENCE_CATEGORIES];
    const currentYear = new Date().getFullYear();

    let userDomain: string | undefined;
    if (wpUrl) {
      try { userDomain = new URL(wpUrl).hostname.replace("www.", ""); } catch {}
    }

    const query = categoryConfig
      ? `${keyword} ${categoryConfig.searchModifiers.slice(0, 2).join(" OR ")} ${currentYear}`
      : `${keyword} research data ${currentYear}`;

    const response = await fetchWithProxies("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": serperApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 15 }),
    });

    const data = safeJsonParseWithRecovery<{ organic?: Array<{ link: string; title?: string }> }>(
      await response.text(),
      "Serper API",
      { organic: [] }
    );

    const validLinks: Array<{ title: string; url: string; source: string; category: string }> = [];

    for (const link of data.organic || []) {
      if (validLinks.length >= 6) break;

      try {
        const urlObj = new URL(link.link);
        const domain = urlObj.hostname.replace("www.", "").toLowerCase();

        if (userDomain && domain.includes(userDomain)) continue;
        if (isBlockedDomain(link.link)) continue;
        if (BLOCKED_SPAM_DOMAINS.some((spam) => domain.includes(spam))) continue;

        const checkRes = await Promise.race([
          fetchWithProxies(link.link, { method: "HEAD", headers: { "User-Agent": "Mozilla/5.0" } }),
          new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
        ]) as Response;

        if (checkRes.status === 200) {
          validLinks.push({ title: link.title || "Reference", url: link.link, source: domain, category });
        }
      } catch { continue; }
    }

    return validLinks.length > 0 ? generateReferenceHTML(validLinks, category) : "";
  } catch (e) {
    console.error("[fetchVerifiedReferences] Error:", e);
    return "";
  }
};

// ============================================================================
// SECTION 5: CONTENT GENERATION ENGINE
// ============================================================================

export const generateContent = {
  async generateItems(
    items: ContentItem[],
    callAIFn: (promptKey: string, args: unknown[], format?: "json" | "html", grounding?: boolean) => Promise<string>,
    generateImageFn: ((prompt: string) => Promise<string | null>) | null,
    context: GenerationContext,
    onProgress: (progress: { current: number; total: number }) => void,
    stopRef: React.MutableRefObject<Set<string>>
  ): Promise<void> {
    const { existingPages, siteInfo, wpConfig, geoTargeting, serperApiKey, neuronConfig } = context;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (stopRef.current.has(item.id)) {
        context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "idle", statusText: "Stopped" } });
        continue;
      }

      onProgress({ current: i + 1, total: items.length });
      context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "generating", statusText: "Researching..." } });

      try {
        // Step 1: Generate semantic keywords with ROBUST extraction
        context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "generating", statusText: "Generating keywords..." } });
        
        const keywordsResponse = await callAIFn("semantickeywordgenerator", [item.title], "json");
        const semanticKeywords = extractSemanticKeywords(keywordsResponse, "semantickeywordgenerator");
        
        console.log(`[generateItems] Got ${semanticKeywords.length} keywords for: ${item.title}`);

        // Step 2: NeuronWriter terms
        let neuronData: string | null = null;
        if (neuronConfig?.enabled && neuronConfig.apiKey && neuronConfig.projectId) {
          context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "generating", statusText: "Fetching NLP terms..." } });
          try {
            const neuronTerms = await fetchNeuronTerms(neuronConfig.apiKey, neuronConfig.projectId, item.title);
            if (neuronTerms) neuronData = Object.entries(neuronTerms).map(([k, v]) => `${k}: ${v}`).join("\n");
          } catch (e) { console.warn("[NeuronWriter] Failed:", e); }
        }

        // Step 3: SERP analysis
        let serpData: unknown[] = [];
        let competitorGaps: string[] = [];

        if (serperApiKey) {
          context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "generating", statusText: "Analyzing competitors..." } });
          try {
            const serpResponse = await fetchWithProxies("https://google.serper.dev/search", {
              method: "POST",
              headers: { "X-API-KEY": serperApiKey, "Content-Type": "application/json" },
              body: JSON.stringify({ q: item.title, num: 10 }),
            });
            const serpJson = safeJsonParseWithRecovery<{ organic?: unknown[] }>(await serpResponse.text(), "Serper", { organic: [] });
            serpData = serpJson.organic || [];

            const gapResponse = await callAIFn("competitorgapanalyzer", [item.title, serpData.slice(0, 5)], "json");
            const gapResult = safeJsonParseWithRecovery<{ gaps: string[] }>(gapResponse, "gaps", { gaps: [] });
            competitorGaps = gapResult.gaps || [];
          } catch (e) { console.warn("[SERP] Failed:", e); }
        }

        // Step 4: Content strategy
        context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "generating", statusText: "Planning strategy..." } });
        const strategyResponse = await callAIFn("contentstrategygenerator", [item.title, semanticKeywords, serpData, item.type], "json");
        const strategy = safeJsonParseWithRecovery<Record<string, unknown>>(strategyResponse, "strategy", 
          { targetAudience: "General", searchIntent: "Informational", contentAngle: "Comprehensive" });

        // Step 5: Main content
        context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "generating", statusText: "Writing content..." } });
        const contentResponse = await callAIFn(
          "ultrasotaarticlewriter",
          [item.title, semanticKeywords, strategy, existingPages.slice(0, 30), competitorGaps, geoTargeting.enabled ? geoTargeting.location : null, neuronData],
          "html"
        );
        let generatedHtml = surgicalSanitizer(contentResponse);

        // Step 6: SEO metadata
        context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "generating", statusText: "Optimizing SEO..." } });
        const metaResponse = await callAIFn("seometadatagenerator", [item.title, generatedHtml.substring(0, 800), strategy.targetAudience || "General", [], null], "json");
        const { seoTitle, metaDescription, slug } = safeJsonParseWithRecovery<{ seoTitle: string; metaDescription: string; slug: string }>(
          metaResponse, "metadata", { seoTitle: item.title, metaDescription: `Learn about ${item.title}`, slug: item.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) }
        );

        // Step 7: FAQ
        context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "generating", statusText: "Creating FAQ..." } });
        const faqResponse = await callAIFn("sotafaqgenerator", [item.title, semanticKeywords], "html");
        const faqHtml = surgicalSanitizer(faqResponse);

        // Step 8: Takeaways
        const takeawaysResponse = await callAIFn("sotatakeawaysgenerator", [item.title, generatedHtml], "html");
        const takeawaysHtml = surgicalSanitizer(takeawaysResponse);

        // Step 9: References
        context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "generating", statusText: "Validating references..." } });
        const referencesHtml = await fetchVerifiedReferences(item.title, semanticKeywords, serperApiKey, wpConfig.url);

        // Step 10: YouTube
        let videosHtml = "";
        if (serperApiKey) {
          const videos = await getGuaranteedYoutubeVideos(item.title, serperApiKey, 2);
          videosHtml = generateYoutubeEmbedHtml(videos);
        }

        // Step 11: Internal links
        generatedHtml = processInternalLinkCandidates(generatedHtml, existingPages.map((p) => ({ title: p.title, slug: p.slug })), wpConfig.url, MAX_INTERNAL_LINKS);

        // Step 12: Assemble
        const verificationFooter = generateVerificationFooterHtml();
        const finalContent = performSurgicalUpdate(generatedHtml, { keyTakeawaysHtml: takeawaysHtml, faqHtml, referencesHtml });
        let cleanContent = removeDuplicateSections(finalContent) + videosHtml + verificationFooter;

        // Step 13: Schema
        const schemaJson = generateFullSchema({
          title: seoTitle, description: metaDescription, content: cleanContent,
          datePublished: new Date().toISOString(), dateModified: new Date().toISOString(),
          author: siteInfo.authorName || "Expert Author", siteInfo, faqItems: [],
        });

        const generatedContent: GeneratedContent = {
          title: seoTitle, metaDescription, slug, primaryKeyword: item.title, semanticKeywords,
          content: cleanContent, strategy, serpData, schemaMarkup: schemaJson, imageDetails: [],
          wordCount: countWords(cleanContent),
          socialMediaCopy: { twitter: `Just published: ${seoTitle}`, linkedIn: `New article on ${seoTitle}` },
          faqSection: [], keyTakeaways: [], outline: [], references: [],
          neuronAnalysis: neuronData ? { termstxt: { contentbasic: neuronData } } : undefined,
        };

        context.dispatch({ type: "SET_CONTENT", payload: { id: item.id, content: generatedContent } });
        context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "done", statusText: "Complete!" } });
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`[generateItems] Error for ${item.title}:`, error);
        context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "error", statusText: errMsg } });
      }

      await delay(500);
    }
  },

  async refreshItem(
    item: ContentItem,
    callAIFn: (promptKey: string, args: unknown[], format?: "json" | "html", grounding?: boolean) => Promise<string>,
    context: GenerationContext,
    aiRepairer: (brokenText: string) => Promise<string>
  ): Promise<void> {
    const { existingPages, wpConfig, serperApiKey } = context;

    try {
      let crawledContent = item.crawledContent;
      if (!crawledContent && item.originalUrl) {
        context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "generating", statusText: "Crawling page..." } });
        crawledContent = await smartCrawl(item.originalUrl);
      }

      if (!crawledContent || crawledContent.length < 500) throw new Error("Content too short to refresh");

      const existingImages = extractImagesFromHtml(crawledContent);
      const parser = new DOMParser();
      const doc = parser.parseFromString(crawledContent, "text/html");
      const existingTitle = doc.querySelector("h1")?.textContent?.trim() || item.title || extractSlugFromUrl(item.originalUrl!).replace(/-/g, " ");

      context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "generating", statusText: "Analyzing content..." } });
      const keywordsResponse = await callAIFn("semantickeywordgenerator", [existingTitle], "json");
      const semanticKeywords = extractSemanticKeywords(keywordsResponse, "refresh-keywords");

      context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "generating", statusText: "Optimizing content..." } });
      const optimizedResponse = await callAIFn("godmodestructuralguardian", [crawledContent, semanticKeywords, existingTitle], "html");
      let optimizedContent = surgicalSanitizer(optimizedResponse);

      if (existingImages.length > 0) optimizedContent = injectImagesIntoContent(optimizedContent, existingImages);

      const referencesHtml = await fetchVerifiedReferences(existingTitle, semanticKeywords, serperApiKey, wpConfig.url);
      const verificationFooter = generateVerificationFooterHtml();
      optimizedContent = removeDuplicateSections(optimizedContent + referencesHtml + verificationFooter);

      const metaResponse = await callAIFn("seometadatagenerator", [existingTitle, optimizedContent.substring(0, 800), "General", [], null], "json");
      const { seoTitle, metaDescription, slug } = safeJsonParseWithRecovery<{ seoTitle: string; metaDescription: string; slug: string }>(
        metaResponse, "refresh-meta", { seoTitle: existingTitle, metaDescription: `Learn about ${existingTitle}`, slug: extractSlugFromUrl(item.originalUrl!) }
      );

      const generatedContent: GeneratedContent = {
        title: seoTitle, metaDescription, slug: extractSlugFromUrl(item.originalUrl!) || slug,
        primaryKeyword: existingTitle, semanticKeywords, content: optimizedContent,
        strategy: { targetAudience: "General", searchIntent: "Informational", competitorAnalysis: "", contentAngle: "" },
        serpData: [], jsonLdSchema: {}, socialMediaCopy: { twitter: "", linkedIn: "" },
        faqSection: [], keyTakeaways: [], outline: [], references: [], imageDetails: [],
        wordCount: countWords(optimizedContent),
      };

      context.dispatch({ type: "SET_CONTENT", payload: { id: item.id, content: generatedContent } });
      context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "done", statusText: "Refreshed!" } });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      context.dispatch({ type: "UPDATE_STATUS", payload: { id: item.id, status: "error", statusText: errMsg } });
    }
  },

  async analyzeContentGaps(
    existingPages: SitemapPage[],
    topic: string,
    callAIFn: (promptKey: string, args: unknown[], format?: "json" | "html", grounding?: boolean) => Promise<string>,
    context: GenerationContext
  ): Promise<GapAnalysisSuggestion[]> {
    try {
      const gapResponse = await callAIFn("competitorgapanalyzer", [topic || "General", [], existingPages.map((p) => p.title).slice(0, 50).join(",")], "json");
      const parsed = safeJsonParseWithRecovery<any>(gapResponse, "gaps", { gaps: [] });
      return Array.isArray(parsed) ? parsed : parsed.gaps || [];
    } catch { return []; }
  },

  async analyzePages(
    pages: SitemapPage[],
    callAIFn: (promptKey: string, args: unknown[], format?: "json" | "html", grounding?: boolean) => Promise<string>,
    setPages: React.Dispatch<React.SetStateAction<SitemapPage[]>>,
    onProgress: (progress: { current: number; total: number }) => void,
    shouldStop: () => boolean
  ): Promise<void> {
    const analyzePage = async (page: SitemapPage, index: number) => {
      if (shouldStop()) return;
      setPages((prev) => prev.map((p) => p.id === page.id ? { ...p, status: "analyzing" as const } : p));

      try {
        const crawledContent = await smartCrawl(page.id);
        const wordCount = countWords(crawledContent);

        const analysisResponse = await callAIFn("healthanalyzer", [page.id, crawledContent.substring(0, 5000), page.title || page.slug], "json");
        const analysis = safeJsonParseWithRecovery<{
          healthScore: number; wordCount: number;
          issues: Array<{ type: string; issue: string; fix: string }>;
          recommendations: string[]; critique?: string; strengths?: string[]; weaknesses?: string[];
        }>(analysisResponse, "health", { healthScore: 50, wordCount, issues: [], recommendations: [], strengths: [], weaknesses: [] });

        const updatePriority = analysis.healthScore < 50 ? "Critical" : analysis.healthScore < 70 ? "High" : analysis.healthScore < 90 ? "Medium" : "Healthy";

        setPages((prev) => prev.map((p) => p.id === page.id ? {
          ...p, status: "analyzed" as const, crawledContent, wordCount, healthScore: analysis.healthScore, updatePriority,
          justification: analysis.recommendations?.[0] || "Analysis complete",
          analysis: {
            critique: analysis.critique || `Health: ${analysis.healthScore}/100`,
            strengths: analysis.strengths || [], weaknesses: analysis.weaknesses || analysis.issues?.map((i) => i.issue) || [],
            recommendations: analysis.recommendations || [], seoScore: analysis.healthScore, readabilityScore: Math.min(100, analysis.healthScore + 10),
          },
        } : p));
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        setPages((prev) => prev.map((p) => p.id === page.id ? { ...p, status: "error" as const, justification: errMsg } : p));
      }
      onProgress({ current: index + 1, total: pages.length });
    };

    await processConcurrently(pages, analyzePage, 3, () => {}, shouldStop);
  },
};

// ============================================================================
// SECTION 6: IMAGE GENERATION
// ============================================================================

export const generateImageWithFallback = async (apiClients: ApiClients, prompt: string): Promise<string | null> => {
  if (apiClients.gemini) {
    try {
      const response = await (apiClients.gemini as GoogleGenAI).models.generateImages({
        model: AI_MODELS.GEMINI_IMAGEN, prompt,
        config: { numberOfImages: 1, outputOptions: { mimeType: "image/png" } },
      });
      const imageData = (response as { generatedImages?: Array<{ image?: { imageBytes?: string } }> }).generatedImages?.[0]?.image?.imageBytes;
      if (imageData) return `data:image/png;base64,${imageData}`;
    } catch (e) { console.warn("[generateImage] Gemini failed:", e); }
  }

  if (apiClients.openai) {
    try {
      const response = await (apiClients.openai as OpenAI).images.generate({
        model: AI_MODELS.OPENAI_DALLE3, prompt, n: 1, size: "1024x1024", quality: "standard", response_format: "b64_json",
      });
      const imageData = response.data[0]?.b64_json;
      if (imageData) return `data:image/png;base64,${imageData}`;
    } catch (e) { console.warn("[generateImage] DALL-E failed:", e); }
  }

  return null;
};

// ============================================================================
// SECTION 7: WORDPRESS PUBLISHING
// ============================================================================

export const publishItemToWordPress = async (
  item: ContentItem, wpPassword: string, status: "publish" | "draft", fetchFn: typeof fetch, wpConfig: WpConfig
): Promise<{ success: boolean; message: React.ReactNode; link?: string; postId?: number }> => {
  if (!item.generatedContent) return { success: false, message: "No content to publish" };

  const { title, metaDescription, slug, content, schemaMarkup } = item.generatedContent;
  const baseUrl = wpConfig.url.replace(/\/$/, "");
  const authHeader = `Basic ${btoa(`${wpConfig.username}:${wpPassword}`)}`;
  const schemaString = schemaMarkup ? JSON.stringify(schemaMarkup) : "";
  const contentWithSchema = schemaString ? `${content}<script type="application/ld+json">${schemaString}</script>` : content;

  try {
    const isUpdate = !!item.originalUrl;
    let postId: number | null = null;

    if (isUpdate) {
      const postsRes = await fetchFn(`${baseUrl}/wp-json/wp/v2/posts?slug=${slug}&status=any`, { method: "GET", headers: { Authorization: authHeader } });
      try {
        const posts = safeJsonParse<Array<{ id: number }>>(await postsRes.text(), "WP Lookup");
        if (posts.length > 0) postId = posts[0].id;
      } catch {}
    }

    const endpoint = postId ? `${baseUrl}/wp-json/wp/v2/posts/${postId}` : `${baseUrl}/wp-json/wp/v2/posts`;
    const method = postId ? "PUT" : "POST";

    const response = await fetchFn(endpoint, {
      method,
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: contentWithSchema, status, slug, excerpt: metaDescription,
        meta: { _yoast_wpseo_title: title, _yoast_wpseo_metadesc: metaDescription } }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      try { const err = safeJsonParse<{ message?: string }>(responseText, "WP Error"); return { success: false, message: err.message || `HTTP ${response.status}` }; }
      catch { return { success: false, message: `WordPress returned ${response.status}` }; }
    }

    const result = safeJsonParse<{ id: number; link: string }>(responseText, "WP Publish");
    return { success: true, message: postId ? "Updated!" : "Published!", link: result.link, postId: result.id };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : String(error) };
  }
};

// ============================================================================
// SECTION 8: GOD MODE MAINTENANCE ENGINE
// ============================================================================

class MaintenanceEngine {
  isRunning = false;
  logCallback: (msg: string) => void = console.log;
  private context: GenerationContext | null = null;
  private intervalId: ReturnType<typeof setTimeout> | null = null;

  start(context: GenerationContext): void {
    if (!context.apiClients) {
      this.logCallback("❌ No AI API Clients configured!"); return;
    }
    if (context.existingPages.length === 0) {
      this.logCallback("⚠️ No pages in sitemap."); return;
    }

    this.isRunning = true;
    this.context = context;
    this.logCallback(`🚀 God Mode Activated: ${context.existingPages.length} pages`);
    this.runMaintenanceCycle();
  }

  stop(): void {
    this.isRunning = false;
    this.context = null;
    if (this.intervalId) { clearTimeout(this.intervalId); this.intervalId = null; }
    this.logCallback("⏹️ God Mode Deactivated");
  }

  updateContext(context: GenerationContext): void { this.context = context; }

  private async runMaintenanceCycle(): Promise<void> {
    if (!this.isRunning || !this.context) return;

    try {
      const page = this.getNextPageToOptimize();
      if (!page) {
        this.logCallback("✅ All pages optimized. Waiting...");
        this.scheduleCycle(60000);
        return;
      }

      this.logCallback(`🎯 Target: ${page.title || page.slug}`);
      await this.optimizePage(page);
      this.scheduleCycle(5000);
    } catch (error) {
      this.logCallback(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
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

    const eligible = existingPages.filter((page) => {
      if (excludedUrls?.some((url) => page.id.includes(url))) return false;
      if (excludedCategories?.some((cat) => page.id.toLowerCase().includes(cat.toLowerCase()))) return false;
      const lastProc = localStorage.getItem(`sota_last_proc_${page.id}`);
      if (lastProc && (Date.now() - parseInt(lastProc)) / (1000 * 60 * 60 * 24) < 7) return false;
      return true;
    });

    if (priorityOnlyMode && priorityUrls?.length) {
      return eligible.find((p) => priorityUrls.includes(p.id)) || null;
    }

    eligible.sort((a, b) => {
      const aP = priorityUrls?.includes(a.id) || false;
      const bP = priorityUrls?.includes(b.id) || false;
      if (aP && !bP) return -1;
      if (!aP && bP) return 1;
      return (b.daysOld || 0) - (a.daysOld || 0);
    });

    return eligible[0] || null;
  }

  private async optimizePage(page: SitemapPage): Promise<void> {
    if (!this.context) return;
    const { apiClients, selectedModel, geoTargeting, openrouterModels, selectedGroqModel, wpConfig, serperApiKey } = this.context;

    try {
      this.logCallback(`📥 Crawling ${page.id}`);
      const crawledContent = await smartCrawl(page.id);
      if (!crawledContent || crawledContent.length < 300) {
        this.logCallback(`⚠️ Content too short. Skipping.`); return;
      }

      this.logCallback("🔍 Generating keywords...");
      const keywordsResponse = await callAI(apiClients, selectedModel, geoTargeting, openrouterModels, selectedGroqModel, "semantickeywordgenerator", [page.title || page.slug], "json");
      const semanticKeywords = extractSemanticKeywords(keywordsResponse, "God Mode Keywords");

      this.logCallback("⚡ Optimizing...");
      const optimizedResponse = await callAI(apiClients, selectedModel, geoTargeting, openrouterModels, selectedGroqModel, "godmodestructuralguardian", [crawledContent, semanticKeywords, page.title || page.slug], "html");
      let optimizedContent = surgicalSanitizer(optimizedResponse);

      let changesMade = optimizedContent.length > crawledContent.length * 0.6 ? 1 : 0;

      if (!optimizedContent.includes("verification-footer-sota")) {
        optimizedContent += generateVerificationFooterHtml();
        changesMade++;
      }

      if (!optimizedContent.includes("sota-references-section") && serperApiKey) {
        const refs = await fetchVerifiedReferences(page.title || page.slug, semanticKeywords, serperApiKey, wpConfig.url);
        if (refs) { optimizedContent += refs; changesMade++; }
      }

      if (changesMade > 0) {
        this.logCallback(`📤 Publishing ${changesMade} improvements...`);
        const item: ContentItem = {
          id: page.id, title: page.title!, type: "refresh", originalUrl: page.id, status: "done", statusText: "Optimized",
          generatedContent: {
            title: page.title!, slug: page.slug, content: optimizedContent, metaDescription: "",
            primaryKeyword: page.title!, semanticKeywords,
            strategy: { targetAudience: "", searchIntent: "", competitorAnalysis: "", contentAngle: "" },
            jsonLdSchema: {}, socialMediaCopy: { twitter: "", linkedIn: "" },
            faqSection: [], keyTakeaways: [], outline: [], references: [], imageDetails: [],
          },
        };

        const result = await publishItemToWordPress(item, localStorage.getItem("wpPassword") || "", "publish", fetchWithProxies, wpConfig);
        if (result.success) {
          this.logCallback(`✅ SUCCESS|${page.title}|${page.id}`);
          localStorage.setItem(`sota_last_proc_${page.id}`, Date.now().toString());
        } else {
          this.logCallback(`❌ Failed: ${result.message}`);
        }
      } else {
        this.logCallback(`✅ No changes needed for ${page.title}`);
      }
    } catch (error) {
      this.logCallback(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export const maintenanceEngine = new MaintenanceEngine();

// ============================================================================
// EXPORTS
// ============================================================================

export {
  extractJsonFromResponse,
  safeJsonParse,
  safeJsonParseWithRecovery,
  extractSemanticKeywords,
  surgicalSanitizer,
  stripMarkdownCodeBlocks,
  repairTruncatedJson,
};
