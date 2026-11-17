'use client';
import { useEffect, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from 'cn';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ClaudeMark, GitHubMark, OpenAIMark } from '@/components/brand-marks';
import { setupPrompts, type SetupHarness } from '@/lib/setup-prompts';

const marks = { claude: ClaudeMark, chatgpt: OpenAIMark };
const swap = 'transition-[opacity,filter,scale] duration-300 ease-[cubic-bezier(0.2,0,0,1)]';

export function HeroActions() {
  const [status, setStatus] = useState<
    { state: 'copied'; harness: SetupHarness } | { state: 'failed' } | null
  >(null);
  useEffect(() => {
    if (status?.state !== 'copied') return;
    const timer = setTimeout(() => setStatus(null), 4000);
    return () => clearTimeout(timer);
  }, [status]);
  const copied = status?.state === 'copied';
  return (
    <>
      <div className="home-hero-actions">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="lg" className="pl-3 pr-2.5" aria-label="Set up in Claude or ChatGPT" />
            }
          >
            Set up in
            <span
              className="setup-roll"
              data-chosen={status?.state === 'copied' ? status.harness : undefined}
              aria-hidden="true"
            >
              <span>
                <ClaudeMark />
                Claude
              </span>
              <span>
                <OpenAIMark />
                ChatGPT
              </span>
            </span>
            <span className="relative size-4">
              <CheckIcon
                className={cn(
                  'absolute inset-0',
                  swap,
                  copied ? 'scale-100 opacity-100 blur-0' : 'scale-[0.25] opacity-0 blur-[4px]',
                )}
              />
              <ChevronDownIcon
                className={cn(
                  'absolute inset-0',
                  swap,
                  copied ? 'scale-[0.25] opacity-0 blur-[4px]' : 'scale-100 opacity-60 blur-0',
                )}
              />
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Copy the setup prompt for</DropdownMenuLabel>
              {(Object.keys(setupPrompts) as SetupHarness[]).map(harness => {
                const Mark = marks[harness];
                return (
                  <DropdownMenuItem
                    key={harness}
                    onClick={() => {
                      navigator.clipboard
                        .writeText(setupPrompts[harness].prompt)
                        .then(() => setStatus({ state: 'copied', harness }))
                        .catch(() => setStatus({ state: 'failed' }));
                    }}
                  >
                    <Mark />
                    {setupPrompts[harness].harness}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <a
          href="https://github.com/fabiotaroc/ganttaro"
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({
            variant: 'outline',
            size: 'lg',
            className: 'home-hero-github pl-2.5 pr-3',
          })}
        >
          <GitHubMark />
          GitHub
        </a>
      </div>
      <p className="home-hero-status" aria-live="polite">
        {status?.state === 'copied' ? (
          <>Copied. Paste it into {setupPrompts[status.harness].harness} to install Ganttaro.</>
        ) : status?.state === 'failed' ? (
          <>Couldn’t copy the prompt. You’ll find it in the README on GitHub.</>
        ) : null}
      </p>
    </>
  );
}
