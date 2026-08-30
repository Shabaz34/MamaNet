'use client';

import { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

export interface RosterPlayer {
  uid: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
}

export interface TeamFile {
  id: string;
  fileName: string;
  uploadedBy: string;
  teamCode: string;
  hasContent: boolean;
  timestampMs: number;
}

export interface TeamPracticePlan {
  id: string;
  title: string;
  date: string;
  notes: string;
  createdBy: string;
  teamCode: string;
  timestampMs: number;
}

export interface CoachFile {
  id: string;
  fileName: string;
  hasContent: boolean;
  timestampMs: number;
}

export interface TeamEvent {
  title: string;
  type: 'game' | 'practice';
  date: string;
  time: string;
}

export type RsvpStatus = 'coming' | 'not-coming';

export interface SetScore {
  our: number;
  opponent: number;
}

export interface TeamGame {
  id: string;
  opponentName: string;
  date: string;
  time: string;
  createdBy: string;
  teamCode: string;
  timestampMs: number;
  status: 'scheduled' | 'completed';
  sets?: SetScore[];
  setsWon?: { our: number; opponent: number };
  result?: 'win' | 'loss';
}

export function useTeamRoster(teamCode: string | undefined) {
  const [players, setPlayers] = useState<RosterPlayer[]>([]);

  useEffect(() => {
    if (!db || !teamCode) {
      setPlayers([]);
      return;
    }

    const q = query(collection(db, 'users'), where('role', '==', 'player'), where('teamCode', '==', teamCode));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPlayers(
          snapshot.docs.map((d) => {
            const data = d.data() as { fullName?: string; email?: string; avatarUrl?: string };
            return { uid: d.id, fullName: data.fullName ?? '', email: data.email ?? '', avatarUrl: data.avatarUrl };
          }),
        );
      },
      (err) => console.error('useTeamRoster listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode]);

  return players;
}

export function useTeamFiles(teamCode: string | undefined) {
  const [files, setFiles] = useState<TeamFile[]>([]);

  useEffect(() => {
    if (!db || !teamCode) {
      setFiles([]);
      return;
    }

    const q = query(collection(db, 'team_files'), where('teamCode', '==', teamCode));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setFiles(
          snapshot.docs.map((d) => {
            const data = d.data() as {
              fileName?: string;
              uploadedBy?: string;
              teamCode?: string;
              hasContent?: boolean;
              timestamp?: { toMillis?: () => number };
            };
            return {
              id: d.id,
              fileName: data.fileName ?? '',
              uploadedBy: data.uploadedBy ?? '',
              teamCode: data.teamCode ?? '',
              hasContent: Boolean(data.hasContent),
              timestampMs: data.timestamp?.toMillis?.() ?? 0,
            };
          }),
        );
      },
      (err) => console.error('useTeamFiles listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode]);

  return files;
}

export function useTeamPracticePlans(teamCode: string | undefined) {
  const [plans, setPlans] = useState<TeamPracticePlan[]>([]);

  useEffect(() => {
    if (!db || !teamCode) {
      setPlans([]);
      return;
    }

    const q = query(collection(db, 'team_practice_plans'), where('teamCode', '==', teamCode));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPlans(
          snapshot.docs.map((d) => {
            const data = d.data() as {
              title?: string;
              date?: string;
              notes?: string;
              createdBy?: string;
              teamCode?: string;
              timestamp?: { toMillis?: () => number };
            };
            return {
              id: d.id,
              title: data.title ?? '',
              date: data.date ?? '',
              notes: data.notes ?? '',
              createdBy: data.createdBy ?? '',
              teamCode: data.teamCode ?? '',
              timestampMs: data.timestamp?.toMillis?.() ?? 0,
            };
          }),
        );
      },
      (err) => console.error('useTeamPracticePlans listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode]);

  return plans;
}

export function useCoachFiles(coachUid: string | undefined) {
  const [files, setFiles] = useState<CoachFile[]>([]);

  useEffect(() => {
    if (!db || !coachUid) {
      setFiles([]);
      return;
    }

    const q = query(collection(db, 'coach_files'), where('uploadedBy', '==', coachUid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setFiles(
          snapshot.docs.map((d) => {
            const data = d.data() as {
              fileName?: string;
              hasContent?: boolean;
              timestamp?: { toMillis?: () => number };
            };
            return {
              id: d.id,
              fileName: data.fileName ?? '',
              hasContent: Boolean(data.hasContent),
              timestampMs: data.timestamp?.toMillis?.() ?? 0,
            };
          }),
        );
      },
      (err) => console.error('useCoachFiles listener failed:', err),
    );

    return unsubscribe;
  }, [coachUid]);

  return files;
}

export function useTeamEvent(teamCode: string | undefined) {
  const [event, setEvent] = useState<TeamEvent | null>(null);

  useEffect(() => {
    if (!db || !teamCode) {
      setEvent(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'team_events', teamCode),
      (snap) => {
        if (!snap.exists()) {
          setEvent(null);
          return;
        }
        const data = snap.data() as { title?: string; type?: 'game' | 'practice'; date?: string; time?: string };
        setEvent({
          title: data.title ?? '',
          type: data.type === 'game' ? 'game' : 'practice',
          date: data.date ?? '',
          time: data.time ?? '',
        });
      },
      (err) => console.error('useTeamEvent listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode]);

  return event;
}

export async function saveTeamEvent(teamCode: string, event: TeamEvent, coachUid: string) {
  if (!db) return;
  await setDoc(doc(db, 'team_events', teamCode), { ...event, createdBy: coachUid, updatedAt: serverTimestamp() });
}

export function useMyRsvp(teamCode: string | undefined, uid: string | undefined) {
  const [status, setStatus] = useState<RsvpStatus | null>(null);

  useEffect(() => {
    if (!db || !teamCode || !uid) {
      setStatus(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'team_events', teamCode, 'rsvps', uid),
      (snap) => setStatus(snap.exists() ? ((snap.data().status as RsvpStatus) ?? null) : null),
      (err) => console.error('useMyRsvp listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode, uid]);

  return status;
}

export async function setMyRsvp(teamCode: string, uid: string, status: RsvpStatus) {
  if (!db) return;
  await setDoc(doc(db, 'team_events', teamCode, 'rsvps', uid), { status, updatedAt: serverTimestamp() });
}

export function useEventRsvps(teamCode: string | undefined) {
  const [rsvps, setRsvps] = useState<Record<string, RsvpStatus>>({});

  useEffect(() => {
    if (!db || !teamCode) {
      setRsvps({});
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'team_events', teamCode, 'rsvps'),
      (snapshot) => {
        const next: Record<string, RsvpStatus> = {};
        snapshot.docs.forEach((d) => {
          next[d.id] = (d.data().status as RsvpStatus) ?? 'not-coming';
        });
        setRsvps(next);
      },
      (err) => console.error('useEventRsvps listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode]);

  return rsvps;
}

export interface EventGuest {
  id: string;
  name: string;
  addedBy: string;
}

export function useEventGuests(teamCode: string | undefined) {
  const [guests, setGuests] = useState<EventGuest[]>([]);

  useEffect(() => {
    if (!db || !teamCode) {
      setGuests([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'team_events', teamCode, 'guests'),
      (snapshot) => {
        setGuests(
          snapshot.docs.map((d) => {
            const data = d.data() as { name?: string; addedBy?: string };
            return { id: d.id, name: data.name ?? '', addedBy: data.addedBy ?? '' };
          }),
        );
      },
      (err) => console.error('useEventGuests listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode]);

  return guests;
}

export async function addEventGuest(teamCode: string, name: string, addedByUid: string) {
  if (!db) return;
  await addDoc(collection(db, 'team_events', teamCode, 'guests'), {
    name,
    addedBy: addedByUid,
    addedAt: serverTimestamp(),
  });
}

export async function removeEventGuest(teamCode: string, guestId: string) {
  if (!db) return;
  await deleteDoc(doc(db, 'team_events', teamCode, 'guests', guestId));
}

export function useTeamCaptain(teamCode: string | undefined) {
  const [captainUid, setCaptainUid] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !teamCode) {
      setCaptainUid(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'team_captains', teamCode),
      (snap) => setCaptainUid(snap.exists() ? ((snap.data().captainUid as string) ?? null) : null),
      (err) => console.error('useTeamCaptain listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode]);

  return captainUid;
}

export async function setTeamCaptain(teamCode: string, captainUid: string) {
  if (!db) return;
  await setDoc(doc(db, 'team_captains', teamCode), { captainUid, updatedAt: serverTimestamp() });
}

export function useTeamGames(teamCode: string | undefined) {
  const [games, setGames] = useState<TeamGame[]>([]);

  useEffect(() => {
    if (!db || !teamCode) {
      setGames([]);
      return;
    }

    const q = query(collection(db, 'team_games'), where('teamCode', '==', teamCode));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setGames(
          snapshot.docs.map((d) => {
            const data = d.data() as {
              opponentName?: string;
              date?: string;
              time?: string;
              createdBy?: string;
              teamCode?: string;
              timestamp?: { toMillis?: () => number };
              status?: 'scheduled' | 'completed';
              sets?: SetScore[];
              setsWon?: { our: number; opponent: number };
              result?: 'win' | 'loss';
            };
            return {
              id: d.id,
              opponentName: data.opponentName ?? '',
              date: data.date ?? '',
              time: data.time ?? '',
              createdBy: data.createdBy ?? '',
              teamCode: data.teamCode ?? '',
              timestampMs: data.timestamp?.toMillis?.() ?? 0,
              status: data.status === 'completed' ? 'completed' : 'scheduled',
              sets: data.sets,
              setsWon: data.setsWon,
              result: data.result,
            };
          }),
        );
      },
      (err) => console.error('useTeamGames listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode]);

  return games;
}

export async function addTeamGame(teamCode: string, game: { opponentName: string; date: string; time: string }, captainUid: string) {
  if (!db) return;
  await addDoc(collection(db, 'team_games'), {
    ...game,
    teamCode,
    createdBy: captainUid,
    status: 'scheduled',
    timestamp: serverTimestamp(),
  });
}

export async function deleteTeamGame(gameId: string) {
  if (!db) return;
  await deleteDoc(doc(db, 'team_games', gameId));
}

// Computes each set's winner from the raw scores, tallies the match to a
// best-of-3 set score, and derives the overall win/loss before saving.
export async function updateTeamGameResult(gameId: string, sets: SetScore[], adminUid: string) {
  if (!db) return;
  let ourWins = 0;
  let opponentWins = 0;
  for (const s of sets) {
    if (s.our > s.opponent) ourWins++;
    else if (s.opponent > s.our) opponentWins++;
  }
  const result: 'win' | 'loss' = ourWins > opponentWins ? 'win' : 'loss';

  await setDoc(
    doc(db, 'team_games', gameId),
    {
      sets,
      setsWon: { our: ourWins, opponent: opponentWins },
      result,
      status: 'completed',
      updatedBy: adminUid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
