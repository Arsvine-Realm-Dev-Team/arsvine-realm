/**
 * 打字机效果核心工具。
 *
 * 项目内 4 个打字机（useFateTypingEffect / useEnvParamsTypingEffect /
 * TweetsSection / SkillTree）都按"CJK / Latin 字符给不同节奏"控制速度，
 * 但编排差异巨大：
 *   - Fate 轮询 preset + hitokoto + 多层 schedule 回调链
 *   - Env Params 随机生成 + 删除 + 重启
 *   - TweetsSection 删 + 打 + 切换
 *   - SkillTree 只打
 *
 * 因此本文件只抽出**真正共享**的 4 段：
 *   1. getTypingDelays(text) — 根据下一个字符的种类返回 type / delete 延迟
 *   2. ALPHABETIC_CHAR_RE / CJK_CHAR_RE — 字符种类判定（与上面共用）
 *   3. formatFateTextForWrap / pickNextWrapIndex — Fate 文本软换行
 *   4. 通用节奏常量（ALPHABETIC_TYPING_DELAY 等）
 *
 * 4 个 hook 共享这些常量与判定后，再无节奏漂移；各自的 setState / schedule
 * 递归仍由 hook 自己控制（因为编排形态不同，统一抽象会反向增加复杂度）。
 */

const FATE_BREAK_PUNCTUATION = /[,.!?;:，。！？；：、]/;
const ALPHABETIC_CHAR_RE = /\p{Script=Latin}/u;
const CJK_CHAR_RE = /(?:\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul})/u;

const ALPHABETIC_TYPING_DELAY = 48;
const ALPHABETIC_DELETE_DELAY = 32;
const ALPHABETIC_PAUSE_AFTER_TYPE = 2600;

const CJK_TYPING_DELAY = 150;
const CJK_DELETE_DELAY = 100;
const CJK_PAUSE_AFTER_TYPE = 1500;

export const TYPING_CONSTANTS = {
  ALPHABETIC_TYPING_DELAY,
  ALPHABETIC_DELETE_DELAY,
  ALPHABETIC_PAUSE_AFTER_TYPE,
  CJK_TYPING_DELAY,
  CJK_DELETE_DELAY,
  CJK_PAUSE_AFTER_TYPE,
  FATE_WRAP_MIN_UNITS: 18,
  FATE_BREAK_PUNCTUATION,
  ALPHABETIC_CHAR_RE,
  CJK_CHAR_RE,
} as const;

export function getTypingDelays(text: string): {
  typeDelay: number;
  deleteDelay: number;
  pauseAfterType: number;
} {
  // 与原有 useFateTypingEffect / useTweetTypewriter 一致：纯 Latin 走 Latin 节奏，
  // 含 CJK 走中文节奏（中文里偶尔有 Latin 字符也按中文处理）。
  if (ALPHABETIC_CHAR_RE.test(text) && !CJK_CHAR_RE.test(text)) {
    return {
      typeDelay: ALPHABETIC_TYPING_DELAY,
      deleteDelay: ALPHABETIC_DELETE_DELAY,
      pauseAfterType: ALPHABETIC_PAUSE_AFTER_TYPE,
    };
  }
  return {
    typeDelay: CJK_TYPING_DELAY,
    deleteDelay: CJK_DELETE_DELAY,
    pauseAfterType: CJK_PAUSE_AFTER_TYPE,
  };
}

function getTypingUnitWeight(char: string): number {
  return /[A-Za-z0-9]/.test(char) ? 1 : 2;
}

export function formatFateTextForWrap(text: string): string {
  let formatted = '';
  let lineUnits = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    formatted += char;

    if (char === '\n') {
      lineUnits = 0;
      continue;
    }

    lineUnits += getTypingUnitWeight(char);

    if (!FATE_BREAK_PUNCTUATION.test(char) || lineUnits < TYPING_CONSTANTS.FATE_WRAP_MIN_UNITS) {
      continue;
    }

    let nextIndex = i + 1;
    while (nextIndex < text.length && text[nextIndex] === ' ') {
      nextIndex += 1;
    }

    if (nextIndex < text.length) {
      formatted += '\n';
      lineUnits = 0;
      i = nextIndex - 1;
    }
  }

  return formatted;
}
