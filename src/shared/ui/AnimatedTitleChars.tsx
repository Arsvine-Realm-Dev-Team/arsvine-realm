import React from 'react';

/**
 * 把 hero 标题字符串按字符拆分渲染，用于 GSAP 的入场动画（每个字符一个 wrapper）。
 *
 * - 标题里写 `\n` 即可换行（详情页 `data/projects/index.ts` / `data/life/index.ts` 的 `title` 字段）。
 * - 空格保留为文本节点，让浏览器在词与词之间自然断行。
 * - 拉丁单词外套 `wordWrapperClassName`（white-space: nowrap）保护，
 *   避免长英文标题在词中断行（如 `t-o`、`Moo|n`）。
 * - CJK 文本块（全是汉字/假名/谚文）按字符断行是正确行为，不加 wordWrapper。
 * - 行间插入 `<br>`，不带 `charWrapper` class，不影响 `querySelectorAll('.charWrapper')`
 *   的索引顺序——GSAP 现有动画无需调整。
 */

// 全 CJK 文本块：汉字 / 平假名 / 片假名 / 谚文 + 常见 CJK 中点。
// 命中时按字符自然断行，不需要 wordWrapper 保护。
const CJK_BLOCK = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}・·]+$/u;
// 用空白拆分为「文本块 + 空白块」交替序列；空白块保留供浏览器断行。
const SEGMENTS = /(\s+)/;

export function AnimatedTitleChars({
  text,
  wrapperClassName,
  innerClassName,
  wordWrapperClassName,
  uppercase = true,
}: {
  text: string;
  wrapperClassName: string;
  innerClassName: string;
  wordWrapperClassName: string;
  /** 标题是否转成大写。默认 true 兼容历史 hero 调用方；blog 标题保持原大小写。 */
  uppercase?: boolean;
}) {
  const normalized = uppercase ? text.toUpperCase() : text;
  const lines = normalized.split('\n');
  let globalIndex = 0;
  return (
    <>
      {lines.map((line, lineIdx) => (
        <React.Fragment key={`line-${lineIdx}`}>
          {lineIdx > 0 && <br />}
          {line.split(SEGMENTS).map((seg, segIdx) => {
            if (seg === '') return null;
            // 空白块：以文本节点形式输出，浏览器在此可自然断行
            if (/^\s+$/.test(seg)) {
              return <React.Fragment key={`s-${lineIdx}-${segIdx}`}>{seg}</React.Fragment>;
            }
            // 文本块：每个 codepoint 单独包成 charWrapper 给 GSAP 动画用
            // [...seg] 而不是 seg.split('')：正确处理 surrogate pair（emoji 等）
            const inner = [...seg].map((char) => {
              const key = `t-${globalIndex++}`;
              return (
                <span key={key} className={wrapperClassName}>
                  <span className={innerClassName}>{char}</span>
                </span>
              );
            });
            // 全 CJK 文本块：直接展开 charWrapper，按字断行
            if (CJK_BLOCK.test(seg)) {
              return <React.Fragment key={`w-${lineIdx}-${segIdx}`}>{inner}</React.Fragment>;
            }
            // 含拉丁/西里尔等非 CJK 字符：外套 wordWrapper 防止词中断行
            return (
              <span key={`w-${lineIdx}-${segIdx}`} className={wordWrapperClassName}>
                {inner}
              </span>
            );
          })}
        </React.Fragment>
      ))}
    </>
  );
}
