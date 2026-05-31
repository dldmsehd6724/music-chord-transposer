"use client";

import { useState } from "react";

const MAJOR_KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MINOR_KEYS = ["Am", "A#m", "Bm", "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m"];
const ALL_KEYS = [...MAJOR_KEYS, ...MINOR_KEYS];

const AGENT_INFO = {
  orchestrator: {
    label: "총괄 에이전트",
    icon: "🎼",
    gradient: "from-purple-500/20 to-violet-500/20",
    border: "border-purple-500/30",
    text: "text-purple-300",
  },
  parser: {
    label: "파서 에이전트",
    icon: "🔍",
    gradient: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-500/30",
    text: "text-blue-300",
  },
  transposer: {
    label: "전조 에이전트",
    icon: "🎵",
    gradient: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
  },
  formatter: {
    label: "포매터 에이전트",
    icon: "✨",
    gradient: "from-amber-500/20 to-orange-500/20",
    border: "border-amber-500/30",
    text: "text-amber-300",
  },
} as const;

interface AgentStep {
  agent: keyof typeof AGENT_INFO;
  status: "running" | "done" | "error";
  message: string;
}

const SAMPLE_CHORD = `[G]여기 서서 [Em]바라보면
[C]온 세상이 [D]아름다워
[G]하늘 아래 [Em]우리 함께
[C]손을 잡고 [D]걸어가자

[G]빛나는 저 [Em]별들처럼
[C]우리의 꿈 [D]높이 날아
[G]언제까지나 [Em]함께해요
[C]이 순간을 [D]기억해요`;

const PIPELINE = [
  { icon: "🎼", name: "총괄" },
  { icon: "🔍", name: "파서" },
  { icon: "🎵", name: "전조" },
  { icon: "✨", name: "포매터" },
];

