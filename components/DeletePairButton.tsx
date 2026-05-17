'use client';

import { useTransition } from 'react';
import { deletePairSession } from '@/app/pair-actions';
import { DELETE_WARNING } from '@/lib/couples-copy';

export default function DeletePairButton({ pairId, participantId }: { pairId: string; participantId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(DELETE_WARNING)) return;
        startTransition(() => deletePairSession({ pairId, participantId }));
      }}
      className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? 'Deleting…' : 'Delete this comparison'}
    </button>
  );
}
