'use client';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { PDFDocument } from 'pdf-lib';
import { exportSvg, exportPage } from '@ganttaro/chart';
import type { Chart } from '@ganttaro/core';
let ready: Promise<void> | undefined;
let font: Promise<Uint8Array> | undefined;
export async function renderExport(chart: Chart): Promise<Uint8Array> {
  ready ??= initWasm(fetch('/export/resvg.wasm'));
  font ??= fetch('/export/IBMPlexSans-Regular.ttf').then(async response => {
    if (!response.ok) throw new Error('Export font could not be loaded');
    return new Uint8Array(await response.arrayBuffer());
  });
  const [, data] = await Promise.all([ready, font]);
  const renderer = new Resvg(exportSvg(chart), {
    font: { fontBuffers: [data], defaultFontFamily: 'IBM Plex Sans', loadSystemFonts: false },
    fitTo: { mode: 'width', value: exportPage.width * 2 },
  });
  const rendered = renderer.render();
  try {
    return rendered.asPng();
  } finally {
    rendered.free();
    renderer.free();
  }
}
export async function exportChart(chart: Chart, format: 'png' | 'pdf') {
  const png = await renderExport(chart);
  let bytes: Uint8Array = png;
  if (format === 'pdf') {
    const pdf = await PDFDocument.create();
    const image = await pdf.embedPng(png);
    const page = pdf.addPage([exportPage.width * 0.75, exportPage.height * 0.75]);
    page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
    bytes = await pdf.save();
  }
  const url = URL.createObjectURL(
    new Blob([new Uint8Array(bytes).buffer], {
      type: format === 'pdf' ? 'application/pdf' : 'image/png',
    }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `${chart.title.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 80) || 'Chart'}.${format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
