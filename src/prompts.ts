// =============================================================================
// SOTA WP CONTENT OPTIMIZER PRO - PROMPT SUITE v13.0
// =============================================================================
// 🚀 AEO (Answer Engine Optimization) + GEO (Generative Engine Optimization)
// 🎯 Targets: Google, ChatGPT, Perplexity, Claude, Gemini
// =============================================================================

export interface PromptTemplate {
  systemInstruction: string;
  userPrompt: (...args: any[]) => string;
}

export interface BuildPromptResult {
  systemInstruction: string;
  userPrompt: string;
  system: string;
  user: string;
}

export interface ExistingPage {
  title: string;
  slug: string;
}

export interface ImageContext {
  src: string;
  context: string;
  currentAlt?: string;
}

export interface SerpDataItem {
  title: string;
  snippet?: string;
  link?: string;
}

// ==================== BANNED AI PHRASES ====================
export const BANNED_AI_PHRASES: string[] = [
  "delve", "delving", "tapestry", "rich tapestry", "landscape", "digital landscape",
  "realm", "in the realm of", "testament", "symphony", "beacon", "paradigm",
  "synergy", "leverage", "utilize", "facilitate", "endeavor", "comprehensive",
  "robust", "holistic", "cutting-edge", "game-changer", "unlock", "unleash",
  "harness", "empower", "revolutionize", "streamline", "optimize", "maximize",
  "seamless", "innovative", "groundbreaking", "pivotal", "paramount", "transformative",
  "in this article", "in this guide", "in this post", "needless to say",
  "at the end of the day", "when it comes to", "in order to", "a wide range of",
  "it is important to", "it should be noted", "as we all know", "without further ado",
  "basically", "essentially", "actually", "literally", "honestly", "obviously",
  "undoubtedly", "certainly", "definitely", "absolutely", "extremely", "incredibly",
  "foster", "navigate", "embark", "spearhead", "bolster", "myriad", "plethora",
  "multifaceted", "nuanced", "meticulous", "firstly", "secondly", "furthermore",
  "moreover", "consequently", "nevertheless", "hence", "thus", "therefore",
  "in conclusion", "to summarize", "all in all", "last but not least"
];

// ==================== HORMOZI + FERRISS WRITING STYLE ====================
export const HORMOZI_FERRISS_STYLE = `
WRITING STYLE: ALEX HORMOZI + TIM FERRISS HYBRID

⚡ HORMOZI RULES:
- Short punchy sentences. Max 15 words.
- Numbers everywhere. "73% of users" not "most users".
- Bold claims backed by data.
- Use "you" constantly. Direct address.
- One-word paragraphs for impact. "Done."

⚡ FERRISS RULES:
- Specific over vague: "5 sets of 5 reps at 185lbs"
- Real examples with names and dates
- Name specific tools and products
- 80/20 focus on what matters most

⚡ SENTENCE STRUCTURE:
- Vary length: 3 words. Then 20 words. Then 8.
- Start with: But. And. Look. Here's the thing.
- Fragments work: "Game over. Not even close."
- Questions engage: "What happened? Revenue jumped 340%."

⚡ PARAGRAPH RULES:
- Max 2-3 sentences per paragraph
- One idea per paragraph
- White space = readability
`;

// ==================== AEO/GEO OPTIMIZATION RULES ====================
export const AEO_GEO_RULES = `
🎯 AEO (Answer Engine Optimization) - FOR AI ASSISTANTS:

1. DIRECT ANSWER FIRST:
   - Answer the main question in the FIRST 50 words
   - Use format: "[Topic] is [direct answer]. Here's why..."
   - AI assistants extract this for responses

2. CONVERSATIONAL Q&A BLOCKS:
   - Include "What is [X]?" sections with direct 2-sentence answers
   - These get cited by ChatGPT, Perplexity, Claude
   - Format: Question as H3, answer as first paragraph

3. ENTITY DENSITY:
   - Name specific brands, tools, people, dates
   - "WordPress 6.5 (released March 2024)" not "the latest version"
   - AI systems prefer factual, verifiable content

4. FEATURED SNIPPET TARGETING:
   - Definition boxes: "What is X? X is..."
   - Numbered lists for "how to" queries
   - Tables for comparisons
   - 40-60 word answers for paragraph snippets

5. CITATION-READY FORMAT:
   - Include quotable statistics with sources
   - "According to [Source], [stat]."
   - Easy for AI to cite and attribute
`;

