import { refreshToken } from 'api/auth'
import axiosLibrary from 'axios'
import { BASE_URL } from 'const/API'
import { getExToken, getToken, saveToken } from 'utils/auth'

const axios = axiosLibrary.create({
  baseURL: BASE_URL,
  timeout: 600000,
})

axios.interceptors.request.use(
  async (config) => {
    config.headers.Authorization = `Bearer ${getToken()}`
    config.headers.ExToken = getExToken()
    return config
  },
  (error) => Promise.reject(error),
)

axios.interceptors.response.use(
  async (res) => res,
  async (error) => {
    if (error?.response?.status === 401) {
      const { access_token } = await refreshToken()
      saveToken(access_token)
      error.config.headers.Authorization = `Bearer ${access_token}`
      return axiosLibrary(error.config)
    }
    return Promise.reject(error)
  },
)

export default axios
