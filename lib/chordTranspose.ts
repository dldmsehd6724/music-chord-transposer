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
// - M7/Maj7/maj7/M9/Maj9 등 메이저 7th 표기 모두 지원
// - 대문자 M = 메이저, 소문자 m = 마이너 구분
// - M(?=7|9) : 뒤에 7 또는 9가 있을 때만 대문자 M을 접두어로 인식
const CHORD_RE = /^([A-G][#b]?)((?:maj|Maj|M(?=7|9)|min|m(?!aj)|aug|dim|sus|add)?(?:2|4|5|6|7|9|11|13)?(?:sus[24])?(?:maj7|maj9|Maj7|Maj9)?(?:[b#]\d+)*)((?:\/[A-G][#b]?)?)$/;

// 코드 줄에 등장할 수 있는 비코드 허용 토큰 (N.C. = No Chord)
const NON_CHORD_TOKEN_RE = /^N\.?C\.?$/i;

// 코드 줄 구분자: 공백·쉼표·마침표·바라인(|)·하이픈(-)
const SEPARATOR_RE = /[\s,.|‐\-]+/;
const SEPARATOR_CAPTURE_RE = /([\s,.|‐\-]+)/;

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

// ── 카포 추천 계산 ──────────────────────────────────────────────────────

export interface CapoCandidate {
  capo: number;
  shapeRoot: string;
  fingerChords: string[];
}

// 메이저 키: C 모양(idx=0)과 G 모양(idx=7)만 사용
// capo = K mod 12 (C), capo = (K−7) mod 12 (G)
const EASY_MAJOR_SHAPES = [
  { root: 'C', idx: 0 },
  { root: 'G', idx: 7 },
];

// 마이너 키: Am 모양(idx=9)과 Em 모양(idx=4)만 사용
// capo = (T−9) mod 12 (Am), capo = (T−4) mod 12 (Em)
const EASY_MINOR_SHAPES = [
  { root: 'Am', idx: 9 },
  { root: 'Em', idx: 4 },
];

/**
 * 전조 결과(또는 입력 코드) 텍스트와 목표 키를 분석해,
 * 카포를 끼우고 쉬운 모양으로 칠 수 있는 후보를 최대 3개 반환.
 *
 * 메이저: C·G 모양만 / 마이너: Am·Em 모양만
 * capo = (targetIdx − shapeIdx) mod 12, 유효 범위 1–7
 * 잡을 코드 = 결과 코드를 capo 반음만큼 아래로 전조
 */
export function getCapoRecommendations(
  resultText: string,
  targetKey: string
): CapoCandidate[] {
  const isMinorKey = targetKey.endsWith('m');
  const targetRoot = targetKey.replace(/m$/, '');
  const targetIdx = NOTE_INDEX[targetRoot] ?? 0;

  const chordSet = new Set<string>();
  for (const line of resultText.split('\n')) {
    const brackets = line.match(/\[([A-G][#b]?[^\]]*)\]/g);
    if (brackets) {
      brackets.forEach(b => {
        const c = b.slice(1, -1).trim();
        if (CHORD_RE.test(c)) chordSet.add(c);
      });
    } else if (isChordOnlyLine(line)) {
      line.trim().split(SEPARATOR_RE).filter(Boolean).forEach(t => {
        if (CHORD_RE.test(t)) chordSet.add(t);
      });
    }
  }

  const uniqueChords = Array.from(chordSet);
  if (uniqueChords.length === 0) return [];

  const shapeList = isMinorKey ? EASY_MINOR_SHAPES : EASY_MAJOR_SHAPES;
  const candidates: CapoCandidate[] = [];

  for (const { root, idx: shapeIdx } of shapeList) {
    const capo = ((targetIdx - shapeIdx) % 12 + 12) % 12;
    if (capo < 1 || capo > 7) continue;

    const seen = new Set<string>();
    const fingerChords: string[] = [];
    for (const c of uniqueChords) {
      const f = shiftChord(c, -capo, false);
      if (!seen.has(f)) { seen.add(f); fingerChords.push(f); }
    }

    candidates.push({ capo, shapeRoot: root, fingerChords });
  }

  return candidates.sort((a, b) => a.capo - b.capo).slice(0, 3);
}
