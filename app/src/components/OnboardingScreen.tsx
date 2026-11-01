import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Level, Role, Goal } from '../types';
import { scenarioData } from '../data/scenario';

interface OnboardingScreenProps {
  level: Level | null;
  role: Role | null;
  goal: Goal | null;
  isDataMode?: boolean;
  onSelectLevel: (level: Level) => void;
  onSelectRole: (role: Role) => void;
  onSelectGoal: (goal: Goal) => void;
  onStart: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  level,
  role,
  goal,
  isDataMode = false,
  onSelectLevel,
  onSelectRole,
  onSelectGoal,
  onStart,
}) => {
  const answeredCount = (level ? 1 : 0) + (role ? 1 : 0) + (goal ? 1 : 0);
  const isStartEnabled = answeredCount === 3;

  const progressText = scenarioData.onboarding.progressText.replace(
    '{answered}',
    answeredCount.toString()
  );

  return (
    <div className="w-full flex flex-col min-h-screen py-6 px-5 pb-8 max-w-[480px] mx-auto">
      {/* Top Bar */}
      <header className="flex items-center justify-between mb-6">
        <span className="font-mono text-[11px] tracking-[0.08em] font-medium text-[#5B6275] uppercase">
          {scenarioData.onboarding.label}
        </span>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#FFFDF8] border border-[#D9D3C7] shadow-subtle">
          <span className="w-2 h-2 rounded-full bg-[#A34E12] inline-block" />
          <span className="font-mono text-[11px] font-medium text-[#5B6275] tracking-tight">
            {scenarioData.onboarding.badge}
          </span>
        </div>
      </header>

      {/* Screen Title & Intro */}
      <div className="mb-6">
        <h1 className="font-serif text-[28px] leading-[34px] font-semibold text-[#14213D] mb-2 tracking-tight">
          {scenarioData.onboarding.title}
        </h1>
        <p className="font-sans text-[15px] leading-[22px] text-[#5B6275]">
          {scenarioData.onboarding.intro}
        </p>
      </div>

      <div className="w-full h-px bg-[#D9D3C7] mb-6" />

      {/* Questions Stack */}
      <div className="flex flex-col gap-6 flex-1">
        {/* Q1: SEVİYEN */}
        <section aria-labelledby="heading-level">
          <div className="flex items-center justify-between mb-2.5">
            <h2
              id="heading-level"
              className="font-mono text-[11px] tracking-[0.08em] font-medium text-[#5B6275] uppercase"
            >
              SEVİYEN
            </h2>
            <span
              className={`font-mono text-[11px] font-medium ${
                level ? 'text-[#5B6275]' : 'text-[#A34E12]'
              }`}
            >
              {level ? '[ SEÇİLDİ ]' : '[ BEKLENİYOR ]'}
            </span>
          </div>

          <div className="flex flex-col gap-2.5" role="radiogroup" aria-labelledby="heading-level">
            {scenarioData.onboarding.questions[0].options.map((opt) => {
              const isSelected = level === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-cy={`level-${opt.id}`}
                  onClick={() => onSelectLevel(opt.id as Level)}
                  className={`w-full min-h-[64px] px-4 py-3 rounded-[14px] flex items-center justify-between text-left transition-all ${
                    isSelected
                      ? 'bg-[#FFFDF8] border-2 border-[#14213D] shadow-sm'
                      : 'bg-[#FFFDF8] border border-[#D9D3C7] shadow-subtle hover:border-[#5B6275]/50'
                  }`}
                >
                  <div className="flex flex-col pr-3">
                    <span className="font-sans text-[16px] leading-[22px] font-medium text-[#14213D]">
                      {opt.label}
                    </span>
                    {opt.sub && (
                      <span className="font-sans text-[13px] leading-[18px] text-[#5B6275] mt-0.5">
                        {opt.sub}
                      </span>
                    )}
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#14213D] text-[#FFFDF8]'
                        : 'border border-[#D9D3C7] bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Q2: ROLÜN */}
        <section aria-labelledby="heading-role">
          <div className="flex items-center justify-between mb-2.5">
            <h2
              id="heading-role"
              className="font-mono text-[11px] tracking-[0.08em] font-medium text-[#5B6275] uppercase"
            >
              ROLÜN
            </h2>
            <span
              className={`font-mono text-[11px] font-medium ${
                role ? 'text-[#5B6275]' : 'text-[#A34E12]'
              }`}
            >
              {role ? '[ SEÇİLDİ ]' : '[ BEKLENİYOR ]'}
            </span>
          </div>

          <div className="flex flex-col gap-2.5" role="radiogroup" aria-labelledby="heading-role">
            {scenarioData.onboarding.questions[1].options.map((opt) => {
              const isSelected = role === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-cy={`role-${opt.id}`}
                  onClick={() => onSelectRole(opt.id as Role)}
                  className={`w-full min-h-[56px] px-4 py-3 rounded-[14px] flex items-center justify-between text-left transition-all ${
                    isSelected
                      ? 'bg-[#FFFDF8] border-2 border-[#14213D] shadow-sm'
                      : 'bg-[#FFFDF8] border border-[#D9D3C7] shadow-subtle hover:border-[#5B6275]/50'
                  }`}
                >
                  <span className="font-sans text-[16px] leading-[22px] font-medium text-[#14213D]">
                    {opt.label}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#14213D] text-[#FFFDF8]'
                        : 'border border-[#D9D3C7] bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Q3: HEDEFİN */}
        <section aria-labelledby="heading-goal">
          <div className="flex items-center justify-between mb-2.5">
            <h2
              id="heading-goal"
              className="font-mono text-[11px] tracking-[0.08em] font-medium text-[#5B6275] uppercase"
            >
              HEDEFİN
            </h2>
            <span
              className={`font-mono text-[11px] font-medium ${
                goal ? 'text-[#5B6275]' : 'text-[#A34E12]'
              }`}
            >
              {goal ? '[ SEÇİLDİ ]' : '[ BEKLENİYOR ]'}
            </span>
          </div>

          <div className="flex flex-col gap-2.5" role="radiogroup" aria-labelledby="heading-goal">
            {scenarioData.onboarding.questions[2].options.map((opt) => {
              const isSelected = goal === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  data-cy={`goal-${opt.id}`}
                  onClick={() => onSelectGoal(opt.id as Goal)}
                  className={`w-full min-h-[56px] px-4 py-3 rounded-[14px] flex items-center justify-between text-left transition-all ${
                    isSelected
                      ? 'bg-[#FFFDF8] border-2 border-[#14213D] shadow-sm'
                      : 'bg-[#FFFDF8] border border-[#D9D3C7] shadow-subtle hover:border-[#5B6275]/50'
                  }`}
                >
                  <span className="font-sans text-[16px] leading-[22px] font-medium text-[#14213D]">
                    {opt.label}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#14213D] text-[#FFFDF8]'
                        : 'border border-[#D9D3C7] bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Bottom Start Section */}
      <footer className="mt-8 pt-2">
        <p className="font-mono text-[12px] text-[#5B6275] text-center mb-3">
          {progressText}
        </p>
        {isDataMode && (
          <p
            data-cy="veri-notu"
            className="font-sans text-[12px] leading-[18px] text-[#5B6275] text-center mb-3"
          >
            Veri Toplama Modu: Ad, e-posta, cihaz ve konum bilgisi toplanmaz. Kararların yalnızca sen indirip gönderirsen paylaşılır.
          </p>
        )}
        <button
          type="button"
          data-cy="start"
          disabled={!isStartEnabled}
          onClick={onStart}
          className={`w-full h-[52px] rounded-[12px] flex items-center justify-center gap-2 font-sans text-[16px] font-medium transition-all ${
            isStartEnabled
              ? 'bg-[#14213D] text-[#FFFDF8] cursor-pointer hover:bg-[#14213D]/95 active:translate-y-[1px]'
              : 'bg-[#14213D] text-[#FFFDF8] opacity-40 cursor-not-allowed'
          }`}
        >
          <span>{scenarioData.onboarding.startButton}</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </footer>
    </div>
  );
};
