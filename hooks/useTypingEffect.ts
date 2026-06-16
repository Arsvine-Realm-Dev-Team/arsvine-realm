import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { FateTypingState, EnvParamsTypingState, EnvData } from '../types';
import { useSafeTimeouts } from '../lib/use-safe-timeouts';

/**
 * Fate text typing effect — 节奏：
 *   1 轮预设 (en + zh) → 1 句 hitokoto → 1 轮预设 → 1 句 hitokoto → ...
 *
 * hitokoto 句子从 /api/hitokoto 拉取（服务端代理 https://v1.hitokoto.cn）。
 * 拉取失败时本轮回退为一轮预设，下一轮继续尝试 hitokoto，避免上游故障时卡死。
 *
 * 一句一言之后立刻回到预设，是为了避开 /api/hitokoto 的 60s 进程内缓存——
 * 连续多次拉到同一句会让用户觉得"中文反复出现"。一言句子停留时间也比预设
 * 中文更长（HITOKOTO_PAUSE_AFTER_TYPE），让短句的呼吸感更明显。
 */
const HITOKOTO_PER_CYCLE = 1;
const HITOKOTO_PAUSE_AFTER_TYPE = 4000; // ms，比预设的 1500 长，给短句更长停留
const FATE_WRAP_MIN_UNITS = 18;
const FATE_BREAK_PUNCTUATION = /[,.!?;:，。！？；：、]/;
const ALPHABETIC_CHAR_RE = /[A-Za-z\u0400-\u04FF]/;
const CJK_CHAR_RE = /[\u3400-\u9FFF\uF900-\uFAFF]/;

const ALPHABETIC_TYPING_DELAY = 48;
const ALPHABETIC_DELETE_DELAY = 32;
const ALPHABETIC_PAUSE_AFTER_TYPE = 2600;

const CJK_TYPING_DELAY = 150;
const CJK_DELETE_DELAY = 100;
const CJK_PAUSE_AFTER_TYPE = 1500;

function getTypingUnitWeight(char: string): number {
  return /[A-Za-z0-9]/.test(char) ? 1 : 2;
}

