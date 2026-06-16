import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { FateTypingState, EnvParamsTypingState, EnvData } from '../types';
import { useSafeTimeouts } from '../lib/use-safe-timeouts';
import {
  TYPING_CONSTANTS,
  formatFateTextForWrap,
  getTypingDelays,
} from '../lib/typing-effect';

// 节奏常量与字符判定已抽到 lib/typing-effect.ts（4 处共享）。
// 本文件保留 "Fate / EnvParams" 各自的编排逻辑：hitokoto 轮询、随机生成、
// 多层 setTimeout 回调链等，纯节奏判定走 getTypingDelays。

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
      const primaryProfile = getTypingDelays(englishText);
      const secondaryProfile = getTypingDelays(chineseText);

      typeString(englishText, 0, primaryProfile.typeDelay, () => {
        schedule(() => {
          deleteString(englishText, primaryProfile.deleteDelay, () => {
            schedule(() => {
              typeString(chineseText, 0, secondaryProfile.typeDelay, () => {
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

    // 一句 hitokoto：fetch → 按节奏打/删；失败则回退一轮预设
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
          const textProfile = getTypingDelays(wrappedText);
          typeString(wrappedText, 0, textProfile.typeDelay, () => {
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
  const displayedEnvParamsRef = useRef('');
  const lastGeneratedParamsRef = useRef('');
  const safeTimers = useSafeTimeouts();
  // hook 顺序严格按"先所有 useState、useRef、useSafeTimeouts，再 useEffect"——后面 useEffect
  // 不能放进 if/else 否则会破坏 React Hook 规则；safeTimers 只是 ref 集合，提前或延后都安全。

  useEffect(() => {
    if (textVisible) {
      const typingDelay = 35;
      const envDeleteDelay = 20;
      const setDisplayedEnvParamsTracked = (updater: string | ((prev: string) => string)) => {
        setDisplayedEnvParams((prev) => {
          const next = typeof updater === 'function'
            ? (updater as (prev: string) => string)(prev)
            : updater;
          displayedEnvParamsRef.current = next;
          return next;
        });
      };

      const typeString = (str: string, index: number, delay: number, callback?: () => void) => {
        if (index < str.length) {
          setDisplayedEnvParamsTracked(prev => prev + str[index]);
          safeTimers.setTimeout(() => typeString(str, index + 1, delay, callback), delay);
        } else if (callback) {
          safeTimers.setTimeout(callback, 0);
        }
      };

      const deleteEnvParamsString = (currentStr: string, delay: number, callback?: () => void) => {
        if (currentStr.length > 0) {
          setDisplayedEnvParamsTracked(prev => prev.slice(0, -1));
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
        const textToDelete = displayedEnvParamsRef.current;

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
        displayedEnvParamsRef.current = '';
        setDisplayedEnvParams('');
        setEnvData(null);
        setEnvDataVersion(0);
        lastGeneratedParamsRef.current = '';
      };
    }
  }, [textVisible, safeTimers]);

  return { displayedEnvParams, isEnvParamsTyping, envData, envDataVersion };
}
