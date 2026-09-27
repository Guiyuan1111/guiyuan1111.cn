import type { CollectionEntry } from 'astro:content'
import { OGImageRoute } from 'astro-og-canvas'
import { getCollection } from 'astro:content'
import { themeConfig } from '@/config'
import { getPostDescription } from '@/utils/description'

// eslint-disable-next-line antfu/no-top-level-await
const posts = await getCollection('posts')

// Create slug-to-metadata lookup object for blog posts
const pages = Object.fromEntries(
  posts.map((post: CollectionEntry<'posts'>) => [
    post.id,
    {
      title: post.data.title,
      description: getPostDescription(post, 'og'),
    },
  ]),
)

const { title, subtitle } = themeConfig.site

// Static site OG card, used as fallback for non-post pages (home, tags, about)
pages.home = {
  title,
  description: subtitle,
}

// Configure Open Graph image generation route
// eslint-disable-next-line antfu/no-top-level-await
export const { getStaticPaths, GET } = await OGImageRoute({
  param: 'image',
  pages,
  getImageOptions: (_path, page) => ({
    title: page.title,
    description: page.description,
    logo: {
      path: './public/icons/og-logo.png', // Required local path and PNG format
      size: [250],
    },
    border: {
      color: [242, 241, 245],
      width: 20,
    },
    font: {
      title: {
        families: ['Noto Sans SC'],
        weight: 'Bold',
        color: [34, 33, 36],
        lineHeight: 1.5,
      },
      description: {
        families: ['Noto Sans SC'],
        color: [72, 71, 74],
        lineHeight: 1.5,
      },
    },
    fonts: [
      './src/assets/fonts/NotoSansSC-Bold.otf',
      './src/assets/fonts/NotoSansSC-Regular.otf',
    ],
    bgGradient: [[242, 241, 245]],
  }),
})
