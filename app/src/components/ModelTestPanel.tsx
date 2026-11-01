import React, { useState } from 'react';
import { MODEL_REPO, MODEL_COMMIT, predictP } from '../services/model';

const REQUIRED_FEATURES = [
  'seviye',
  'sahne_no',
  'hedef_eslesir',
  'tekrar_oyun',
  'giris_sn',
  'giris_degisiklik',
  'onceki_b_sayisi',
  'onceki_karar_suresi_sn',
  'onceki_ipucu_acti',
  'onceki_tutor_mesaj',
  'onceki_aciklama_sn',
];

export const ModelTestPanel: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [outputResult, setOutputResult] = useState<{
    text: string;
    pVal: number | null;
  } | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const handleRun = async () => {
    setIsRunning(true);
    let parsed: any;
    try {
      parsed = JSON.parse(inputText);
    } catch {
      setOutputResult({ text: 'geçersiz girdi', pVal: null });
      setIsRunning(false);
      return;
    }

    if (!parsed || typeof parsed !== 'object') {
      setOutputResult({ text: 'geçersiz girdi', pVal: null });
      setIsRunning(false);
      return;
    }

    // Check that all 11 required features exist and are numbers
    const isMissingFeature = REQUIRED_FEATURES.some(
      (feat) => !(feat in parsed) || typeof parsed[feat] !== 'number'
    );

    if (isMissingFeature) {
      setOutputResult({ text: 'geçersiz girdi', pVal: null });
      setIsRunning(false);
      return;
    }

    // Call predictP with ignoreTestHook = true (always uses real model)
    const p = await predictP(parsed as Record<string, number>, true);

    if (p === null) {
      setOutputResult({ text: 'model yüklenemedi', pVal: null });
    } else {
      setOutputResult({
        text: `p = ${p.toFixed(6)}`,
        pVal: p,
      });
    }

    setIsRunning(false);
  };

  return (
    <main className="min-h-screen w-full bg-[#F7F4EE] flex justify-center text-[#14213D] selection:bg-[#F0A35A]/30">
      <div className="w-full max-w-[480px] min-h-screen bg-[#F7F4EE] p-6 flex flex-col">
        <h1 className="font-serif text-[24px] font-semibold tracking-tight text-[#14213D] mb-1">
          Model test paneli
        </h1>
        <p className="font-mono text-[12px] text-[#5B6275] mb-6">
          {MODEL_REPO} · {MODEL_COMMIT}
        </p>

        <div className="flex flex-col gap-4 flex-1">
          <label className="font-mono text-[11px] tracking-wide text-[#5B6275] uppercase font-medium">
            Özellik JSON Girdisi
          </label>
          <textarea
            data-cy="model-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={10}
            placeholder='{"seviye": 0, "sahne_no": 1, ...}'
            className="w-full bg-[#FFFDF8] border border-[#D9D3C7] rounded-[12px] p-3 font-mono text-[13px] text-[#14213D] focus:outline-none focus:border-[#14213D] resize-y shadow-subtle"
          />

          <button
            type="button"
            data-cy="model-run"
            disabled={isRunning}
            onClick={handleRun}
            className="w-full h-[48px] rounded-[12px] bg-[#14213D] text-[#FFFDF8] font-sans text-[15px] font-medium flex items-center justify-center cursor-pointer hover:bg-[#14213D]/95 active:translate-y-[1px] transition-all shadow-subtle disabled:opacity-50"
          >
            {isRunning ? 'Hesaplanıyor...' : 'Hesapla'}
          </button>

          <div className="mt-4 p-4 rounded-[12px] bg-[#FFFDF8] border border-[#D9D3C7] shadow-subtle">
            <span className="font-mono text-[11px] text-[#5B6275] uppercase block mb-1">
              Sonuç
            </span>
            <div
              data-cy="p"
              data-p={outputResult && outputResult.pVal !== null ? String(outputResult.pVal) : ''}
              className="font-mono text-[15px] font-medium text-[#14213D]"
            >
              {outputResult ? outputResult.text : '—'}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};
