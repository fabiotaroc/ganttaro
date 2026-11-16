'use client';

import { useLayoutEffect, type ReactNode } from 'react';
import { Preferences } from '@ui-sdk/react/preferences';
import { colorScheme } from '@/lib/color-scheme';

export function AppPreferences({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    // Strict Mode remounts reset <html> to the server attribute before paint.
    document.documentElement.setAttribute(colorScheme.attribute, colorScheme.get().value);
  }, []);
  return <Preferences preferences={[colorScheme]}>{children}</Preferences>;
}