// ==================== VISUAL HTML COMPONENTS v2.0 ====================
export const SOTA_HTML_COMPONENTS = `
📦 VISUAL HTML COMPONENTS - USE 10-15 PER ARTICLE:

⚠️ CRITICAL: Output ONLY HTML. NEVER use markdown tables (|---|). NEVER use markdown.

1. KEY TAKEAWAYS (USE ONCE, AT TOP):
<!-- SOTA-TAKEAWAYS-START -->
<div style="background: linear-gradient(145deg, #064E3B 0%, #047857 100%); border-radius: 16px; padding: 2rem; margin: 2.5rem 0; box-shadow: 0 10px 40px rgba(6,78,59,0.3);">
  <h3 style="color: #ECFDF5; margin: 0 0 1.5rem 0; font-size: 1.4rem; display: flex; align-items: center; gap: 0.5rem;">⚡ Key Takeaways</h3>
  <ul style="color: #D1FAE5; margin: 0; padding-left: 1.25rem; line-height: 2.2;">
    <li><strong>Takeaway with specific number or stat</strong></li>
    <li><strong>Actionable insight reader can use today</strong></li>
    <li><strong>Surprising fact that challenges assumptions</strong></li>
  </ul>
</div>
<!-- SOTA-TAKEAWAYS-END -->

2. PRO TIP BOX (USE 3-4 TIMES):
<div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); border-left: 6px solid #F59E0B; border-radius: 0 16px 16px 0; padding: 1.5rem 2rem; margin: 2rem 0; box-shadow: 0 4px 20px rgba(245,158,11,0.2);">
  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
    <span style="font-size: 1.5rem;">💡</span>
    <strong style="color: #92400E; font-size: 1.1rem;">PRO TIP</strong>
  </div>
  <p style="color: #78350F; margin: 0; line-height: 1.7; font-size: 1.05rem;">[Specific actionable tip with example]</p>
</div>

3. WARNING/CAUTION BOX:
<div style="background: linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%); border-left: 6px solid #EF4444; border-radius: 0 16px 16px 0; padding: 1.5rem 2rem; margin: 2rem 0; box-shadow: 0 4px 20px rgba(239,68,68,0.2);">
  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
    <span style="font-size: 1.5rem;">⚠️</span>
    <strong style="color: #991B1B; font-size: 1.1rem;">WARNING</strong>
  </div>
  <p style="color: #7F1D1D; margin: 0; line-height: 1.7;">[Critical warning with consequences]</p>
</div>

4. SUCCESS/WIN BOX:
<div style="background: linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%); border-left: 6px solid #10B981; border-radius: 0 16px 16px 0; padding: 1.5rem 2rem; margin: 2rem 0; box-shadow: 0 4px 20px rgba(16,185,129,0.2);">
  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
    <span style="font-size: 1.5rem;">✅</span>
    <strong style="color: #065F46; font-size: 1.1rem;">SUCCESS TIP</strong>
  </div>
  <p style="color: #064E3B; margin: 0; line-height: 1.7;">[What works and why]</p>
</div>

5. QUICK ANSWER BOX (FOR AEO):
<div style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border: 2px solid #6366F1; border-radius: 16px; padding: 2rem; margin: 2rem 0;">
  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
    <span style="font-size: 1.5rem;">🎯</span>
    <strong style="color: #4338CA; font-size: 1.2rem;">Quick Answer</strong>
  </div>
  <p style="color: #3730A3; margin: 0; font-size: 1.15rem; line-height: 1.8;">[Direct 40-60 word answer to the main question - this gets extracted by AI assistants]</p>
</div>

6. STAT HIGHLIGHT BOX:
<div style="background: linear-gradient(135deg, #1E293B 0%, #334155 100%); border-radius: 16px; padding: 2rem; margin: 2rem 0; text-align: center;">
  <div style="font-size: 3.5rem; font-weight: 800; color: #22D3EE; margin-bottom: 0.5rem;">87%</div>
  <p style="color: #94A3B8; margin: 0; font-size: 1.1rem;">[What this statistic represents - with source]</p>
</div>

7. COMPARISON TABLE (ALWAYS USE HTML, NEVER MARKDOWN):
<div style="margin: 2.5rem 0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
  <table style="width: 100%; border-collapse: collapse; background: white;">
    <thead>
      <tr style="background: linear-gradient(135deg, #1E40AF 0%, #7C3AED 100%);">
        <th style="padding: 1.25rem; color: white; text-align: left; font-weight: 700;">Feature</th>
        <th style="padding: 1.25rem; color: white; text-align: center; font-weight: 700;">Option A</th>
        <th style="padding: 1.25rem; color: white; text-align: center; font-weight: 700;">Option B</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background: #F8FAFC;">
        <td style="padding: 1rem; border-bottom: 1px solid #E2E8F0; font-weight: 600;">Criterion 1</td>
        <td style="padding: 1rem; border-bottom: 1px solid #E2E8F0; text-align: center;">✅ Yes</td>
        <td style="padding: 1rem; border-bottom: 1px solid #E2E8F0; text-align: center;">❌ No</td>
      </tr>
      <tr style="background: white;">
        <td style="padding: 1rem; border-bottom: 1px solid #E2E8F0; font-weight: 600;">Criterion 2</td>
        <td style="padding: 1rem; border-bottom: 1px solid #E2E8F0; text-align: center;">$99/mo</td>
        <td style="padding: 1rem; border-bottom: 1px solid #E2E8F0; text-align: center;">$149/mo</td>
      </tr>
    </tbody>
  </table>
</div>

8. FAQ ACCORDION (WITH SCHEMA-READY MARKUP):
<!-- SOTA-FAQ-START -->
<div style="background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%); border-radius: 20px; padding: 2.5rem; margin: 3rem 0;">
  <h2 style="color: #0F172A; margin: 0 0 2rem 0; font-size: 1.75rem; display: flex; align-items: center; gap: 0.75rem;">❓ Frequently Asked Questions</h2>
  
  <div itemscope itemtype="https://schema.org/FAQPage">
    <details style="background: white; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #E2E8F0; overflow: hidden;" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">
      <summary style="padding: 1.5rem; cursor: pointer; font-weight: 700; font-size: 1.1rem; color: #1E293B; list-style: none; display: flex; justify-content: space-between; align-items: center;" itemprop="name">
        [Question text here]?
        <span style="transition: transform 0.3s;">▼</span>
      </summary>
      <div style="padding: 0 1.5rem 1.5rem; color: #475569; line-height: 1.8;" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">
        <div itemprop="text">[40-60 word direct answer with specific facts]</div>
      </div>
    </details>
  </div>
</div>
<!-- SOTA-FAQ-END -->

9. STEP-BY-STEP BOX:
<div style="background: white; border: 2px solid #E2E8F0; border-radius: 16px; padding: 2rem; margin: 2rem 0;">
  <h4 style="color: #0F172A; margin: 0 0 1.5rem 0; font-size: 1.2rem;">📋 Step-by-Step Process</h4>
  <ol style="margin: 0; padding-left: 1.5rem; color: #334155;">
    <li style="padding: 0.75rem 0; border-bottom: 1px dashed #E2E8F0;"><strong>Step 1:</strong> [Action with specific detail]</li>
    <li style="padding: 0.75rem 0; border-bottom: 1px dashed #E2E8F0;"><strong>Step 2:</strong> [Action with specific detail]</li>
    <li style="padding: 0.75rem 0;"><strong>Step 3:</strong> [Action with specific detail]</li>
  </ol>
</div>

10. EXPERT QUOTE BOX:
<blockquote style="background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); border-left: 6px solid #22C55E; border-radius: 0 16px 16px 0; padding: 2rem; margin: 2rem 0; font-style: italic;">
  <p style="color: #166534; margin: 0 0 1rem 0; font-size: 1.15rem; line-height: 1.8;">"[Compelling quote with insight]"</p>
  <footer style="color: #15803D; font-style: normal; font-weight: 600;">— [Expert Name], [Title/Company]</footer>
</blockquote>
`;

