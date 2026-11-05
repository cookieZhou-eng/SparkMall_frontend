import { http } from './request'

/**
 * 图片地址网关前缀。
 * 开发环境走 Vite 代理(/api -> 网关 http://localhost:9001);
 * 生产/自定义部署可通过 .env 的 VITE_API_BASE 覆盖(如直接填网关地址)。
 */
const API_BASE: string = import.meta.env.VITE_API_BASE || '/api'

/**
 * 把图片路径解析为可直接用于 <img> / el-image 的 src。
 * - 绝对地址(http/https/data/blob)原样返回, 兼容历史库里存的完整 URL;
 * - 相对路径(如上传接口返回的 /upload/files/2026/11/xxx.jpg)拼接网关前缀。
 */
export function resolveImageUrl(path?: string | null): string {
  if (!path) return ''
  if (/^(https?:|data:|blob:)/i.test(path)) return path
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
}

/**
 * POST /upload/image 本地图片上传(需登录, request 实例自动携带 token)。
 * FormData 不手动设 Content-Type, 让浏览器自动生成 multipart boundary。
 * 返回图片相对路径, 如 /upload/files/2026/11/xxx.jpg。
 */
export function uploadImage(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  return http.post<string>('/upload/image', fd, { timeout: 30000 })
}
