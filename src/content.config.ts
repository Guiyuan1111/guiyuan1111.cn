import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { defineCollection } from 'astro:content'
import { themeConfig } from '@/config'

// [多语言已永久停用] lang 只允许空字符串（通用内容）与 'zh'（站点唯一语言）。
// 历史代码备份在 备份/i18n-backup/，停用与恢复说明见 note/disabled-features.md
const postLang = z.enum(['', 'zh']).optional().default('')

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
    // per-post opt-in: only posts with math: true load the KaTeX stylesheet
    math: z.boolean().optional().default(false),
    lang: postLang,
    abbrlink: z.string().optional().default('').refine(
      abbrlink => !abbrlink || /^[a-z0-9\-]*$/.test(abbrlink),
      { message: 'Abbrlink can only contain lowercase letters, numbers and hyphens' },
    ),
  }),
})

const about = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/about' }),
  schema: z.object({
    lang: postLang,
  }),
})

export const collections = { posts, about }
