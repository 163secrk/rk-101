import axios from 'axios'
import { Message } from '@arco-design/web-react'

const service = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

service.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 0 && res.code !== undefined) {
      Message.error(res.message || '请求失败')
      const err = new Error(res.message || 'Error')
      err.response = res
      return Promise.reject(err)
    }
    return res
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_info')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      } else {
        const msg = data?.message || data?.detail || error.message || '网络错误'
        if (typeof msg === 'string') {
          Message.error(msg)
        } else if (typeof msg === 'object') {
          const firstMsg = Object.values(msg)[0]
          if (firstMsg) Message.error(Array.isArray(firstMsg) ? firstMsg[0] : firstMsg)
        }
      }
    } else {
      Message.error('网络连接失败')
    }
    return Promise.reject(error)
  }
)

export default service
