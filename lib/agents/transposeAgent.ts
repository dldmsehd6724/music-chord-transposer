import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "../anthropic";

const TRANSPOSE_SYSTEM_PROMPT = `당신은 음악 이론 전문가로, 코드 전조(Key Transposition)를 담당하는 에이전트입니다.

## 반음계 순서 (12음)
C → C# → D → D# → E → F → F# → G → G# → A → A# → B → C (반복)

## 전조 계산 방법
1. 원본 키의 반음 위치 확인 (C=0, C#=1, D=2, D#=3, E=4, F=5, F#=6, G=7, G#=8, A=9, A#=10, B=11)
2. 목표 키의 반음 위치 확인
3. 차이만큼 모든 코드의 근음(root)을 이동
4. 코드 품질(m, 7, maj7, sus4, dim, aug 등) 유지

## 이명동음 처리 규칙
- 기본적으로 # 표기 사용 (C#, D#, F#, G#, A#)
- 단, F키·Bb키·Eb키·Ab키·Db키는 관용적 b 표기 사용
- 단조(minor) 키는 해당 조성의 관용을 따름

## 슬래시 코드 처리
G/B 형식에서 분자(G)와 분모(B) 모두 같은 간격으로 전조

## 핵심 규칙
원본 텍스트의 모든 형식(줄바꿈, 공백, 대괄호, 한글 가사 등)을 절대 변경하지 말고
코드 음이름만 교체하여 반환하세요.`;

export async function runTransposeAgent(
  chordText: string,
  sourceKey: string,
  targetKey: string
): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    system: [
      {
        type: "text",
        text: TRANSPOSE_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ] as Anthropic.TextBlockParam[],
    messages: [
      {
        role: "user",
        content: `원본 키: ${sourceKey}\n목표 키: ${targetKey}\n\n전조할 악보:\n\n${chordText}`,
      },
    ],
  });

  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}
