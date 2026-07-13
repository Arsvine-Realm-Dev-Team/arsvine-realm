import React from 'react';
import styles from '../../styles/MDXContent.module.scss';

/**
 * 词级注解 / 名词注解。
 *
 * 渲染为原生 `<ruby>` + `<rt>`，注释永远显示在被注解词的上方（ruby-position: over），
 * 适合外语术语、专有名词、自造词、缩写等需要"并排小字注音"场景。
 *
 * `<rp>(...)</rp>` 兜底：不支持 ruby 的旧浏览器与纯文本复制时
 * 会展开为 `Persona Reactor(人格反应容器)`，不破坏复制语义。
 */
interface TermProps {
  children: React.ReactNode;
  note: string;
}

export default function Term({ children, note }: TermProps) {
  return (
    <ruby className={styles.term}>
      {children}
      <rp>(</rp>
      <rt className={styles.termRt}>{note}</rt>
      <rp>)</rp>
    </ruby>
  );
}
