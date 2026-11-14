'use client';
type Action = 'remove' | 'restore_revision';
type Ask = (message: string, signal?: AbortSignal) => Promise<boolean>;
let ask: Ask | undefined;
let approved: { action: Action; expires: number } | undefined;
export function installConfirmation(handler: Ask) { ask=handler;return()=>{if(ask===handler)ask=undefined;approved=undefined;}; }
const message = (action: Action) => action==='restore_revision' ? 'Allow the browser agent to restore an earlier Revision? This can remove Items.' : 'Allow the browser agent to delete this Item? This creates a Revision that can be undone.';
export async function allowBridgeAction(action: Action, signal: AbortSignal) {
  approved=undefined;
  const allowed=await ask?.(message(action),signal) ?? false;
  if(allowed)approved={action,expires:Date.now()+1000};
  return allowed;
}
export async function ensureBridgeApproval(action: Action) {
  if(approved?.action===action && approved.expires>=Date.now()){approved=undefined;return;}
  approved=undefined;
  if(!await ask?.(message(action)))throw new Error('A person must confirm this Agent Edit');
}
