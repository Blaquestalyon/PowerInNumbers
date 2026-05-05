# AI Mirror Build Context

## What This Is
The AI Mirror is a multi-agent AI report generation system for the Power In Numbers summit. It generates personalized business opportunity reports for summit attendees exploring Ghana market entry.

## Architecture
- **Backend**: Express.js (using the webapp template) with SQLite + Drizzle ORM
- **Frontend**: React + Tailwind CSS + shadcn/ui
- **Pipeline**: Simulated multi-agent pipeline using LLM API calls
- **Two Stages**: Stage 1 (Kiosk - 6 sections K-1 to K-6) and Stage 3 (Full Report - 15 sections G-1 to G-15)

## Pipeline Flow
1. User fills out Intake Form (I-1 through I-5)
2. Backend creates a GenerationRun + all section rows
3. Pipeline runs A-1a (Analytical Core) → writes core_analysis_a1a JSON
4. Pipeline runs A-1b (VERIDEX & Quant) → writes core_analysis_a1b JSON
5. All section agents run in parallel, each producing an HTML fragment
6. Frontend polls for status and progressively renders each section

## Key Concepts
- **VERIDEX**: Verification index with 26 gates for data integrity
- **Monte Carlo**: 10,000-scenario probabilistic market outlook
- **Dual Pathways**: Each report generates Pathway A and Pathway B options
- **Opportunity Signal Matrix**: Scoring framework for opportunities
- **Risk & Friction Framework**: Risk assessment scoring

## Design Direction
- Dark, analytical, high-stakes tone - NOT generic coaching
- Color: Deep slate/dark backgrounds, teal accents (analytical, finance feel)
- Typography: Clean sans-serif, strong typographic hierarchy
- Tables with high contrast for risk and pathways
- Generous spacing, restrained color use

## Data Model (in shared/schema.ts)
- generationRuns: id, stage, status, intakePayload, coreAnalysisA1a, coreAnalysisA1b, errorLog, createdAt, updatedAt
- generationSections: id, runId, code, title, status, llmModel, promptVersion, ragContextIds, htmlFragment, qaScore, error

## Generation Manifest (in server/config/generation-manifest.ts)
Defines all K-1..K-6 and G-1..G-15 sections with their titles, RAG scopes, and dependencies.

## Important Rules
- Section agents CANNOT change scores or numeric values from core analysis
- HTML fragments must be self-contained <section> blocks
- No <html>, <head>, or <body> tags in fragments
- VERIDEX validation cannot be bypassed
- Redo = rendering retry only, not analytical revision
