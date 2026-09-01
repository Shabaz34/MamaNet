'use client';

import { useState, type FormEvent } from 'react';
import { ChevronRight, Check, Loader2, LogOut, UserPlus, Users } from 'lucide-react';
import { useTeamInfo, useTeamRoster } from '@/lib/teamHooks';
import {
  ATTENDANCE_TARGET,
  WEEKDAY_NAMES,
  addTrainingGuest,
  formatDateKey,
  removeTrainingGuest,
  sessionDateTime,
  useTrainingGuests,
  useTrainingRsvps,
} from '@/lib/trainingHooks';
import { useForumPosts, type ForumPost } from '@/lib/forumHooks';

export default function SubstitutesForumView({
  teamCode,
  playerUid,
  playerName,
  onBack,
}: {
  teamCode: string;
  playerUid: string;
  playerName: string;
  onBack: () => void;
}) {
  const myTeam = useTeamInfo(teamCode);
  const posts = useForumPosts(myTeam?.city);
  const otherTeamsPosts = posts.filter((p) => p.teamCode !== teamCode);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="חזרה למסך הבית"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition shrink-0"
        >
          <ChevronRight size={20} />
        </button>
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">פורום משלימות</h2>
          {myTeam?.city && <p className="text-xs text-slate-400 mt-0.5">אימונים פתוחים בעיר {myTeam.city}</p>}
        </div>
      </div>

      {!myTeam?.city ? (
        <p className="text-sm text-slate-500 leading-relaxed bg-white rounded-2xl border border-violet-100 p-5">
          לא ניתן להציג את הפורום — לקבוצה שלך עדיין אין עיר מוגדרת. בקשי מהמאמנת/קפטנית להשלים את פרטי הקבוצה.
        </p>
      ) : otherTeamsPosts.length === 0 ? (
        <p className="text-sm text-slate-500 leading-relaxed bg-white rounded-2xl border border-violet-100 p-5">
          אין כרגע אימונים פתוחים להשלמה בעיר {myTeam.city}.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {otherTeamsPosts.map((post) => (
            <ForumPostCard key={post.id} post={post} playerUid={playerUid} playerName={playerName} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ForumPostCard({ post, playerUid, playerName }: { post: ForumPost; playerUid: string; playerName: string }) {
  const roster = useTeamRoster(post.teamCode);
  const rsvps = useTrainingRsvps(post.teamCode, post.dateKey);
  const guests = useTrainingGuests(post.teamCode, post.dateKey);

  const [guestName, setGuestName] = useState(playerName);
  const [saving, setSaving] = useState(false);

  const attendingPlayers = roster.filter((p) => rsvps[p.uid] === 'coming');
  const myGuestEntry = guests.find((g) => g.addedBy === playerUid);
  const total = attendingPlayers.length + guests.length;
  const isFull = total >= ATTENDANCE_TARGET;

  // Once full, drop off the browsable forum — unless this viewer is the one
  // who filled a spot here, in which case she keeps seeing her own entry.
  if (isFull && !myGuestEntry) return null;

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await addTrainingGuest(post.teamCode, post.dateKey, name, playerUid);
    } catch (err) {
      console.error('Failed to join as substitute:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleLeave() {
    if (!myGuestEntry) return;
    setSaving(true);
    try {
      await removeTrainingGuest(post.teamCode, post.dateKey, myGuestEntry.id);
    } catch (err) {
      console.error('Failed to leave:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="rounded-2xl border border-violet-100 bg-white shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-extrabold text-slate-800">{post.teamName || post.teamCode}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            יום {WEEKDAY_NAMES[sessionDateTime(post.dateKey, post.time).getDay()]}, {formatDateKey(post.dateKey)} בשעה{' '}
            {post.time}
          </p>
        </div>
        <span
          className={`shrink-0 flex items-center gap-1 text-sm font-extrabold tabular-nums ${
            isFull ? 'text-emerald-600' : 'text-violet-600'
          }`}
        >
          <Users size={14} />
          {total}/{ATTENDANCE_TARGET}
        </span>
      </div>

      {guests.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl bg-slate-50 p-2">
          {guests.map((g) => (
            <li key={g.id} className="flex items-center gap-2 px-1.5 py-0.5 text-xs text-slate-600">
              <Check size={12} className="text-emerald-600 shrink-0" />
              {g.name}
              <span className="text-[10px] font-bold text-slate-400">משלימה</span>
            </li>
          ))}
        </ul>
      )}

      {myGuestEntry ? (
        <button
          type="button"
          disabled={saving}
          onClick={handleLeave}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 text-slate-500 py-2.5 min-h-[40px] text-xs font-bold hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60 transition"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
          ביטול הרשמה
        </button>
      ) : (
        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="השם שיופיע ברשימה"
            className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 min-h-[40px] text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
          />
          <button
            type="submit"
            disabled={!guestName.trim() || saving}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 text-white px-3.5 py-2.5 min-h-[40px] text-xs font-bold hover:bg-violet-700 disabled:opacity-40 transition shrink-0"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
            הצטרפות כמשלימה
          </button>
        </form>
      )}
    </li>
  );
}
