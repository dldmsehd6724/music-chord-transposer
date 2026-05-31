import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../anthropic";
import { runParserAgent } from "./parserAgent";
import { runTransposeAgent } from "./transposeAgent";
import { runFormatterAgent } from "./formatterAgent";

export interface TransposeRequest {
  chordText: string;
  sourceKey: string;
  targetKey: string;
}

export interface AgentStep {
  agent: "orchestrator" | "parser" | "transposer" | "formatter";
  status: "running" | "done" | "error";
  message: string;
}

// 총괄 에이전트 시스템 프롬프트
const ORCHESTRATOR_SYSTEM_PROMPT = `당신은 음악 코드 전조 시스템의 총괄 오케스트레이터 에이전트입니다.
세 가지 전문 서브 에이전트를 조율하여 사용자의 악보를 목표 키로 전조합니다.

## 사용 가능한 도구 (서브 에이전트)
1. analyze_chords — 파서 에이전트: 악보에서 코드를 분석·추출
2. transpose_chords — 전조 에이전트: 코드를 목표 키로 변환
3. format_output — 포매터 에이전트: 전조 결과를 깔끔하게 정리

## 작업 순서 (반드시 준수)
Step 1: analyze_chords 호출 → 코드 분석
Step 2: transpose_chords 호출 → 전조 수행
Step 3: format_output 호출 → 결과 포맷

모든 도구를 순서대로 호출한 뒤, format_output이 반환한 내용을 그대로 최종 답변으로 출력하세요.
악보 외 추가 설명은 하지 마세요.`;

// 오케스트레이터가 사용할 도구 정의 (각 서브 에이전트를 tool로 표현)
const ORCHESTRATOR_TOOLS: Anthropic.Tool[] = [
  {
    name: "analyze_chords",
    description:
      "악보 텍스트에서 코드를 분석하고 추출합니다. 파서 서브 에이전트를 호출합니다.",
    input_schema: {
      type: "object" as const,
      properties: {
        chord_text: {
          type: "string",
          description: "분석할 악보 텍스트",
        },
      },
      required: ["chord_text"],
    },
  },
  {
    name: "transpose_chords",
    description:
      "악보의 모든 코드를 원본 키에서 목표 키로 전조합니다. 전조 서브 에이전트를 호출합니다.",
    input_schema: {
      type: "object" as const,
      properties: {
        chord_text: {
          type: "string",
          description: "전조할 악보 텍스트 (원본 코드 포함)",
        },
        source_key: { type: "string", description: "원본 키 (예: G, Am, C)" },
        target_key: { type: "string", description: "목표 키 (예: D, Em, F)" },
      },
      required: ["chord_text", "source_key", "target_key"],
    },
  },
  {
    name: "format_output",
    description:
      "전조된 악보를 헤더와 함께 깔끔하게 포맷합니다. 포매터 서브 에이전트를 호출합니다.",
    input_schema: {
      type: "object" as const,
      properties: {
        transposed_text: { type: "string", description: "전조 완료된 악보 텍스트" },
        source_key: { type: "string", description: "원본 키" },
        target_key: { type: "string", description: "전조된 목표 키" },
      },
      required: ["transposed_text", "source_key", "target_key"],
    },
  },
];

/**
 * 총괄 오케스트레이터 실행
 * Claude가 tool_use로 서브 에이전트를 호출하는 에이전트 루프 패턴
 */
export async function runOrchestrator(
  request: TransposeRequest,
  onStep: (step: AgentStep) => void | Promise<void>
): Promise<string> {
  // 메시지 히스토리 — 에이전트 루프 전체에서 유지
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `다음 악보를 ${request.sourceKey}에서 ${request.targetKey}로 전조해주세요.\n\n악보:\n${request.chordText}`,
    },
  ];

  await onStep({
    agent: "orchestrator",
    status: "running",
    message: "총괄 에이전트가 작업을 분석하고 서브 에이전트 조율을 시작합니다...",
  });

  // format_output 결과를 별도 저장 — 최종 반환값으로 사용
  let formattedResult = "";

  // ─── 에이전트 루프 ───────────────────────────────────────────
  // 총괄 에이전트가 tool_use를 멈출 때까지 반복
  while (true) {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: ORCHESTRATOR_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }, // 시스템 프롬프트 캐싱
        },
      ] as Anthropic.TextBlockParam[],
      tools: ORCHESTRATOR_TOOLS,
      messages,
    });

    // 어시스턴트 응답 전체를 히스토리에 추가 (tool_use 블록 포함)
    messages.push({ role: "assistant", content: response.content });

    // 최종 응답 (더 이상 tool 호출 없음)
    if (response.stop_reason === "end_turn") {
      break;
    }

    if (response.stop_reason !== "tool_use") {
      break;
    }

    // ── 도구 호출 처리 ──────────────────────────────────────────
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      let result = "";

      // 총괄 에이전트가 analyze_chords 도구 호출 → 파서 서브 에이전트 실행
      if (toolUse.name === "analyze_chords") {
        await onStep({ agent: "parser", status: "running", message: "파서 에이전트: 악보 코드를 분석 중..." });
        const input = toolUse.input as { chord_text: string };
        result = await runParserAgent(input.chord_text);
        await onStep({ agent: "parser", status: "done", message: "파서 에이전트: 코드 분석 완료 ✓" });

      // 총괄 에이전트가 transpose_chords 도구 호출 → 전조 서브 에이전트 실행
      } else if (toolUse.name === "transpose_chords") {
        await onStep({ agent: "transposer", status: "running", message: "전조 에이전트: 코드를 변환 중..." });
        const input = toolUse.input as {
          chord_text: string;
          source_key: string;
          target_key: string;
        };
        result = await runTransposeAgent(input.chord_text, input.source_key, input.target_key);
        await onStep({ agent: "transposer", status: "done", message: "전조 에이전트: 코드 변환 완료 ✓" });

      // 총괄 에이전트가 format_output 도구 호출 → 포매터 서브 에이전트 실행
      } else if (toolUse.name === "format_output") {
        await onStep({ agent: "formatter", status: "running", message: "포매터 에이전트: 출력 정리 중..." });
        const input = toolUse.input as {
          transposed_text: string;
          source_key: string;
          target_key: string;
        };
        result = await runFormatterAgent(input.transposed_text, input.source_key, input.target_key);
        formattedResult = result; // 포매터 결과 저장
        await onStep({ agent: "formatter", status: "done", message: "포매터 에이전트: 출력 정리 완료 ✓" });
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: result,
      });
    }

    // 모든 tool_result를 user 메시지로 추가 후 다음 루프
    messages.push({ role: "user", content: toolResults });
  }
  // ─── 루프 종료 ───────────────────────────────────────────────

  await onStep({ agent: "orchestrator", status: "done", message: "전조 완료! 최종 결과를 반환합니다." });

  // 포매터 결과가 있으면 우선 반환, 없으면 오케스트레이터 텍스트 응답 반환
  if (formattedResult) return formattedResult;

  const lastMsg = messages[messages.length - 1];
  if (lastMsg.role === "assistant") {
    const blocks = Array.isArray(lastMsg.content) ? lastMsg.content : [];
    return blocks
      .filter((b): b is Anthropic.TextBlock => typeof b === "object" && "type" in b && b.type === "text")
      .map((b) => b.text)
      .join("");
  }
  return "";
}
