import Anthropic from "@anthropic-ai/sdk";

// 싱글톤 클라이언트 — ANTHROPIC_API_KEY 환경변수 사용
export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
