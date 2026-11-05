<template>
  <div class="address">
    <div class="head">
      <h2 class="title">📍 收货地址</h2>
      <el-button type="primary" @click="openDialog()">新增地址</el-button>
    </div>

    <el-empty v-if="!list.length" description="暂无收货地址,点击右上角新增" />

    <div class="grid">
      <div v-for="a in list" :key="a.id" class="card" :class="{ active: a.isDefault === 1 }">
        <div class="card-top">
          <span class="name">{{ a.receiverName }}</span>
          <span class="phone">{{ a.receiverPhone }}</span>
          <el-tag v-if="a.isDefault === 1" type="danger" size="small">默认</el-tag>
        </div>
        <div class="addr">{{ a.receiverAddr }}</div>
        <div class="ops">
          <el-button
            v-if="a.isDefault !== 1"
            link type="primary" size="small"
            @click="setDefault(a)"
          >设为默认</el-button>
          <el-button link type="primary" size="small" @click="openDialog(a)">编辑</el-button>
          <el-button link type="danger" size="small" @click="remove(a)">删除</el-button>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑地址' : '新增地址'" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="收货人" prop="receiverName">
          <el-input v-model="form.receiverName" placeholder="请输入收货人姓名" />
        </el-form-item>
        <el-form-item label="电话" prop="receiverPhone">
          <el-input v-model="form.receiverPhone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="地址" prop="receiverAddr">
          <el-input v-model="form.receiverAddr" type="textarea" :rows="2" placeholder="请输入收货地址" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessageBox } from 'element-plus'
import {
  addAddress, deleteAddress, getAddressList, setDefaultAddress, updateAddress,
  type UserAddress
} from '@/api/address'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const list = ref<UserAddress[]>([])

const dialogVisible = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()
const form = reactive({
  id: undefined as number | undefined,
  receiverName: '',
  receiverPhone: '',
  receiverAddr: ''
})
const rules: FormRules = {
  receiverName: [{ required: true, message: '请输入收货人姓名', trigger: 'blur' }],
  receiverPhone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
  receiverAddr: [{ required: true, message: '请输入收货地址', trigger: 'blur' }]
}

/** 拉取当前用户地址列表 */
async function load() {
  const userId = userStore.userInfo?.id
  if (!userId) return
  list.value = await getAddressList(userId)
}

/** 打开弹窗: 不传参=新增, 传地址=编辑(回填表单) */
function openDialog(addr?: UserAddress) {
  form.id = addr?.id
  form.receiverName = addr?.receiverName || ''
  form.receiverPhone = addr?.receiverPhone || ''
  form.receiverAddr = addr?.receiverAddr || ''
  dialogVisible.value = true
  formRef.value?.clearValidate()
}

async function save() {
  await formRef.value?.validate()
  const userId = userStore.userInfo?.id
  if (!userId) return
  saving.value = true
  try {
    if (form.id) {
      await updateAddress({ id: form.id, receiverName: form.receiverName, receiverPhone: form.receiverPhone, receiverAddr: form.receiverAddr })
    } else {
      await addAddress({ userId, receiverName: form.receiverName, receiverPhone: form.receiverPhone, receiverAddr: form.receiverAddr })
    }
    ElMessage.success(form.id ? '地址已更新' : '地址已添加')
    dialogVisible.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function setDefault(addr: UserAddress) {
  await setDefaultAddress(addr.id, addr.userId)
  ElMessage.success('已设为默认地址')
  await load()
}

async function remove(addr: UserAddress) {
  await ElMessageBox.confirm('确定删除该地址吗?', '提示', { type: 'warning' })
  await deleteAddress(addr.id, addr.userId)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<style scoped>
.address {
  background: #fff;
  padding: 24px;
  border-radius: 8px;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.title {
  margin: 0;
  font-size: 20px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 16px;
  transition: box-shadow 0.2s;
}
.card.active {
  border-color: var(--spark-primary);
  box-shadow: 0 0 0 1px var(--spark-primary);
}
.card-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.name {
  font-weight: 700;
  font-size: 15px;
}
.phone {
  color: #666;
  font-size: 14px;
}
.addr {
  color: #555;
  font-size: 14px;
  line-height: 1.6;
  min-height: 44px;
}
.ops {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  margin-top: 10px;
}
</style>
