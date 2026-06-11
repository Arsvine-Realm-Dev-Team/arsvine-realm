// ============================================================
// CDN helpers
// ------------------------------------------------------------
// 媒体 / 静态资源托管在腾讯云 COS（香港桶 `arsvine-cdn`，
// region `ap-hongkong`），通过 `cdn.arsvine.com` 对外服务。
//
//   NEXT_PUBLIC_MEDIA_CDN=https://cdn.arsvine.com
//
// 在生产环境部署时设置该变量；本地 dev 通常不设，此时所有 helper
// 都返回相对路径（如 `/covers/projects/foo.webp`），方便把"无 CDN
// 时本地放在 public/ 镜像同名目录里"作为可选 fallback。
//
// 对象 Key 前缀约定见 docs / 内部规范：
//   posts/<year>/        文章正文配图
//   covers/              文章 / 项目 / Life 封面
//   gallery/             图集
//   avatar/              头像
//   music/               公开音频
//   fonts/               Google Fonts 自托管副本（详见 scripts/fetch-google-fonts.mjs）
//   assets/              通用静态资源
//   test/                测试
// ============================================================

const MEDIA_CDN = process.env.NEXT_PUBLIC_MEDIA_CDN || '';

/** 拼接任意 COS 对象 Key 为可访问 URL；保证只有一个 `/` 分隔。 */
export const cdn = (key: string): string => {
  const clean = key.replace(/^\/+/, '');
  return `${MEDIA_CDN}/${clean}`;
};

/** 封面图：`covers/<key>`，例：cover('projects/arsvine-realm.webp')。 */
export const cover = (key: string): string => cdn(`covers/${key}`);

/** 图集：`gallery/<key>`，例：gallery('life/arknights/01.webp')。 */
export const gallery = (key: string): string => cdn(`gallery/${key}`);

/** 文章正文配图：`posts/<key>`，例：post('2026/first-meeting-hero.webp')。 */
export const post = (key: string): string => cdn(`posts/${key}`);

/** 头像：`avatar/<key>`，例：avatar('main.webp')。 */
export const avatar = (key: string): string => cdn(`avatar/${key}`);

/** 音频：`music/<key>`，例：music('jane-doe.m4a')。 */
export const music = (key: string): string => cdn(`music/${key}`);

/** 通用静态资产：`assets/<key>`，例：asset('logo.svg')。 */
export const asset = (key: string): string => cdn(`assets/${key}`);

/** 字体资产：`fonts/<key>`，例：font('google-fonts.css')。
 *  字体文件由 scripts/fetch-google-fonts.mjs 抓取并上传，目录结构：
 *    fonts/google-fonts.css           入口样式表（已改写 url 指向同 CDN）
 *    fonts/<family-slug>/<file>.woff2 各 unicode-range 分片
 */
export const font = (key: string): string => cdn(`fonts/${key}`);
