import mdx from '@astrojs/mdx'
import partytown from '@astrojs/partytown'
import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'
import rehypeKatex from 'rehype-katex'
import rehypeMermaid from 'rehype-mermaid'
import rehypeSlug from 'rehype-slug'
import remarkDirective from 'remark-directive'
import remarkMath from 'remark-math'
import UnoCSS from 'unocss/astro'
import { base, defaultLocale, themeConfig } from './src/config'
import { langMap } from './src/i18n/config'
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
  // [多语言已永久停用] 本站只有 zh 一个语言，此块不可注释掉，原因有二：
  //   1) Layout.astro:40 的 <html lang={Astro.currentLocale}> 依赖它；注释后 lang 属性丢失，
  //      uno.config.ts 的 cjk: 变体（:lang(zh)/:lang(ja)/:lang(ko)）随之失效，Header/Navbar 中文排版样式会掉；
  //   2) 它不参与页面生成——页面数量完全由 src/config.ts 的 moreLocales 决定（当前为空数组，只生成根路径页面），无性能开销。
  // 真正要停用多语言生成，看的是 moreLocales，不是这里。
  i18n: {
    locales: Object.entries(langMap).map(([path, codes]) => ({
      path,
      codes: [...codes] as [string, ...string[]],
    })),
    defaultLocale,
  },
  integrations: [
    UnoCSS({
      injectReset: true,
    }),
    mdx(),
    partytown({
      config: {
        forward: ['dataLayer.push', 'gtag'],
      },
    }),
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
