/**
 * LLM Service — Opus 4.7 with Adaptive Thinking
 *
 * All non-template agents now run on Claude Opus 4.7 with a thinking budget
 * that adapts to analytical complexity:
 *   - Deep analysis tier:    Opus 4.7 + 16K thinking (core analyses, flagship sections)
 *   - Mid tier (structured): Opus 4.7 + 8K thinking (complex but structured)
 *   - Rendering tier:        Opus 4.7 + 4K thinking (data-to-HTML output)
 *
 * Uses streaming (required by Anthropic SDK for extended thinking).
 *
 * Configuration:
 *   ANTHROPIC_API_KEY — Set as environment variable on the server.
 *   One key serves all users.
 */

import Anthropic from "@anthropic-ai/sdk";
import { log } from "./index";

// ─── Model Definitions ────────────────────────────────────────
// All agents run on Opus 4.7. SONNET is retained as an alias for backward
// compatibility with any code that imports MODELS.SONNET.
export const MODELS = {
  OPUS: "claude-opus-4-7",
  SONNET: "claude-opus-4-7",
} as const;

export type ModelId = typeof MODELS[keyof typeof MODELS];

// ─── Agent Configuration ──────────────────────────────────────
// Defines which model and thinking budget each agent gets.

export interface AgentConfig {
  model: ModelId;
  thinkingBudget: number | null; // null = no extended thinking
  maxOutputTokens: number;
}

// Opus + Deep Adaptive Thinking: deep multi-step reasoning
const OPUS_DEEP_THINKING: AgentConfig = {
  model: MODELS.OPUS,
  thinkingBudget: 16000,
  maxOutputTokens: 32000,
};

// Opus + Mid Adaptive Thinking: complex but more structured tasks
const OPUS_MID_THINKING: AgentConfig = {
  model: MODELS.OPUS,
  thinkingBudget: 8000,
  maxOutputTokens: 16000,
};

// Opus + Light Adaptive Thinking: structured rendering, data-to-HTML
const OPUS_LIGHT_THINKING: AgentConfig = {
  model: MODELS.OPUS,
  thinkingBudget: 4000,
  maxOutputTokens: 16000,
};

/**
 * Agent-to-model mapping (all Opus 4.7, varying thinking budget).
 *
 * Opus + Deep Thinking (16K):  A-1a, A-1b, G-0, G-1, G-11 (deep reasoning)
 * Opus + Mid Thinking (8K):    G-2, G-3, G-14 (complex but structured)
 * Opus + Light Thinking (4K):  G-4, G-5, G-6, G-8, G-9, G-10, G-12, G-13 (rendering)
 * Template:                    G-7, G-15 (Monte Carlo JS engine — no LLM)
 */
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
  // Core analyses — Opus + Deep Adaptive Thinking
  "A-1a": OPUS_DEEP_THINKING,
  "A-1b": OPUS_DEEP_THINKING,

  // Executive Summary — Opus + Deep Adaptive Thinking (synthesis of all analysis)
  "G-0":  OPUS_DEEP_THINKING,

  // Flagship analytical sections — Opus + Deep Adaptive Thinking
  "G-1":  OPUS_DEEP_THINKING,
  "G-11": OPUS_DEEP_THINKING,

  // Complex structured sections — Opus + Mid Adaptive Thinking
  "G-2":  OPUS_MID_THINKING,
  "G-3":  OPUS_MID_THINKING,
  "G-14": OPUS_MID_THINKING,

  // Data rendering sections — Opus + Light Adaptive Thinking
  "G-4":  OPUS_LIGHT_THINKING,
  "G-5":  OPUS_LIGHT_THINKING,
  "G-6":  OPUS_LIGHT_THINKING,
  "G-8":  OPUS_LIGHT_THINKING,
  "G-9":  OPUS_LIGHT_THINKING,
  "G-10": OPUS_LIGHT_THINKING,
  "G-12": OPUS_LIGHT_THINKING,
  "G-13": OPUS_LIGHT_THINKING,
};

// Default config for any section not explicitly mapped
const DEFAULT_CONFIG: AgentConfig = OPUS_LIGHT_THINKING;

export function getAgentConfig(agentCode: string): AgentConfig {
  return AGENT_CONFIGS[agentCode] || DEFAULT_CONFIG;
}

// ─── Client Setup ─────────────────────────────────────────────

let client: Anthropic | null = null;

export function isLlmAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function getClient(): Anthropic {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error("ANTHROPIC_API_KEY is not set.");
    }
    client = new Anthropic({ apiKey: key });
    log("Anthropic client initialized (Opus 4.7 + Adaptive Thinking)", "llm");
  }
  return client;
}

// ─── Streaming Call ───────────────────────────────────────────

async function streamClaudeResponse(opts: {
  agentName: string;
  config: AgentConfig;
  systemPrompt: string;
  userMessage: string;
}): Promise<string> {
  const anthropic = getClient();
  const { config } = opts;
  const modelShort = config.model.includes("opus") ? "Opus" : "Sonnet";
  const thinkingLabel = config.thinkingBudget ? ` +adaptive-thinking(${config.thinkingBudget})` : "";

  log(`[${opts.agentName}] ${modelShort}${thinkingLabel} — streaming...`, "llm");
  const startTime = Date.now();

  // Build request params
  const params: any = {
    model: config.model,
    max_tokens: config.maxOutputTokens,
    system: opts.systemPrompt,
    messages: [{ role: "user", content: opts.userMessage }],
  };

  // Add extended thinking if configured
  if (config.thinkingBudget) {
    params.thinking = {
      type: "enabled",
      budget_tokens: config.thinkingBudget,
    };
  }

  const stream = await anthropic.messages.stream(params);

  // Collect text content (skip thinking blocks)
  let textContent = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta") {
      const delta = event.delta as any;
      if (delta.type === "text_delta" && delta.text) {
        textContent += delta.text;
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(`[${opts.agentName}] ${modelShort} complete in ${elapsed}s (${textContent.length} chars)`, "llm");

  if (!textContent.trim()) {
    throw new Error("Claude returned empty text content");
  }

  return textContent;
}

// ─── Public API ───────────────────────────────────────────────

/**
 * Call Claude for structured JSON output (core analyses).
 */
export async function callClaudeJson<T>(opts: {
  agentName: string;
  agentCode: string;
  systemPrompt: string;
  userMessage: string;
}): Promise<T> {
  const config = getAgentConfig(opts.agentCode);

  const textContent = await streamClaudeResponse({
    agentName: opts.agentName,
    config,
    systemPrompt: opts.systemPrompt,
    userMessage: opts.userMessage,
  });

  // Parse JSON — strip code fences if present
  let jsonStr = textContent.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr) as T;
  log(`[${opts.agentName}] JSON parsed successfully`, "llm");
  return parsed;
}

/**
 * Call Claude for HTML output (section generators).
 */
export async function callClaudeHtml(opts: {
  agentName: string;
  agentCode: string;
  systemPrompt: string;
  userMessage: string;
}): Promise<string> {
  const config = getAgentConfig(opts.agentCode);

  const textContent = await streamClaudeResponse({
    agentName: opts.agentName,
    config,
    systemPrompt: opts.systemPrompt,
    userMessage: opts.userMessage,
  });

  // Try to extract HTML from JSON {"html": "..."} or use raw
  let html = textContent.trim();
  if (html.startsWith("```")) {
    html = html.replace(/^```(?:json|html)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(html);
    if (parsed.html) html = parsed.html;
  } catch {
    // Not JSON — use raw text
  }

  log(`[${opts.agentName}] HTML extracted (${html.length} chars)`, "llm");
  return html;
}
