'use client';

import { useState } from 'react';
import { UserCircle2, Menu, NotebookPen, BookOpen, Sparkles, Trophy } from 'lucide-react';
import { useTeamCaptain, useTeamRoster } from '@/lib/teamHooks';
import TeamRoster from './TeamRoster';
import EventEditor from './EventEditor';
import NextEventCard from './NextEventCard';
import NextGameCard from './NextGameCard';
import TrainingRsvpCard from './TrainingRsvpCard';
import TrainingPlanView from './TrainingPlanView';
import KnowledgeBaseView from './KnowledgeBaseView';
import RulesChatBot from './RulesChatBot';
import MatchHistoryView from './MatchHistoryView';
import DrawerMenu, { DrawerItem } from './DrawerMenu';
import PushPermissionPrompt from './PushPermissionPrompt';

type View = 'dashboard' | 'plan' | 'knowledge' | 'rules' | 'results';

export default function CoachDashboard({
  coachName,
  coachUid,
  teamCode,
  avatarUrl,
  onOpenProfile,
  onLogout,
}: {
  coachName: string;
  coachUid: string;
  teamCode: string;
  avatarUrl?: string;
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  const [view, setView] = useState<View>('dashboard');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const roster = useTeamRoster(teamCode);
  const captainUid = useTeamCaptain(teamCode);

  function openView(next: View) {
    setView(next);
    setDrawerOpen(false);
  }

  if (view === 'plan') {
    return <TrainingPlanView teamCode={teamCode} coachUid={coachUid} onBack={() => setView('dashboard')} />;
  }
  if (view === 'knowledge') {
    return <KnowledgeBaseView teamCode={teamCode} onBack={() => setView('dashboard')} />;
  }
  if (view === 'rules') {
    return <RulesChatBot onBack={() => setView('dashboard')} />;
  }
  if (view === 'results') {
    return (
      <MatchHistoryView teamCode={teamCode} isAdmin isCoach adminUid={coachUid} onBack={() => setView('dashboard')} />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="פתיחת תפריט"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-700 hover:bg-violet-50 transition"
          >
            <Menu size={22} />
          </button>

          <button
            type="button"
            onClick={onOpenProfile}
            className="flex items-center gap-2 rounded-full ps-3 pe-1.5 py-1.5 min-h-[44px] transition hover:bg-violet-50 hover:ring-2 hover:ring-violet-100"
          >
            <span className="w-9 h-9 rounded-full bg-violet-600 text-white flex items-center justify-center shrink-0 overflow-hidden">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 size={19} />
              )}
            </span>
            <span className="text-xs font-bold text-slate-600">פרופיל מאמן</span>
          </button>
        </div>

        <p className="text-[15px] font-bold text-slate-800 text-center">
          שלום, <span className="text-violet-600">{coachName}</span> 👋
        </p>

        <PushPermissionPrompt uid={coachUid} />

        <TeamRoster players={roster} captainUid={captainUid} />

        {/* Attendance counter + list for the next event; coach can add guests but doesn't RSVP for herself */}
        <NextEventCard teamCode={teamCode} uid={coachUid} isCoach hideSelfRsvp />

        {/* Weekly training attendance counter + list; coach can add guests but doesn't RSVP for herself */}
        <TrainingRsvpCard teamCode={teamCode} uid={coachUid} isCaptain hideSelfRsvp />

        <EventEditor teamCode={teamCode} uid={coachUid} />

        <NextGameCard teamCode={teamCode} isCoach coachUid={coachUid} canEdit />
      </div>

      <DrawerMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={onLogout}>
        <DrawerItem icon={NotebookPen} label="בניית מערך אימון" onClick={() => openView('plan')} />
        <DrawerItem icon={BookOpen} label="מאגר ידע קבוצתי (AI)" onClick={() => openView('knowledge')} />
        <DrawerItem icon={Trophy} label="תוצאות משחקים" onClick={() => openView('results')} />
        <DrawerItem icon={Sparkles} label="חוקת המשחק והתקנון" onClick={() => openView('rules')} />
      </DrawerMenu>
    </>
  );
}
