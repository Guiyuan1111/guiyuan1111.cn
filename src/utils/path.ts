import { base } from '@/config'

/**
 * Prefix a site path with the configured base
 *
 * @param path Site path, with or without leading/trailing slashes ('' for home)
 * @returns Base-prefixed path with leading and trailing slashes
 */
export function getLocalizedPath(path: string): string {
  const normalizedPath = path.replace(/^\/|\/$/g, '')
  const sitePath = normalizedPath === '' ? '/' : `/${normalizedPath}/`

  return base ? `${base}${sitePath}` : sitePath
}

/**
 * Get the path to a post page
 *
 * @param slug Post slug
 * @returns Path to the post page
 */
export function getPostPath(slug: string): string {
  return getLocalizedPath(`posts/${slug}`)
}

/**
 * Get the path to a tag page
 *
 * @param tagName Tag name
 * @returns Path to the tag page
 */
export function getTagPath(tagName: string): string {
  return getLocalizedPath(`tags/${tagName}`)
}
