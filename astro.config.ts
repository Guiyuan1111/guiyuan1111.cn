import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'
import rehypeKatex from 'rehype-katex'
import rehypeMermaid from 'rehype-mermaid'
import rehypeSlug from 'rehype-slug'
import remarkDirective from 'remark-directive'
import remarkMath from 'remark-math'
import UnoCSS from 'unocss/astro'
import { base, themeConfig } from './src/config'
import { rehypeCodeCopyButton } from './src/plugins/rehype-code-copy-button.mjs'
import { rehypeExternalLinks } from './src/plugins/rehype-external-links.mjs'
import { rehypeHeadingAnchor } from './src/plugins/rehype-heading-anchor.mjs'
import { rehypeImageProcessor } from './src/plugins/rehype-image-processor.mjs'
import { remarkContainerDirectives } from './src/plugins/remark-container-directives.mjs'
import { remarkLeafDirectives } from './src/plugins/remark-leaf-directives.mjs'
import { remarkReadingTime } from './src/plugins/remark-reading-time.mjs'

const { url: site } = themeConfig.site
const { imageHostURL } = themeConfig.preload ?? {}
const imageConfig = imageHostURL
  ? { image: { domains: [imageHostURL], remotePatterns: [{ protocol: 'https', hostname: imageHostURL }] } }
  : {}

export default defineConfig({
  site,
  base,
  trailingSlash: 'always', // Not recommended to change
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport', // hover, tap, viewport, load
  },
  ...imageConfig,
  // [多语言已永久停用] 本站只有中文，原 i18n 块已于 v1.0.9 删除：<html lang> 在 Layout.astro 硬编码为
  // "zh-CN"（uno.config.ts 的 cjk: 变体只依赖 html lang 属性，与 Astro i18n 配置无关）。
  // 历史代码备份在 i18n-backup/，停用与恢复说明见 note/disabled-features.md
  //
  // [v1.0.9 已移除 partytown 集成] 原 Partytown（Web Worker 隔离统计脚本）因 Google Analytics 与
  // Umami 统计 ID 均已清空而成为死重（每页内联 loader + 构建产物多 ~108K）。
  // 将来接入统计时：`pnpm add @astrojs/partytown` 并恢复 integrations 中的
  // `partytown({ config: { forward: ['dataLayer.push', 'gtag'] } })`（Head.astro 的统计代码无需改动）。
  integrations: [
    UnoCSS({
      injectReset: true,
    }),
    mdx(),
    sitemap(),
  ],
  markdown: {
    remarkPlugins: [
      remarkDirective,
      remarkMath,
      remarkContainerDirectives,
      remarkLeafDirectives,
      remarkReadingTime,
    ],
    rehypePlugins: [
      rehypeKatex,
      [rehypeMermaid, { strategy: 'pre-mermaid' }],
      rehypeSlug,
      rehypeHeadingAnchor,
      rehypeImageProcessor,
      rehypeExternalLinks,
      rehypeCodeCopyButton,
    ],
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid'],
    },
    shikiConfig: {
      // Available themes: https://shiki.style/themes
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
  vite: {
    plugins: [
      {
        name: 'prefix-font-urls-with-base',
        transform(code, id) {
          if (!id.split('?')[0].endsWith('src/styles/font.css')) {
            return null
          }

          return code.replace(/url\(\s*(['"]?)\/fonts\//g, `url($1${base}/fonts/`)
        },
      },
    ],
    build: {
      chunkSizeWarningLimit: 600,
    },
  },
  devToolbar: {
    enabled: false,
  },
})
