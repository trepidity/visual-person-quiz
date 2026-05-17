'use client';

import { useEffect } from 'react';
import { recordInviteOpened } from '@/app/pair-actions';

export default function InviteOpenedTracker({ pairId, inviteToken }: { pairId: string; inviteToken: string }) {
  useEffect(() => {
    const key = `visual-person-quiz:invite-opened:${pairId}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
    void recordInviteOpened({ pairId, inviteToken });
  }, [pairId, inviteToken]);

  return null;
}
