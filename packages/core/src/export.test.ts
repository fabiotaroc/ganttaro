import { describe, expect, it } from 'vitest';
import { exportData, exportJson, type Chart } from './index';

describe('exportData and exportJson', () => {
  it('builds an ID-free portable Chart brief with in-range Holidays, used Groups, Working Days and Conflicts', () => {
    const chart: Chart = {
      id: 'j578k2m9p4q1w3x6y8z0abc123',
      title: 'Leadabeelity rollout',
      description: 'Q2 rollout plan across design and backend.',
      version: 14,
      zoom: 'weeks',
      holidays: ['2026-01-01', '2026-04-06', '2026-05-01', '2026-12-25'],
      groups: [
        { id: 'datapizza', name: 'Datapizza', color: 'indigo' },
        { id: 'client', name: 'Client', color: 'blue' },
        { id: 'legal', name: 'Legal', color: 'amber' },
      ],
      items: [
        {
          id: 'kickoff',
          name: 'Kickoff',
          on: '2026-04-07',
          group: 'client',
          owners: ['Marco'],
          description: 'Internal kickoff notes',
          links: ['https://example.com/kickoff'],
          version: 2,
        },
        {
          id: 'api-spec',
          name: 'API spec',
          start: '2026-04-08',
          end: '2026-04-14',
          after: ['kickoff'],
          group: 'datapizza',
          owners: ['Sara'],
          version: 4,
        },
        {
          id: 'build-api',
          name: 'Build API',
          start: '2026-04-13',
          end: '2026-04-24',
          after: ['api-spec'],
          group: 'datapizza',
          owners: ['Sara', 'Luca'],
          description: 'Should be omitted from export',
          links: ['https://example.com/spec'],
          version: 5,
        },
        {
          id: 'uat',
          name: 'Client UAT',
          start: '2026-04-27',
          end: '2026-05-04',
          after: ['build-api'],
          group: 'client',
          owners: ['Marco'],
          version: 1,
        },
        {
          id: 'go-live',
          name: 'Go live',
          on: '2026-05-05',
          after: ['uat'],
          version: 1,
        },
      ],
    };

    const result = exportData(chart);
    expect(result).toEqual({
      title: 'Leadabeelity rollout',
      description: 'Q2 rollout plan across design and backend.',
      timeline: {
        start: '2026-04-07',
        end: '2026-05-05',
        zoom: 'weeks',
        weekends: 'hidden',
        holidays: ['2026-05-01'],
      },
      groups: [
        { name: 'Datapizza', color: 'indigo' },
        { name: 'Client', color: 'blue' },
      ],
      items: [
        {
          type: 'milestone',
          name: 'Kickoff',
          date: '2026-04-07',
          group: 'Client',
          owners: ['Marco'],
        },
        {
          type: 'task',
          name: 'API spec',
          start: '2026-04-08',
          end: '2026-04-14',
          workingDays: 5,
          group: 'Datapizza',
          owners: ['Sara'],
          after: ['Kickoff'],
        },
        {
          type: 'task',
          name: 'Build API',
          start: '2026-04-13',
          end: '2026-04-24',
          workingDays: 10,
          group: 'Datapizza',
          owners: ['Sara', 'Luca'],
          after: ['API spec'],
          conflictsWith: ['API spec'],
        },
        {
          type: 'task',
          name: 'Client UAT',
          start: '2026-04-27',
          end: '2026-05-04',
          workingDays: 5,
          group: 'Client',
          owners: ['Marco'],
          after: ['Build API'],
        },
        {
          type: 'milestone',
          name: 'Go live',
          date: '2026-05-05',
          after: ['Client UAT'],
        },
      ],
    });

    const json = exportJson(chart);
    expect(json).toBe(JSON.stringify(result, null, 2));
    expect(json).not.toContain('j578k2m9p4q1w3x6y8z0abc123');
    expect(json).not.toContain('"version"');
    expect(json).not.toContain('Internal kickoff notes');
    expect(json).not.toContain('https://example.com/spec');
  });

  it('disambiguates colliding Item names only in references, falls back to Unnamed Item, and disambiguates colliding Group names by color', () => {
    const chart: Chart = {
      id: 'c1',
      title: 'Edge cases',
      version: 1,
      zoom: 'days',
      holidays: [],
      groups: [
        { id: 'g1', name: 'Design', color: 'blue' },
        { id: 'g2', name: 'Design', color: 'violet' },
      ],
      items: [
        {
          id: 'rev-1',
          name: 'Review',
          start: '2026-04-06',
          end: '2026-04-08',
          group: 'g1',
          version: 1,
        },
        { id: 'unnamed', name: '   ', on: '2026-04-09', after: ['rev-1'], version: 1 },
        {
          id: 'rev-2',
          name: 'Review',
          start: '2026-04-08',
          end: '2026-04-10',
          after: ['rev-1', 'unnamed'],
          group: 'g2',
          version: 1,
        },
        { id: 'ship', name: 'Ship', on: '2026-04-13', after: ['rev-2'], version: 1 },
      ],
    };

    const result = exportData(chart);
    expect(result.groups).toEqual([
      { name: 'Design (blue)', color: 'blue' },
      { name: 'Design (violet)', color: 'violet' },
    ]);
    expect(result.items).toEqual([
      {
        type: 'task',
        name: 'Review',
        start: '2026-04-06',
        end: '2026-04-08',
        workingDays: 3,
        group: 'Design (blue)',
      },
      {
        type: 'milestone',
        name: 'Unnamed Item',
        date: '2026-04-09',
        after: ['Review (row 1)'],
      },
      {
        type: 'task',
        name: 'Review',
        start: '2026-04-08',
        end: '2026-04-10',
        workingDays: 3,
        group: 'Design (violet)',
        after: ['Review (row 1)', 'Unnamed Item'],
        conflictsWith: ['Review (row 1)', 'Unnamed Item'],
      },
      {
        type: 'milestone',
        name: 'Ship',
        date: '2026-04-13',
        after: ['Review (row 3)'],
      },
    ]);
  });

  it('handles an empty Chart cleanly without range bounds, Holidays or Groups', () => {
    const chart: Chart = {
      id: 'empty',
      title: '',
      description: '   ',
      version: 1,
      zoom: 'months',
      holidays: ['2026-05-01'],
      groups: [{ id: 'g1', name: 'Unused', color: 'teal' }],
      items: [],
    };

    expect(exportData(chart)).toEqual({
      title: 'Untitled Chart',
      timeline: {
        zoom: 'months',
        weekends: 'hidden',
      },
      items: [],
    });
  });
});
