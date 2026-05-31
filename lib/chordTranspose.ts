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

const PREFER_FLAT = new Set([
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm',
]);

// 코드 파싱 정규식
// - 7sus4, 7sus2 지원 (sus 위치 추가)
// - 다중 변화음 지원: b9#11 등 (?:[b#]\d+)* 로 확장
const CHORD_RE = /^([A-G][#b]?)((?:maj|min|m(?!aj)|aug|dim|sus|add)?(?:2|4|5|6|7|9|11|13)?(?:sus[24])?(?:maj7|maj9)?(?:[b#]\d+)*)((?:\/[A-G][#b]?)?)$/;

// 코드 줄에 등장할 수 있는 비코드 허용 토큰 (N.C. = No Chord)
const NON_CHORD_TOKEN_RE = /^N\.?C\.?$/i;

// 코드 줄 구분자: 공백·쉼표·바라인(|)·하이픈(-)
// 하이픈: "G - Em - C - D" 또는 "Am-Dm-G-C" 형식 지원
const SEPARATOR_RE = /[\s,|\-]+/;
const SEPARATOR_CAPTURE_RE = /([\s,|\-]+)/;

function shiftNote(note: string, steps: number, useFlat: boolean): string {
  const idx = NOTE_INDEX[note];
  if (idx === undefined) return note;
  const newIdx = ((idx + steps) % 12 + 12) % 12;
  return useFlat ? FLAT_NOTES[newIdx] : SHARP_NOTES[newIdx];
}

function shiftChord(chord: string, steps: number, useFlat: boolean): string {
  const m = chord.match(CHORD_RE);
  if (!m) return chord;
  const [, root, quality, slash] = m;
  const newRoot = shiftNote(root, steps, useFlat);
  const newSlash = slash ? '/' + shiftNote(slash.slice(1), steps, useFlat) : '';
  return newRoot + quality + newSlash;
}

// 코드만 있는 줄인지 판별
// - 한글 없음
// - 구분자(공백·쉼표·|·-)로 나눈 모든 토큰이 코드이거나 N.C.
// - 코드 토큰이 하나 이상 있어야 함
function isChordOnlyLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(trimmed)) return false;
  const tokens = trimmed.split(SEPARATOR_RE).filter(Boolean);
  if (tokens.length === 0) return false;
  const hasChord = tokens.some(t => CHORD_RE.test(t));
  return hasChord && tokens.every(t => CHORD_RE.test(t) || NON_CHORD_TOKEN_RE.test(t));
}

/**
 * 악보 텍스트의 모든 코드를 전조합니다.
 *
 * 지원 형식:
 * ① 대괄호 표기  : [G]여기 서서 [Em]바라보면
 * ② 코드 위-가사 : G    Em    C    D  (가사 위 줄)
 * ③ 코드 나열    : Am,Dm,G,C  /  G Em C D  /  | G | Em | C | D |  /  G-Em-C-D
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

  if (steps === 0) return text;

  const useFlat = PREFER_FLAT.has(targetKey) || PREFER_FLAT.has(targetRoot);

  return text
    .split('\n')
    .map((line) => {
      // ① 대괄호 표기: [코드] 부분만 교체, 가사·섹션 헤더([Verse] 등)는 유지
      if (line.includes('[')) {
        return line.replace(
          /\[([A-G][#b]?[^\]]*)\]/g,
          (_, chord) => '[' + shiftChord(chord.trim(), steps, useFlat) + ']'
        );
      }
      // ② 코드만 있는 줄: 구분자를 보존하면서 각 코드 토큰만 전조
      if (isChordOnlyLine(line)) {
        return line
          .split(SEPARATOR_CAPTURE_RE)
          .map((part) => {
            if (SEPARATOR_RE.test(part) || part === '') return part;
            if (CHORD_RE.test(part)) return shiftChord(part, steps, useFlat);
            return part; // N.C. 등 비코드 토큰 보존
          })
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
