// =============================================================================
// INTERNAL LINK ORCHESTRATOR v1.0.0 - Enterprise-Grade Link Distribution
// SOTA Implementation: Zone-Based Distribution with Contextual Anchors
// =============================================================================

import {
  ContextualAnchorEngine,
  PageInfo,
  LinkInjectionResult,
  ContextualAnchorConfig,
} from './ContextualAnchorEngine';
import { escapeRegExp } from './contentUtils';

// ==================== TYPE DEFINITIONS ====================

export interface LinkDistributionZone {
  name: string;
  startPercent: number;
  endPercent: number;
  minLinks: number;
  maxLinks: number;
  priority: number;
}

export interface LinkDistributionConfig {
  zones: LinkDistributionZone[];
  totalTargetLinks: number;
  minParagraphLength: number;
  maxLinksPerParagraph: number;
  minWordsBetweenLinks: number;
  skipSections: string[];
  anchorConfig: Partial<ContextualAnchorConfig>;
}

export interface OrchestratorResult {
  html: string;
  linksInjected: number;
  distribution: Map<string, number>;
  injectionDetails: LinkInjectionResult[];
}

// ==================== CONSTANTS ====================

// ULTRA PREMIUM Link Distribution Zones
const DEFAULT_ZONES: LinkDistributionZone[] = [
  { name: 'INTRO', startPercent: 0, endPercent: 10, minLinks: 0, maxLinks: 2, priority: 5 },
  { name: 'EARLY_BODY', startPercent: 10, endPercent: 30, minLinks: 2, maxLinks: 3, priority: 3 },
  { name: 'MID_BODY', startPercent: 30, endPercent: 60, minLinks: 3, maxLinks: 4, priority: 1 },
  { name: 'LATE_BODY', startPercent: 60, endPercent: 80, minLinks: 2, maxLinks: 3, priority: 2 },
  { name: 'FAQ_CONCLUSION', startPercent: 80, endPercent: 100, minLinks: 2, maxLinks: 3, priority: 4 },
];

const DEFAULT_CONFIG: LinkDistributionConfig = {
  zones: DEFAULT_ZONES,
  totalTargetLinks: 12,
  minParagraphLength: 60,
  maxLinksPerParagraph: 1,
  minWordsBetweenLinks: 200,
  skipSections: [
    '.sota-faq-section',
    '.sota-references-section',
    '.sota-references-wrapper',
    '[class*="faq"]',
    '[class*="reference"]',
    '.verification-footer-sota',
    '[itemtype*="FAQPage"]',
  ],
  anchorConfig: {
    minAnchorWords: 3,
    maxAnchorWords: 7,
    minContextScore: 0.35,
    preferredPosition: 'middle',
    avoidHeadingDuplication: true,
  },
};

console.log('[InternalLinkOrchestrator] Module loaded');

// ==================== HELPER FUNCTIONS ====================

/**
 * Get the nearest heading above an element
 */
const getNearbyHeading = (element: Element, doc: Document): string | null => {
  // Look for heading in parent section
  const section = element.closest('section, article, div[class*="section"]');
  if (section) {
    const heading = section.querySelector('h2, h3');
    if (heading) return heading.textContent?.trim() || null;
  }

  // Walk backwards through previous siblings
  let sibling = element.previousElementSibling;
  while (sibling) {
    if (['H2', 'H3', 'H4'].includes(sibling.tagName)) {
      return sibling.textContent?.trim() || null;
    }
    sibling = sibling.previousElementSibling;
  }

  return null;
};

/**
 * Determine which zone an element belongs to based on position
 */
const getElementZone = (
  element: Element,
  allElements: Element[],
  zones: LinkDistributionZone[]
): LinkDistributionZone | null => {
  const index = allElements.indexOf(element);
  if (index === -1) return null;

  const positionPercent = (index / allElements.length) * 100;

  for (const zone of zones) {
    if (positionPercent >= zone.startPercent && positionPercent < zone.endPercent) {
      return zone;
    }
  }

  return zones[zones.length - 1]; // Default to last zone
};

/**
 * Check if element should be skipped for link injection
 */
const shouldSkipElement = (element: Element, skipSelectors: string[]): boolean => {
  for (const selector of skipSelectors) {
    try {
      if (element.closest(selector)) return true;
    } catch (e) {
      // Invalid selector, ignore
    }
  }
  return false;
};

/**
 * Count words in text
 */
const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
};

// ==================== MAIN ORCHESTRATOR CLASS ====================

export class InternalLinkOrchestrator {
  private config: LinkDistributionConfig;
  private anchorEngine: ContextualAnchorEngine;
  private zoneLinks: Map<string, number>;
  private lastLinkWordPosition: number;
  private totalWordsProcessed: number;

  constructor(config: Partial<LinkDistributionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.anchorEngine = new ContextualAnchorEngine(this.config.anchorConfig);
    this.zoneLinks = new Map();
    this.lastLinkWordPosition = -this.config.minWordsBetweenLinks;
    this.totalWordsProcessed = 0;

    // Initialize zone counters
    for (const zone of this.config.zones) {
      this.zoneLinks.set(zone.name, 0);
    }
  }

