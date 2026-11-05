<template>
  <div class="register-page">
    <el-card class="register-card">
      <div class="header">
        <div class="brand-badge">🔥</div>
        <h2 class="title">星火商城</h2>
        <p class="subtitle">创建新账号</p>
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
            placeholder="用户名(3-20 个字符)"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码(至少 6 位)"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="确认密码"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item prop="phone">
          <el-input
            v-model="form.phone"
            placeholder="手机号"
            :prefix-icon="Iphone"
            clearable
          />
        </el-form-item>
        <el-form-item prop="role">
          <el-radio-group v-model="form.role" class="role-group">
            <el-radio value="customer">顾客</el-radio>
            <el-radio value="merchant">商家(开店)</el-radio>
          </el-radio-group>
        </el-form-item>
        <template v-if="form.role === 'merchant'">
          <el-form-item prop="shopName">
            <el-input
              v-model="form.shopName"
              placeholder="店铺名称"
              :prefix-icon="Shop"
              clearable
            />
          </el-form-item>
          <el-form-item prop="shopDesc">
            <el-input
              v-model="form.shopDesc"
              type="textarea"
              :rows="2"
              maxlength="200"
              show-word-limit
              placeholder="店铺简介(选填)"
            />
          </el-form-item>
        </template>
        <el-button
          type="primary"
          class="submit"
          :loading="loading"
          @click="onSubmit"
        >
          注 册
        </el-button>
      </el-form>

      <div class="footer">
        已有账号?
        <el-link type="primary" :underline="false" @click="router.push('/login')">
          去登录
        </el-link>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, Iphone, Shop } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { register } from '@/api/user'

const router = useRouter()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  phone: '',
  role: 'customer' as 'customer' | 'merchant',
  shopName: '',
  shopDesc: ''
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度为 3-20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
        if (value !== form.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
  ],
  shopName: [
    {
      validator: (_rule, value: string, callback) => {
        if (form.role === 'merchant' && !value.trim()) {
          callback(new Error('开店请填写店铺名称'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  loading.value = true
  try {
    await register({
      username: form.username,
      password: form.password,
      phone: form.phone,
      role: form.role,
      shopName: form.role === 'merchant' ? form.shopName : undefined,
      shopDesc: form.role === 'merchant' ? form.shopDesc : undefined
    })
    ElMessage.success('注册成功,请登录')
    router.push('/login')
  } catch {
    // 错误消息由响应拦截器统一弹出
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--brand-gradient);
  position: relative;
  overflow: hidden;
}
/* 背景柔光装饰 */
.register-page::before,
.register-page::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}
.register-page::before {
  width: 360px;
  height: 360px;
  left: -120px;
  top: -120px;
}
.register-page::after {
  width: 480px;
  height: 480px;
  right: -160px;
  bottom: -200px;
}
.register-card {
  width: 420px;
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
.role-group {
  width: 100%;
  justify-content: space-around;
}
.submit {
  width: 100%;
  margin-top: 4px;
  letter-spacing: 4px;
}
.footer {
  margin-top: 16px;
  text-align: center;
  font-size: 14px;
  color: var(--text-2);
}
</style>
