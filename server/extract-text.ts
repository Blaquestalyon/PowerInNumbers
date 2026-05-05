/**
 * File Text Extraction
 *
 * Accepts PDF, DOCX, TXT, and MD uploads via multipart/form-data
 * and returns the extracted plain text. Used by the intake form's
 * "Upload file" affordance on long-text fields.
 *
 * Limits:
 *   - Max upload size: 10 MB
 *   - Returned text trimmed to MAX_TEXT_CHARS to keep prompts manageable
 */

import type { Express, Request, Response } from "express";
import multer from "multer";
import mammoth from "mammoth";
import { log } from "./index";

// ─── Constants ────────────────────────────────────────────
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_TEXT_CHARS = 50_000;            // ~10K tokens worth

const ACCEPTED_EXTS = [".pdf", ".docx", ".txt", ".md"];
const ACCEPTED_MIME_PREFIXES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

// ─── Multer setup (memory storage; no temp files) ────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
});

// ─── Per-format extractors ────────────────────────────────
async function extractFromPdf(buf: Buffer): Promise<string> {
  // pdf-parse v2 exposes { PDFParse } class
  const mod = await import("pdf-parse");
  const PDFParse = (mod as any).PDFParse || (mod as any).default?.PDFParse;
  if (!PDFParse) {
    // Fallback for v1 shape: default export is a function
    const parser = (mod as any).default || mod;
    const result = await parser(buf);
    return result?.text ?? "";
  }
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  return result?.text ?? "";
}

async function extractFromDocx(buf: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: buf });
  return result.value || "";
}

function extractFromText(buf: Buffer): string {
  return buf.toString("utf-8");
}

// ─── Public extract function ──────────────────────────────
async function extractTextFromBuffer(
  buf: Buffer,
  filename: string,
  mimetype: string,
): Promise<string> {
  const lower = filename.toLowerCase();
  const ext = ACCEPTED_EXTS.find((e) => lower.endsWith(e));
  if (!ext) {
    throw new Error(`Unsupported file type. Accepted: ${ACCEPTED_EXTS.join(", ")}`);
  }

  let text = "";
  if (ext === ".pdf") text = await extractFromPdf(buf);
  else if (ext === ".docx") text = await extractFromDocx(buf);
  else text = extractFromText(buf);

  // Normalize whitespace: collapse 3+ newlines, trim
  text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  if (text.length > MAX_TEXT_CHARS) {
    text = text.slice(0, MAX_TEXT_CHARS) + "\n\n…(truncated)";
  }
  return text;
}

// ─── Route registration ───────────────────────────────────
export function registerExtractRoute(app: Express) {
  app.post(
    "/api/extract-text",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const file = (req as any).file as
          | { buffer: Buffer; originalname: string; mimetype: string; size: number }
          | undefined;

        if (!file) {
          return res.status(400).json({ error: "No file uploaded (expected field 'file')" });
        }

        // Optional MIME hint check (some browsers misreport — we still validate by extension)
        const mimeOk = ACCEPTED_MIME_PREFIXES.some((p) => file.mimetype.startsWith(p));
        if (!mimeOk) {
          // Don't reject solely on mimetype — fall through to extension-based extraction
          log(`extract-text: unusual mimetype '${file.mimetype}' for '${file.originalname}'`, "extract");
        }

        const text = await extractTextFromBuffer(file.buffer, file.originalname, file.mimetype);

        if (!text.trim()) {
          return res.status(422).json({ error: "No text could be extracted from this file" });
        }

        log(`extract-text: '${file.originalname}' (${file.size} bytes) → ${text.length} chars`, "extract");
        return res.json({
          filename: file.originalname,
          chars: text.length,
          text,
        });
      } catch (err: any) {
        const msg = err?.message || "Extraction failed";
        log(`extract-text error: ${msg}`, "extract");
        return res.status(400).json({ error: msg });
      }
    },
  );
}
