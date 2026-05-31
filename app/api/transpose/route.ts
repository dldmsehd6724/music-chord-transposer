import { NextRequest } from "next/server";
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

  const transposed = transposeText(chordText, sourceKey, targetKey);
  const formatted = formatResult(transposed, sourceKey, targetKey);

  return new Response(JSON.stringify({ result: formatted }), {
    headers: { "Content-Type": "application/json" },
  });
}
