import { useState, useTransition, useRef } from 'react';
import { Screen, Level, Role, Goal, Choice, GameChoices, ChatMessage, DecisionMeasurement } from './types';
import { scenarioData } from './data/scenario';
import { calculateClock, calculateTotalElapsedMinutes, getDecisionMinutes, BASE_START_MINUTES, formatTime } from './utils/time';
import { OnboardingScreen } from './components/OnboardingScreen';
import { SceneScreen } from './components/SceneScreen';
import { ExplanationSheet } from './components/ExplanationSheet';
import { TutorSheet } from './components/TutorSheet';
import { EndingScreen } from './components/EndingScreen';
import { askTutor } from './services/tutor';

export default function App() {
  const [, startTransition] = useTransition();

  // Data Collection Mode: ON only if URL has ?veri=1 at startup
  const [isDataMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('veri') === '1';
  });

  // Session id: random 8-char hex/uuid slice per game start (kept only in state)
  const [sessionId, setSessionId] = useState<string>('');

  // Decision measurements for data collection mode
  const [decisionRecords, setDecisionRecords] = useState<Record<string, DecisionMeasurement>>({});
  const [tutorRequestCounts, setTutorRequestCounts] = useState<Record<string, number>>({
    k1: 0,
    k2: 0,
    k3: 0,
  });
  const [currentDecisionMeta, setCurrentDecisionMeta] = useState<{
    decisionDurationSec: number;
    hintOpened: 0 | 1;
  } | null>(null);
  const explanationStartTimeRef = useRef<number>(0);

  // Navigation State
  const [screen, setScreen] = useState<Screen>('onboarding');

  // Player Profile State (retained across replay)
  const [level, setLevel] = useState<Level | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);

  // Gameplay State
  const [decisionIndex, setDecisionIndex] = useState<number>(0);
  const [choices, setChoices] = useState<GameChoices>({});
  const [violation, setViolation] = useState<boolean>(false);

  // Explanation sheet state
  const [isExplanationOpen, setIsExplanationOpen] = useState<boolean>(false);
  const [currentChoice, setCurrentChoice] = useState<Choice | null>(null);
  const [timedOut, setTimedOut] = useState<boolean>(false);

  // AI Tutor state
  const [isTutorOpen, setIsTutorOpen] = useState<boolean>(false);
  const [tutorMessages, setTutorMessages] = useState<ChatMessage[]>([]);
  const [hintCounters, setHintCounters] = useState<Record<string, number>>({
    k1: 0,
    k2: 0,
    k3: 0,
  });
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);

  const currentDecision = scenarioData.decisions[decisionIndex];

  // Current clock before this decision was finalized
  const currentSceneClock = calculateClock(choices);

  // Clock including current decision (used inside explanation sheet)
  const previewChoices: GameChoices = {
    ...choices,
    ...(currentDecision.id === 'k1' ? { k1: currentChoice || 'A' } : {}),
    ...(currentDecision.id === 'k2' ? { k2: currentChoice || 'A' } : {}),
    ...(currentDecision.id === 'k3' ? { k3: currentChoice || 'A' } : {}),
  };
  const explanationClock = calculateClock(previewChoices);
  const explanationElapsed = calculateTotalElapsedMinutes(previewChoices);

  // Start game from Onboarding
  const handleStartGame = () => {
    if (!level || !role || !goal) return;

    // Generate a fresh session ID for this game
    const newSessionId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).substring(2, 10);
    setSessionId(newSessionId);
    setDecisionRecords({});
    setTutorRequestCounts({ k1: 0, k2: 0, k3: 0 });
    setCurrentDecisionMeta(null);

    setChoices({});
    setViolation(false);
    setDecisionIndex(0);
    setCurrentChoice(null);
    setTimedOut(false);
    setIsExplanationOpen(false);
    setIsTutorOpen(false);
    setTutorMessages([]);
    setHintCounters({ k1: 0, k2: 0, k3: 0 });
    startTransition(() => {
      setScreen('scene');
    });
  };

  // Called when player selects option A or B (or 60s timeout fires option B)
  const handleSelectChoice = (
    choice: Choice,
    isTimeout: boolean,
    measurements?: { decisionDurationSec: number; hintOpened: 0 | 1 }
  ) => {
    setCurrentChoice(choice);
    setTimedOut(isTimeout);

    if (measurements) {
      setCurrentDecisionMeta(measurements);
    } else {
      setCurrentDecisionMeta({
        decisionDurationSec: 0,
        hintOpened: level === 'beginner' ? 1 : 0,
      });
    }

    // Record choice
    const updatedChoices: GameChoices = {
      ...choices,
      [currentDecision.id]: choice,
    };
    setChoices(updatedChoices);

    if (currentDecision.id === 'k3' && choice === 'B') {
      setViolation(true);
    }

    explanationStartTimeRef.current = performance.now();
    setIsExplanationOpen(true);
  };

  // Called when player clicks "Devam →" in ExplanationSheet
  const handleContinueFromExplanation = () => {
    const explanationDurationSec = (performance.now() - explanationStartTimeRef.current) / 1000;

    const record: DecisionMeasurement = {
      karar_suresi_sn: currentDecisionMeta ? Number(currentDecisionMeta.decisionDurationSec.toFixed(1)) : 0,
      ipucu_acti: currentDecisionMeta ? currentDecisionMeta.hintOpened : (level === 'beginner' ? 1 : 0),
      tutor_mesaj: tutorRequestCounts[currentDecision.id] || 0,
      secim: currentChoice || 'A',
      sure_doldu: timedOut ? 1 : 0,
      aciklama_sn: Number(explanationDurationSec.toFixed(1)),
    };

    setDecisionRecords((prev) => ({
      ...prev,
      [currentDecision.id]: record,
    }));

    setIsExplanationOpen(false);
    setCurrentChoice(null);
    setTimedOut(false);
    setCurrentDecisionMeta(null);

    if (decisionIndex < scenarioData.decisions.length - 1) {
      // Advance to next decision
      setDecisionIndex((prev) => prev + 1);
    } else {
      // Finished all 3 decisions, advance to ending screen
      startTransition(() => {
        setScreen('ending');
      });
    }
  };

  // Tutor handlers
  const handleRequestTutorHint = async () => {
    if (isTutorLoading || !level || !role) return;

    // Track tutor request count for current decision
    setTutorRequestCounts((prev) => ({
      ...prev,
      [currentDecision.id]: (prev[currentDecision.id] || 0) + 1,
    }));

    setIsTutorLoading(true);
    const currentCounter = hintCounters[currentDecision.id] || 0;

    const result = await askTutor({
      decision: currentDecision,
      decisionId: currentDecision.id,
      k1Choice: choices.k1 ?? null,
      level,
      role,
      isHintRequest: true,
      hintIndex: currentCounter,
    });

    setHintCounters((prev) => ({
      ...prev,
      [currentDecision.id]: currentCounter + 1,
    }));
    setIsTutorLoading(false);

    const nowMinutes = BASE_START_MINUTES + calculateTotalElapsedMinutes(choices);
    const timeFormatted = formatTime(nowMinutes);

    setTutorMessages((prev) => [
      ...prev,
      {
        id: `tutor-${Date.now()}`,
        sender: 'tutor',
        text: result.text,
        time: timeFormatted,
      },
    ]);
  };

  const handleSendTutorMessage = async (userText: string) => {
    if (isTutorLoading || !level || !role) return;

    // Track tutor request count for current decision
    setTutorRequestCounts((prev) => ({
      ...prev,
      [currentDecision.id]: (prev[currentDecision.id] || 0) + 1,
    }));

    const nowMinutes = BASE_START_MINUTES + calculateTotalElapsedMinutes(choices);
    const timeFormatted = formatTime(nowMinutes);

    // Append user message immediately
    setTutorMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: userText,
        time: timeFormatted,
      },
    ]);

    setIsTutorLoading(true);
    const currentCounter = hintCounters[currentDecision.id] || 0;

    const result = await askTutor({
      decision: currentDecision,
      decisionId: currentDecision.id,
      k1Choice: choices.k1 ?? null,
      level,
      role,
      userQuestion: userText,
      isHintRequest: false,
      hintIndex: currentCounter,
    });

    if (result.isFallback) {
      setHintCounters((prev) => ({
        ...prev,
        [currentDecision.id]: currentCounter + 1,
      }));
    }

    setIsTutorLoading(false);

    setTutorMessages((prev) => [
      ...prev,
      {
        id: `tutor-${Date.now()}`,
        sender: 'tutor',
        text: result.text,
        time: timeFormatted,
      },
    ]);
  };

  // Replay handler (KÖ-6):
  // Resets choices, clock and violation, but keeps level, role and goal pre-selected!
  const handleReplay = () => {
    setChoices({});
    setViolation(false);
    setDecisionIndex(0);
    setCurrentChoice(null);
    setTimedOut(false);
    setIsExplanationOpen(false);
    setIsTutorOpen(false);
    setTutorMessages([]);
    setHintCounters({ k1: 0, k2: 0, k3: 0 });
    setDecisionRecords({});
    setTutorRequestCounts({ k1: 0, k2: 0, k3: 0 });
    setCurrentDecisionMeta(null);
    startTransition(() => {
      setScreen('onboarding');
    });
  };

  // CSV download handler for data collection mode
  const handleDownloadCsv = () => {
    if (!level || !role || !goal) return;

    const header = 'surum,oturum,sahne_no,seviye,rol,hedef,karar_suresi_sn,ipucu_acti,tutor_mesaj,secim,sure_doldu,aciklama_sn,kaynak';
    const levelNum = level === 'beginner' ? 0 : level === 'intermediate' ? 1 : 2;

    const decisionIds: Array<'k1' | 'k2' | 'k3'> = ['k1', 'k2', 'k3'];
    const rows = decisionIds.map((id, index) => {
      const sahneNo = index + 1;
      const rec = decisionRecords[id] || {
        karar_suresi_sn: 0,
        ipucu_acti: 0,
        tutor_mesaj: 0,
        secim: 'A',
        sure_doldu: 0,
        aciklama_sn: 0,
      };
      const kararSuresi = rec.karar_suresi_sn.toFixed(1);
      const aciklamaSn = rec.aciklama_sn.toFixed(1);

      return `2.0-veri,${sessionId},${sahneNo},${levelNum},${role},${goal},${kararSuresi},${rec.ipucu_acti},${rec.tutor_mesaj},${rec.secim},${rec.sure_doldu},${aciklamaSn},gercek`;
    });

    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `primer-${sessionId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const finalClock = calculateClock(choices);
  const finalMttr = calculateTotalElapsedMinutes(choices);

  return (
    <main className="min-h-screen w-full bg-[#F7F4EE] flex justify-center text-[#14213D] selection:bg-[#F0A35A]/30">
      <div className="w-full max-w-[480px] min-h-screen bg-[#F7F4EE] relative flex flex-col">
        {screen === 'onboarding' && (
          <OnboardingScreen
            level={level}
            role={role}
            goal={goal}
            isDataMode={isDataMode}
            onSelectLevel={setLevel}
            onSelectRole={setRole}
            onSelectGoal={setGoal}
            onStart={handleStartGame}
          />
        )}

        {screen === 'scene' && level && role && goal && (
          <>
            <SceneScreen
              decisionIndex={decisionIndex}
              decision={currentDecision}
              k1Choice={choices.k1}
              profile={{ level, role, goal }}
              clock={currentSceneClock}
              onSelectChoice={handleSelectChoice}
              onOpenTutor={() => setIsTutorOpen(true)}
            />

            {/* Explanation Sheet (overlaying current scene) */}
            {currentChoice && (
              <ExplanationSheet
                isOpen={isExplanationOpen}
                decision={currentDecision}
                choice={currentChoice}
                k1Choice={choices.k1}
                userGoal={goal}
                timedOut={timedOut}
                clock={explanationClock}
                elapsedMinutes={explanationElapsed}
                onContinue={handleContinueFromExplanation}
              />
            )}

            {/* Tutor Sheet (overlaying current scene) */}
            <TutorSheet
              isOpen={isTutorOpen}
              clock={currentSceneClock}
              messages={tutorMessages}
              isLoading={isTutorLoading}
              onClose={() => setIsTutorOpen(false)}
              onRequestHint={handleRequestTutorHint}
              onSendMessage={handleSendTutorMessage}
            />
          </>
        )}

        {screen === 'ending' && goal && (
          <EndingScreen
            choices={choices}
            violation={violation}
            clock={finalClock}
            mttr={finalMttr}
            userGoal={goal}
            isDataMode={isDataMode}
            onDownloadData={handleDownloadCsv}
            onReplay={handleReplay}
          />
        )}
      </div>
    </main>
  );
}
