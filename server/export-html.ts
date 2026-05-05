/**
 * Standalone HTML Export
 *
 * GET /api/runs/:id/export-html
 *
 * Returns a single self-contained HTML file containing all completed report
 * sections, the full report stylesheet inlined, and any embedded section
 * <script> blocks (e.g. Monte Carlo simulator with CSV download). The file
 * can be opened in any browser by the prospect with full interactive Monte
 * Carlo capability — no app chrome, no API key, no external dependencies
 * beyond Google Fonts (which load over CDN).
 */

import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { REPORT_CSS } from "./report-styles";

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeFilename(s: string): string {
  return (
    String(s || "ai-mirror-report")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "ai-mirror-report"
  );
}

export function registerExportHtmlRoute(app: Express) {
  app.get("/api/runs/:id/export-html", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (!Number.isFinite(id)) {
        return res.status(400).send("Invalid run id");
      }

      const run = await storage.getRun(id);
      if (!run) {
        return res.status(404).send("Run not found");
      }

      const sections = await storage.getSections(id);
      const completedSections = sections.filter(
        (s) => s.status === "complete" && s.htmlFragment,
      );

      // Pull a friendly name for the file/title (operator name from intake)
      let reportSubject = "Analysis";
      try {
        const intake = run.intakePayload ? JSON.parse(run.intakePayload) : null;
        const candidate =
          intake?.i1_profile?.name ||
          intake?.i1_profile?.companyName ||
          intake?.companyName;
        if (candidate && typeof candidate === "string") reportSubject = candidate;
      } catch {
        // ignore
      }

      const generatedOn = new Date().toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      });

      const sectionsHtml = completedSections
        .map(
          (s) => `
<div class="report-section" id="section-${escapeHtml(s.code)}" data-section-code="${escapeHtml(s.code)}">
${s.htmlFragment}
</div>`,
        )
        .join("\n");

      const title = `AI Mirror Ghana — ${reportSubject}`;

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap" rel="stylesheet" />
<style>
/* ── Global page chrome for the standalone export ── */
*, *::before, *::after { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #F3F3F0;
  font-family: 'Source Sans 3', system-ui, -apple-system, sans-serif;
  color: #1A1A1A;
}
.export-banner {
  background: linear-gradient(135deg, #0B1D3A 0%, #132C54 55%, #1A3A6E 100%);
  color: #fff;
  padding: 18px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: 'Source Sans 3', sans-serif;
  box-shadow: 0 2px 12px rgba(11,29,58,0.15);
}
.export-banner .brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.export-banner .brand .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #C9A84C;
  box-shadow: 0 0 0 4px rgba(201,168,76,0.18);
}
.export-banner .meta {
  font-size: 13px;
  opacity: 0.85;
  text-align: right;
}
.export-content {
  max-width: 1180px;
  margin: 0 auto;
  padding: 28px 16px 64px;
}
.export-footer {
  text-align: center;
  font-size: 12px;
  color: #6B7280;
  padding: 24px 16px 40px;
  border-top: 1px solid #E5E5E0;
  margin-top: 24px;
}
@media print {
  .export-banner { box-shadow: none; }
  .export-banner .meta { display: none; }
}

/* ── Begin embedded report stylesheet ── */
${REPORT_CSS}
/* ── End embedded report stylesheet ── */
</style>
</head>
<body>
<div class="export-banner">
  <div class="brand"><span class="dot"></span><span>AI Mirror Ghana</span></div>
  <div class="meta">Prepared for ${escapeHtml(reportSubject)} · Generated ${escapeHtml(generatedOn)}</div>
</div>
<main class="export-content">
${sectionsHtml}
</main>
<footer class="export-footer">
  AI Mirror Ghana · Standalone Report Export · Run #${run.id}
</footer>
<script>
/* Re-execute any inline <script> blocks that came from server-rendered
   section fragments. The browser does not execute scripts inserted as
   innerHTML strings on first parse for some content paths, but for
   static HTML loaded directly from disk all top-level scripts in the
   document run as expected. This wrapper only re-runs scripts whose
   parent is a .report-section, which is the contract for embedded
   simulators (e.g. Monte Carlo). It is idempotent and safe to omit. */
(function rehydrateSectionScripts(){
  try {
    var scripts = document.querySelectorAll('.report-section script');
    scripts.forEach(function(oldScript){
      // Skip if this script was already executed (data flag)
      if (oldScript.getAttribute('data-rehydrated') === '1') return;
      var newScript = document.createElement('script');
      // Copy attributes
      for (var i = 0; i < oldScript.attributes.length; i++) {
        var a = oldScript.attributes[i];
        newScript.setAttribute(a.name, a.value);
      }
      newScript.text = oldScript.text || oldScript.textContent || '';
      newScript.setAttribute('data-rehydrated', '1');
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  } catch (e) {
    console.warn('Section script rehydration failed:', e);
  }
})();
</script>
</body>
</html>`;

      const filename = `ai-mirror-${sanitizeFilename(reportSubject)}-run${run.id}.html`;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`,
      );
      res.send(html);
    } catch (err: any) {
      console.error("[export-html] Error:", err);
      res.status(500).send(`Export failed: ${err?.message || String(err)}`);
    }
  });
}
