"use client";

import { useState } from "react";

const MAJOR_KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MINOR_KEYS = ["Am", "A#m", "Bm", "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m"];
const ALL_KEYS = [...MAJOR_KEYS, ...MINOR_KEYS];

// ── 텍스트 리소스 (언어별 문구를 모두 여기서 관리) ──────────────────────
const translations = {
  ko: {
    appName: "코디",
    appNameSub: "Chordy",
    subtitle: "코드체인지",
    desc: "악보의 코드를 원하는 키로 즉시 전조합니다",
    langToggle: "English",
    inputSection: "악보 입력",
    keySection: "키 선택",
    originalKey: "원본 키",
    targetKey: "목표 키",
    sheetLabel: "악보 텍스트",
    placeholder: "코드 악보를 입력하세요\n예: [G]여기 서서 [Em]바라보면",
    transpose: "코드 전조하기",
    transposing: "전조 중...",
    resultSection: "전조 결과",
    copy: "복사",
    copied: "복사됨",
    emptyLine1: "왼쪽에 악보를 입력하고",
    emptyLine2: "키를 선택한 후 전조하기를 눌러보세요",
    emptyMobile: "키를 선택한 후 위 버튼을 눌러보세요",
    footer: "순수 코드 전조 엔진 · Next.js",
  },
  en: {
    appName: "Chordy",
    appNameSub: "코디",
    subtitle: "Chord Change",
    desc: "Instantly transpose your chord sheet to any key",
    langToggle: "한국어",
    inputSection: "Sheet Music",
    keySection: "Key Selection",
    originalKey: "Original Key",
    targetKey: "Target Key",
    sheetLabel: "Chord Sheet",
    placeholder: "Enter your chord sheet here\ne.g. [G]Standing here [Em]looking out",
    transpose: "Transpose Chords",
    transposing: "Transposing...",
    resultSection: "Transposed Result",
    copy: "Copy",
    copied: "Copied!",
    emptyLine1: "Enter your chord sheet on the left,",
    emptyLine2: "select a key and press Transpose.",
    emptyMobile: "Select a key and tap the button above.",
    footer: "Pure Chord Transposition Engine · Next.js",
  },
} as const;

type Lang = keyof typeof translations;

