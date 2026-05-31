import { NextRequest } from "next/server";
import { runOrchestrator, AgentStep } from "@/lib/agents/orchestrator";
import { transposeText, formatResult } from "@/lib/chordTranspose";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { chordText, sourceKey, targetKey } = body as {
    chordText: string;
    sourceKey: string;
    targetKey: string;
  };

  if (!chordText?.trim() || !sourceKey || !targetKey) {
    return new Response(JSON.stringify({ error: "필수 파라미터가 누락되었습니다." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  const send = async (data: object) => {
    await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  // API 키 유무로 모드 자동 결정
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY?.trim();

  (async () => {
    try {
      // 클라이언트에 현재 모드 알림
      await send({ type: "mode", mode: hasApiKey ? "ai" : "local" });

      if (hasApiKey) {
        // ── AI 에이전트 모드 ──────────────────────────────────────
        const result = await runOrchestrator(
          { chordText, sourceKey, targetKey },
          (step: AgentStep) => send({ type: "step", ...step })
        );
        await send({ type: "result", data: result });
      } else {
        // ── 로컬 전조 모드 (API 키 불필요) ───────────────────────
        await send({
          type: "step",
          agent: "orchestrator",
          status: "running",
          message: "로컬 전조 엔진 시작...",
        });

        // 순수 코드로 전조 수행 (동기, 즉시 완료)
        const transposed = transposeText(chordText, sourceKey, targetKey);
        const formatted = formatResult(transposed, sourceKey, targetKey);

        await send({
          type: "step",
          agent: "orchestrator",
          status: "done",
          message: "전조 완료!",
        });
        await send({ type: "result", data: formatted });
      }
    } catch (err) {
      await send({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
