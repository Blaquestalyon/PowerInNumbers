import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { runPipeline, runSection } from "./pipeline";
import { intakeSchema } from "@shared/schema";
import { registerExtractRoute } from "./extract-text";
import { registerExportHtmlRoute } from "./export-html";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // File text extraction (PDF / DOCX / TXT / MD upload → plain text)
  registerExtractRoute(app);

  // Standalone HTML export (full interactive report download)
  registerExportHtmlRoute(app);

  // Create a new run
  app.post("/api/runs", async (req, res) => {
    try {
      const parsed = intakeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const run = await storage.createRun(parsed.data);
      return res.json({ runId: run.id });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Get run status and sections
  app.get("/api/runs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const run = await storage.getRun(id);
      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }
      const sections = await storage.getSections(id);
      return res.json({
        ...run,
        intakePayload: run.intakePayload ? JSON.parse(run.intakePayload) : null,
        coreAnalysisA1a: run.coreAnalysisA1a
          ? JSON.parse(run.coreAnalysisA1a)
          : null,
        coreAnalysisA1b: run.coreAnalysisA1b
          ? JSON.parse(run.coreAnalysisA1b)
          : null,
        errorLog: run.errorLog ? JSON.parse(run.errorLog) : null,
        sections,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Start the pipeline
  app.post("/api/runs/:id/start", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const run = await storage.getRun(id);
      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }
      // Fire and forget — pipeline runs in the background
      runPipeline(id).catch((err) => {
        console.error(`Pipeline error for run ${id}:`, err);
      });
      return res.json({ status: "started" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Redo a specific section
  app.post("/api/runs/:id/sections/:code/redo", async (req, res) => {
    try {
      const runId = parseInt(req.params.id, 10);
      const code = req.params.code;

      const sections = await storage.getSections(runId);
      const section = sections.find((s) => s.code === code);
      if (!section) {
        return res.status(404).json({ error: "Section not found" });
      }

      await storage.updateSectionStatus(section.id, "queued");

      // Fire and forget — section runs in the background
      runSection(section.id, runId).catch((err) => {
        console.error(`Section redo error for ${code}:`, err);
      });

      return res.json({ status: "queued" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Submit Stage 2 enrichment answers
  app.post("/api/runs/:id/stage2", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const run = await storage.getRun(id);
      if (!run) return res.status(404).json({ error: "Run not found" });
      if (run.stage !== 1 || run.status !== "complete") {
        return res.status(400).json({ error: "Stage 1 must be complete before submitting Stage 2" });
      }

      await storage.saveStage2Data(id, JSON.stringify(req.body));
      return res.json({ status: "saved" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Trigger Stage 3 full report generation
  app.post("/api/runs/:id/stage3", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const run = await storage.getRun(id);
      if (!run) return res.status(404).json({ error: "Run not found" });
      if (run.status !== "complete") {
        return res.status(400).json({ error: "Previous stage must be complete" });
      }

      // Upgrade run to stage 3 — creates new sections
      await storage.upgradeRunToStage3(id);

      // Fire and forget — pipeline runs in background
      runPipeline(id).catch((err) => {
        console.error(`Stage 3 pipeline error for run ${id}:`, err);
      });

      return res.json({ status: "started" });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Get Stage 2 questions (dynamically generated from Stage 1 analysis)
  app.get("/api/runs/:id/stage2-questions", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const run = await storage.getRun(id);
      if (!run) return res.status(404).json({ error: "Run not found" });
      if (!run.coreAnalysisA1a) {
        return res.status(400).json({ error: "Stage 1 analysis required" });
      }

      const a1a = JSON.parse(run.coreAnalysisA1a);
      const intake = JSON.parse(run.intakePayload);

      // Generate dynamic Stage 2 questions
      const { generateStage2Questions } = await import("./pipeline");
      const questions = generateStage2Questions(intake, a1a);

      return res.json({ questions });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // List all runs for admin
  app.get("/api/admin/runs", async (_req, res) => {
    try {
      const runs = await storage.getRunsForAdmin();
      return res.json(runs);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Retry failed sections
  app.post("/api/runs/:id/retry", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      const run = await storage.getRun(id);
      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }

      const count = await storage.retryFailedSections(id);

      if (count > 0) {
        // Re-run the queued sections in the background
        const sections = await storage.getSections(id);
        const queued = sections.filter((s) => s.status === "queued");
        for (const section of queued) {
          runSection(section.id, id).catch((err) => {
            console.error(`Retry error for section ${section.code}:`, err);
          });
        }
      }

      return res.json({ status: "retrying", count });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  return httpServer;
}
