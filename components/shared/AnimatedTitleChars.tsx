import React from 'react';

/**
 * 把 hero 标题字符串按字符拆分渲染，用于 GSAP 的入场动画（每个字符一个 wrapper）。
 *
 * - 标题里写 `\n` 即可换行（详情页 `data/projects/index.ts` / `data/life/index.ts` 的 `title` 字段）。
 * - 空格渲染为 ` `，保证 charWrapper 有可见宽度。
 * - 行间插入 `<br>`，不带 `charWrapper` class，不影响 `querySelectorAll('.charWrapper')`
 *   的索引顺序——GSAP 现有动画无需调整。
 */
export function AnimatedTitleChars({
  text,
  wrapperClassName,
  innerClassName,
}: {
  text: string;
  wrapperClassName: string;
  innerClassName: string;
}) {
  const lines = text.toUpperCase().split('\n');
  let globalIndex = 0;
  return (
    <>
      {lines.map((line, lineIdx) => (
        <React.Fragment key={`line-${lineIdx}`}>
          {lineIdx > 0 && <br />}
          {line.split('').map((char) => {
            const key = `t-${globalIndex++}`;
            return (
              <span key={key} className={wrapperClassName}>
                <span className={innerClassName}>{char === ' ' ? ' ' : char}</span>
              </span>
            );
          })}
        </React.Fragment>
      ))}
    </>
  );
}