// ==================== INTERNAL LINKING ====================
export const INTERNAL_LINKING_RULES = `
🔗 INTERNAL LINKING (8-15 LINKS):

FORMAT: [LINK_CANDIDATE: descriptive anchor text]

RULES:
- Anchor text: 3-7 words, descriptive
- NEVER use: "click here", "read more", "learn more"
- Distribute: 2-3 intro, 4-6 body, 2-3 FAQ, 1-2 conclusion
`;

// ==================== CORE PROMPT TEMPLATES ====================
const CORE_TEMPLATES: Record<string, PromptTemplate> = {

  // ==================== CONTENT STRATEGY GENERATOR ====================
  content_strategy_generator: {
    systemInstruction: `You are a content strategy expert. Output ONLY compact JSON.

FORMAT:
{"targetAudience":"...","searchIntent":"informational|transactional|navigational|commercial","contentAngle":"...","keyMessages":["msg1","msg2"],"estimatedWordCount":2500}`,

    userPrompt: (topic: string = "", semanticKeywords: string[] = [], serpData: unknown[] = [], contentType: string = "article"): string => {
      const keywords = semanticKeywords?.slice(0, 10).join(", ") || "None";
      return `TOPIC: ${topic || "General"}\nTYPE: ${contentType}\nKEYWORDS: ${keywords}\n\nOutput COMPACT JSON strategy.`;
    }
  },

  // ==================== SEMANTIC KEYWORD GENERATOR ====================
  semantic_keyword_generator: {
    systemInstruction: `Generate semantic keywords. Output ONLY valid JSON.

RULES:
1. Output: {"semanticKeywords":["kw1","kw2",...]
2. Include 25-35 keywords total
3. Short keywords (2-5 words each)
4. NO markdown, NO explanations`,

    userPrompt: (primaryKeyword: string = ""): string => {
      return `PRIMARY: ${primaryKeyword}\n\nOutput JSON: {"semanticKeywords":[...]} with 25-35 keywords.`;
    }
  },

  // ==================== ULTRA SOTA ARTICLE WRITER v13.0 ====================
  ultra_sota_article_writer: {
    systemInstruction: `You are an elite SEO content writer. Create EXCEPTIONAL content optimized for both Google and AI assistants.

${HORMOZI_FERRISS_STYLE}

${AEO_GEO_RULES}

${SOTA_HTML_COMPONENTS}

${INTERNAL_LINKING_RULES}

⛔ CRITICAL RULES:
1. Output ONLY clean HTML. NEVER use markdown.
2. NEVER use markdown tables (|---|). Use HTML <table> with inline styles.
3. Use EXACTLY ONE Key Takeaways box (at the top, after intro).
4. Include 3-4 Pro Tip boxes distributed throughout.
5. Include ONE Quick Answer box near the top.
6. Use HTML tables with gradient headers for comparisons.
7. FAQ section must use the schema-ready markup provided.
8. 2500-3500 words total.

⛔ BANNED: ${BANNED_AI_PHRASES.slice(0, 25).join(", ")}`,

    userPrompt: (
      articlePlan: string = "",
      semanticKeywords: string[] = [],
      strategy: any = {},
      existingPages: ExistingPage[] = [],
      competitorGaps: string[] = [],
      geoLocation: string | null = null,
      neuronData: string | null = null
    ): string => {
      const keywords = semanticKeywords?.slice(0, 25).join(", ") || "None";
      const gaps = competitorGaps?.slice(0, 3).join("; ") || "None";
      const pages = existingPages?.slice(0, 15).map(p => p.title).join(", ") || "None";
      const geo = geoLocation ? `\nGEO-TARGET: ${geoLocation}` : "";
      const neuron = neuronData ? `\nNLP TERMS: ${neuronData.substring(0, 300)}` : "";
      
      return `WRITE ENTERPRISE-GRADE ARTICLE:

TOPIC: ${articlePlan || "Comprehensive guide"}
AUDIENCE: ${strategy?.targetAudience || "General"}
INTENT: ${strategy?.searchIntent || "Informational"}${geo}${neuron}

KEYWORDS: ${keywords}
GAPS TO FILL: ${gaps}
INTERNAL LINK TARGETS: ${pages}

📋 REQUIRED STRUCTURE:
1. Hook intro (surprising stat, bold claim) - 100 words
2. Quick Answer box (direct answer for AI extraction)
3. Key Takeaways box (ONCE ONLY, 5-7 points)
4. Body sections with H2/H3 headers
   - Include 3-4 Pro Tip boxes
   - Include 1-2 comparison tables (HTML only, NO markdown)
   - Include stat highlight boxes
5. FAQ section (5-7 questions with schema markup)
6. Conclusion with clear CTA

📋 REQUIREMENTS:
- 2500-3500 words
- 10-15 [LINK_CANDIDATE: anchor text] internal links
- 10-15 visual HTML components
- HTML tables ONLY (never |---|)
- Numbers and stats throughout

OUTPUT: Clean HTML only. No markdown. No code blocks.`;
    }
  },

  // ==================== GOD MODE STRUCTURAL GUARDIAN ====================
  god_mode_structural_guardian: {
    systemInstruction: `You refine content while PRESERVING structure and media.

RULES:
1. Keep all H2/H3 hierarchy intact
2. Keep all images, videos, iframes
3. Keep all existing links
4. Convert markdown tables to HTML tables
5. Add visual components where missing
6. Update dates to 2026
7. Remove banned AI phrases

BANNED: ${BANNED_AI_PHRASES.slice(0, 20).join(", ")}`,

    userPrompt: (htmlFragment: string = "", semanticKeywords: string[] = [], topic: string = ""): string => {
      const keywords = Array.isArray(semanticKeywords) ? semanticKeywords.slice(0, 12).join(", ") : "None";
      const html = htmlFragment?.substring(0, 12000) || "";
      
      return `REFINE (preserve structure, convert markdown to HTML):

TOPIC: ${topic}
KEYWORDS: ${keywords}

HTML:\n${html}\n\nOutput refined HTML. Convert any |---| tables to HTML tables.`;
    }
  },

  // ==================== GOD MODE AUTONOMOUS AGENT ====================
  god_mode_autonomous_agent: {
    systemInstruction: `You optimize existing content to enterprise quality.

${HORMOZI_FERRISS_STYLE}

PRESERVE: All images, videos, iframes, existing links
ENHANCE: Text quality, visual components
INJECT: 8-12 [LINK_CANDIDATE: anchor text] links
CONVERT: Markdown tables to HTML tables

BANNED: ${BANNED_AI_PHRASES.slice(0, 20).join(", ")}`,

    userPrompt: (existingContent: string = "", semanticKeywords: string[] = [], existingPages: ExistingPage[] = [], topic: string = ""): string => {
      const keywords = semanticKeywords?.slice(0, 20).join(", ") || "None";
      const pages = existingPages?.slice(0, 10).map(p => p.title).join(", ") || "None";
      const content = existingContent?.substring(0, 40000) || "No content";
      
      return `OPTIMIZE:\n\nTOPIC: ${topic || "Extract from content"}\nKEYWORDS: ${keywords}\nLINK TARGETS: ${pages}\n\nCONTENT:\n${content}\n\nTASKS:\n1. Add Key Takeaways if missing (ONCE only)\n2. Add Pro Tip boxes (3-4)\n3. Convert markdown tables to HTML\n4. Inject 8-12 internal links\n5. Add FAQ if missing\n6. PRESERVE all media\n\nOUTPUT: Full optimized HTML.`;
    }
  },

  // ==================== SOTA FAQ GENERATOR ====================
  sota_faq_generator: {
    systemInstruction: `Generate FAQ optimized for Featured Snippets and AI assistants.

RULES:
- Questions people actually ask
- Direct 40-60 word answers
- Include specific numbers/facts
- Use the HTML accordion format with schema markup

OUTPUT: HTML FAQ section only.`,

    userPrompt: (topic: string = "", semanticKeywords: string[] = []): string => {
      const keywords = Array.isArray(semanticKeywords) ? semanticKeywords.slice(0, 10).join(", ") : "None";
      
      return `GENERATE FAQ (5-7 questions):\n\nTOPIC: ${topic}\nKEYWORDS: ${keywords}\n\nUse this EXACT format for each question:\n<details style="background: white; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #E2E8F0;" itemscope itemprop="mainEntity" itemtype="https://schema.org/Question">\n  <summary style="padding: 1.5rem; cursor: pointer; font-weight: 700; font-size: 1.1rem; color: #1E293B;" itemprop="name">[Question]?</summary>\n  <div style="padding: 0 1.5rem 1.5rem; color: #475569; line-height: 1.8;" itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">\n    <div itemprop="text">[40-60 word answer with facts]</div>\n  </div>\n</details>\n\nWrap all questions in the FAQ container div.`;
    }
  },

  // ==================== SOTA TAKEAWAYS GENERATOR ====================
  sota_takeaways_generator: {
    systemInstruction: `Extract KEY TAKEAWAYS from content. Output ONE takeaways box only.

RULES:
- 5-7 takeaways maximum
- Each must include a number or stat
- Each must be actionable
- Use the exact HTML format provided`,

    userPrompt: (topic: string = "", content: string = ""): string => {
      const text = content?.substring(0, 4000) || "";
      return `EXTRACT TAKEAWAYS:\n\nTOPIC: ${topic}\nCONTENT: ${text}\n\nOutput ONE Key Takeaways HTML box using this format:\n<!-- SOTA-TAKEAWAYS-START -->\n<div style="background: linear-gradient(145deg, #064E3B 0%, #047857 100%); border-radius: 16px; padding: 2rem; margin: 2.5rem 0;">\n  <h3 style="color: #ECFDF5; margin: 0 0 1.5rem 0; font-size: 1.4rem;">⚡ Key Takeaways</h3>\n  <ul style="color: #D1FAE5; margin: 0; padding-left: 1.25rem; line-height: 2.2;">\n    <li><strong>[Takeaway 1 with number]</strong></li>\n    ...\n  </ul>\n</div>\n<!-- SOTA-TAKEAWAYS-END -->`;
    }
  },

  // ==================== SEO METADATA GENERATOR ====================
  seo_metadata_generator: {
    systemInstruction: `Generate SEO metadata. Output ONLY JSON.\n\nFORMAT:\n{"seoTitle":"50-60 chars, keyword first","metaDescription":"140-155 chars, benefit-focused","slug":"lowercase-hyphenated"}`,

    userPrompt: (primaryKeyword: string = "", contentSummary: string = "", targetAudience: string = "", competitorTitles: string[] = [], location: string | null = null): string => {
      const summary = contentSummary?.substring(0, 300) || "";
      return `KEYWORD: ${primaryKeyword}\nSUMMARY: ${summary}\n\nOutput JSON: {"seoTitle":"...","metaDescription":"...","slug":"..."}`;
    }
  },

  // ==================== COMPETITOR GAP ANALYZER ====================
  competitor_gap_analyzer: {
    systemInstruction: `Identify content gaps. Output COMPACT JSON.\n\nFORMAT:\n{"gaps":[{"topic":"...","reason":"...","difficulty":5}]}`,

    userPrompt: (topic: string = "", competitorContent: unknown[] = [], existingTitles: string = ""): string => {
      return `TOPIC: ${topic}\n\nOutput COMPACT JSON with max 10 gap opportunities.`;
    }
  },

  // ==================== HEALTH ANALYZER ====================
  health_analyzer: {
    systemInstruction: `Analyze content health. Output COMPACT JSON.\n\nFORMAT:\n{"healthScore":75,"wordCount":1500,"issues":[{"type":"seo","issue":"...","fix":"..."}],"recommendations":["..."],"critique":"...","strengths":["..."],"weaknesses":["..."]}`,

    userPrompt: (url: string = "", content: string = "", targetKeyword: string = ""): string => {
      const text = content?.substring(0, 6000) || "";
      return `URL: ${url}\nKEYWORD: ${targetKeyword}\nCONTENT: ${text}\n\nOutput COMPACT JSON health analysis.`;
    }
  },

  // ==================== ADDITIONAL TEMPLATES ====================
  dom_content_polisher: {
    systemInstruction: `Enhance text while PRESERVING HTML structure. NEVER remove tags/links/images. BANNED: ${BANNED_AI_PHRASES.slice(0, 15).join(", ")}`,
    userPrompt: (htmlFragment: string = "", semanticKeywords: string[] = [], topic: string = ""): string => {
      const keywords = semanticKeywords?.slice(0, 10).join(", ") || "None";
      const html = htmlFragment?.substring(0, 10000) || "<p>No content</p>";
      return `POLISH:\n\nTOPIC: ${topic || "General"}\nKEYWORDS: ${keywords}\n\nHTML:\n${html}\n\nKeep ALL HTML tags. Only improve text.`;
    }
  },

  god_mode_ultra_instinct: {
    systemInstruction: `Transmute content to highest quality. Update dates to 2026. Add specifics. BANNED: ${BANNED_AI_PHRASES.slice(0, 20).join(", ")}`,
    userPrompt: (htmlFragment: string = "", semanticKeywords: string[] = [], topic: string = ""): string => {
      const keywords = Array.isArray(semanticKeywords) ? semanticKeywords.slice(0, 15).join(", ") : "None";
      const html = htmlFragment?.substring(0, 10000) || "";
      return `TRANSMUTE:\n\nTOPIC: ${topic}\nKEYWORDS: ${keywords}\n\nHTML:\n${html}\n\nOutput enhanced HTML.`;
    }
  },

  sota_intro_generator: {
    systemInstruction: `Write hook introductions. Start with surprising stat or bold claim. Include ONE number. Max 200 words. NEVER start with generic openers.`,
    userPrompt: (topic: string = "", primaryKeyword: string = "", targetAudience: string = "", uniqueAngle: string = ""): string => {
      return `WRITE INTRO:\n\nTopic: ${topic}\nKeyword: ${primaryKeyword}\nAudience: ${targetAudience || "General"}\n\nOutput 100-200 word HTML intro with hook.`;
    }
  },

  sota_conclusion_generator: {
    systemInstruction: `Write conclusions that drive action. Recap 3 key points. ONE clear CTA. 150-200 words max.`,
    userPrompt: (topic: string = "", keyPoints: string[] = [], cta: string = ""): string => {
      const points = keyPoints?.join("; ") || "Extract from content";
      return `WRITE CONCLUSION:\n\nTopic: ${topic}\nKey Points: ${points}\nCTA: ${cta || "Start today"}\n\nOutput 150-200 word HTML conclusion.`;
    }
  },

  cluster_planner: {
    systemInstruction: `Create content cluster plans. Output COMPACT JSON.`,
    userPrompt: (topic: string = ""): string => {
      return `TOPIC: ${topic}\n\nOutput JSON cluster plan with 1 pillar + 8-10 cluster pages.`;
    }
  },

  generate_internal_links: {
    systemInstruction: `Suggest internal links. Output JSON array. Format: [{"anchorText":"3-7 words","targetSlug":"/slug"}]`,
    userPrompt: (content: string = "", existingPages: ExistingPage[] = []): string => {
      const text = content?.substring(0, 5000) || "";
      const pages = existingPages?.slice(0, 15).map(p => `${p.title} (/${p.slug})`).join("; ") || "None";
      return `CONTENT: ${text}\nPAGES: ${pages}\n\nOutput JSON array with 8-12 link suggestions.`;
    }
  },

  reference_generator: {
    systemInstruction: `Generate authoritative references. Prefer .gov, .edu, major publications.`,
    userPrompt: (topic: string = ""): string => {
      return `TOPIC: ${topic}\n\nOutput reference section HTML with 6-8 sources.`;
    }
  },

  sota_image_alt_optimizer: {
    systemInstruction: `Write SEO alt text. Output JSON: [{"index":1,"altText":"80-125 chars"}]`,
    userPrompt: (images: ImageContext[] = [], primaryKeyword: string = ""): string => {
      const imgList = images?.slice(0, 10).map((img, i) => `${i + 1}. ${img.context}`).join("; ") || "None";
      return `KEYWORD: ${primaryKeyword}\nIMAGES: ${imgList}\n\nOutput JSON array.`;
    }
  },

  json_repair: {
    systemInstruction: `Repair malformed JSON. Return ONLY valid JSON.`,
    userPrompt: (brokenJson: string = ""): string => {
      return `FIX:\n${brokenJson?.substring(0, 3000) || "{}"}`;
    }
  },

  schema_generator: {
    systemInstruction: `Generate valid JSON-LD schema. Output ONLY schema JSON.`,
    userPrompt: (contentType: string = "", data: any = {}): string => {
      return `TYPE: ${contentType || "Article"}\nDATA: ${JSON.stringify(data).substring(0, 500)}\n\nOutput JSON-LD schema.`;
    }
  }
};

