'use client';
import { useEffect, useState } from 'react';
import { createAgent, registerTools } from '@ui-sdk/react/agent';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { allowBridgeAction, installConfirmation } from './approval';
declare global {
  interface Window {
    ganttaro?: ReturnType<typeof createAgent>;
  }
}
export function AgentBridge() {
  const [confirmation, setConfirmation] = useState<{
    message: string;
    resolve: (allowed: boolean) => void;
  } | null>(null);
  useEffect(() => {
    const removeConfirmation = installConfirmation(
      (message, signal) =>
        new Promise<boolean>(resolve => {
          const finish = (allowed: boolean) => {
            signal?.removeEventListener('abort', abort);
            setConfirmation(null);
            resolve(allowed);
          };
          const abort = () => finish(false);
          signal?.addEventListener('abort', abort, { once: true });
          setConfirmation({ message, resolve: finish });
        }),
    );
    const agent = createAgent({
      allow: (step, { signal }) => {
        if (step.action === 'remove' || step.action === 'restore_revision')
          return allowBridgeAction(step.action, signal);
        return !step.confirm;
      },
    });
    window.ganttaro = agent;
    const unregister = registerTools(agent, { allow: () => true });
    return () => {
      unregister();
      removeConfirmation();
      if (window.ganttaro === agent) delete window.ganttaro;
    };
  }, []);
  return (
    <Dialog
      open={!!confirmation}
      onOpenChange={open => {
        if (!open) confirmation?.resolve(false);
      }}
    >
      <DialogContent data-agent-hidden>
        <DialogTitle>Confirm Agent Edit</DialogTitle>
        <DialogDescription>{confirmation?.message}</DialogDescription>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => confirmation?.resolve(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={event => {
              if (event.nativeEvent.isTrusted) confirmation?.resolve(true);
            }}
          >
            Allow Agent Edit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
