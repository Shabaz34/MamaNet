'use client';

import { useRef, useState } from 'react';
import { Camera, Loader2, Menu, Sparkles, BookOpen, Trophy, History } from 'lucide-react';
import { useTeamCaptain, useTeamRoster } from '@/lib/teamHooks';
import { uploadAvatar } from '@/lib/uploadAvatar';
import TeamRoster from './TeamRoster';
import TeamChatBot from './TeamChatBot';
import RulesChatBot from './RulesChatBot';
import NextEventCard from './NextEventCard';
import TrainingRsvpCard from './TrainingRsvpCard';
import EventEditor from './EventEditor';
import NextGameCard from './NextGameCard';
import EnterGamesView from './EnterGamesView';
import MatchHistoryView from './MatchHistoryView';
import DrawerMenu, { DrawerItem } from './DrawerMenu';
import PushPermissionPrompt from './PushPermissionPrompt';

type View = 'dashboard' | 'chat' | 'rules' | 'games' | 'results';

export default function PlayerDashboard({
  playerName,
  playerUid,
  teamCode,
  avatarUrl,
  onAvatarChange,
  onLogout,
}: {
  playerName: string;
  playerUid: string;
  teamCode: string;
  avatarUrl?: string;
  onAvatarChange: (url: string) => void;
  onLogout: () => void;
}) {
  const [view, setView] = useState<View>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const roster = useTeamRoster(teamCode);
  const captainUid = useTeamCaptain(teamCode);
  const isCaptain = Boolean(captainUid) && captainUid === playerUid;

  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  async function handleAvatarFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    setAvatarError(null);
    const { avatarUrl: newUrl, error } = await uploadAvatar(file);
    setUploading(false);

    if (error) {
      setAvatarError(error);
      return;
    }
    if (newUrl) onAvatarChange(newUrl);
  }

  function openView(next: View) {
    setView(next);
    setDrawerOpen(false);
  }

  if (view === 'chat') {
    return <TeamChatBot teamCode={teamCode} onBack={() => setView('dashboard')} />;
  }
  if (view === 'rules') {
    return <RulesChatBot onBack={() => setView('dashboard')} />;
  }
  if (view === 'games' && isCaptain) {
    return <EnterGamesView teamCode={teamCode} captainUid={playerUid} onBack={() => setView('dashboard')} />;
  }
  if (view === 'results') {
    return (
      <MatchHistoryView
        teamCode={teamCode}
        isAdmin={isCaptain}
        adminUid={isCaptain ? playerUid : undefined}
        onBack={() => setView('dashboard')}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="פתיחת תפריט"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-700 hover:bg-violet-50 transition"
          >
            <Menu size={22} />
          </button>

          <div className="flex-1 flex flex-col items-center gap-1.5">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              aria-label="החלפת תמונת פרופיל"
              className="relative w-16 h-16 rounded-full bg-violet-600 text-white flex items-center justify-center text-xl font-bold overflow-hidden shrink-0 hover:ring-4 hover:ring-violet-100 transition disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                playerName.trim().charAt(0) || 'ש'
              )}
              <span className="absolute bottom-0 inset-x-0 bg-black/40 flex items-center justify-center py-1">
                <Camera size={12} className="text-white" />
              </span>
            </button>

            <p className="text-[15px] font-bold text-slate-800 text-center text-balance">
              היי <span className="text-violet-600">{playerName}</span>, שמחים לראות אותך! 👋
            </p>

            {avatarError && <p className="text-xs font-semibold text-rose-600">{avatarError}</p>}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleAvatarFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* spacer to balance the hamburger button so the header block stays centered */}
          <div className="w-11 h-11 shrink-0" aria-hidden="true" />
        </div>

        <PushPermissionPrompt uid={playerUid} />

        {/* Hero: upcoming match/training + RSVP */}
        <NextEventCard teamCode={teamCode} uid={playerUid} isCaptain={isCaptain} />

        {/* Weekly training RSVP + attendance counter */}
        <TrainingRsvpCard teamCode={teamCode} uid={playerUid} isCaptain={isCaptain} />

        {/* Recurring training schedule — captain-owned, practice only (games stay coach-only) */}
        {isCaptain && <EventEditor teamCode={teamCode} uid={playerUid} allowGames={false} />}

        {/* Next opponent, entered by the team captain */}
        <NextGameCard teamCode={teamCode} canEdit={isCaptain} />

        <TeamRoster players={roster} captainUid={captainUid} />
      </div>

      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={onLogout}>
        <DrawerItem icon={Sparkles} label="עוזר דיגיטלי AI" onClick={() => openView('chat')} />
        <DrawerItem icon={BookOpen} label="חוקת המשחק והתקנון" onClick={() => openView('rules')} />
        <DrawerItem icon={History} label="תוצאות משחקים" onClick={() => openView('results')} />
        {isCaptain && <DrawerItem icon={Trophy} label="הזן משחקים" onClick={() => openView('games')} />}
      </DrawerMenu>
    </>
  );
}