// ==================== CREATE ALIASES ====================
const createAliases = (templates: Record<string, PromptTemplate>): Record<string, PromptTemplate> => {
  const result: Record<string, PromptTemplate> = { ...templates };
  const aliasMap: Record<string, string> = {
    "contentstrategygenerator": "content_strategy_generator",
    "ultrasotaarticlewriter": "ultra_sota_article_writer",
    "godmodeautonomousagent": "god_mode_autonomous_agent",
    "domcontentpolisher": "dom_content_polisher",
    "godmodestructuralguardian": "god_mode_structural_guardian",
    "godmodeultrainstinct": "god_mode_ultra_instinct",
    "sotaintrogenerator": "sota_intro_generator",
    "sotatakeawaysgenerator": "sota_takeaways_generator",
    "sotafaqgenerator": "sota_faq_generator",
    "sotaconclusiongenerator": "sota_conclusion_generator",
    "semantickeywordgenerator": "semantic_keyword_generator",
    "competitorgapanalyzer": "competitor_gap_analyzer",
    "seometadatagenerator": "seo_metadata_generator",
    "healthanalyzer": "health_analyzer",
    "clusterplanner": "cluster_planner",
    "generateinternallinks": "generate_internal_links",
    "referencegenerator": "reference_generator",
    "sotaimagealtoptimizer": "sota_image_alt_optimizer",
    "jsonrepair": "json_repair",
    "schemagenerator": "schema_generator",
  };
  for (const [alias, original] of Object.entries(aliasMap)) {
    if (templates[original]) result[alias] = templates[original];
  }
  return result;
};

