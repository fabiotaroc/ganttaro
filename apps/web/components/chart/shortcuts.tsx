'use client';
import { KeyboardIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
type Shortcut = { keys: string[][]; action: string; edits?: boolean };
function sections(mac: boolean): { title: string; shortcuts: Shortcut[] }[] {
  const mod = mac ? '⌘' : 'Ctrl',
    alt = mac ? '⌥' : 'Alt',
    shift = mac ? '⇧' : 'Shift';
  return [
    {
      title: 'Chart',
      shortcuts: [
        { keys: [['N']], action: 'New Item', edits: true },
        { keys: [['T']], action: 'Scroll to today' },
        { keys: [[mod, 'Z']], action: 'Undo', edits: true },
        { keys: [[mod, shift, 'Z']], action: 'Redo', edits: true },
        { keys: [['?']], action: 'Show shortcuts' },
      ],
    },
    {
      title: 'Moving around',
      shortcuts: [
        { keys: [['↑'], ['↓']], action: 'Previous or next Item' },
        { keys: [['←'], ['→']], action: 'Name or bar' },
        { keys: [['Enter']], action: 'Open details' },
      ],
    },
    {
      title: 'On a name',
      shortcuts: [
        { keys: [['F2']], action: 'Rename', edits: true },
        { keys: [['Space']], action: 'Pick up to reorder, then ↑ ↓ and Space', edits: true },
      ],
    },
    {
      title: 'On a bar',
      shortcuts: [
        {
          keys: [
            [alt, '←'],
            [alt, '→'],
          ],
          action: 'Move by a Working Day',
          edits: true,
        },
        {
          keys: [
            [alt, shift, '←'],
            [alt, shift, '→'],
          ],
          action: 'Change the end date',
          edits: true,
        },
        { keys: [['C']], action: 'Draw a Dependency, then arrows and Enter', edits: true },
        { keys: [[mac ? '⌫' : 'Delete']], action: 'Remove', edits: true },
      ],
    },
    {
      title: 'In details',
      shortcuts: [{ keys: [[mod, 'Enter']], action: 'Save Item', edits: true }],
    },
  ];
}
export function Shortcuts({
  open,
  onOpenChange,
  readOnly,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  readOnly: boolean;
}) {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={<Button variant="ghost" size="icon-sm" aria-label="Keyboard shortcuts" />}
            />
          }
        >
          <KeyboardIcon />
        </TooltipTrigger>
        <TooltipContent>
          Keyboard shortcuts <kbd className="shortcut-key shortcut-key-dark">?</kbd>
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" sideOffset={8} className="shortcuts w-[22rem] gap-0 p-0">
        <PopoverTitle className="px-4 pt-4 pb-1 text-sm font-semibold">
          Keyboard shortcuts
        </PopoverTitle>
        {sections(mac)
          .map(section => ({
            ...section,
            shortcuts: section.shortcuts.filter(shortcut => !readOnly || !shortcut.edits),
          }))
          .filter(section => section.shortcuts.length)
          .map(section => (
            <section key={section.title} className="px-4 py-2.5 not-last:border-b">
              <h3 className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                {section.title}
              </h3>
              <dl className="grid gap-1.5">
                {section.shortcuts.map(shortcut => (
                  <div key={shortcut.action} className="flex items-center justify-between gap-4">
                    <dd className="text-[13px] text-pretty">{shortcut.action}</dd>
                    <dt className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((combo, index) => (
                        <span key={combo.join('+')} className="flex items-center gap-0.5">
                          {index > 0 && (
                            <span className="px-0.5 text-[11px] text-muted-foreground">or</span>
                          )}
                          {combo.map(key => (
                            <kbd key={key} className="shortcut-key">
                              {key}
                            </kbd>
                          ))}
                        </span>
                      ))}
                    </dt>
                  </div>
                ))}
              </dl>
            </section>
          ))}
      </PopoverContent>
    </Popover>
  );
}
