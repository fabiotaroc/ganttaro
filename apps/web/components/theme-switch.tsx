'use client';

import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import {
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
} from '@ui-sdk/react/segmented-control';
import { usePreference } from '@ui-sdk/react/preferences';
import { colorScheme } from '@/lib/color-scheme';

const choices = [
  { value: 'light', label: 'Light', icon: SunIcon },
  { value: 'dark', label: 'Dark', icon: MoonIcon },
  { value: 'system', label: 'System', icon: MonitorIcon },
] as const;

export function ThemeSwitch() {
  const { value } = usePreference(colorScheme);
  return (
    <SegmentedControl
      aria-label="Appearance"
      value={value}
      onValueChange={(next, details) => {
        if (next !== 'light' && next !== 'dark' && next !== 'system') return;
        colorScheme.set(next, { reason: details.reason, event: details.event });
      }}
    >
      <SegmentedControlIndicator />
      {choices.map(choice => {
        const Icon = choice.icon;
        return (
          <SegmentedControlItem key={choice.value} value={choice.value}>
            <Icon aria-hidden="true" />
            <span className="sr-only">{choice.label}</span>
          </SegmentedControlItem>
        );
      })}
    </SegmentedControl>
  );
}
