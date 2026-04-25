import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/* ============================================================
   Library — the publishing engine.
   Per deck §08, six core categories:
   white-paper, framework, case-study (cross-link), press-essay,
   track-record-essay, firm-built-essay
   ============================================================ */
const library = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/library' }),
  schema: z.object({
    title: z.string(),
    type: z.enum([
      'white-paper',
      'framework',
      'press-essay',
      'track-record-essay',
      'firm-built-essay',
      'methodology-note',
    ]),
    publishedAt: z.coerce.date(),
    summary: z.string(),
    deck: z.string().optional(),
    readingMinutes: z.number().int().positive().optional(),
    authors: z.array(z.string()).default(['Jay Davis']),
    tags: z.array(z.string()).default([]),
    foundational: z.boolean().default(false),
    unlisted: z.boolean().default(false),
    series: z.string().optional(),
    seriesOrder: z.number().int().optional(),
    /* Optional pull-quote excerpt for index cards */
    excerpt: z.string().optional(),
  }),
});

/* ============================================================
   Track Record — the six historical patterns.
   Per deck §03 / §07, each entry pairs PIN's earlier
   implementation with mainstream emergence and primary-source
   evidence. The /track-record page renders a museum-grade
   archive timeline. Each entry has a full essay treatment.
   ============================================================ */
const trackRecord = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/track-record' }),
  schema: z.object({
    title: z.string(),
    /* Display year — e.g., "2008" or "2010-11" */
    year: z.string(),
    /* Numeric sort key — e.g., 2008, 2010 */
    yearSort: z.number().int(),
    /* Optional explicit timeline ordering (otherwise yearSort) */
    order: z.number().int().optional(),
    /* Three-column row content for the timeline */
    pinImplementation: z.string(),
    mainstreamEmergence: z.string(),
    evidence: z.string(),
    /* Lede / summary for the entry's full page */
    summary: z.string().optional(),
    publishedAt: z.coerce.date().optional(),
    /* Primary-source artifacts — added when files arrive */
    artifacts: z
      .array(
        z.object({
          kind: z.enum(['pdf', 'image', 'youtube', 'link', 'document']),
          label: z.string(),
          /* For pdf/image/document: path under /artifacts/. For youtube: video id. For link: url. */
          src: z.string(),
          caption: z.string().optional(),
          /* Date the artifact was created/published */
          dated: z.string().optional(),
        })
      )
      .default([]),
    /* The mainstream company / product PIN's implementation predates */
    foilCompany: z.string().optional(),
    foilYear: z.string().optional(),
    yearsAhead: z.string().optional(),
  }),
});

/* ============================================================
   Case Studies — sovereign / enterprise / firm-built.
   Per deck §08, each case opens with the four research-paper
   anchors: development question, methodology applied,
   output, counterfactual considered.
   ============================================================ */
const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/case-studies' }),
  schema: z.object({
    title: z.string(),
    tier: z.enum(['sovereign', 'enterprise', 'firm-built']),
    /* Sub-classification within tier — e.g., "fiscal framework", "market entry", "philanthropic coalition" */
    classification: z.string(),
    deck: z.string(),
    /* Year/period of engagement */
    engagedAt: z.string(),
    /* operational | pre-launch | completed */
    status: z.enum(['operational', 'pre-launch', 'completed', 'ongoing']),
    summary: z.string(),
    publishedAt: z.coerce.date().optional(),
    /* Order within tier on the index page */
    order: z.number().int().optional(),
    /* Whether to feature on the home preview */
    featured: z.boolean().default(false),
    /* The four research-paper anchors */
    developmentQuestion: z.string(),
    methodologyApplied: z.string(),
    output: z.string(),
    counterfactual: z.string(),
    /* Optional VERIDEX gate count e.g., "22/22" */
    veridexGates: z.string().optional(),
    /* Optional fiscal scale e.g., "$30B" */
    fiscalScale: z.string().optional(),
    /* External attribution e.g., Nexten Summit */
    attribution: z.string().optional(),
    /* For firm-built ventures: optional stat triplets */
    stats: z
      .array(
        z.object({
          value: z.string(),
          label: z.string(),
        })
      )
      .default([]),
  }),
});

export const collections = {
  library,
  'track-record': trackRecord,
  'case-studies': caseStudies,
};
