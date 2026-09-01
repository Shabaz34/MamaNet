'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

export interface ForumPost {
  id: string;
  teamCode: string;
  teamName: string;
  city: string;
  dateKey: string;
  time: string;
}

export interface MyForumJoin {
  id: string;
  teamCode: string;
  dateKey: string;
  time: string;
}

function forumPostId(teamCode: string, dateKey: string): string {
  return `${teamCode}_${dateKey}`;
}

// A published-to-forum flag for one specific team's training session — one
// doc per (team, date), deterministic id so publishing twice is a no-op
// overwrite and "is this date already published" is a single doc lookup.
export function useForumPosts(city: string | undefined) {
  const [posts, setPosts] = useState<ForumPost[]>([]);

  useEffect(() => {
    if (!db || !city) {
      setPosts([]);
      return;
    }

    const q = query(collection(db, 'forum_posts'), where('city', '==', city));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setPosts(
          snapshot.docs.map((d) => {
            const data = d.data() as { teamCode?: string; teamName?: string; city?: string; dateKey?: string; time?: string };
            return {
              id: d.id,
              teamCode: data.teamCode ?? '',
              teamName: data.teamName ?? '',
              city: data.city ?? '',
              dateKey: data.dateKey ?? '',
              time: data.time ?? '',
            };
          }),
        );
      },
      (err) => console.error('useForumPosts listener failed:', err),
    );

    return unsubscribe;
  }, [city]);

  return posts;
}

// Whether the given team's training on this date is currently published to
// the forum — drives the captain's "פרסם/הסרה מהפורום" toggle.
export function useIsPublished(teamCode: string | undefined, dateKey: string | undefined) {
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!db || !teamCode || !dateKey) {
      setPublished(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'forum_posts', forumPostId(teamCode, dateKey)),
      (snap) => setPublished(snap.exists()),
      (err) => console.error('useIsPublished listener failed:', err),
    );

    return unsubscribe;
  }, [teamCode, dateKey]);

  return published;
}

export async function publishToForum(
  teamCode: string,
  teamName: string,
  city: string,
  dateKey: string,
  time: string,
  publishedBy: string,
) {
  if (!db) return;
  await setDoc(doc(db, 'forum_posts', forumPostId(teamCode, dateKey)), {
    teamCode,
    teamName,
    city,
    dateKey,
    time,
    publishedBy,
    publishedAt: serverTimestamp(),
  });
}

export async function unpublishFromForum(teamCode: string, dateKey: string) {
  if (!db) return;
  await deleteDoc(doc(db, 'forum_posts', forumPostId(teamCode, dateKey)));
}

// Every training session this player has joined as a substitute, on *any*
// team — a collection-group query across every team's guests subcollection,
// filtered to entries she added herself. This is what lets a joined session
// keep showing up for her (on her own dashboard) even after it's dropped
// off the browsable forum for being full. Excludes her own team: a
// captain/coach's own uid also ends up as `addedBy` on guests *she* added
// manually to her own team's roster, which isn't a forum join at all.
export function useMyForumJoins(uid: string | undefined, myTeamCode: string | undefined) {
  const [joins, setJoins] = useState<MyForumJoin[]>([]);

  useEffect(() => {
    if (!db || !uid) {
      setJoins([]);
      return;
    }

    const q = query(collectionGroup(db, 'guests'), where('addedBy', '==', uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setJoins(
          snapshot.docs
            .map((d) => {
              const data = d.data() as { teamCode?: string; dateKey?: string; time?: string };
              // Path-derived fallback for any guest doc written before these
              // fields existed: .../team_training_sessions/{teamCode}/dates/{dateKey}/guests/{id}
              const teamCode = data.teamCode ?? d.ref.parent.parent?.parent.parent?.id ?? '';
              const dateKey = data.dateKey ?? d.ref.parent.parent?.id ?? '';
              return { id: d.id, teamCode, dateKey, time: data.time ?? '' };
            })
            .filter((j) => j.teamCode && j.teamCode !== myTeamCode),
        );
      },
      (err) => console.error('useMyForumJoins listener failed:', err),
    );

    return unsubscribe;
  }, [uid, myTeamCode]);

  return joins;
}
