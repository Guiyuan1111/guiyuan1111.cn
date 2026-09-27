import { generateAtom } from '@/utils/feed'

// [多语言已永久停用] 本文件原为 [...lang]/atom.xml.ts，lang 参数与 getStaticPaths 已移除；
// v1.0.9 起 feed 层也不再接收 lang 参数，恒定输出中文订阅源
export async function GET() {
  return generateAtom()
}
