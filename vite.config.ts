import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
// 按需自动引入:unplugin-auto-import 负责 API(ElMessage/ref/useRoute 等),
// unplugin-vue-components 负责组件(<el-button> 等)。配合 ElementPlusResolver
// 会自动按需引入对应组件与其样式,无需手动 import,产物体积更小。
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    vue(),
    // 自动引入 Vue / Vue Router / Pinia 的 API,以及 Element Plus 的 API(如 ElMessage)
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      resolvers: [ElementPlusResolver()],
      dts: 'src/auto-imports.d.ts'
    }),
    // 自动按需注册 Element Plus 组件
    Components({
      resolvers: [ElementPlusResolver()],
      dts: 'src/components.d.ts'
    })
  ],
  resolve: {
    alias: {
      // @ 指向 src 目录
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    // 固定端口 5173(默认端口):独立前端仓库,不与其他项目冲突
    // strictPort: true 表示该端口被占用时直接报错提示,而不是悄悄换到别的端口
    port: 5173,
    strictPort: true,
    proxy: {
      // 开发环境把 /api 前缀代理到网关,并 rewrite 去掉 /api 前缀
      // 例如前端请求 /api/product/list → 实际转发 http://localhost:9001/product/list
      '/api': {
        target: 'http://localhost:9001',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, '')
      }
    }
  }
})
