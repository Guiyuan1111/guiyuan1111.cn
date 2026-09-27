import type { APIContext } from 'astro'
import { generateAtom } from '@/utils/feed'

// [多语言已永久停用] 本文件原为 [...lang]/atom.xml.ts，lang 参数与 getStaticPaths 已移除。
// feed.ts 读不到 params.lang 时会回退到 defaultLocale，故仍输出中文订阅源（src/utils/feed.ts:143-145）
export async function GET(context: APIContext) {
  return generateAtom(context)
}
