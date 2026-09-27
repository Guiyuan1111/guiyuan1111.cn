// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// [多语言已永久停用] 本站确定不再开启多语言（2026-09-27 决定）。
// 本文件不能删除：langMap 被 astro.config.ts、content.config.ts、lang.ts 引用，
// 三套评论语言映射被 Giscus/Twikoo/Waline 组件静态引用 —— 删掉任一项构建即失败。
// 当前只服务于 zh 一个语言，其余 10 种语言的条目均为死数据。
// 备份：i18n-backup/ ｜ 停用与恢复清单：note/disabled-features.md
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

// Global Language Map
export const langMap = {
  'de': ['de-DE'],
  'en': ['en-US'],
  'es': ['es-ES'],
  'fr': ['fr-FR'],
  'ja': ['ja-JP'],
  'ko': ['ko-KR'],
  'pl': ['pl-PL'],
  'pt': ['pt-BR'],
  'ru': ['ru-RU'],
  'zh': ['zh-CN'],
  'zh-tw': ['zh-TW'],
} as const

// Supported Languages
export type Language = keyof typeof langMap

// Giscus Language Map
// https://giscus.app/
export const giscusLocaleMap: Record<Language, string> = {
  'de': 'de',
  'en': 'en',
  'es': 'es',
  'fr': 'fr',
  'ja': 'ja',
  'ko': 'ko',
  'pl': 'pl',
  'pt': 'pt',
  'ru': 'ru',
  'zh': 'zh-CN',
  'zh-tw': 'zh-TW',
}

// Twikoo Language Map
// https://github.com/twikoojs/twikoo/blob/main/src/client/utils/i18n/index.js
export const twikooLocaleMap: Record<Language, string> = {
  'de': 'en', // fallback to English
  'en': 'en',
  'es': 'en', // fallback to English
  'fr': 'en', // fallback to English
  'ja': 'ja',
  'ko': 'ko',
  'pl': 'en', // fallback to English
  'pt': 'en', // fallback to English
  'ru': 'en', // fallback to English
  'zh': 'zh-cn',
  'zh-tw': 'zh-tw',
}

// Waline Language Map
// https://waline.js.org/en/guide/features/i18n.html
export const walineLocaleMap: Record<Language, string> = {
  'de': 'en-US', // fallback to English
  'en': 'en-US',
  'es': 'es',
  'fr': 'fr-FR',
  'ja': 'jp-JP',
  'ko': 'en-US', // fallback to English
  'pl': 'en-US', // fallback to English
  'pt': 'pt-BR',
  'ru': 'ru-RU',
  'zh': 'zh-CN',
  'zh-tw': 'zh-TW',
}
