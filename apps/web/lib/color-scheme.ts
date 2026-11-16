import { createColorScheme, createLocalStorage } from '@ui-sdk/core';

const colorScheme = createColorScheme({
  global: true,
  storage: createLocalStorage('ganttaro-appearance'),
});

export { colorScheme };
