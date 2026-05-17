'use client';

import { useState } from 'react';

export default function CopyInviteLink({ inviteUrl }: { inviteUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
      window.prompt('Copy this invite link:', inviteUrl);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <code className="min-w-0 flex-1 break-all rounded-2xl bg-white p-3 text-sm text-slate-800 ring-1 ring-amber-100">
        {inviteUrl}
      </code>
      <button
        type="button"
        onClick={copyInviteLink}
        className="rounded-2xl bg-ink px-4 py-3 text-sm font-black text-white shadow-sm transition active:scale-[0.99]"
        aria-live="polite"
      >
        {copied ? 'Copied!' : 'Copy invite link'}
      </button>
    </div>
  );
}