function formatFateTextForWrap(text: string): string {
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

    if (!FATE_BREAK_PUNCTUATION.test(char) || lineUnits < FATE_WRAP_MIN_UNITS) {
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

function getTypingProfile(text: string) {
  const hasAlphabetic = ALPHABETIC_CHAR_RE.test(text);
  const hasCjk = CJK_CHAR_RE.test(text);

  if (hasAlphabetic && !hasCjk) {
    return {
      typingDelay: ALPHABETIC_TYPING_DELAY,
      deleteDelay: ALPHABETIC_DELETE_DELAY,
      pauseAfterType: ALPHABETIC_PAUSE_AFTER_TYPE,
    };
  }

  return {
    typingDelay: CJK_TYPING_DELAY,
    deleteDelay: CJK_DELETE_DELAY,
    pauseAfterType: CJK_PAUSE_AFTER_TYPE,
  };
}

export function useFateTypingEffect(textVisible: boolean): FateTypingState {
  const tSite = useTranslations('pages.site');
  const [displayedFateText, setDisplayedFateText] = useState('');
  const isFateTypingActive = textVisible;

  useEffect(() => {
    if (!textVisible) return;

    const englishText = formatFateTextForWrap(tSite('taglinePrimary'));
    const chineseText = formatFateTextForWrap(tSite('taglineSecondary'));
    const pauseAfterDelete = 500;

    let timeouts: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;
    const abortControllers: AbortController[] = [];

    const schedule = (fn: () => void, delay: number) => {
      const id = setTimeout(() => {
        if (cancelled) return;
        fn();
      }, delay);
      timeouts.push(id);
    };

    const typeString = (str: string, index: number, delay: number, callback?: () => void) => {
      if (cancelled) return;
      if (index < str.length) {
        setDisplayedFateText(prev => prev + str[index]);
        schedule(() => typeString(str, index + 1, delay, callback), delay);
      } else if (callback) {
        schedule(callback, 0);
      }
    };

    const deleteString = (currentStr: string, delay: number, callback?: () => void) => {
      if (cancelled) return;
      if (currentStr.length > 0) {
        setDisplayedFateText(prev => prev.slice(0, -1));
        schedule(() => deleteString(currentStr.slice(0, -1), delay, callback), delay);
      } else if (callback) {
        schedule(callback, 0);
      }
    };

    // 一轮预设：en (英文节奏) → zh (中文节奏)
    const presetCycle = (onDone: () => void) => {
      const primaryProfile = getTypingProfile(englishText);
      const secondaryProfile = getTypingProfile(chineseText);

      typeString(englishText, 0, primaryProfile.typingDelay, () => {
        schedule(() => {
          deleteString(englishText, primaryProfile.deleteDelay, () => {
            schedule(() => {
              typeString(chineseText, 0, secondaryProfile.typingDelay, () => {
                schedule(() => {
                  deleteString(chineseText, secondaryProfile.deleteDelay, () => {
                    schedule(onDone, pauseAfterDelete);
                  });
                }, secondaryProfile.pauseAfterType);
              });
            }, pauseAfterDelete);
          });
        }, primaryProfile.pauseAfterType);
      });
    };

    // 一句 hitokoto：fetch → 按中文节奏打/删；失败则回退一轮预设
    const hitokotoCycle = (onDone: () => void, onFail: () => void) => {
      const controller = new AbortController();
      abortControllers.push(controller);
      fetch('/api/hitokoto', { signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) throw new Error(`status ${res.status}`);
          const data = await res.json();
          const text = typeof data?.text === 'string' ? data.text.trim() : '';
          if (!text) throw new Error('empty text');
          return text;
        })
        .then((text) => {
          if (cancelled) return;
          const wrappedText = formatFateTextForWrap(text);
          const textProfile = getTypingProfile(wrappedText);
          typeString(wrappedText, 0, textProfile.typingDelay, () => {
            schedule(() => {
              deleteString(wrappedText, textProfile.deleteDelay, () => {
                schedule(onDone, pauseAfterDelete);
              });
            }, HITOKOTO_PAUSE_AFTER_TYPE);
          });
        })
        .catch((err) => {
          if (cancelled) return;
          // AbortError 是组件卸载时的正常清理，不算失败
          if ((err as Error)?.name === 'AbortError') return;
          console.warn('[useFateTypingEffect] hitokoto fetch failed, fallback to preset:', (err as Error).message);
          onFail();
        });
    };

    // 主调度器
    let hitokotoCount = 0;
    const runHitokoto = () => {
      if (cancelled) return;
      if (hitokotoCount >= HITOKOTO_PER_CYCLE) {
        loop();
        return;
      }
      hitokotoCycle(
        () => {
          hitokotoCount++;
          runHitokoto();
        },
        // 失败：回退一轮预设，下一轮重新开始尝试 hitokoto
        () => {
          presetCycle(() => {
            hitokotoCount = 0;
            runHitokoto();
          });
        },
      );
    };

    const loop = () => {
      presetCycle(() => {
        hitokotoCount = 0;
        runHitokoto();
      });
    };

    loop();

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
      abortControllers.forEach((c) => c.abort());
      timeouts = [];
      setDisplayedFateText('');
    };
  }, [textVisible, tSite]);

  return { displayedFateText, isFateTypingActive };
}

/**
 * Environment parameters typing effect — generates and types random env data
 */
