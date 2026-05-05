import { useEffect, useRef, useCallback } from "react";

// Brand teal color in HSL: 183, 85%, 27%
const TEAL_BASE = { h: 183, s: 85, l: 27 };

function hsl(h: number, s: number, l: number, a = 1) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

function drawFanChart(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const data = canvas.dataset;
  const p5 = parseFloat(data.p5 || "0");
  const p10 = parseFloat(data.p10 || "0");
  const p25 = parseFloat(data.p25 || "0");
  const p50 = parseFloat(data.p50 || "0");
  const p75 = parseFloat(data.p75 || "0");
  const p90 = parseFloat(data.p90 || "0");
  const p95 = parseFloat(data.p95 || "0");
  const years = parseInt(data.years || "5", 10);
  const title = data.title || "Monte Carlo Projection";

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight || 300;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const pad = { top: 40, right: 30, bottom: 40, left: 70 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  // Clear
  ctx.clearRect(0, 0, w, h);

  // Title
  ctx.font = "600 14px 'Satoshi', 'Inter', system-ui, sans-serif";
  ctx.fillStyle = hsl(TEAL_BASE.h, TEAL_BASE.s, TEAL_BASE.l);
  ctx.textAlign = "left";
  ctx.fillText(title, pad.left, 24);

  // Generate projected bands (linear interpolation from 0 to endpoint)
  const maxVal = p95 * 1.1;
  const minVal = Math.min(0, p5 * 0.9);
  const range = maxVal - minVal;

  function xPos(year: number) {
    return pad.left + (year / years) * plotW;
  }
  function yPos(val: number) {
    return pad.top + plotH - ((val - minVal) / range) * plotH;
  }

  // Draw bands: P5-P95, P10-P90, P25-P75
  const bands = [
    { lo: p5, hi: p95, opacity: 0.1 },
    { lo: p10, hi: p90, opacity: 0.18 },
    { lo: p25, hi: p75, opacity: 0.28 },
  ];

  const numPoints = 50;
  bands.forEach(({ lo, hi, opacity }) => {
    ctx.beginPath();
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const year = t * years;
      const loVal = lo * t;
      const x = xPos(year);
      const y = yPos(loVal);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let i = numPoints; i >= 0; i--) {
      const t = i / numPoints;
      const year = t * years;
      const hiVal = hi * t;
      ctx.lineTo(xPos(year), yPos(hiVal));
    }
    ctx.closePath();
    ctx.fillStyle = hsl(TEAL_BASE.h, TEAL_BASE.s, TEAL_BASE.l, opacity);
    ctx.fill();
  });

  // Draw median line (P50)
  ctx.beginPath();
  ctx.strokeStyle = hsl(TEAL_BASE.h, TEAL_BASE.s, TEAL_BASE.l);
  ctx.lineWidth = 2;
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const val = p50 * t;
    const x = xPos(t * years);
    const y = yPos(val);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Axes
  ctx.strokeStyle = hsl(0, 0, 60, 0.3);
  ctx.lineWidth = 1;

  // X axis
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  // Y axis
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.stroke();

  // X axis labels (years)
  ctx.font = "11px 'Inter', system-ui, sans-serif";
  ctx.fillStyle = hsl(0, 0, 50);
  ctx.textAlign = "center";
  for (let y = 0; y <= years; y++) {
    ctx.fillText(`Y${y}`, xPos(y), pad.top + plotH + 20);
  }

  // Y axis labels
  ctx.textAlign = "right";
  const yTicks = 5;
  for (let i = 0; i <= yTicks; i++) {
    const val = minVal + (range * i) / yTicks;
    const label =
      Math.abs(val) >= 1000000
        ? `$${(val / 1000000).toFixed(1)}M`
        : Math.abs(val) >= 1000
          ? `$${(val / 1000).toFixed(0)}K`
          : `$${val.toFixed(0)}`;
    ctx.fillText(label, pad.left - 8, yPos(val) + 4);
  }

  // Legend
  const legendY = pad.top + plotH + 35;
  const legendItems = [
    { label: "P5–P95", opacity: 0.1 },
    { label: "P10–P90", opacity: 0.18 },
    { label: "P25–P75", opacity: 0.28 },
    { label: "Median (P50)", opacity: 1, isLine: true },
  ];
  let lx = pad.left;
  ctx.font = "10px 'Inter', system-ui, sans-serif";
  ctx.textAlign = "left";
  legendItems.forEach(({ label, opacity, isLine }) => {
    if (isLine) {
      ctx.strokeStyle = hsl(TEAL_BASE.h, TEAL_BASE.s, TEAL_BASE.l);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, legendY - 4);
      ctx.lineTo(lx + 16, legendY - 4);
      ctx.stroke();
    } else {
      ctx.fillStyle = hsl(TEAL_BASE.h, TEAL_BASE.s, TEAL_BASE.l, opacity);
      ctx.fillRect(lx, legendY - 8, 16, 8);
    }
    ctx.fillStyle = hsl(0, 0, 50);
    ctx.fillText(label, lx + 20, legendY);
    lx += ctx.measureText(label).width + 36;
  });
}

