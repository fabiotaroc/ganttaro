import { addDays, conflicts, endOf, layout, startOf, type Chart } from '@ganttaro/core';
export const exportPage = { width: 1120, height: 792, margin: 36 };
const escape = (value: string) =>
  value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
const shorten = (value: string, length: number) =>
  [...value].length > length ? [...value].slice(0, length - 1).join('') + '…' : value;
const colors: Record<string, string> = {
  indigo: '#dce2ff',
  blue: '#d9eaff',
  teal: '#d8f0e9',
  green: '#dfefd8',
  amber: '#f8ebc4',
  orange: '#ffe5d0',
  rose: '#f8dce6',
  violet: '#e9ddfa',
};
export function exportSvg(chart: Chart): string {
  const { width, height, margin } = exportPage;
  const first = chart.items.map(startOf).sort()[0] ?? '2026-01-01';
  const last = chart.items.map(endOf).sort().at(-1) ?? addDays(first, 21);
  const geometry = layout(chart, {
    start: addDays(first, -2),
    end: addDays(last, 2),
    zoom: 'days',
  });
  const label = 220,
    top = 130,
    available = width - margin * 2 - label;
  const col = available / Math.max(1, geometry.columns.length),
    row = Math.min(42, (height - top - margin - 28) / Math.max(1, chart.items.length));
  const positions = new Map(
    geometry.bars.map(bar => [
      bar.id,
      {
        x: margin + label + (bar.x / geometry.columnWidth) * col,
        width: (bar.width / geometry.columnWidth) * col,
        y: top + bar.row * row,
      },
    ]),
  );
  const bad = new Set(conflicts(chart).map(value => value.item));
  const text = (x: number, y: number, value: string, size = 12, fill = '#26354a', extra = '') =>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" ${extra}>${escape(value)}</text>`;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="white"/><g font-family="IBM Plex Sans">`,
    text(margin, margin + 12, 'ganttaro', 14, '#5368d9'),
    text(margin, margin + 48, shorten(chart.title || 'Untitled Chart', 80), 26),
    text(margin, margin + 70, shorten(chart.description ?? '', 145), 11, '#68778d'),
  ];
  for (const [index, column] of geometry.columns.entries()) {
    const x = margin + label + index * col;
    if (column.holiday)
      parts.push(
        `<rect x="${x}" y="${top - 28}" width="${col}" height="${chart.items.length * row + 28}" fill="#e9edf2"/>`,
      );
    parts.push(`<path d="M${x} ${top - 28}V${top + chart.items.length * row}" stroke="#e7ebf1"/>`);
    if (index === 0 || col >= 25 || index % Math.ceil(30 / col) === 0)
      parts.push(
        text(x + 3, top - 12, column.date.slice(8) + '/' + column.date.slice(5, 7), 9, '#718097'),
      );
  }
  parts.push(text(margin, top - 12, 'Items', 11, '#718097'));
  for (const item of chart.items) {
    const p = positions.get(item.id)!;
    parts.push(
      `<path d="M${margin} ${p.y + row}H${width - margin}" stroke="#e7ebf1"/>`,
      text(
        margin,
        p.y + row / 2 + 4,
        shorten(item.name || 'Unnamed Item', 30),
        Math.min(12, row * 0.4),
      ),
    );
    const fill = bad.has(item.id)
      ? '#f8d5dc'
      : colors[chart.groups.find(group => group.id === item.group)?.color ?? 'indigo'];
    if (item.on !== undefined) {
      const x = p.x + p.width / 2,
        y = p.y + row / 2,
        r = Math.min(8, row * 0.25);
      parts.push(
        `<path d="M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z" fill="${bad.has(item.id) ? '#b9435b' : '#5368d9'}"/>`,
      );
    } else
      parts.push(
        `<rect x="${p.x}" y="${p.y + row * 0.25}" width="${Math.max(1, p.width)}" height="${row * 0.5}" rx="3" fill="${fill}" stroke="${bad.has(item.id) ? '#bd6678' : '#b4bfd7'}"/>`,
      );
  }
  for (const item of chart.items)
    for (const id of item.after ?? []) {
      const a = positions.get(id),
        b = positions.get(item.id);
      if (!a || !b) continue;
      const x1 = a.x + a.width,
        y1 = a.y + row / 2,
        x2 = b.x,
        y2 = b.y + row / 2,
        mid = Math.max(x1 + 6, x2 - 6);
      parts.push(
        `<path d="M${x1} ${y1}H${mid}V${y2}H${x2}" fill="none" stroke="${bad.has(item.id) ? '#bd6678' : '#8796ad'}" stroke-width="1"/>`,
      );
    }
  parts.push(
    text(
      margin,
      height - margin,
      `${chart.items.length} Items · ${chart.groups.length} Groups · ${bad.size} Items in Conflict`,
      10,
      '#718097',
    ),
    text(
      width - margin,
      height - margin,
      'Weekends hidden · Holidays greyed out',
      10,
      '#718097',
      'text-anchor="end"',
    ),
    '</g></svg>',
  );
  return parts.join('');
}