export function useEnvParamsTypingEffect(textVisible: boolean): EnvParamsTypingState {
  const [displayedEnvParams, setDisplayedEnvParams] = useState('');
  const isEnvParamsTyping = textVisible;
  const [envData, setEnvData] = useState<EnvData | null>(null);
  const [envDataVersion, setEnvDataVersion] = useState(0);
  const currentTempRef = useRef(55.0);
  const lastGeneratedParamsRef = useRef('');
  const safeTimers = useSafeTimeouts();
  // hook 顺序严格按"先所有 useState、useRef、useSafeTimeouts，再 useEffect"——后面 useEffect
  // 不能放进 if/else 否则会破坏 React Hook 规则；safeTimers 只是 ref 集合，提前或延后都安全。

  useEffect(() => {
    if (textVisible) {
      const typingDelay = 35;
      const envDeleteDelay = 20;

      const typeString = (str: string, index: number, delay: number, callback?: () => void) => {
        if (index < str.length) {
          setDisplayedEnvParams(prev => prev + str[index]);
          safeTimers.setTimeout(() => typeString(str, index + 1, delay, callback), delay);
        } else if (callback) {
          safeTimers.setTimeout(callback, 0);
        }
      };

      const deleteEnvParamsString = (currentStr: string, delay: number, callback?: () => void) => {
        if (currentStr.length > 0) {
          setDisplayedEnvParams(prev => prev.slice(0, -1));
          safeTimers.setTimeout(
            () => deleteEnvParamsString(currentStr.slice(0, -1), delay, callback),
            delay,
          );
        } else if (callback) {
          safeTimers.setTimeout(callback, 0);
        }
      };

      const generateNewParams = () => {
        const tempChange = (Math.random() * 3) - 1.5;
        let newTemp = currentTempRef.current + tempChange;
        newTemp = Math.max(44, Math.min(66, newTemp));
        currentTempRef.current = newTemp;
        const tempStr = newTemp.toFixed(1);

        const rad = Math.floor(200 + Math.random() * 300);
        const o2 = (8 + Math.random() * 2).toFixed(1);

        const pollutionLevels = ["SEVERE", "CRITICAL", "UNSTABLE", "HAZARDOUS"];
        const pollution = pollutionLevels[Math.floor(Math.random() * pollutionLevels.length)];

        const rainStatus = ["IMMINENT", "LIKELY", "UNLIKELY", "CERTAIN"];
        const rain = rainStatus[Math.floor(Math.random() * rainStatus.length)];

        const warnings = [
          "ALERT: TOXIC EXPOSURE RISK",
          "CAUTION: RADIATION STORM",
          "DANGER: ACID ZONES EXPANDING",
          "URGENT: OXYGEN DEPLETION"
        ];
        const randomWarning = warnings[Math.floor(Math.random() * warnings.length)];
        const warningLine = Math.random() > 0.5 ? `\n${randomWarning}` : '';

        setEnvData({ temp: newTemp, rad, o2: parseFloat(o2), pollution, acidRain: rain });
        setEnvDataVersion(prev => prev + 1);

        return `TEMP: ${tempStr}°C\nRAD: ${rad}mSv/h\nO2: ${o2}%\nPOLLUTION: ${pollution}\nACID RAIN: ${rain}${warningLine}`;
      };

      const generateAndType = () => {
        const newParams = generateNewParams();
        lastGeneratedParamsRef.current = newParams;
        typeString(newParams, 0, typingDelay, () => {
          const updateTime = 8000 + Math.floor(Math.random() * 7000);
          safeTimers.setTimeout(() => {
            startTyping();
          }, updateTime);
        });
      };

      const startTyping = () => {
        const textToDelete = lastGeneratedParamsRef.current;

        if (textToDelete.length > 0) {
          deleteEnvParamsString(textToDelete, envDeleteDelay, () => {
            generateAndType();
          });
        } else {
          generateAndType();
        }
      };

      safeTimers.setTimeout(() => {
        startTyping();
      }, 1000);

      return () => {
        setDisplayedEnvParams('');
        setEnvData(null);
        setEnvDataVersion(0);
        lastGeneratedParamsRef.current = '';
      };
    }
  }, [textVisible, safeTimers]);

  return { displayedEnvParams, isEnvParamsTyping, envData, envDataVersion };
}
