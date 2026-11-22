'use client';
import { exportJson, type Chart } from '@ganttaro/core';

export function exportFileName(title: string, extension: string): string {
  return `${title.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 80) || 'Chart'}.${extension}`;
}

export async function copyChartJson(chart: Chart): Promise<void> {
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable');
  await navigator.clipboard.writeText(exportJson(chart));
}

export function downloadChartJson(chart: Chart): void {
  const url = URL.createObjectURL(
    new Blob([exportJson(chart)], { type: 'application/json;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(chart.title, 'json');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
