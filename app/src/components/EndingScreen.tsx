import React from 'react';
import { ShieldCheck, AlertTriangle, BookOpen, RotateCcw } from 'lucide-react';
import { Choice, GameChoices, Goal } from '../types';
import { scenarioData } from '../data/scenario';
import { getDecisionMinutes } from '../utils/time';

interface EndingScreenProps {
  choices: GameChoices;
  violation: boolean;
  clock: string;
  mttr: number;
  userGoal: Goal;
  isDataMode?: boolean;
  onDownloadData?: () => void;
  onReplay: () => void;
}

export const EndingScreen: React.FC<EndingScreenProps> = ({
  choices,
  violation,
  clock,
  mttr,
  userGoal,
  isDataMode = false,
  onDownloadData,
  onReplay,
}) => {
  const endingType = violation ? 'B' : 'A';
  const k1Choice = choices.k1 || 'A';
  const k2Choice = choices.k2 || 'A';
  const k3Choice = choices.k3 || (violation ? 'B' : 'A');

  const k1Minutes = getDecisionMinutes('k1', k1Choice);
  const k2Minutes = getDecisionMinutes('k2', k2Choice, k1Choice);
  const k3Minutes = getDecisionMinutes('k3', k3Choice);

  const reading = scenarioData.readings[userGoal] || scenarioData.readings.privacy;

  return (
    <div className="w-full flex flex-col min-h-screen py-4 px-5 pb-8 max-w-[480px] mx-auto">
      {/* Top Status Bar */}
      <header className="h-[44px] flex items-center justify-between border-b border-[#D9D3C7]/60 pb-2 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[12px] font-medium text-[#14213D]">
            {clock} SE PRIMER
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#A34E12] inline-block" />
          <span
            className={`font-mono text-[11px] font-semibold tracking-tight ${
              violation ? 'text-[#A34E12]' : 'text-[#5B6275]'
            }`}
          >
            {violation ? scenarioData.endings.B.status : scenarioData.endings.A.status}
          </span>
        </div>
      </header>

      {/* Outcome Card with data-cy="ending" and data-ending="A"|"B" */}
      <div
        data-cy="ending"
        data-ending={endingType}
        className={`w-full rounded-[16px] p-5 mb-6 shadow-sm relative overflow-hidden ${
          violation ? 'bg-[#FFDBC9] text-[#8A3A10]' : 'bg-[#D9E2FF] text-[#1F4E8C]'
        }`}
      >
        {/* Decorative radar graphic for Ending A */}
        {!violation && (
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-20 translate-x-4 translate-y-4">
            <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
              <circle cx="90" cy="90" r="80" stroke="#1F4E8C" strokeWidth="2" strokeDasharray="4 4" />
              <circle cx="90" cy="90" r="50" stroke="#1F4E8C" strokeWidth="1.5" />
              <line x1="90" y1="10" x2="90" y2="170" stroke="#1F4E8C" strokeWidth="1.5" />
              <line x1="10" y1="90" x2="170" y2="90" stroke="#1F4E8C" strokeWidth="1.5" />
            </svg>
          </div>
        )}

        {/* Top Badges */}
        <div className="flex items-center justify-between mb-3 relative z-10">
          {violation ? (
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-[#A34E12]/20 text-[#8A3A10] uppercase flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-[#A34E12]" />
              <span>{scenarioData.endings.B.riskBadge}</span>
            </span>
          ) : (
            <div
              className="w-9 h-9 rounded-[8px] bg-white text-[#1F4E8C] flex items-center justify-center shadow-subtle"
              aria-label={scenarioData.endings.A.iconLabel}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
          )}

          <span
            data-cy="ending-time"
            className="font-mono text-[11px] font-semibold bg-white/70 px-2.5 py-0.5 rounded-[4px] text-[#14213D] shadow-subtle"
          >
            {clock} · T+{mttr}m
          </span>
        </div>

        {/* Icon for Ending B */}
        {violation && (
          <div
            className="w-9 h-9 rounded-[8px] bg-white text-[#8A3A10] flex items-center justify-center shadow-subtle mb-3 relative z-10"
            aria-label={scenarioData.endings.B.iconLabel}
          >
            <AlertTriangle className="w-5 h-5 text-[#8A3A10]" />
          </div>
        )}

        {/* Ending Heading */}
        <h1 className="font-serif text-[22px] leading-[28px] font-semibold mb-2 relative z-10">
          {violation ? scenarioData.endings.B.title : scenarioData.endings.A.title}
        </h1>

        {/* Ending Subtitle Description */}
        <p className="font-sans text-[14px] leading-[22px] mb-4 opacity-90 relative z-10">
          {violation
            ? scenarioData.endings.B.text.replace('{minutes}', mttr.toString())
            : scenarioData.endings.A.text.replace('{minutes}', mttr.toString())}
        </p>

        {/* Outcome Metrics / Badges */}
        {violation ? (
          <div className="bg-white/75 p-3 rounded-[8px] border border-[#8A3A10]/20 relative z-10">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-mono text-[10px] font-semibold text-[#8A3A10] uppercase tracking-tight min-w-0">
                {scenarioData.endings.B.impact}
              </span>
              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] bg-[#8A3A10] text-white whitespace-nowrap flex-shrink-0">
                {scenarioData.endings.B.severity}
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#8A3A10]/20 rounded-full overflow-hidden">
              <div className="w-4/5 h-full bg-[#8A3A10] rounded-full" />
            </div>
          </div>
        ) : (
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[11px] font-semibold px-2 py-1 rounded-[4px] bg-[#14213D] text-white">
                KAYIP YOK
              </span>
              <span className="font-mono text-[11px] font-semibold px-2 py-1 rounded-[4px] bg-white text-[#14213D]">
                VERİ GÜVENLİĞİ %100
              </span>
            </div>
            <div className="font-mono text-[12px] font-bold tracking-wider text-[#1F4E8C]">
              {scenarioData.endings.mttrLabel.replace('{minutes}', mttr.toString())}
            </div>
          </div>
        )}
      </div>

      {/* Summary Section: Kararların */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[10px] font-semibold text-[#A34E12] tracking-[0.08em] uppercase">
            ÖZET VE MALİYET ANALİZİ
          </span>
          <span className="font-mono text-[10px] text-[#5B6275]">
            3 ADIMDA ÇÖZÜM
          </span>
        </div>
        <h2 className="font-serif text-[20px] font-semibold text-[#14213D] mb-3">
          {scenarioData.endings.summaryTitle}
        </h2>

        <div className="flex flex-col gap-3">
          {/* Row 1: K1 */}
          <div
            data-cy="summary-row"
            className="w-full bg-[#FFFDF8] rounded-[14px] p-4 border border-[#D9D3C7] shadow-subtle flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A34E12]" />
                <span className="font-mono text-[11px] font-semibold text-[#A34E12] uppercase tracking-wide">
                  {scenarioData.decisions[0].summaryLabel}
                </span>
              </div>
              <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#F0A35A]/20 text-[#A34E12]">
                +{k1Minutes} dk
              </span>
            </div>
            <h3 className="font-sans text-[15px] font-medium text-[#14213D]">
              {k1Choice === 'A'
                ? scenarioData.decisions[0].options.A.title
                : scenarioData.decisions[0].options.B.title}
            </h3>
            <p className="font-sans text-[13px] leading-[18px] text-[#5B6275]">
              — {scenarioData.decisions[0].options[k1Choice].summary}
            </p>
          </div>

          {/* Row 2: K2 */}
          <div
            data-cy="summary-row"
            className="w-full bg-[#FFFDF8] rounded-[14px] p-4 border border-[#D9D3C7] shadow-subtle flex flex-col gap-1.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A34E12]" />
                <span className="font-mono text-[11px] font-semibold text-[#A34E12] uppercase tracking-wide">
                  {scenarioData.decisions[1].summaryLabel}
                </span>
              </div>
              <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#F0A35A]/20 text-[#A34E12]">
                +{k2Minutes} dk
              </span>
            </div>
            <h3 className="font-sans text-[15px] font-medium text-[#14213D]">
              {k2Choice === 'A'
                ? scenarioData.decisions[1].options.A.title
                : scenarioData.decisions[1].options.B.title}
            </h3>
            <p className="font-sans text-[13px] leading-[18px] text-[#5B6275]">
              — {scenarioData.decisions[1].options[k2Choice].summary}
            </p>
          </div>

          {/* Row 3: K3 (Highlight in bad-tint if violation) */}
          <div
            data-cy="summary-row"
            className={`w-full rounded-[14px] p-4 border shadow-subtle flex flex-col gap-1.5 ${
              violation
                ? 'bg-[#FDEEE6] border-[#FFDBC9]'
                : 'bg-[#FFFDF8] border-[#D9D3C7]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A34E12]" />
                <span className="font-mono text-[11px] font-semibold text-[#A34E12] uppercase tracking-wide">
                  {scenarioData.decisions[2].summaryLabel}
                </span>
              </div>
              <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-[4px] bg-[#14213D]/6 text-[#14213D]">
                +{k3Minutes} dk
              </span>
            </div>
            <h3
              className={`font-sans text-[15px] font-medium ${
                violation ? 'text-[#A34E12]' : 'text-[#14213D]'
              }`}
            >
              {k3Choice === 'A'
                ? scenarioData.decisions[2].options.A.title
                : scenarioData.decisions[2].options.B.title}
            </h3>
            <p className="font-sans text-[13px] leading-[18px] text-[#5B6275]">
              — {scenarioData.decisions[2].options[k3Choice].summary}
            </p>
          </div>
        </div>
      </section>

      {/* Reading Recommendation Card */}
      <div className="w-full bg-[#F2EEE6] rounded-[14px] p-4 border border-[#D9D3C7] border-l-[3px] border-l-[#A34E12] mb-6 shadow-subtle">
        <div className="flex items-center gap-1.5 mb-1.5">
          <BookOpen className="w-3.5 h-3.5 text-[#A34E12]" />
          <span className="font-mono text-[10px] font-semibold tracking-[0.08em] text-[#A34E12] uppercase">
            HEDEFİNE GÖRE OKUMA
          </span>
        </div>
        <h3 className="font-serif text-[17px] leading-[22px] font-medium text-[#14213D] mb-1.5">
          {reading.title}
        </h3>
        <p className="font-sans text-[13px] leading-[20px] text-[#5B6275]">
          {reading.text}
        </p>
      </div>

      {/* Replay Button */}
      <footer className="mt-auto">
        <button
          type="button"
          data-cy="replay"
          onClick={onReplay}
          className="w-full h-[52px] rounded-[12px] bg-[#14213D] text-[#FFFDF8] font-sans text-[16px] font-medium flex items-center justify-center gap-2 cursor-pointer hover:bg-[#14213D]/95 active:translate-y-[1px] transition-all shadow-subtle"
        >
          <RotateCcw className="w-4 h-4 stroke-[2.5]" />
          <span>{scenarioData.endings.replayButton}</span>
        </button>

        {isDataMode && onDownloadData && (
          <>
            <button
              type="button"
              data-cy="veri-indir"
              onClick={onDownloadData}
              className="w-full h-[48px] mt-3 rounded-[12px] bg-[#FFFDF8] text-[#14213D] border border-[#D9D3C7] font-sans text-[15px] font-medium flex items-center justify-center gap-2 cursor-pointer hover:bg-[#F2EEE6] active:translate-y-[1px] transition-all shadow-subtle"
            >
              <span>Verimi indir (CSV)</span>
            </button>
            <p
              data-cy="veri-tesekkur"
              className="font-sans text-[12px] leading-[18px] text-[#5B6275] text-center mt-2.5"
            >
              Dosyayı oyunu sana gönderen kişiye ilet. Teşekkürler!
            </p>
          </>
        )}

        <p className="font-mono text-[11px] text-[#5B6275] text-center mt-3 uppercase tracking-wider">
          SE PRIMER · POST-MORTEM DOSYASI INC-9402
        </p>
      </footer>
    </div>
  );
};