export default function Home() {
  const [chordText, setChordText] = useState(SAMPLE_CHORD);
  const [sourceKey, setSourceKey] = useState("G");
  const [targetKey, setTargetKey] = useState("C");
  const [result, setResult] = useState("");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"ai" | "local" | null>(null);
  const [copied, setCopied] = useState(false);

  const handleTranspose = async () => {
    if (!chordText.trim()) return;

    setIsLoading(true);
    setResult("");
    setSteps([]);
    setError("");
    setMode(null);

    try {
      const res = await fetch("/api/transpose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chordText, sourceKey, targetKey }),
      });

      if (!res.body) throw new Error("스트림을 받을 수 없습니다.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "mode") {
              setMode(data.mode as "ai" | "local");
            } else if (data.type === "step") {
              const step = data as AgentStep & { type: string };
              setSteps((prev) => {
                const idx = prev.findIndex((s) => s.agent === step.agent);
                const next = { agent: step.agent, status: step.status, message: step.message };
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = next;
                  return updated;
                }
                return [...prev, next];
              });
            } else if (data.type === "result") {
              setResult(data.data as string);
            } else if (data.type === "error") {
              setError(data.message as string);
            }
          } catch {
            // ignore JSON parse errors
          }
        }
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
    <main className="min-h-screen bg-[#0d0b1e] note-bg relative overflow-hidden pt-safe pb-safe">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-purple-700/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-blue-700/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-pink-700/10 blur-3xl" />

      <div className="max-w-5xl mx-auto relative z-10 px-4 sm:px-6 py-6 sm:py-10 lg:py-12">

        {/* ── 헤더 ── */}
        <div className="text-center mb-6 sm:mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-2xl glass mb-3 sm:mb-5 text-2xl sm:text-3xl shadow-lg shadow-purple-900/30">
            🎸
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight gradient-text text-glow mb-2 sm:mb-3">
            코드 전조 에이전트
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm max-w-xs sm:max-w-sm mx-auto leading-relaxed px-2">
            총괄 에이전트가 파서 · 전조 · 포매터 서브 에이전트를 조율하여 악보를 전조합니다
          </p>

          {/* 모드 배지 */}
          <div className="mt-3 flex justify-center">
            {mode === "local" ? (
              <span className="inline-flex items-center gap-1.5 glass text-emerald-300 text-xs font-medium px-3 sm:px-4 py-1.5 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                로컬 모드 — API 키 없이 즉시 전조
              </span>
            ) : mode === "ai" ? (
              <span className="inline-flex items-center gap-1.5 glass text-blue-300 text-xs font-medium px-3 sm:px-4 py-1.5 rounded-full border border-blue-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                AI 에이전트 모드 — Claude Opus 사용 중
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 glass text-slate-400 text-xs px-3 sm:px-4 py-1.5 rounded-full border border-white/10">
                💡 API 키 없이도 기본 전조 기능 사용 가능
              </span>
            )}
          </div>

          {/* 아키텍처 파이프라인 */}
          <div className="mt-3 sm:mt-4 flex justify-center">
            <div className="inline-flex flex-wrap justify-center items-center gap-x-1 gap-y-1 glass px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs text-slate-400 border border-white/10">
              {PIPELINE.map((item, i) => (
                <span key={item.name} className="inline-flex items-center gap-1">
                  <span className="inline-flex items-center gap-0.5 sm:gap-1">
                    <span>{item.icon}</span>
                    <span className="text-slate-300">{item.name}</span>
                  </span>
                  {i < PIPELINE.length - 1 && (
                    <span className="text-slate-600 ml-0.5 sm:ml-1">→</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

          {/* ── 입력 패널 ── */}
          <div className="glass rounded-2xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 shadow-xl shadow-purple-950/30">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 sm:h-5 rounded-full bg-gradient-to-b from-purple-400 to-blue-400" />
              <h2 className="text-sm font-semibold text-slate-200">악보 입력</h2>
            </div>

            {/* 키 선택 */}
            <div className="flex items-end gap-2 sm:gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">원본 키</label>
                <select
                  value={sourceKey}
                  onChange={(e) => setSourceKey(e.target.value)}
                  className="w-full glass-light rounded-xl px-3 py-3 sm:py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 border-0 cursor-pointer touch-manipulation"
                >
                  {ALL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>

              <div className="pb-3 sm:pb-2.5 flex flex-col items-center gap-0.5 flex-shrink-0">
                <div className="w-5 sm:w-6 h-0.5 rounded-full bg-gradient-to-r from-purple-400 to-blue-400" />
                <span className="text-slate-500 text-xs">→</span>
              </div>

              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1.5 font-medium">목표 키</label>
                <select
                  value={targetKey}
                  onChange={(e) => setTargetKey(e.target.value)}
                  className="w-full glass-light rounded-xl px-3 py-3 sm:py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 border-0 cursor-pointer touch-manipulation"
                >
                  {ALL_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
            </div>

            {/* 악보 텍스트에어리어 */}
            <textarea
              value={chordText}
              onChange={(e) => setChordText(e.target.value)}
              rows={8}
              className="w-full glass-light rounded-xl px-3 sm:px-4 py-3 font-mono text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none leading-relaxed placeholder:text-slate-600 border-0 lg:rows-11"
              placeholder={`코드 악보를 입력하세요\n예: [G]여기 서서 [Em]바라보면`}
            />

            <button
              onClick={handleTranspose}
              disabled={isLoading || !chordText.trim()}
              className="relative w-full py-4 sm:py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 btn-glow disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden group touch-manipulation active:scale-95"
              style={{
                background: isLoading
                  ? "linear-gradient(135deg, #4c1d95, #1e3a8a)"
                  : "linear-gradient(135deg, #7c3aed, #2563eb)",
              }}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    에이전트 작업 중...
                  </>
                ) : (
                  <>
                    <span>🎵</span>
                    코드 전조하기
                  </>
                )}
              </span>
              {!isLoading && (
                <span className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors duration-200" />
              )}
            </button>
          </div>

          {/* ── 결과 패널 ── */}
          <div className="flex flex-col gap-4">

            {/* 에이전트 진행 상황 */}
            {(isLoading || steps.length > 0) && (
              <div className="glass rounded-2xl p-4 sm:p-6 shadow-xl shadow-purple-950/20">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <div className="w-1 h-4 sm:h-5 rounded-full bg-gradient-to-b from-violet-400 to-pink-400" />
                  <h2 className="text-sm font-semibold text-slate-200">에이전트 실행 현황</h2>
                </div>
                <div className="space-y-2 sm:space-y-2.5">
                  {steps.map((step) => {
                    const info = AGENT_INFO[step.agent];
                    return (
                      <div
                        key={step.agent}
                        className={`flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl bg-gradient-to-r ${info.gradient} border ${info.border}`}
                      >
                        <span className="text-lg sm:text-xl flex-shrink-0">{info.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${info.text}`}>{info.label}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{step.message}</p>
                        </div>
                        <span className="flex-shrink-0">
                          {step.status === "running" ? (
                            <svg className="w-4 h-4 animate-spin text-slate-400" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : step.status === "done" ? (
                            <span className="text-emerald-400 font-bold">✓</span>
                          ) : (
                            <span className="text-red-400">✗</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 오류 표시 */}
            {error && (
              <div className="rounded-2xl p-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20">
                <div className="flex items-start gap-2">
                  <span className="text-red-400 flex-shrink-0 mt-0.5">⚠</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* 전조 결과 */}
            {result && (
              <div className="glass rounded-2xl p-4 sm:p-6 flex-1 shadow-xl shadow-purple-950/20">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 sm:h-5 rounded-full bg-gradient-to-b from-emerald-400 to-cyan-400" />
                    <h2 className="text-sm font-semibold text-slate-200">전조 결과</h2>
                    <span className="text-xs text-slate-500 font-mono ml-1">
                      {sourceKey} → {targetKey}
                    </span>
                  </div>
                  <button
                    onClick={handleCopy}
                    className={`inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all duration-200 touch-manipulation ${
                      copied
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "glass-light text-slate-400 active:text-slate-200 border border-white/10"
                    }`}
                  >
                    {copied ? (
                      <><span>✓</span> 복사됨</>
                    ) : (
                      <><span>📋</span> 복사</>
                    )}
                  </button>
                </div>
                <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap glass-light rounded-xl p-3 sm:p-4 overflow-auto max-h-72 sm:max-h-80 leading-relaxed">
                  {result}
                </pre>
              </div>
            )}

            {/* 빈 상태 — 모바일에서는 숨김 (입력창 바로 아래가 돼서 불필요) */}
            {!isLoading && !result && steps.length === 0 && (
              <div className="hidden lg:flex glass rounded-2xl p-10 text-center flex-1 flex-col items-center justify-center gap-3 shadow-xl shadow-purple-950/20">
                <div className="text-5xl opacity-60 animate-bounce" style={{ animationDuration: "3s" }}>🎶</div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  왼쪽에 악보를 입력하고<br />
                  키를 선택한 후 전조하기를 눌러보세요
                </p>
              </div>
            )}

            {/* 빈 상태 — 모바일 전용 (버튼 아래 힌트) */}
            {!isLoading && !result && steps.length === 0 && (
              <div className="lg:hidden text-center py-2">
                <p className="text-xs text-slate-600">키를 선택한 후 위 버튼을 눌러보세요</p>
              </div>
            )}
          </div>
        </div>

        {/* ── 푸터 ── */}
        <p className="mt-8 sm:mt-10 text-center text-xs text-slate-700 leading-relaxed">
          API 키 있을 때: Claude Opus 멀티 에이전트 · 없을 때: 순수 코드 전조 엔진 · Next.js
        </p>
      </div>
    </main>
  );
}
