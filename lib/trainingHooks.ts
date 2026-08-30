'use client';

import { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
  ATTENDANCE_TARGET,
  POLL_WINDOW_MS,
  WEEKDAY_NAMES,
  formatDateKey,
  resolveNextTraining,
  sessionDateTime,
  toDateKey,
  computeDefaultSessionDate,
  type ResolvedTraining,
  type TrainingSettings,
} from './trainingSchedule';

// Re-exported for existing importers (components already do
// `import { ATTENDANCE_TARGET, formatDateKey, sessionDateTime, ... } from '@/lib/trainingHooks'`).
export { ATTENDANCE_TARGET, POLL_WINDOW_MS, WEEKDAY_NAMES, formatDateKey, sessionDateTime };
export type { ResolvedTraining, TrainingSettings };

export type TrainingRsvpStatus = 'coming' | 'not-coming';

export interface TrainingGuest {
  id: string;
  name: string;
  addedBy: string;
}

export function useTrainingSettings(teamCode: string | undefined) {
  const [settings, setSettings] = useState<TrainingSettings | null>(null);

  useEffect(() => {
    if (!db || !teamCode) {
      setSettings(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'team_training_settings', teamCode),
      (snap) => {
        if (!snap.exists()) {
          setSettings(null);
          return;
        }
        const data = snap.data() as { weekday?: number; time?: string };
        if (typeof data.weekday !== 'number' || !data.time) {
          setSettings(null);
          return;
        }
        setSettings({ weekday: data.weekday, time: data.time });
      },
      (err) => console.error('useTrainingSettings listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode]);

  return settings;
}

export async function saveTrainingSettings(teamCode: string, settings: TrainingSettings, captainUid: string) {
  if (!db) return;
  await setDoc(doc(db, 'team_training_settings', teamCode), {
    ...settings,
    updatedBy: captainUid,
    updatedAt: serverTimestamp(),
  });
}

function useTrainingOverride(teamCode: string | undefined, defaultDateKey: string | undefined) {
  const [override, setOverride] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    if (!db || !teamCode || !defaultDateKey) {
      setOverride(null);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'team_training_overrides', teamCode, 'dates', defaultDateKey),
      (snap) => {
        if (!snap.exists()) {
          setOverride(null);
          return;
        }
        const data = snap.data() as { date?: string; time?: string };
        if (!data.date || !data.time) {
          setOverride(null);
          return;
        }
        setOverride({ date: data.date, time: data.time });
      },
      (err) => console.error('useTrainingOverride listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode, defaultDateKey]);

  return override;
}

export async function saveTrainingOverride(
  teamCode: string,
  defaultDateKey: string,
  newDateKey: string,
  newTime: string,
  captainUid: string,
) {
  if (!db) return;
  await setDoc(doc(db, 'team_training_overrides', teamCode, 'dates', defaultDateKey), {
    date: newDateKey,
    time: newTime,
    updatedBy: captainUid,
    updatedAt: serverTimestamp(),
  });
}

export function useNextTraining(teamCode: string | undefined, now: Date): ResolvedTraining | null {
  const settings = useTrainingSettings(teamCode);
  const defaultDateKey = settings ? toDateKey(computeDefaultSessionDate(settings.weekday, settings.time, now)) : undefined;
  const override = useTrainingOverride(teamCode, defaultDateKey);

  return resolveNextTraining(settings, override, now);
}

export interface TrainingPollState {
  next: ResolvedTraining | null;
  now: Date;
  msUntilStart: number | null;
  msUntilPollOpens: number | null;
  pollOpen: boolean;
  trainingStarted: boolean;
}

export function useTrainingPollState(teamCode: string | undefined): TrainingPollState {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const next = useNextTraining(teamCode, now);

  if (!next) {
    return { next: null, now, msUntilStart: null, msUntilPollOpens: null, pollOpen: false, trainingStarted: false };
  }

  const msUntilStart = sessionDateTime(next.dateKey, next.time).getTime() - now.getTime();
  const msUntilPollOpens = msUntilStart - POLL_WINDOW_MS;
  const pollOpen = msUntilPollOpens <= 0 && msUntilStart > 0;
  const trainingStarted = msUntilStart <= 0;

  return { next, now, msUntilStart, msUntilPollOpens, pollOpen, trainingStarted };
}

export function useTrainingRsvps(teamCode: string | undefined, dateKey: string | undefined) {
  const [rsvps, setRsvps] = useState<Record<string, TrainingRsvpStatus>>({});

  useEffect(() => {
    if (!db || !teamCode || !dateKey) {
      setRsvps({});
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'team_training_sessions', teamCode, 'dates', dateKey, 'rsvps'),
      (snapshot) => {
        const next: Record<string, TrainingRsvpStatus> = {};
        snapshot.docs.forEach((d) => {
          next[d.id] = (d.data().status as TrainingRsvpStatus) ?? 'not-coming';
        });
        setRsvps(next);
      },
      (err) => console.error('useTrainingRsvps listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode, dateKey]);

  return rsvps;
}

export async function setMyTrainingRsvp(
  teamCode: string,
  dateKey: string,
  uid: string,
  status: TrainingRsvpStatus,
) {
  if (!db) return;
  await setDoc(doc(db, 'team_training_sessions', teamCode, 'dates', dateKey, 'rsvps', uid), {
    status,
    updatedAt: serverTimestamp(),
  });
}

export function useTrainingGuests(teamCode: string | undefined, dateKey: string | undefined) {
  const [guests, setGuests] = useState<TrainingGuest[]>([]);

  useEffect(() => {
    if (!db || !teamCode || !dateKey) {
      setGuests([]);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'team_training_sessions', teamCode, 'dates', dateKey, 'guests'),
      (snapshot) => {
        setGuests(
          snapshot.docs.map((d) => {
            const data = d.data() as { name?: string; addedBy?: string };
            return { id: d.id, name: data.name ?? '', addedBy: data.addedBy ?? '' };
          }),
        );
      },
      (err) => console.error('useTrainingGuests listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode, dateKey]);

  return guests;
}

export async function addTrainingGuest(teamCode: string, dateKey: string, name: string, captainUid: string) {
  if (!db) return;
  await addDoc(collection(db, 'team_training_sessions', teamCode, 'dates', dateKey, 'guests'), {
    name,
    addedBy: captainUid,
    addedAt: serverTimestamp(),
  });
}

export async function removeTrainingGuest(teamCode: string, dateKey: string, guestId: string) {
  if (!db) return;
  await deleteDoc(doc(db, 'team_training_sessions', teamCode, 'dates', dateKey, 'guests', guestId));
}
