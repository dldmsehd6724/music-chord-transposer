import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../anthropic";

const FORMATTER_SYSTEM_PROMPT = `당신은 음악 악보 포맷팅 전문가 에이전트입니다.
전조 완료된 악보를 깔끔하게 정리하여 반환합니다.

## 포맷 규칙
1. 전조 정보 헤더를 상단에 추가
2. 원본 구조(절, 코러스, 브리지 등) 그대로 유지
3. 코드 표기 방식 일관성 유지
4. 불필요한 설명이나 주석 없이 악보만 반환

## 출력 형식
=== 코드 전조 악보 ===
원본 키: {source_key}  →  전조 키: {target_key}
=====================

{전조된 악보 내용}

악보 외 다른 설명은 절대 추가하지 마세요.`;

export async function runFormatterAgent(
  transposedText: string,
  sourceKey: string,
  targetKey: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: FORMATTER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ] as Anthropic.TextBlockParam[],
    messages: [
      {
        role: "user",
        content: `원본 키: ${sourceKey}\n전조 키: ${targetKey}\n\n전조된 악보:\n\n${transposedText}`,
      },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
