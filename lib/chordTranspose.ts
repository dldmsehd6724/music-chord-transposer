// 순수 코드 전조 엔진 — Claude API 불필요

const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NOTES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const NOTE_INDEX: Record<string, number> = {
  C: 0,  'C#': 1, Db: 1,
  D: 2,  'D#': 3, Eb: 3,
  E: 4,
  F: 5,  'F#': 6, Gb: 6,
  G: 7,  'G#': 8, Ab: 8,
  A: 9,  'A#': 10, Bb: 10,
  B: 11,
};

// 플랫 표기를 선호하는 키
const PREFER_FLAT = new Set([
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm',
]);

// 코드 토큰 파싱 정규식: 루트 + 품질 + 슬래시 베이스(선택)
// 예: C#m7, Gmaj7, Am/C, Dsus4, Bbmaj7/D
const CHORD_RE = /^([A-G][#b]?)((?:maj|min|m(?!aj)|aug|dim|sus|add)?(?:2|4|5|6|7|9|11|13)?(?:maj7|maj9)?(?:b\d+|#\d+)?)((?:\/[A-G][#b]?)?)$/;

function shiftNote(note: string, steps: number, useFlat: boolean): string {
  const idx = NOTE_INDEX[note];
  if (idx === undefined) return note;
  const newIdx = ((idx + steps) % 12 + 12) % 12;
  return useFlat ? FLAT_NOTES[newIdx] : SHARP_NOTES[newIdx];
}

function shiftChord(chord: string, steps: number, useFlat: boolean): string {
  const m = chord.match(CHORD_RE);
  if (!m) return chord; // 인식 불가 토큰은 그대로

  const [, root, quality, slash] = m;
  const newRoot = shiftNote(root, steps, useFlat);
  const newSlash = slash ? '/' + shiftNote(slash.slice(1), steps, useFlat) : '';
  return newRoot + quality + newSlash;
}

// 코드만 있는 줄인지 판별 (한글 없고 모든 토큰이 코드 형식)
function isChordOnlyLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(trimmed)) return false; // 한글 포함 시 제외
  const tokens = trimmed.split(/\s+/);
  return tokens.length > 0 && tokens.every((t) => CHORD_RE.test(t));
}

/**
 * 악보 텍스트의 모든 코드를 전조합니다.
 * - 대괄호 표기: [G], [Em7], [C#m/E] → 대괄호 내부만 교체
 * - 인라인 표기: 코드만 있는 줄 전체를 교체
 */
export function transposeText(
  text: string,
  sourceKey: string,
  targetKey: string
): string {
  const sourceRoot = sourceKey.replace(/m$/, '');
  const targetRoot = targetKey.replace(/m$/, '');
  const si = NOTE_INDEX[sourceRoot] ?? 0;
  const ti = NOTE_INDEX[targetRoot] ?? 0;
  const steps = ((ti - si) % 12 + 12) % 12;

  if (steps === 0) return text; // 전조 불필요

  const useFlat = PREFER_FLAT.has(targetKey) || PREFER_FLAT.has(targetRoot);

  return text
    .split('\n')
    .map((line) => {
      // ① 대괄호 표기: [코드] → 가사와 혼재 가능
      if (line.includes('[')) {
        return line.replace(
          /\[([A-G][#b]?[^\]]*)\]/g,
          (_, chord) => '[' + shiftChord(chord.trim(), steps, useFlat) + ']'
        );
      }
      // ② 인라인 표기: 코드만 있는 줄
      if (isChordOnlyLine(line)) {
        const parts = line.split(/(\s+)/); // 공백 보존
        return parts
          .map((part) => (/^\s+$/.test(part) ? part : shiftChord(part, steps, useFlat)))
          .join('');
      }
      return line;
    })
    .join('\n');
}

export function formatResult(
  text: string,
  sourceKey: string,
  targetKey: string
): string {
  return `=== 코드 전조 악보 ===\n원본 키: ${sourceKey}  →  전조 키: ${targetKey}\n=====================\n\n${text}`;
}
