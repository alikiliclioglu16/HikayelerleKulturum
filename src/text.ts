/**
 * Story text markup:
 *   {kelime}            → glossary word, lemma = kelime
 *   {yatağından|yatak}  → surface form shown, lemma used for the glossary
 * Everything else is plain text.
 */
export interface Token {
  kind: 'word' | 'space' | 'punct';
  text: string;
  lemma?: string;
  /** index among word tokens (reading order) */
  wi?: number;
  start: number;
  end: number;
  syllables: number;
}

const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;
const VOWELS = /[aeıioöuüâîûAEIİOÖUÜÂÎÛ]/g;

export function syllables(s: string): number {
  return Math.max(1, (s.match(VOWELS) || []).length);
}

export function trLower(s: string): string {
  return s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
}

export function tokenize(markup: string): { tokens: Token[]; plain: string } {
  const tokens: Token[] = [];
  let plain = '';
  let wi = 0;
  const pushPlain = (seg: string) => {
    let last = 0;
    for (const m of seg.matchAll(WORD_RE)) {
      const idx = m.index ?? 0;
      if (idx > last) pushOther(seg.slice(last, idx));
      const start = plain.length;
      plain += m[0];
      tokens.push({ kind: 'word', text: m[0], wi: wi++, start, end: plain.length, syllables: syllables(m[0]) });
      last = idx + m[0].length;
    }
    if (last < seg.length) pushOther(seg.slice(last));
  };
  const pushOther = (s: string) => {
    for (const part of s.split(/(\s+)/)) {
      if (!part) continue;
      const start = plain.length;
      plain += part;
      tokens.push({ kind: /^\s+$/.test(part) ? 'space' : 'punct', text: part, start, end: plain.length, syllables: 0 });
    }
  };

  const re = /\{([^}|]+)(?:\|([^}]+))?\}/g;
  let last = 0;
  for (const m of markup.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) pushPlain(markup.slice(last, idx));
    const surface = m[1];
    const lemma = m[2] ?? m[1];
    const start = plain.length;
    plain += surface;
    tokens.push({ kind: 'word', text: surface, lemma, wi: wi++, start, end: plain.length, syllables: syllables(surface) });
    last = idx + m[0].length;
  }
  if (last < markup.length) pushPlain(markup.slice(last));
  return { tokens, plain };
}

/** Rough reading schedule (seconds from start) for every word token, used when no word timing is available. */
export function estimateMarks(tokens: Token[], rate: number): number[] {
  const marks: number[] = [];
  let t = 0.15;
  const perSyllable = 0.2 / rate;
  for (const tok of tokens) {
    if (tok.kind === 'word') {
      marks.push(t);
      t += tok.syllables * perSyllable + 0.06;
    } else if (tok.kind === 'punct') {
      if (/[.!?…]/.test(tok.text)) t += 0.45 / rate;
      else if (/[,:;]/.test(tok.text)) t += 0.22 / rate;
    }
  }
  marks.push(t);
  return marks;
}
