import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { PDFDocument } from 'pdf-lib';
import { exportPage, exportSvg } from './export-svg';
import type { Chart } from '@ganttaro/core';
const chart: Chart = {
  id: 'chart',
  title: 'A < B & C',
  version: 1,
  zoom: 'weeks',
  holidays: ['2026-11-23'],
  groups: [],
  items: [
    { id: 'a', name: 'Build', start: '2026-11-20', end: '2026-11-24', version: 1 },
    { id: 'm', name: 'Launch', on: '2026-11-25', after: ['a'], version: 1 },
  ],
};
test('exports escaped labels, weekday columns, Holidays and Dependencies deterministically', () => {
  const svg = exportSvg(chart);
  expect(svg).toContain('A &lt; B &amp; C');
  expect(svg).toContain('23/11');
  expect(svg).not.toContain('21/11');
  expect(svg).not.toContain('22/11');
  expect(svg).toContain('#e9edf2');
  expect(svg).toBe(exportSvg(structuredClone(chart)));
});
test('the bundled WASM and font render stable PNG bytes and the PDF embeds that PNG on a landscape page', async () => {
  await initWasm(await readFile('apps/web/public/export/resvg.wasm'));
  const font = await readFile('apps/web/public/export/IBMPlexSans-Regular.ttf');
  const render = () => {
    const renderer = new Resvg(exportSvg(chart), {
      font: { fontBuffers: [font], defaultFontFamily: 'IBM Plex Sans' },
    });
    const result = renderer.render();
    const png = result.asPng();
    result.free();
    renderer.free();
    return png;
  };
  const first = render();
  expect(first).toEqual(render());
  expect(Array.from(first.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const pdf = await PDFDocument.create();
  const image = await pdf.embedPng(first);
  const page = pdf.addPage([exportPage.width * 0.75, exportPage.height * 0.75]);
  page.drawImage(image, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  const loaded = await PDFDocument.load(await pdf.save());
  expect(loaded.getPageCount()).toBe(1);
  expect(loaded.getPage(0).getWidth()).toBeGreaterThan(loaded.getPage(0).getHeight());
});