function drawHistogram(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const data = canvas.dataset;
  const rawBins = data.bins;
  const title = data.title || "Distribution";
  let bins: number[] = [];

  if (rawBins) {
    try {
      bins = JSON.parse(rawBins);
    } catch {
      return;
    }
  }
  if (bins.length === 0) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight || 250;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  const pad = { top: 40, right: 20, bottom: 30, left: 50 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const maxBin = Math.max(...bins);

  ctx.clearRect(0, 0, w, h);

  // Title
  ctx.font = "600 14px 'Satoshi', 'Inter', system-ui, sans-serif";
  ctx.fillStyle = hsl(TEAL_BASE.h, TEAL_BASE.s, TEAL_BASE.l);
  ctx.textAlign = "left";
  ctx.fillText(title, pad.left, 24);

  const barW = plotW / bins.length;

  bins.forEach((val, i) => {
    const barH = (val / maxBin) * plotH;
    const x = pad.left + i * barW;
    const y = pad.top + plotH - barH;
    const t = i / bins.length;
    const lightness = TEAL_BASE.l + t * 25;
    ctx.fillStyle = hsl(TEAL_BASE.h, TEAL_BASE.s, lightness, 0.8);
    ctx.fillRect(x + 1, y, barW - 2, barH);
  });

  // Axes
  ctx.strokeStyle = hsl(0, 0, 60, 0.3);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.stroke();
}

export default function MonteCarloChart() {
  const observerRef = useRef<MutationObserver | null>(null);

  const processCanvases = useCallback(() => {
    document.querySelectorAll<HTMLCanvasElement>("canvas[data-monte-carlo='fan']").forEach((canvas) => {
      if (!canvas.dataset.rendered) {
        canvas.dataset.rendered = "1";
        drawFanChart(canvas);
      }
    });
    document.querySelectorAll<HTMLCanvasElement>("canvas[data-monte-carlo='histogram']").forEach((canvas) => {
      if (!canvas.dataset.rendered) {
        canvas.dataset.rendered = "1";
        drawHistogram(canvas);
      }
    });
  }, []);

  useEffect(() => {
    // Process any already-present canvases
    processCanvases();

    // Watch for new canvases injected via dangerouslySetInnerHTML
    observerRef.current = new MutationObserver(() => {
      processCanvases();
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also handle window resize
    const onResize = () => {
      document.querySelectorAll<HTMLCanvasElement>("canvas[data-monte-carlo]").forEach((c) => {
        delete c.dataset.rendered;
      });
      processCanvases();
    };
    window.addEventListener("resize", onResize);

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [processCanvases]);

  // This component doesn't render visible elements itself —
  // it attaches to canvases injected by report HTML fragments.
  return null;
}
