import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../anthropic";

// 시스템 프롬프트를 상수로 분리 → 프롬프트 캐싱 효과 극대화
const PARSER_SYSTEM_PROMPT = `당신은 음악 악보에서 코드를 분석하는 전문 파서 에이전트입니다.

## 지원하는 코드 표기 형식
- 대괄호 형식: [G], [Em], [C7], [Am/E], [Bm7], [Dsus4]
- 인라인 형식: G  Em  C  D (가사 위 공백으로 구분)
- 혼합 형식

## 식별 가능한 코드 유형
장조: C D E F G A B (및 # / b 변형)
단조: Cm Dm Em Fm Gm Am Bm
확장: C7 Cmaj7 Cm7 Cdim Caug Csus2 Csus4 Cadd9
슬래시 코드: G/B Am/C C/E

## 출력 형식 (JSON만 반환, 설명 없음)
{
  "format": "bracket" | "inline" | "mixed",
  "unique_chords": ["G", "Em", "C", "D"],
  "total_chord_occurrences": 12,
  "has_slash_chords": false,
  "estimated_key": "G장조"
}`;

export async function runParserAgent(chordText: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 512,
    // 안정적인 시스템 프롬프트에 캐시 적용 (반복 호출 시 약 90% 비용 절감)
    system: [
      {
        type: "text",
        text: PARSER_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ] as Anthropic.TextBlockParam[],
    messages: [
      {
        role: "user",
        content: `다음 악보 텍스트를 분석하세요:\n\n${chordText}`,
      },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