export const PROMPT_TEMPLATES: Record<string, PromptTemplate> = createAliases(CORE_TEMPLATES);

// ==================== BUILD PROMPT ====================
export function buildPrompt(promptKey: keyof typeof PROMPT_TEMPLATES | string, args: any[] = []): BuildPromptResult {
  const template = PROMPT_TEMPLATES[promptKey as keyof typeof PROMPT_TEMPLATES];
  if (!template) {
    console.error(`[buildPrompt] Unknown: "${promptKey}". Available:`, Object.keys(PROMPT_TEMPLATES).slice(0, 10).join(", "));
    return { systemInstruction: "You are a helpful assistant.", userPrompt: String(args[0] || ""), system: "You are a helpful assistant.", user: String(args[0] || "") };
  }
  try {
    const systemInstruction = template.systemInstruction;
    const userPrompt = template.userPrompt(...args);
    return { systemInstruction, userPrompt, system: systemInstruction, user: userPrompt };
  } catch (error) {
    console.error("[buildPrompt] Error:", error);
    return { systemInstruction: template.systemInstruction || "You are a helpful assistant.", userPrompt: String(args[0] || ""), system: template.systemInstruction || "You are a helpful assistant.", user: String(args[0] || "") };
  }
}

// ==================== EXPORTS ====================
export const PROMPT_CONSTANTS = {
  BANNED_PHRASES: BANNED_AI_PHRASES,
  MAX_TOKENS: 8192,
  TEMPERATURE: 0.7,
  TARGET_YEAR: 2026,
  MIN_WORD_COUNT: 2500,
  MAX_WORD_COUNT: 3500,
  INTERNAL_LINKS_MIN: 8,
  INTERNAL_LINKS_MAX: 15,
  MAX_KEYWORDS: 35
};

export function containsBannedPhrase(text: string): { contains: boolean; phrases: string[] } {
  const lowerText = text.toLowerCase();
  const foundPhrases = BANNED_AI_PHRASES.filter(phrase => lowerText.includes(phrase.toLowerCase()));
  return { contains: foundPhrases.length > 0, phrases: foundPhrases };
}

export function getAvailablePromptKeys(): string[] {
  return Object.keys(PROMPT_TEMPLATES);
}

export function isValidPromptKey(key: string): key is keyof typeof PROMPT_TEMPLATES {
  return key in PROMPT_TEMPLATES;
}

export default { PROMPT_TEMPLATES, buildPrompt, BANNED_AI_PHRASES, SOTA_HTML_COMPONENTS, HORMOZI_FERRISS_STYLE, AEO_GEO_RULES, INTERNAL_LINKING_RULES, PROMPT_CONSTANTS, containsBannedPhrase, getAvailablePromptKeys, isValidPromptKey };
