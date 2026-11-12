<template>
  <div class="login-page">
    <el-card class="login-card">
      <div class="header">
        <div class="brand-badge">🔥</div>
        <h2 class="title">星火商城</h2>
        <p class="subtitle">SparkMall</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="0"
        size="large"
        @submit.prevent
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="onSubmit"
          />
        </el-form-item>
        <el-button
          type="primary"
          class="submit"
          :loading="loading"
          @click="onSubmit"
        >
          登 录
        </el-button>
      </el-form>

      <el-alert
        class="tip"
        type="info"
        :closable="false"
        title="测试账号:admin / 123456(后端目前为 mock)"
        show-icon
      />

      <div class="footer">
        还没有账号?
        <el-link type="primary" :underline="false" @click="router.push('/register')">
          去注册
        </el-link>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

// 默认填入测试账号,方便演示
const form = reactive({ username: 'admin', password: '123456' })

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await userStore.login({ ...form })
    ElMessage.success('登录成功')
    // 登录后回到来源页(由路由守卫带入); 无来源时管理员进后台, 其他角色进商城首页
    const redirect = (route.query.redirect as string)
      || (userStore.userInfo?.role === 'admin' ? '/admin/dashboard' : '/home')
    router.replace(redirect)
  } catch {
    // 错误消息由响应拦截器统一弹出
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--brand-gradient);
  position: relative;
  overflow: hidden;
}
/* 背景柔光装饰 */
.login-page::before,
.login-page::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}
.login-page::before {
  width: 360px;
  height: 360px;
  left: -120px;
  top: -120px;
}
.login-page::after {
  width: 480px;
  height: 480px;
  right: -160px;
  bottom: -200px;
}
.login-card {
  width: 400px;
  padding: 12px 28px 24px;
  border-radius: var(--radius-card);
}
.header {
  text-align: center;
  margin-bottom: 20px;
}
.brand-badge {
  width: 56px;
  height: 56px;
  line-height: 56px;
  margin: 0 auto 10px;
  border-radius: 18px;
  font-size: 30px;
  background: var(--brand-gradient);
  box-shadow: 0 6px 16px rgba(255, 107, 53, 0.35);
}
.title {
  margin: 0 0 4px;
  font-size: 24px;
  color: var(--text-1);
}
.subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-3);
  letter-spacing: 2px;
}
.submit {
  width: 100%;
  margin-top: 4px;
  letter-spacing: 4px;
}
.tip {
  margin-top: 16px;
}
.footer {
  margin-top: 14px;
  text-align: center;
  font-size: 14px;
  color: var(--text-2);
}
</style>
