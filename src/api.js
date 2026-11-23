import axios from 'axios'

const http = axios.create({ baseURL: '/api', timeout: 10000 })

// 每个请求自动带上登录令牌
http.interceptors.request.use(cfg => {
  const token = localStorage.getItem('paitai_token')
  if (token) cfg.headers.Authorization = token
  return cfg
})

http.interceptors.response.use(
  res => {
    if (res.config.responseType === 'blob') return res.data
    if (res.data && res.data.code === 401) {
      onUnauthorized(res.data.msg)
      return Promise.reject(new Error(res.data.msg || '请先登录'))
    }
    if (res.data && res.data.code !== 200) {
      return Promise.reject(new Error(res.data.msg || '请求失败'))
    }
    return res.data.data
  },
  err => {
    if (err.response && err.response.status === 401) {
      const m = err.response.data && err.response.data.msg
      onUnauthorized(m)
      return Promise.reject(new Error(m || '登录已过期,请重新登录'))
    }
    if (err.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求后端超时，请检查后端服务和数据库是否正常'))
    }
    if (!err.response) {
      return Promise.reject(new Error('无法连接后端服务，请检查网络或服务状态'))
    }
    if (err.response.status === 404) {
      return Promise.reject(new Error('后端接口不存在，请确认后端代码已更新'))
    }
    if (err.response.status >= 500) {
      const message = err.response.data && err.response.data.msg
      return Promise.reject(new Error(message || '后端服务异常，请检查服务日志和数据库表'))
    }
    return Promise.reject(err)
  }
)

// 未登录/过期/被顶下线:清掉本地登录态,刷新后回到登录页
// 若带了服务端提示(如"已在其他设备登录"),暂存一下,刷新后在登录页提示用户
let unauthorizedHandled = false
function onUnauthorized(message) {
  if (unauthorizedHandled) return // 防止并发请求重复刷新
  unauthorizedHandled = true
  if (message) localStorage.setItem('paitai_login_notice', message)
  localStorage.removeItem('paitai_token')
  localStorage.removeItem('paitai_user')
  window.location.reload()
}

export const recordApi = {
  page: params => http.get('/record/page', { params }),
  stats: () => http.get('/record/stats'),
  save: data => http.post('/record', data),
  update: data => http.put('/record', data),
  remove: id => http.delete(`/record/${id}`)
}

export const expressApi = {
  // 按单号查快递状态与轨迹(company 中文名可空;phone 为顺丰等所需的手机号后四位)
  query: (no, company, phone) => http.get('/express/query', { params: { no, company, phone } })
}

// 数据字典:一条 = 一个平台 + 这个平台上用的账号
export const optionApi = {
  list: () => http.get('/option'),
  add: (type, name, account) => http.post('/option', { type, name, account }),
  // 改平台名或账号:返回跟着一起改掉的台账记录条数
  update: (type, oldName, name, account) => http.put('/option', { type, oldName, name, account }),
  remove: (type, name) => http.delete('/option', { params: { type, name } })
}

export const adminApi = {
  users: params => http.get('/admin/users', { params }),
  setStatus: (id, status) => http.put('/admin/user/status', { id, status }),
  resetPassword: (id, password) => http.put('/admin/user/resetPassword', { id, password }),
  remove: id => http.delete(`/admin/user/${id}`)
}

export const fileApi = {
  // 带 token 拉取图片二进制,后端校验归属后才返回(避免 /upload 被公网直读)
  content: path => http.get('/file/content', { params: { path }, responseType: 'blob' })
}

export const aiApi = {
  // 商品页/任务聊天截图识别，返回 { itemName, cost, requirement, remark }
  recordExtract: file => {
    const data = new FormData()
    data.append('file', file)
    return http.post('/ai/recordExtract', data, { timeout: 100000 })
  },
  // AI 修图:出图要几十秒,长请求容易被中间的代理/网络掐断,所以拆成提交任务 + 轮询。
  // 提交返回任务 id;查询返回 { status: running|done|failed, path, msg }
  imageEdit: (file, prompt) => {
    const data = new FormData()
    data.append('file', file)
    data.append('prompt', prompt)
    return http.post('/ai/imageEdit', data, { timeout: 60000 })
  },
  imageEditResult: jobId => http.get(`/ai/imageEdit/${jobId}`)
}

export const authApi = {
  sendCode: (phone, purpose = 'login') => http.post('/auth/sendCode', { phone, purpose }),
  register: data => http.post('/auth/register', data),
  resetPassword: data => http.post('/auth/resetPassword', data),
  login: data => http.post('/auth/login', data),
  me: () => http.get('/auth/me'),
  logout: () => http.post('/auth/logout'),
  setPassword: password => http.post('/auth/setPassword', { password }),
  setNickname: nickname => http.post('/auth/setNickname', { nickname }),
  setAvatar: avatar => http.post('/auth/setAvatar', { avatar })
}

export const feedbackApi = {
  // 用户提交反馈(content 必填,images 为逗号分隔的图片路径,可空)
  submit: (content, images) => http.post('/feedback', { content, images }),
  mine: () => http.get('/feedback/mine'),
  // 管理员
  list: params => http.get('/feedback/list', { params }),
  unreplied: () => http.get('/feedback/unreplied'),
  reply: (id, reply) => http.put('/feedback/reply', { id, reply })
}
