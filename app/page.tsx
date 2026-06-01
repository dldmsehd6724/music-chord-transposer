"use client";

import { useState, useMemo } from "react";
import { getCapoRecommendations } from "@/lib/chordTranspose";

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
    soundOn: "소리 켜짐",
    soundOff: "소리 꺼짐",
    inputSection: "악보 입력",
    keySection: "키 선택",
    originalKey: "원본 키",
    targetKey: "목표 키",
    sheetLabel: "악보 텍스트",
    placeholder: "코드를 입력하세요",
    guideText: "코드를 입력하세요.(코드 사이에 한 칸씩 띄우거나 `,` `.` `-`를 넣으시고 다음 코드를 적으세요)",
    guideText2: "원본 키와 목표 키를 각각 클릭해서 선택하세요. (원본 키 = 지금 악보의 키, 목표 키 = 바꾸고 싶은 키)",
    transpose: "코드 바꾸기",
    transposing: "전조 중...",
    resultSection: "전조 결과",
    copy: "복사",
    copied: "복사됨",
    emptyLine1: "왼쪽에 악보를 입력하고",
    emptyLine2: "키를 선택한 후 코드 바꾸기를 눌러보세요",
    emptyMobile: "키를 선택한 후 위 버튼을 눌러보세요",
    footer: "순수 코드 전조 엔진 · Next.js",
    capoToggle: "🎸 카포 추천",
    capoBest: "⭐ 추천",
    capoFingerLabel: "잡을 코드",
    capoNoRec: "이미 쉬운 키예요! 카포 없이 그대로 치세요.",
  },
  en: {
    appName: "Chordy",
    appNameSub: "코디",
    subtitle: "Chord Change",
    desc: "Instantly transpose your chord sheet to any key",
    langToggle: "한국어",
    soundOn: "Sound on",
    soundOff: "Sound off",
    inputSection: "Sheet Music",
    keySection: "Key Selection",
    originalKey: "Original Key",
    targetKey: "Target Key",
    sheetLabel: "Chord Sheet",
    placeholder: "Enter your chords",
    guideText: "Enter your chords. (Separate each chord with a space, comma `,`, period `.`, or hyphen `-`, then type the next one.)",
    guideText2: "Click to select the original key and the target key. (Original = your song's current key, Target = the key you want)",
    transpose: "Change Chords",
    transposing: "Transposing...",
    resultSection: "Transposed Result",
    copy: "Copy",
    copied: "Copied!",
    emptyLine1: "Enter your chord sheet on the left,",
    emptyLine2: "select a key and press Change Chords.",
    emptyMobile: "Select a key and tap the button above.",
    footer: "Pure Chord Transposition Engine · Next.js",
    capoToggle: "🎸 Capo Suggestions",
    capoBest: "⭐ Best Pick",
    capoFingerLabel: "Chords to finger",
    capoNoRec: "Already an easy key! No capo needed.",
  },
} as const;

type Lang = keyof typeof translations;
// ────────────────────────────────────────────────────────────────────────────

function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const tone = (freq: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.3);
    };
    tone(1046.5, 0.25);
    tone(1318.5, 0.15);
    tone(1568.0, 0.10);
  } catch (e) {}
}

