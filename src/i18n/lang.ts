// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// [多语言已永久停用] 本站确定不再开启多语言（2026-09-27 决定）。
// 本文件不能删除：getLangFromPath 仍被 Footer.astro、src/utils/page.ts、src/i18n/path.ts 静态引用。
//
// 已注释掉的两个函数（[...lang]/ 路由已改名并去掉 lang 参数，它们不再有调用方）：
//   getLangRouteParam —— 路由不再需要把默认语言换算成 undefined；
//   getLangFromLocale —— 路由不再从 Astro.currentLocale 取当前语言。
// getNextGlobalLang 仅被 path.ts 的 getNextGlobalLangPath 使用，而后者已随语言切换按钮一起停用。
//
// 备份：i18n-backup/ ｜ 停用与恢复清单：note/disabled-features.md
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

import type { Language } from '@/i18n/config'
import { allLocales, base, defaultLocale, moreLocales } from '@/config'
// [多语言已永久停用] langMap 仅被下方已注释的 getLangFromLocale 使用
// import { langMap } from '@/i18n/config'

// /**
//  * Get the short language code for the `[...lang]` route parameter
//  *
//  * @param lang Current language code (e.g. 'en')
//  * @returns Route parameter value (e.g. 'en') or undefined (root path '/')
//  */
// export function getLangRouteParam(lang: Language): string | undefined {
//   return lang === defaultLocale ? undefined : lang
// }

// /**
//  * Get the corresponding short language code from the complete current locale value
//  *
//  * @param locale Current locale value (e.g. 'en-US')
//  * @returns Corresponding language code (e.g. 'en') or default locale
//  */
// export function getLangFromLocale(locale: string | undefined): Language {
//   if (!locale) {
//     return defaultLocale
//   }

//   const match = Object.entries(langMap).find(([, codes]) =>
//     (codes as readonly string[]).includes(locale),
//   )
//   return (match?.[0] ?? defaultLocale) as Language
// }

/**
 * Get the language code from the current path
 *
 * 当前唯一仍被调用的函数：按 URL 前缀判断语言。
 * moreLocales 恒为空数组，故永远返回默认语言 defaultLocale（'zh'）。
 *
 * @param path Current page path
 * @returns Language code detected from path or default locale
 */
export function getLangFromPath(path: string): Language {
  const pathWithoutBase = base && path.startsWith(base)
    ? path.slice(base.length)
    : path

  return moreLocales.find(lang => pathWithoutBase.startsWith(`/${lang}/`)) ?? defaultLocale
}

/**
 * Get the next language code in the global language cycle
 *
 * [多语言已永久停用] 仅被 path.ts 的 getNextGlobalLangPath 使用，后者随语言切换按钮一起停用
 *
 * @param currentLang Current language code
 * @returns Next language code in the global cycle
 */
export function getNextGlobalLang(currentLang: Language): Language {
  // Get index of current language
  const currentIndex = allLocales.indexOf(currentLang)
  if (currentIndex === -1) {
    return defaultLocale
  }

  // Calculate and return next language in cycle
  const nextIndex = (currentIndex + 1) % allLocales.length
  return allLocales[nextIndex]
}
