/// <reference types="vite/client" />

// 自定义环境变量类型(在 .env 文件中使用 VITE_ 前缀)
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