export default function Home() {
  const [lang, setLang] = useState<Lang>("ko");
  const [isMuted, setIsMuted] = useState(false);
  const [chordText, setChordText] = useState("");
  const [sourceKey, setSourceKey] = useState("G");
  const [targetKey, setTargetKey] = useState("C");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showCapo, setShowCapo] = useState(false);
  const [showInputCapo, setShowInputCapo] = useState(false);

  const tx = translations[lang];
  const showGuide = chordText.trim() === "";

  // 결과 기반 카포 후보 (전조 후, targetKey 기준)
  const capoRecs = useMemo(
    () => (result ? getCapoRecommendations(result, targetKey) : []),
    [result, targetKey]
  );

  // 입력 기반 카포 후보 (전조 없이, sourceKey 기준)
  const inputCapoRecs = useMemo(
    () => (chordText.trim() ? getCapoRecommendations(chordText, sourceKey) : []),
    [chordText, sourceKey]
  );

  const handleTranspose = async () => {
    if (!chordText.trim()) return;
    setIsLoading(true);
    setResult("");
    setError("");
    setShowCapo(false);
    try {
      const res = await fetch("/api/transpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chordText, sourceKey, targetKey }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.result);
        if (!isMuted) playChime();
      }
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
    <main className="min-h-screen bg-[#fddcb0] relative overflow-hidden pt-safe pb-safe">
      {/* 배경 장식 */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-80 h-80 sm:w-[28rem] sm:h-[28rem] rounded-full bg-orange-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-amber-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-rose-200/25 blur-3xl" />

      <div className="max-w-5xl mx-auto relative z-10 px-4 sm:px-6 py-8 sm:py-12 lg:py-14">

        {/* 상단 버튼 */}
        <div className="flex justify-end gap-2 mb-4 sm:mb-6">
          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? tx.soundOn : tx.soundOff}
            className="inline-flex items-center px-3 py-2.5 rounded-xl bg-white border-2 border-blue-500 text-stone-900 text-base font-bold hover:bg-orange-50 transition-all duration-200 shadow-sm active:scale-95 touch-manipulation"
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
          <button
            onClick={() => setLang(lang === "ko" ? "en" : "ko")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border-2 border-blue-500 text-stone-900 text-sm font-bold hover:bg-orange-50 hover:border-blue-500 transition-all duration-200 shadow-sm active:scale-95 touch-manipulation"
          >
            <span>🌐</span>
            {tx.langToggle}
          </button>
        </div>

        {/* 헤더 */}
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white border-2 border-blue-500 mb-5 sm:mb-6 shadow-lg shadow-orange-200">
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
                    className="w-full bg-white border-2 border-blue-500 rounded-2xl px-4 py-4 text-lg sm:text-xl text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer touch-manipulation"
                  >
                    {ALL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>

                <div className="pt-6 flex-shrink-0">
                  <span className="text-orange-500 text-3xl font-bold">→</span>
                </div>

                <div className="flex-1">
                  <label htmlFor="targetKey" className="block text-sm font-semibold text-stone-700 mb-2">
                    {tx.targetKey}
                  </label>
                  <select
                    id="targetKey"
                    value={targetKey}
                    onChange={(e) => setTargetKey(e.target.value)}
                    className="w-full bg-white border-2 border-blue-500 rounded-2xl px-4 py-4 text-lg sm:text-xl text-stone-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer touch-manipulation"
                  >
                    {ALL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* 악보 텍스트에어리어 */}
            <div>
              <label htmlFor="chordText" className="block text-base font-bold text-stone-800 mb-3">
                {tx.sheetLabel}
              </label>
              <textarea
                id="chordText"
                value={chordText}
                onChange={(e) => setChordText(e.target.value)}
                rows={9}
                className="w-full bg-white border-2 border-blue-400 rounded-2xl px-5 py-4 font-mono text-base sm:text-lg text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none leading-loose placeholder:text-stone-500"
                placeholder={tx.placeholder}
              />
            </div>

            {/* 사용 안내 — 입력값 없을 때만 표시 */}
            <div
              className="overflow-hidden transition-all duration-500 ease-in-out"
              style={{ maxHeight: showGuide ? "500px" : "0px", opacity: showGuide ? 1 : 0 }}
            >
              <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 p-4 sm:p-5 space-y-2">
                <p className="text-base leading-relaxed text-blue-950 font-semibold">
                  <span className="mr-1">📌</span>{tx.guideText}
                </p>
                <p className="text-base leading-relaxed text-blue-950 font-semibold">
                  <span className="mr-1">📌</span>{tx.guideText2}
                </p>
              </div>
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

            {/* ── 입력 코드 기반 카포 추천 (전조 없이 바로 사용 가능) ── */}
            {chordText.trim() && (
              <div>
                <button
                  onClick={() => setShowInputCapo(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-amber-50 border-2 border-amber-300 hover:bg-amber-100 transition-colors touch-manipulation active:scale-95"
                >
                  <span className="font-bold text-stone-800 text-base sm:text-lg">{tx.capoToggle}</span>
                  <span className="text-stone-500 text-base">{showInputCapo ? "▲" : "▼"}</span>
                </button>

                <div
                  className="overflow-hidden transition-all duration-400 ease-in-out"
                  style={{ maxHeight: showInputCapo ? "900px" : "0px", opacity: showInputCapo ? 1 : 0 }}
                >
                  <div className="mt-4 space-y-3">
                    {inputCapoRecs.length === 0 ? (
                      <p className="text-base text-stone-600 px-1">{tx.capoNoRec}</p>
                    ) : (
                      inputCapoRecs.map((rec, i) => (
                        <div
                          key={rec.capo}
                          className={`rounded-2xl border-2 p-4 sm:p-5 ${
                            i === 0 ? "border-amber-400 bg-amber-50" : "border-stone-200 bg-stone-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            {i === 0 && (
                              <span className="text-xs font-extrabold bg-amber-500 text-white px-2.5 py-0.5 rounded-full">
                                {tx.capoBest}
                              </span>
                            )}
                            <span className="font-extrabold text-stone-900 text-lg sm:text-xl">
                              {lang === "ko" ? `카포 ${rec.capo}프렛` : `Capo ${rec.capo}`}
                            </span>
                            <span className="text-stone-500 text-sm">
                              {lang === "ko" ? `(${rec.shapeRoot} 모양으로)` : `(${rec.shapeRoot} shape)`}
                            </span>
                          </div>
                          <p className="text-sm sm:text-base text-stone-700 leading-relaxed mb-4">
                            {lang === "ko"
                              ? `카포를 ${rec.capo}프렛에 끼우고 아래 코드로 치면, 원곡과 같은 음높이(${sourceKey})로 더 쉽게 칠 수 있어요.`
                              : `Put a capo on fret ${rec.capo} and play the chords below — it'll sound in ${sourceKey}, same as the original pitch.`}
                          </p>
                          <div>
                            <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">
                              {tx.capoFingerLabel}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {rec.fingerChords.map(c => (
                                <span
                                  key={c}
                                  className="px-3 py-1.5 bg-white border-2 border-blue-400 rounded-xl text-stone-900 font-mono font-bold text-base sm:text-lg"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
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
                {/* 결과 헤더 */}
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
                        : "bg-orange-50 text-orange-700 border-blue-400 hover:bg-orange-100"
                    }`}
                  >
                    {copied ? <><span>✓</span> {tx.copied}</> : <><span>📋</span> {tx.copy}</>}
                  </button>
                </div>

                {/* 결과 텍스트 */}
                <pre className="font-mono text-xl sm:text-2xl text-stone-900 whitespace-pre-wrap bg-orange-50 border-2 border-blue-400 rounded-2xl p-5 sm:p-6 overflow-auto max-h-96 sm:max-h-[30rem] leading-loose">
                  {result}
                </pre>

                {/* ── 카포 추천 섹션 ── */}
                <div className="mt-5 pt-5 border-t-2 border-stone-100">
                  <button
                    onClick={() => setShowCapo(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-amber-50 border-2 border-amber-300 hover:bg-amber-100 transition-colors touch-manipulation active:scale-95"
                  >
                    <span className="font-bold text-stone-800 text-base sm:text-lg">{tx.capoToggle}</span>
                    <span className="text-stone-500 text-base">{showCapo ? "▲" : "▼"}</span>
                  </button>

                  <div
                    className="overflow-hidden transition-all duration-400 ease-in-out"
                    style={{ maxHeight: showCapo ? "900px" : "0px", opacity: showCapo ? 1 : 0 }}
                  >
                    <div className="mt-4 space-y-3">
                      {capoRecs.length === 0 ? (
                        <p className="text-base text-stone-600 px-1">{tx.capoNoRec}</p>
                      ) : (
                        capoRecs.map((rec, i) => (
                          <div
                            key={rec.capo}
                            className={`rounded-2xl border-2 p-4 sm:p-5 ${
                              i === 0
                                ? "border-amber-400 bg-amber-50"
                                : "border-stone-200 bg-stone-50"
                            }`}
                          >
                            {/* 제목 줄 */}
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              {i === 0 && (
                                <span className="text-xs font-extrabold bg-amber-500 text-white px-2.5 py-0.5 rounded-full">
                                  {tx.capoBest}
                                </span>
                              )}
                              <span className="font-extrabold text-stone-900 text-lg sm:text-xl">
                                {lang === "ko" ? `카포 ${rec.capo}프렛` : `Capo ${rec.capo}`}
                              </span>
                              <span className="text-stone-500 text-sm">
                                {lang === "ko"
                                  ? `(${rec.shapeRoot} 모양으로)`
                                  : `(${rec.shapeRoot} shape)`}
                              </span>
                            </div>

                            {/* 설명 */}
                            <p className="text-sm sm:text-base text-stone-700 leading-relaxed mb-4">
                              {lang === "ko"
                                ? `카포를 ${rec.capo}프렛에 끼우고 아래 코드로 치면, 원곡과 같은 키(${targetKey})로 더 쉽게 칠 수 있어요.`
                                : `Put a capo on fret ${rec.capo} and play the chords below — it'll sound in ${targetKey}, same as the original.`}
                            </p>

                            {/* 잡을 코드 */}
                            <div>
                              <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-2">
                                {tx.capoFingerLabel}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {rec.fingerChords.map(c => (
                                  <span
                                    key={c}
                                    className="px-3 py-1.5 bg-white border-2 border-blue-400 rounded-xl text-stone-900 font-mono font-bold text-base sm:text-lg"
                                  >
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
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
