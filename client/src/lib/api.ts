// client/src/lib/api.ts
import axios, { type AxiosError } from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

function isJsonResponse(contentType: string | undefined): boolean {
  return (contentType ?? '').includes('application/json')
}

function redirectToLogin(): Promise<never> {
  window.location.href = '/login'
  return new Promise(() => {}) // never resolves; page is navigating away
}

api.interceptors.response.use(
  (response) => {
    if (!isJsonResponse(response.headers['content-type'])) {
      return redirectToLogin()
    }
    return response
  },
  (error: AxiosError) => {
    if (!isJsonResponse(error.response?.headers['content-type'])) {
      return redirectToLogin()
    }
    return Promise.reject(error)
  }
)
