'use client';

import { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';

export interface ForumPost {
  id: string;
  teamCode: string;
  teamName: string;
  city: string;
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