  /**
   * Reset orchestrator state for a new document
   */
  reset(): void {
    this.anchorEngine.reset();
    this.zoneLinks.clear();
    this.lastLinkWordPosition = -this.config.minWordsBetweenLinks;
    this.totalWordsProcessed = 0;

    for (const zone of this.config.zones) {
      this.zoneLinks.set(zone.name, 0);
    }
  }

  /**
   * Check if we can add more links to a zone
   */
  private canAddLinkToZone(zone: LinkDistributionZone): boolean {
    const currentCount = this.zoneLinks.get(zone.name) || 0;
    return currentCount < zone.maxLinks;
  }

  /**
   * Check if minimum spacing requirement is met
   */
  private meetsSpacingRequirement(): boolean {
    return (this.totalWordsProcessed - this.lastLinkWordPosition) >= this.config.minWordsBetweenLinks;
  }

  /**
   * Process HTML content and inject contextual internal links
   */
  processContent(
    html: string,
    availablePages: PageInfo[],
    baseUrl: string
  ): OrchestratorResult {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.body;

    const injectionDetails: LinkInjectionResult[] = [];

    // Collect all linkable elements
    const allElements = Array.from(body.querySelectorAll('p, li'));
    
    // Filter out elements in skip sections
    const linkableElements = allElements.filter(el => {
      if (shouldSkipElement(el, this.config.skipSections)) return false;
      if ((el.textContent?.length || 0) < this.config.minParagraphLength) return false;
      if (el.querySelectorAll('a').length >= this.config.maxLinksPerParagraph) return false;
      return true;
    });

    console.log(`[Orchestrator] Found ${linkableElements.length} linkable elements out of ${allElements.length}`);

    // Sort pages by priority (more specific = higher priority)
    const sortedPages = [...availablePages].sort((a, b) => {
      return b.title.split(' ').length - a.title.split(' ').length;
    });

    // Process zones by priority
    const sortedZones = [...this.config.zones].sort((a, b) => a.priority - b.priority);

    let totalLinksInjected = 0;

    for (const zone of sortedZones) {
      // Get elements in this zone
      const zoneElements = linkableElements.filter(el => {
        const elementZone = getElementZone(el, allElements, this.config.zones);
        return elementZone?.name === zone.name;
      });

      console.log(`[Orchestrator] Zone ${zone.name}: ${zoneElements.length} elements`);

      // Process elements in this zone
      for (const element of zoneElements) {
        if (totalLinksInjected >= this.config.totalTargetLinks) break;
        if (!this.canAddLinkToZone(zone)) break;

        // Update word count
        const elementWords = countWords(element.textContent || '');
        
        // Check spacing requirement
        if (!this.meetsSpacingRequirement()) {
          this.totalWordsProcessed += elementWords;
          continue;
        }

        // Get nearby heading for context
        const nearbyHeading = getNearbyHeading(element, doc);

        // Try to inject a link
        const result = this.anchorEngine.processContainer(
          element,
          sortedPages,
          baseUrl,
          nearbyHeading || undefined
        );

        if (result && result.success) {
          totalLinksInjected++;
          this.zoneLinks.set(zone.name, (this.zoneLinks.get(zone.name) || 0) + 1);
          this.lastLinkWordPosition = this.totalWordsProcessed + Math.floor(elementWords / 2);
          injectionDetails.push(result);

          console.log(`[Orchestrator] Injected link in ${zone.name}: "${result.anchor}" -> ${result.targetSlug}`);
        }

        this.totalWordsProcessed += elementWords;
      }
    }

    console.log(`[Orchestrator] Total links injected: ${totalLinksInjected}/${this.config.totalTargetLinks}`);
    console.log(`[Orchestrator] Distribution:`, Object.fromEntries(this.zoneLinks));

    return {
      html: body.innerHTML,
      linksInjected: totalLinksInjected,
      distribution: new Map(this.zoneLinks),
      injectionDetails,
    };
  }

  /**
   * Get current distribution statistics
   */
  getDistribution(): Map<string, number> {
    return new Map(this.zoneLinks);
  }
}

// ==================== CONVENIENCE FUNCTION ====================

/**
 * Process content with enterprise-grade contextual internal links
 * Main entry point for the linking system
 */
export const injectEnterpriseInternalLinks = (
  content: string,
  availablePages: Array<{ title: string; slug: string }>,
  baseUrl: string,
  targetLinks: number = 12
): string => {
  if (availablePages.length === 0) {
    console.log('[Enterprise Links] No pages available for linking');
    return content;
  }

  const orchestrator = new InternalLinkOrchestrator({
    totalTargetLinks: targetLinks,
  });

  const pageInfos: PageInfo[] = availablePages.map(p => ({
    title: p.title,
    slug: p.slug,
  }));

  const result = orchestrator.processContent(content, pageInfos, baseUrl);

  console.log(`[Enterprise Links] Final result: ${result.linksInjected} links injected`);

  return result.html;
};

// ==================== EXPORTS ====================

export default {
  InternalLinkOrchestrator,
  injectEnterpriseInternalLinks,
  DEFAULT_CONFIG,
  DEFAULT_ZONES,
};
