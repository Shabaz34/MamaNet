'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export const POSITIONS = [1, 2, 3, 4, 5, 6] as const;
export type Position = (typeof POSITIONS)[number];

// Maps a court position (1-6) to the uid of the player standing there.
export type Lineup = Partial<Record<Position, string>>;

export type SetKey = 'set1' | 'set2' | 'set3';

export interface GameLineups {
  plannedLineup?: Lineup;
  setLineups?: Partial<Record<SetKey, Lineup>>;
}

export function useGameLineups(gameId: string | undefined) {
  const [lineups, setLineups] = useState<GameLineups | null>(null);

  useEffect(() => {
    if (!db || !gameId) {
      setLineups(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'team_game_lineups', gameId),
      (snap) => {
        if (!snap.exists()) {
          setLineups(null);
          return;
        }
        const data = snap.data() as { plannedLineup?: Lineup; setLineups?: Partial<Record<SetKey, Lineup>> };
        setLineups({ plannedLineup: data.plannedLineup, setLineups: data.setLineups });
      },
      (err) => console.error('useGameLineups listener failed:', err),
    );

    return unsubscribe;
  }, [gameId]);

  return lineups;
}

export async function savePlannedLineup(gameId: string, teamCode: string, lineup: Lineup, coachUid: string) {
  if (!db) return;
  await setDoc(
    doc(db, 'team_game_lineups', gameId),
    { teamCode, plannedLineup: lineup, updatedBy: coachUid, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

// Writes only the given set's lineup via a dotted field path, so the other
// two sets already saved on this game are left untouched. setDoc(..., {merge:
// true}) treats a dotted string key as a literal field name rather than a
// nested path, so we ensure the doc exists first and then use updateDoc,
// which is the call that actually understands dotted field paths.
export async function saveSetLineup(
  gameId: string,
  teamCode: string,
  setKey: SetKey,
  lineup: Lineup,
  coachUid: string,
) {
  if (!db) return;
  const ref = doc(db, 'team_game_lineups', gameId);
  await setDoc(ref, { teamCode }, { merge: true });
  await updateDoc(ref, {
    [`setLineups.${setKey}`]: lineup,
    updatedBy: coachUid,
    updatedAt: serverTimestamp(),
  });
}
