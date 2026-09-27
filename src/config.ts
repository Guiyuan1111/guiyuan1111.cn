import type { ThemeConfig } from '@/types'

// 站点全局配置 —— 全项目唯一事实源。
// astro.config.ts、uno.config.ts、content.config.ts、Head.astro、src/utils、new-post 脚本都引用本文件。
// 字段类型定义见 src/types/index.d.ts；改完执行 `pnpm build` 生效。
export const themeConfig: ThemeConfig = {
  // 站点信息 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  site: {
    // 站点标题
    // ⚠️ 仅当下方 i18nTitle 为 false 时才生效；当前为 true，页面实际标题取自 src/i18n/ui.ts 各语言的 title
    title: 'Guiyuan1111的博客',
    // 站点副标题，生效条件同上（当前不生效）
    subtitle: '百无一用是深情，不屑一顾最相思',
    // 站点描述，输出到 <meta name="description"> 与 RSS 描述
    // 生效条件同上：当前 i18nTitle=true，实际描述取自 src/i18n/ui.ts 的 description
    description: '更新Guiyuan1111的技术博客和哲学日常',
    // 是否改用 src/i18n/ui.ts 中的多语言标题/副标题/描述
    // true  = 首页大标题、<title>、og:title、RSS 标题全读 ui.ts（消费点：Header.astro:10-11、Head.astro:30-32、feed.ts:118-119）
    // false = 改读上面 title / subtitle / description 三个静态字段
    i18nTitle: true, // true | false
    // 作者名，输出到 <meta name="author"> 与 RSS/Atom 的 author
    author: 'Guiyuan1111',
    // 站点 URL：协议 + 域名，末尾不带斜杠
    // 决定 astro.config.ts 的 site，进而决定 canonical、RSS/Atom 的 link 与 guid、sitemap、og:url、hreflang
    url: 'https://guiyuan1111.cn',
    // 部署子路径，站点在域名根目录时保持 '/'
    // 若部署到子路径（如 https://example.com/blog/）改成 '/blog'，所有页面与静态资源都会带上该前缀
    base: '/', // 例：'/blog'、'/docs'
    // 网站图标地址，可填站内路径（如 /icons/favicon.svg）或完整 https URL
    // 按后缀输出对应 <link rel="icon">：仅识别 svg / png / ico 三种（Head.astro:45-47）
    favicon: '/icons/favicon.svg', // 或 https://example.com/favicon.svg
  },
  // 站点信息 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // 配色设置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  color: {
    // 默认明暗模式
    mode: 'light', // light | dark | auto
    light: {
      // 主色：标题、链接悬停、强调元素
      // 取色工具：https://oklch.com/
      primary: 'oklch(25% 0.005 298)',
      // 次要色：正文文字颜色
      secondary: 'oklch(40% 0.005 298)',
      // 背景色
      background: 'oklch(96% 0.005 298)',
      // 高亮色：导航栏背景、文字选中效果等
      highlight: 'oklch(0.93 0.195089 103.2532 / 0.5)', // rgba(255,235,0,0.5)
    },
    dark: {
      // 主色（暗色模式）
      primary: 'oklch(92% 0.005 298)',
      // 次要色（暗色模式）
      secondary: 'oklch(77% 0.005 298)',
      // 背景色（暗色模式）
      background: 'oklch(22% 0.005 298)',
      // 高亮色（暗色模式）
      highlight: 'oklch(0.93 0.195089 103.2532 / 0.2)', // rgba(255,235,0,0.2)
    },
  },
  // 配色设置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // 全局设置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  global: {
    // 默认语言（即站点主语言）
    // 决定 defaultLocale 与 allLocales[0]，默认语言的 URL 不带前缀（如 https://guiyuan1111.cn/）
    locale: 'zh', // de | en | es | fr | ja | ko | pl | pt | ru | zh | zh-tw
    // 额外启用的语言（URL 会带 /en/、/ja/ 等前缀）
    // 不要重复填写上面 locale 已有的语言；可传空数组 []
    // ⚠️ [暂时禁用多语言以优化性能] 恢复方法：取消注释下面一行，并删除紧接着的空数组行
    // moreLocales: ['en', 'es', 'ja', 'ru', 'zh-tw'], // ['de', 'en', 'es', 'fr', 'ja', 'ko', 'pl', 'pt', 'ru', 'zh', 'zh-tw']
    moreLocales: [],
    // 正文字体风格：sans 无衬线（默认，页面轻）| serif 衬线（纸质书感，走 EarlySummer 字体）
    fontStyle: 'sans', // sans | serif
    // 文章发布日期显示格式，作用于文章列表与文章页日期组件（PostDate.astro）
    dateFormat: 'YYYY-MM-DD', // YYYY-MM-DD | MM-DD-YYYY | DD-MM-YYYY | MMM D YYYY | D MMM YYYY
    // 全局是否显示文章目录（TOC），单篇文章可在 frontmatter 用 toc 字段覆盖
    toc: true, // true | false
    // 是否允许渲染 KaTeX 数学公式
    // 注意：样式按需注入，只有 frontmatter 写了 `math: true` 的文章页才会加载 KaTeX 样式表
    katex: true, // true | false
    // 减少动效：开启后页面切换、主题切换等动画直接到位，不做过渡
    reduceMotion: false, // true | false
  },
  // 全局设置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // 评论设置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  comment: {
    // 评论总开关（false 时下面三家都不渲染）
    // 注意：还要对应平台的凭据非空才会启用，见 Comment/Index.astro 的判定
    enabled: true, // true | false
    // Giscus —— 基于 GitHub Discussions，数据存在你自己的仓库
    // https://giscus.app/ 网页上填好参数即可得到 repo/repoId/category/categoryId
    giscus: {
      repo: '', // 例：'Guiyuan1111/guiyuan1111.cn'，非空即启用
      repoId: '',
      category: '',
      categoryId: '',
      mapping: 'pathname', // 评论与页面的对应方式，一般保持 pathname
      strict: '0',
      reactionsEnabled: '1',
      emitMetadata: '0',
      inputPosition: 'bottom', // 评论框位置：bottom | top
    },
    // Twikoo —— 自建/托管后端，需要腾讯云等环境的 envId
    // https://twikoo.js.org/
    twikoo: {
      envId: '', // 非空即启用
      // 前端版本号在 package.json 的 twikoo 依赖里改
    },
    // Waline —— 当前站点实际在用的一家（serverURL 非空即启用）
    // https://waline.js.org/en/
    waline: {
      // 评论服务端地址（⚠️ 当前仍是主题作者的服务器，站点化时需换成自己的）
      serverURL: 'https://retypeset-comment.radishzz.cc',
      // 表情包来源，可加多行
      emoji: [
        'https://unpkg.com/@waline/emojis@1.2.0/tw-emoji',
        // 'https://unpkg.com/@waline/emojis@1.2.0/bmoji',
        // 更多表情：https://waline.js.org/en/guide/features/emoji.html
      ],
      // 评论区 GIF 搜索
      search: false, // true | false
      // 评论区图片上传
      imageUploader: false, // true | false
    },
  },
  // 评论设置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // SEO 设置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  seo: {
    // Twitter/X 账号，输出 <meta name="twitter:site">（⚠️ 当前是主题作者的账号）
    twitterID: '@radishzz_',
    // 搜索引擎站长验证：把后台给的验证码填进来，构建时输出对应 <meta> 标签
    verification: {
      // Google Search Console → <meta name="google-site-verification">（⚠️ 当前是作者的码，验证不了本站）
      // https://search.google.com/search-console
      google: 'AUCrz5F1e5qbnmKKDXl2Sf8u6y0kOpEO1wLs6HMMmlM',
      // Bing 网站管理员工具 → <meta name="msvalidate.01">（⚠️ 同上）
      // https://www.bing.com/webmasters
      bing: '64708CD514011A7965C84DDE1D169F87',
      // Yandex 网站管理员 → <meta name="yandex-verification">，留空则不输出
      // https://webmaster.yandex.com
      yandex: '',
      // 百度搜索资源平台 → <meta name="baidu-site-verification">，留空则不输出
      // https://ziyuan.baidu.com
      baidu: '',
    },
    // Google Analytics 统计 ID（形如 G-XXXXXXX），留空则不加载
    // 以 type="text/partytown" 在 Web Worker 中执行，不占主线程（Head.astro:161-166）
    // https://analytics.google.com
    googleAnalyticsID: '',
    // Umami 统计网站 ID（UUID），留空则不加载，同样走 Partytown（Head.astro:196-201）
    // ⚠️ 当前是主题作者的 ID，访问数据会计入作者账号
    // https://cloud.umami.is
    umamiAnalyticsID: 'dab0e4b9-9cbf-43c3-af60-b09d3b545c38',
    // Folo 订阅验证：两项都填了才会给 RSS/Atom 输出 folo_challenge meta（feed.ts:197-202）
    // https://folo.is/
    folo: {
      feedID: '',
      userID: '',
    },
    // ⚠️ 已废弃字段：v1.0.3 起非文章页分享图改为构建期生成的静态图 /og/home.png，
    // 不再调用 apiflash 截图服务，全项目已无人读取此值，保留仅为类型兼容，可忽略。
    // apiflash access key（历史用途：为 og:image 实时生成网页截图）
    // https://apiflash.com/
    apiflashKey: '',
  },
  // SEO 设置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // 页脚设置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  footer: {
    // 页脚社交链接，按数组顺序渲染；取消对应块的注释即可增加一项
    links: [
      {
        name: 'RSS',
        url: '/atom.xml', // 或 /rss.xml
      },
      {
        name: 'GitHub',
        // ⚠️ 当前指向主题作者的仓库，站点化时建议改成本仓库地址
        url: 'https://github.com/radishzzz/astro-theme-retypeset',
      },
      {
        name: 'Email',
        // ⚠️ 当前是主题作者的邮箱
        url: 'email@radishzz.cc',
      },
      // {
      //   name: 'X',
      //   url: 'https://x.com/radishzz_',
      // },
    ],
    // 网站起始年份，与当前年份相同时页脚只显示一个年份，不同则显示 "起始年 - 当前年"
    startYear: 2025,
  },
  // 页脚设置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END

  // 预加载与资源设置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> START
  preload: {
    // 远程图床域名
    // 会被写入 astro.config.ts 的图片 remotePatterns 白名单（:22-25）：
    // 只有该域名（https）的远程图片才会进入构建期优化与 LQIP 占位生成，其余外链图会被拒绝
    // ⚠️ 当前仍是主题作者的图床域名
    imageHostURL: 'image.radishzz.cc',
    // 自定义 Google Analytics 脚本地址
    // 用于把统计脚本代理到自己的域名以规避广告拦截；留空则用官方 googletagmanager.com 地址（Head.astro:166）
    // https://gist.github.com/xiaopc/0602f06ca465d76bd9efd3dda9393738
    customGoogleAnalyticsJS: '',
    // 自定义 Umami 脚本地址
    // 自建 Umami 或代理脚本到自有域名时填写，需配合上方 umamiAnalyticsID 使用
    // ⚠️ 当前指向主题作者的自建统计实例
    // https://umami.is/docs/bypass-ad-blockers
    customUmamiAnalyticsJS: 'https://views.radishzz.cc/script.js',
  },
  // 预加载与资源设置 >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> END
}

// 以下导出供 astro.config、i18n、页面路由等模块直接使用，通常无需改动
// base：把 '/' 归一化成空字符串，其余去掉末尾斜杠，方便拼 URL
export const base = themeConfig.site.base === '/' ? '' : themeConfig.site.base.replace(/\/$/, '')
// 默认语言，Astro i18n 的 defaultLocale
export const defaultLocale = themeConfig.global.locale
// 额外语言列表
export const moreLocales = themeConfig.global.moreLocales
// 当前实际启用的全部语言 = 默认语言 + 额外语言；所有 [...lang] 路由的 getStaticPaths 都由它展开
export const allLocales = [defaultLocale, ...moreLocales]
