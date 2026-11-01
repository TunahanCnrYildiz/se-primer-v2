import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Clock } from 'lucide-react';
import { DecisionData } from '../data/scenario';
import { Choice, PlayerProfile } from '../types';

interface SceneScreenProps {
  decisionIndex: number;
  decision: DecisionData;
  k1Choice?: Choice;
  profile: PlayerProfile;
  clock: string;
  onSelectChoice: (
    choice: Choice,
    timedOut: boolean,
    measurements?: { decisionDurationSec: number; hintOpened: 0 | 1 }
  ) => void;
  onOpenTutor: () => void;
}

export const SceneScreen: React.FC<SceneScreenProps> = ({
  decisionIndex,
  decision,
  k1Choice,
  profile,
  clock,
  onSelectChoice,
  onOpenTutor,
}) => {
  // Timer for experienced level
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ariaAnnouncement, setAriaAnnouncement] = useState<string>('');

  // Hint card expansion state:
  // Beginner: open by default
  // Intermediate / Experienced: collapsed by default, tap to open
  const [isHintOpen, setIsHintOpen] = useState<boolean>(profile.level === 'beginner');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const decisionShownTimeRef = useRef<number>(performance.now());
  const hasHintBeenOpenedRef = useRef<boolean>(profile.level === 'beginner');

  // Reset timer & selection when decision changes
  useEffect(() => {
    setSelectedChoice(null);
    setIsProcessing(false);
    setTimeLeft(60);
    setAriaAnnouncement('');
    setIsHintOpen(profile.level === 'beginner');

    decisionShownTimeRef.current = performance.now();
    hasHintBeenOpenedRef.current = profile.level === 'beginner';

    if (profile.level === 'experienced') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [decisionIndex, profile.level]);

  // Handle accessibility announcements at exactly 30s and 10s
  useEffect(() => {
    if (profile.level === 'experienced') {
      if (timeLeft === 30) {
        setAriaAnnouncement('Kalan süre 30 saniye');
      } else if (timeLeft === 10) {
        setAriaAnnouncement('Kalan süre 10 saniye');
      }
    }
  }, [timeLeft, profile.level]);

  // Auto-trigger Option B if time runs out (KÖ-2)
  useEffect(() => {
    if (profile.level === 'experienced' && timeLeft === 0 && !selectedChoice && !isProcessing) {
      handleSelectOption('B', true);
    }
  }, [timeLeft, profile.level, selectedChoice, isProcessing]);

  const handleSelectOption = (choice: Choice, timedOut = false) => {
    if (isProcessing) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelectedChoice(choice);
    setIsProcessing(true);

    const selectionTime = performance.now();
    const durationMs = selectionTime - decisionShownTimeRef.current;
    const durationSec = durationMs / 1000;
    const hintOpened: 0 | 1 = hasHintBeenOpenedRef.current ? 1 : 0;

    // After 300ms, trigger explanation sheet
    setTimeout(() => {
      onSelectChoice(choice, timedOut, {
        decisionDurationSec: durationSec,
        hintOpened,
      });
    }, 300);
  };

  // Resolve narrative text based on role & previous decision
  let narrativeText = '';
  if (decision.id === 'k1') {
    narrativeText = decision.narrative?.[profile.role] || '';
  } else if (decision.id === 'k2') {
    narrativeText =
      decision.narrativeByK1?.[k1Choice || 'A']?.[profile.role] || '';
  } else if (decision.id === 'k3') {
    narrativeText = decision.narrative?.[profile.role] || '';
  }

  // Resolve metrics for console card
  const metricsLeft =
    decision.id === 'k2'
      ? decision.metricsByK1?.[k1Choice || 'A']?.left || 'ROLLBACK HAZIR'
      : decision.metrics?.left || 'HTTP 500 Spike';

  const metricsRight =
    decision.id === 'k2'
      ? decision.metricsByK1?.[k1Choice || 'A']?.right || 'ERR_RATE: 94.2%'
      : decision.metrics?.right || 'ERR_RATE: 94.2%';

  const isLast10Seconds = profile.level === 'experienced' && timeLeft <= 10;

  return (
    <div className="w-full flex flex-col min-h-screen py-4 px-5 pb-8 max-w-[480px] mx-auto">
      {/* Screen reader live announcement */}
      <div aria-live="polite" className="sr-only">
        {ariaAnnouncement}
      </div>

      {/* Top Status Bar (48px) */}
      <header className="h-[48px] flex items-center justify-between border-b border-[#D9D3C7]/60 pb-2 mb-3">
        {/* Left: Clock */}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#A34E12] inline-block" />
          <span
            data-cy="clock"
            className="font-mono text-[14px] font-medium text-[#14213D] tracking-tight"
          >
            {clock}
          </span>
        </div>

        {/* Center: Progress & Dots */}
        <div className="flex flex-col items-center">
          <span
            data-cy="progress"
            className="font-mono text-[11px] font-medium tracking-[0.08em] text-[#14213D] uppercase"
          >
            KARAR {decisionIndex + 1} / 3
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                decisionIndex >= 0 ? 'bg-[#14213D]' : 'bg-[#D9D3C7]'
              }`}
            />
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                decisionIndex >= 1 ? 'bg-[#14213D]' : 'bg-[#D9D3C7]'
              }`}
            />
            <span
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                decisionIndex >= 2 ? 'bg-[#14213D]' : 'bg-[#D9D3C7]'
              }`}
            />
          </div>
        </div>

        {/* Right: Tutor Chat Button */}
        <button
          type="button"
          data-cy="tutor-open"
          onClick={onOpenTutor}
          aria-label="Tutor'a sor"
          className="w-9 h-9 rounded-[8px] bg-[#FFFDF8] border border-[#D9D3C7] shadow-subtle flex items-center justify-center text-[#14213D] hover:bg-[#F2EEE6] active:translate-y-[1px] transition-all cursor-pointer"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </header>

      {/* Timer Bar (Only for experienced level) */}
      {profile.level === 'experienced' && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[13px] font-mono mb-1.5">
            <span className="text-[11px] tracking-[0.08em] text-[#5B6275] uppercase">
              KALAN SÜRE
            </span>
            <div
              className={`flex items-center gap-1 ${
                isLast10Seconds ? 'text-[#A34E12] font-bold' : 'text-[#14213D] font-medium'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span data-cy="timer">
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
          <div className="w-full h-1 bg-[#D9D3C7] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                isLast10Seconds ? 'bg-[#A34E12]' : 'bg-[#14213D]'
              }`}
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col gap-4 flex-1">
        {/* Console Card (Lacivert, #14213D) */}
        <div className="w-full bg-[#14213D] text-[#FFFDF8] rounded-[14px] p-5 shadow-sm">
          {/* Top Label */}
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] font-medium tracking-[0.08em] text-[#F0A35A] uppercase">
              {decision.label}
            </span>
            <span className="font-mono text-[11px] font-medium text-[#5B6275]">
              INC-9402
            </span>
          </div>

          {/* Narrative Body */}
          <p className="font-serif text-[19px] leading-[28px] text-[#FFFDF8] mb-4">
            {narrativeText}
          </p>

          {/* Divider */}
          <div className="w-full h-px bg-[#5B6275]/40 mb-3" />

          {/* Bottom Metrikler or Log satırı for K3 */}
          {decision.id === 'k3' ? (
            <div className="font-mono text-[12px] leading-[18px] text-[#F0A35A] bg-[#000a24]/60 p-2.5 rounded-[6px] border border-[#5B6275]/30 break-all select-all">
              {decision.logLine}
            </div>
          ) : (
            <div className="flex items-center justify-between font-mono text-[12px]">
              <div className="flex items-center gap-1.5 text-[#F0A35A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F0A35A] inline-block" />
                <span>{metricsLeft}</span>
              </div>
              <span className="text-[#5B6275]">{metricsRight}</span>
            </div>
          )}
        </div>

        {/* Hint Card */}
        <div
          data-cy="hint"
          className="w-full bg-[#FFFDF8] rounded-[14px] border border-[#D9D3C7] shadow-subtle border-l-[3px] border-l-[#A34E12] overflow-hidden"
        >
          <button
            type="button"
            onClick={() => {
              setIsHintOpen((prev) => {
                const next = !prev;
                if (next) {
                  hasHintBeenOpenedRef.current = true;
                }
                return next;
              });
            }}
            className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-[#F2EEE6]/30 transition-colors"
          >
            <div className="flex items-center gap-1.5 font-mono text-[11px] tracking-tight">
              <span className="font-bold text-[#A34E12] uppercase">İPUCU</span>
              <span className="text-[#5B6275]">• {decision.hintTopic}</span>
            </div>
            <span className="font-mono text-[10px] text-[#5B6275]">
              {isHintOpen ? '[ GİZLE ]' : '[ GÖSTER ]'}
            </span>
          </button>

          {isHintOpen && (
            <div className="px-4 pb-3.5 pt-1 border-t border-[#D9D3C7]/40">
              <p className="font-sans text-[14px] leading-[22px] text-[#14213D]">
                {decision.hints[0]}
              </p>
            </div>
          )}
        </div>

        {/* Müdahale Seçenekleri Header */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <span className="font-mono text-[11px] tracking-[0.08em] font-medium text-[#5B6275] uppercase">
              MÜDAHALE SEÇENEKLERİ
            </span>
            <span className="font-sans text-[12px] text-[#5B6275]">
              Seçim yapınız
            </span>
          </div>

          {/* Options List */}
          <div className="flex flex-col gap-2.5" role="radiogroup">
            {/* Option A */}
            <button
              type="button"
              role="radio"
              aria-checked={selectedChoice === 'A'}
              data-cy="choice-a"
              disabled={isProcessing}
              onClick={() => handleSelectOption('A')}
              className={`w-full min-h-[64px] px-4 py-3 rounded-[14px] flex items-center justify-between text-left transition-all ${
                selectedChoice === 'A'
                  ? 'bg-[#FFFDF8] border-2 border-[#14213D] shadow-sm'
                  : 'bg-[#FFFDF8] border border-[#D9D3C7] shadow-subtle hover:border-[#5B6275]/50 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-[6px] bg-[#F2EEE6] text-[#14213D] font-mono text-[14px] font-bold flex items-center justify-center shrink-0">
                  A
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-sans text-[15px] font-medium text-[#14213D]">
                    A · {decision.options.A.title}
                  </span>
                  <span className="font-mono text-[12px] text-[#5B6275] mt-0.5 break-words">
                    {decision.options.A.sub}
                  </span>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border transition-colors shrink-0 ${
                  selectedChoice === 'A'
                    ? 'border-[#14213D] bg-[#14213D]'
                    : 'border-[#D9D3C7] bg-transparent'
                }`}
              />
            </button>

            {/* Option B */}
            <button
              type="button"
              role="radio"
              aria-checked={selectedChoice === 'B'}
              data-cy="choice-b"
              disabled={isProcessing}
              onClick={() => handleSelectOption('B')}
              className={`w-full min-h-[64px] px-4 py-3 rounded-[14px] flex items-center justify-between text-left transition-all ${
                selectedChoice === 'B'
                  ? 'bg-[#FFFDF8] border-2 border-[#14213D] shadow-sm'
                  : 'bg-[#FFFDF8] border border-[#D9D3C7] shadow-subtle hover:border-[#5B6275]/50 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                <div className="w-8 h-8 rounded-[6px] bg-[#F2EEE6] text-[#14213D] font-mono text-[14px] font-bold flex items-center justify-center shrink-0">
                  B
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-sans text-[15px] font-medium text-[#14213D]">
                    B · {decision.options.B.title}
                  </span>
                  <span className="font-mono text-[12px] text-[#5B6275] mt-0.5 break-words">
                    {decision.options.B.sub}
                  </span>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border transition-colors shrink-0 ${
                  selectedChoice === 'B'
                    ? 'border-[#14213D] bg-[#14213D]'
                    : 'border-[#D9D3C7] bg-transparent'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
