import type { CollectionEntry } from 'astro:content'
import MarkdownIt from 'markdown-it'

type ExcerptScene = 'list' | 'meta' | 'og' | 'feed'

const markdownParser = new MarkdownIt()
// 站点只有中文内容，摘要长度按 CJK 习惯取值（每场景固定）
const excerptLengths: Record<ExcerptScene, number> = {
  list: 120,
  meta: 120,
  og: 70,
  feed: 70,
}

const htmlEntityMap: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
  '&quot;': '"',
  '&apos;': '\'',
  '&nbsp;': ' ',
}

// Creates a clean text excerpt with a per-scene length limit
function getExcerpt(text: string, scene: ExcerptScene): string {
  const length = excerptLengths[scene]

  // Remove HTML tags
  let cleanText = text.replace(/<[^>]*>/g, '')

  // Decode HTML entities
  Object.entries(htmlEntityMap).forEach(([entity, char]) => {
    cleanText = cleanText.replace(new RegExp(entity, 'g'), char)
  })

  // Normalize whitespace
  cleanText = cleanText.replace(/\s+/g, ' ')

  // Normalize CJK punctuation spacing
  cleanText = cleanText.replace(/([。？！："」』])\s+/g, '$1')

  const excerpt = cleanText.slice(0, length).trim()

  // Remove trailing punctuation and add ellipsis
  if (cleanText.length > length) {
    return `${excerpt.replace(/\p{P}+$/u, '')}...`
  }

  return excerpt
}

// Generates post description from existing description or content
export function getPostDescription(
  post: CollectionEntry<'posts'>,
  scene: ExcerptScene,
): string {
  if (post.data.description) {
    // Only truncate for og scene, return full description for other scenes
    return scene === 'og'
      ? getExcerpt(post.data.description, scene)
      : post.data.description
  }

  const rawContent = post.body || ''
  const cleanContent = rawContent
    .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/^\s*#{1,6}\s+\S.*$/gm, '') // Remove Markdown headings
    .replace(/^\s*::.*$/gm, '') // Remove directive containers
    .replace(/^\s*>\s*\[!.*\]$/gm, '') // Remove GitHub admonition markers
    .replace(/\n{2,}/g, '\n\n') // Normalize newlines

  const renderedContent = markdownParser.render(cleanContent)
  return getExcerpt(renderedContent, scene)
}
