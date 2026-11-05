import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'

/**
 * 后端统一返回格式
 * { code: number, message: string, data: T }
 * code === 200 表示业务成功
 */
export interface ApiResult<T = unknown> {
  code: number
  message: string
  data: T
}

// 创建 axios 实例,baseURL 走 Vite 代理(/api -> 网关 http://localhost:9001)
const service: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// ============ 请求拦截器 ============
// 自动携带 Authorization header。这里直接读 localStorage 而不是 useUserStore,
// 是为了打破 request.ts <-> store 之间的循环依赖(store 会 import api,api 又会 import store)。
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ============ 响应拦截器 ============
// 1. 业务 code !== 200:弹出后端错误消息并 reject
// 2. HTTP 401:token 失效,清理本地状态并跳转登录页
// 3. 其它网络/HTTP 错误:统一提示
service.interceptors.response.use(
  (response) => {
    const res = response.data as ApiResult
    if (res.code !== 200) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    // 校验通过后,保留完整 response 交给下方 request() 剥离外层
    return response
  },
  (error) => {
    // HTTP 401:token 失效或未登录
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      ElMessage.error('登录已过期,请重新登录')
      // 用 location 跳转避免引入 router 造成循环依赖
      const redirect = window.location.pathname + window.location.search
      window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`
      return Promise.reject(error)
    }
    const msg = error.response?.data?.message || error.message || '网络异常'
    ElMessage.error(msg)
    return Promise.reject(error)
  }
)

/**
 * 类型化请求封装。
 * 拦截器已保证 code === 200,这里利用 axios 的泛型:
 *   service.request<ApiResult<T>> 返回 Promise<AxiosResponse<ApiResult<T>>>
 * 再取 res.data.data 即可得到真正的业务数据 T。
 * 这样调用方拿到的就是 data 字段本身,类型也精确为 T。
 */
export function request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  return service.request<ApiResult<T>>(config).then((res) => res.data.data)
}

// 常用动词快捷方法,业务侧统一通过 http.get / http.post / http.put / http.delete 调用
export const http = {
  get<T = unknown>(url: string, params?: object): Promise<T> {
    return request<T>({ url, method: 'get', params })
  },
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ url, method: 'post', data, ...config })
  },
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ url, method: 'put', data, ...config })
  },
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return request<T>({ url, method: 'delete', ...config })
  }
}

export default service