// ────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [lang, setLang] = useState<Lang>("ko");
  const [chordText, setChordText] = useState("");
  const [sourceKey, setSourceKey] = useState("G");
  const [targetKey, setTargetKey] = useState("C");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const tx = translations[lang];

  const handleTranspose = async () => {
    if (!chordText.trim()) return;
    setIsLoading(true);
    setResult("");
    setError("");
    try {
      const res = await fetch("/api/transpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chordText, sourceKey, targetKey }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#fff8f0] relative overflow-hidden pt-safe pb-safe">
      {/* 배경 장식 */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-amber-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-rose-200/25 blur-3xl" />

      <div className="max-w-5xl mx-auto relative z-10 px-4 sm:px-6 py-8 sm:py-12 lg:py-14">

        {/* 언어 전환 버튼 */}
        <div className="flex justify-end mb-4 sm:mb-6">
          <button
            onClick={() => setLang(lang === "ko" ? "en" : "ko")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-orange-500 text-stone-900 text-sm font-bold hover:bg-orange-50 hover:border-orange-600 transition-all duration-200 shadow-sm active:scale-95 touch-manipulation"
          >
            <span>🌐</span>
            {tx.langToggle}
          </button>
        </div>

        {/* 헤더 */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white border-2 border-orange-200 mb-5 sm:mb-6 shadow-lg shadow-orange-100">
            <span className="text-4xl sm:text-5xl">🎸</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight warm-gradient-text leading-none mb-2">
            {tx.appName}
          </h1>
          <p className="text-xl sm:text-2xl font-semibold text-orange-600 tracking-widest mb-5">
            {tx.appNameSub}
          </p>

          <p className="text-lg sm:text-xl font-bold text-stone-700 mb-1">{tx.subtitle}</p>
          <p className="text-sm sm:text-base text-stone-600">{tx.desc}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7">

          {/* 입력 패널 */}
          <div className="card rounded-3xl p-6 sm:p-8 flex flex-col gap-6 sm:gap-7">

            <div className="flex items-center gap-3">
              <div className="w-2 h-7 rounded-full bg-gradient-to-b from-orange-400 to-rose-500" />
              <h2 className="text-xl sm:text-2xl font-bold text-stone-800">{tx.inputSection}</h2>
            </div>

            {/* 키 선택 */}
            <div>
              <p className="text-base font-bold text-stone-800 mb-3">{tx.keySection}</p>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="flex-1">
                  <label htmlFor="sourceKey" className="block text-sm font-semibold text-stone-700 mb-2">
                    {tx.originalKey}
                  </label>
                  <select
                    id="sourceKey"
                    value={sourceKey}
                    onChange={(e) => setSourceKey(e.target.value)}
                    className="w-full bg-orange-50 border-2 border-orange-200 rounded-2xl px-4 py-4 text-lg sm:text-xl text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 cursor-pointer touch-manipulation"
                  >
                    {ALL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                <div className="pt-6 flex-shrink-0">
                  <span className="text-orange-400 text-3xl font-bold">→</span>
                </div>

                <div className="flex-1">
                  <label htmlFor="targetKey" className="block text-sm font-semibold text-stone-700 mb-2">
                    {tx.targetKey}
                  </label>
                  <select
                    id="targetKey"
                    value={targetKey}
                    onChange={(e) => setTargetKey(e.target.value)}
                    className="w-full bg-orange-50 border-2 border-orange-200 rounded-2xl px-4 py-4 text-lg sm:text-xl text-stone-800 font-bold focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 cursor-pointer touch-manipulation"
                  >
                    {ALL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* 텍스트에어리어 */}
            <div>
              <label htmlFor="chordText" className="block text-base font-bold text-stone-700 mb-3">
                {tx.sheetLabel}
              </label>
              <textarea
                id="chordText"
                value={chordText}
                onChange={(e) => setChordText(e.target.value)}
                rows={9}
                className="w-full bg-stone-50 border-2 border-stone-200 rounded-2xl px-5 py-4 font-mono text-base sm:text-lg text-stone-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none leading-loose placeholder:text-stone-400"
                placeholder={tx.placeholder}
              />
            </div>

            <button
              onClick={handleTranspose}
              disabled={isLoading || !chordText.trim()}
              className="w-full py-5 sm:py-6 rounded-2xl font-extrabold text-xl sm:text-2xl text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 touch-manipulation btn-orange"
            >
              <span className="flex items-center justify-center gap-3">
                {isLoading ? (
                  <>
                    <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    {tx.transposing}
                  </>
                ) : (
                  <><span>🎵</span> {tx.transpose}</>
                )}
              </span>
            </button>
          </div>

          {/* 결과 패널 */}
          <div className="flex flex-col gap-6">

            {error && (
              <div className="rounded-2xl p-5 sm:p-6 text-base sm:text-lg text-red-700 bg-red-50 border-2 border-red-200">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 flex-shrink-0 text-2xl">⚠</span>
                  <span className="font-semibold leading-relaxed">{error}</span>
                </div>
              </div>
            )}

            {result && (
              <div className="card rounded-3xl p-6 sm:p-8 flex-1">
                <div className="flex items-center justify-between mb-5 sm:mb-6 gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-2 h-7 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500" />
                    <h2 className="text-xl sm:text-2xl font-bold text-stone-800">{tx.resultSection}</h2>
                    <span className="text-sm text-stone-700 font-mono bg-stone-200 px-2 py-0.5 rounded-lg">
                      {sourceKey} → {targetKey}
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-2 text-base px-4 py-3 rounded-xl font-bold transition-all duration-200 touch-manipulation border-2 flex-shrink-0 active:scale-95 ${
                      copied
                        ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                        : "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                    }`}
                  >
                    {copied
                      ? <><span>✓</span> {tx.copied}</>
                      : <><span>📋</span> {tx.copy}</>
                    }
                  </button>
                </div>
                <pre className="font-mono text-base sm:text-lg text-stone-800 whitespace-pre-wrap bg-stone-50 border-2 border-stone-200 rounded-2xl p-5 sm:p-6 overflow-auto max-h-80 sm:max-h-96 leading-loose">
                  {result}
                </pre>
              </div>
            )}

            {!isLoading && !result && !error && (
              <div className="hidden lg:flex card rounded-3xl p-12 text-center flex-1 flex-col items-center justify-center gap-4">
                <div className="text-7xl opacity-60 animate-bounce" style={{ animationDuration: "3s" }}>🎶</div>
                <p className="text-lg text-stone-700 leading-relaxed">
                  {tx.emptyLine1}<br />{tx.emptyLine2}
                </p>
              </div>
            )}

            {!isLoading && !result && !error && (
              <div className="lg:hidden text-center py-3">
                <p className="text-base text-stone-600">{tx.emptyMobile}</p>
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <p className="mt-12 sm:mt-14 text-center text-sm sm:text-base text-stone-500">
          {tx.footer}
        </p>
      </div>
    </main>
  );
}
