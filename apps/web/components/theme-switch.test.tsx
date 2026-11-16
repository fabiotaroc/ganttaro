// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createAgent } from '@ui-sdk/react/agent';
import { afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { colorScheme } from '@/lib/color-scheme';
import { ThemeSwitch } from './theme-switch';

declare global {
  var __UI_SDK_STRICT__: boolean | undefined;
}
globalThis.__UI_SDK_STRICT__ = true;

const agent = createAgent();

const storage = new Map<string, string>();
const local = {
  getItem: (key: string) => (storage.has(key) ? storage.get(key)! : null),
  setItem: (key: string, value: string) => {
    storage.set(key, String(value));
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
  key: (index: number) => [...storage.keys()][index] ?? null,
  get length() {
    return storage.size;
  },
};

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', { configurable: true, value: local });
  HTMLElement.prototype.showPopover = function showPopover() {};
  HTMLElement.prototype.hidePopover = function hidePopover() {};
  Element.prototype.getAnimations = () => [];
  Element.prototype.scrollIntoView = () => {};
  Element.prototype.checkVisibility = () => true;
  Element.prototype.getClientRects = () => [] as unknown as DOMRectList;
  document.elementFromPoint = () => null;
  document.elementsFromPoint = () => [];
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

beforeEach(() => {
  local.clear();
  colorScheme.set('system');
});

afterEach(cleanup);

const tick = () => act(() => new Promise(resolve => setTimeout(resolve, 0)));

test('arrow keys move between Light, Dark and System and keep the choice', async () => {
  render(<ThemeSwitch />);
  await tick();
  expect(screen.getByRole('radio', { name: 'System' }).getAttribute('aria-checked')).toBe('true');
  const system = screen.getByRole('radio', { name: 'System' });
  system.focus();
  fireEvent.keyDown(system, { key: 'ArrowLeft' });
  await tick();
  expect(screen.getByRole('radio', { name: 'Dark' }).getAttribute('aria-checked')).toBe('true');
  expect(colorScheme.get().value).toBe('dark');
  expect(local.getItem('ganttaro-appearance')).toBe('dark');
  const dark = screen.getByRole('radio', { name: 'Dark' });
  dark.focus();
  fireEvent.keyDown(dark, { key: 'ArrowRight' });
  await tick();
  expect(screen.getByRole('radio', { name: 'System' }).getAttribute('aria-checked')).toBe('true');
  expect(colorScheme.get().value).toBe('system');
});

test('an agent can find and change Appearance', async () => {
  render(<ThemeSwitch />);
  await tick();
  const components = agent.snapshot().filter(entry => !entry.offPage && entry.component !== 'more');
  for (const entry of components) {
    expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy();
  }
  expect(components.map(entry => entry.label)).toContain('Appearance');
  const appearance = components.find(entry => entry.label === 'Appearance');
  const dark = appearance?.items?.find(item => item.label === 'Dark');
  expect(dark?.value).toBeTruthy();
  const result = await agent.act({
    steps: [{ ref: 'Appearance', action: 'setValue', args: [dark?.value] }],
  });
  expect(result.ok, result.error?.message).toBe(true);
  await tick();
  expect(screen.getByRole('radio', { name: 'Dark' }).getAttribute('aria-checked')).toBe('true');
  expect(colorScheme.get().value).toBe('dark');
});
