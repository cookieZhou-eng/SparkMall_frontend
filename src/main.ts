import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Element Plus 暗黑模式变量(可选,默认不开启;给 html 加 class="dark" 即可生效)
import 'element-plus/theme-chalk/dark/css-vars.css'
import './styles/main.css'

const app = createApp(App)

// 顺序:Pinia 需在 router 之前安装,以便路由守卫中可用 store
app.use(createPinia())
app.use(router)

app.mount('#app')
