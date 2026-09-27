import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { defineCollection } from 'astro:content'
// [暂时禁用多语言切换] allLocales 暂不参与 schema 校验；恢复多语言时改回下面第一行并删除第二行，同时还原下方两处 lang 字段的注释行
// import { allLocales, themeConfig } from '@/config'
import { themeConfig } from '@/config'
import { langMap } from '@/i18n/config'

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    // required
    title: z.string(),
    published: z.date(),
    // optional
    description: z.string().optional().default(''),
    updated: z.preprocess(
      val => val === '' ? undefined : val,
      z.date().optional(),
    ),
    tags: z.array(z.string()).optional().default([]),
    // Advanced
    draft: z.boolean().optional().default(false),
    pin: z.number().int().min(0).max(99).optional().default(0),
    toc: z.boolean().optional().default(themeConfig.global.toc),
    // [暂时禁用多语言切换] 校验放宽为主题支持的全部语言，未启用语言的文章仍不会被生成页面
    // lang: z.enum(['', ...allLocales]).optional().default(''),
    lang: z.enum(['', ...Object.keys(langMap)]).optional().default(''),
    abbrlink: z.string().optional().default('').refine(
      abbrlink => !abbrlink || /^[a-z0-9\-]*$/.test(abbrlink),
      { message: 'Abbrlink can only contain lowercase letters, numbers and hyphens' },
    ),
  }),
})

const about = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/about' }),
  schema: z.object({
    // [暂时禁用多语言切换] 同 posts 集合，见上方说明
    // lang: z.enum(['', ...allLocales]).optional().default(''),
    lang: z.enum(['', ...Object.keys(langMap)]).optional().default(''),
  }),
})

export const collections = { posts, about }
