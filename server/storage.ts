import {
  type IntakePayload,
  type GenerationRun,
  type GenerationSection,
  generationRuns,
  generationSections,
} from "@shared/schema";
import { getSectionsForStage } from "./config/generation-manifest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite);

export interface IStorage {
  createRun(intake: IntakePayload): Promise<GenerationRun>;
  getRun(id: number): Promise<GenerationRun | undefined>;
  updateRunStatus(id: number, status: string): Promise<void>;
  updateRunAnalysis(
    id: number,
    field: "coreAnalysisA1a" | "coreAnalysisA1b",
    data: string,
  ): Promise<void>;
  getSections(runId: number): Promise<GenerationSection[]>;
  updateSectionStatus(sectionId: number, status: string): Promise<void>;
  updateSectionHtml(sectionId: number, html: string): Promise<void>;
  updateSectionError(sectionId: number, error: string): Promise<void>;
  getRunsForAdmin(): Promise<
    (GenerationRun & { sectionCount: number; completedCount: number })[]
  >;
  retryFailedSections(runId: number): Promise<number>;
  saveStage2Data(runId: number, stage2Data: string): Promise<void>;
  upgradeRunToStage3(runId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createRun(intake: IntakePayload): Promise<GenerationRun> {
    const now = new Date().toISOString();
    const run = db
      .insert(generationRuns)
      .values({
        stage: intake.stage,
        status: "queued",
        intakePayload: JSON.stringify(intake),
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    const sections = getSectionsForStage(intake.stage);
    for (const entry of sections) {
      db.insert(generationSections)
        .values({
          runId: run.id,
          code: entry.code,
          title: entry.title,
          status: "queued",
          llmModel: "mock-v1",
          promptVersion: "1.0",
          ragContextIds: JSON.stringify(entry.ragScope),
        })
        .run();
    }

    return run;
  }

  async getRun(id: number): Promise<GenerationRun | undefined> {
    return db
      .select()
      .from(generationRuns)
      .where(eq(generationRuns.id, id))
      .get();
  }

  async updateRunStatus(id: number, status: string): Promise<void> {
    db.update(generationRuns)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(generationRuns.id, id))
      .run();
  }

  async updateRunAnalysis(
    id: number,
    field: "coreAnalysisA1a" | "coreAnalysisA1b",
    data: string,
  ): Promise<void> {
    db.update(generationRuns)
      .set({ [field]: data, updatedAt: new Date().toISOString() })
      .where(eq(generationRuns.id, id))
      .run();
  }

  async getSections(runId: number): Promise<GenerationSection[]> {
    return db
      .select()
      .from(generationSections)
      .where(eq(generationSections.runId, runId))
      .all();
  }

  async updateSectionStatus(
    sectionId: number,
    status: string,
  ): Promise<void> {
    db.update(generationSections)
      .set({ status })
      .where(eq(generationSections.id, sectionId))
      .run();
  }

  async updateSectionHtml(sectionId: number, html: string): Promise<void> {
    db.update(generationSections)
      .set({ status: "complete", htmlFragment: html })
      .where(eq(generationSections.id, sectionId))
      .run();
  }

  async updateSectionError(sectionId: number, error: string): Promise<void> {
    db.update(generationSections)
      .set({ status: "error", error })
      .where(eq(generationSections.id, sectionId))
      .run();
  }

  async getRunsForAdmin(): Promise<
    (GenerationRun & { sectionCount: number; completedCount: number })[]
  > {
    const runs = db.select().from(generationRuns).all();
    const result = [];
    for (const run of runs) {
      const sections = db
        .select()
        .from(generationSections)
        .where(eq(generationSections.runId, run.id))
        .all();
      result.push({
        ...run,
        sectionCount: sections.length,
        completedCount: sections.filter((s) => s.status === "complete").length,
      });
    }
    return result;
  }

  async retryFailedSections(runId: number): Promise<number> {
    const sections = db
      .select()
      .from(generationSections)
      .where(eq(generationSections.runId, runId))
      .all();

    let count = 0;
    for (const section of sections) {
      if (section.status === "error") {
        db.update(generationSections)
          .set({ status: "queued", error: null })
          .where(eq(generationSections.id, section.id))
          .run();
        count++;
      }
    }
    return count;
  }

  async saveStage2Data(runId: number, stage2Data: string): Promise<void> {
    db.update(generationRuns)
      .set({ stage2Payload: stage2Data, updatedAt: new Date().toISOString() })
      .where(eq(generationRuns.id, runId))
      .run();
  }

  async upgradeRunToStage3(runId: number): Promise<void> {
    // Update stage to 3
    db.update(generationRuns)
      .set({ stage: 3, status: "queued", updatedAt: new Date().toISOString() })
      .where(eq(generationRuns.id, runId))
      .run();

    // Delete existing Stage 1 sections (they'll be regenerated as expanded versions)
    db.delete(generationSections)
      .where(eq(generationSections.runId, runId))
      .run();

    // Create Stage 3 sections
    const sections = getSectionsForStage(3);
    for (const entry of sections) {
      db.insert(generationSections)
        .values({
          runId: runId,
          code: entry.code,
          title: entry.title,
          status: "queued",
          llmModel: "hybrid-v1",
          promptVersion: "2.0",
          ragContextIds: JSON.stringify(entry.ragScope),
        })
        .run();
    }
  }
}

export const storage = new DatabaseStorage();
