/**
 * 打字机效果核心工具。
 *
 * Fate、环境遥测、推文和 SkillTree 都有打字效果，但它们的节奏与编排是
 * 独立的产品调校：
 *   - Fate 轮询 preset + hitokoto + 多层 schedule 回调链
 *   - Env Params 随机生成 + 删除 + 重启
 *   - TweetsSection 删 + 打 + 切换
 *   - SkillTree 只打
 *
 * 本模块只维护 Fate 的文本判定、节奏与软换行工具。不要把其它效果改为
 * 复用这里的数值或正则：它们的语言范围和视觉节奏并不等价。
 *
 * Fate 的 setState / schedule 递归仍由 hook 自己控制；把它抽象成通用状态机
 * 会反向增加复杂度。
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
