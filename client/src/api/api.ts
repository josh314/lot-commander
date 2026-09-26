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


export type QueryParamValue = string | number | boolean | undefined
export type QueryParams<T extends object> = { [K in keyof T]: QueryParamValue }

export function getQueryString<T extends object>(obj: QueryParams<T> | undefined ): string {

  if(!obj) {
    return ''
  }

  // filter out undefined values
  const filteredParams = Object.fromEntries(
    Object.entries( obj ).filter( ( [_, value] ) => value !== undefined )
  ) as Record<string, string>
  return new URLSearchParams( filteredParams ).toString();

}
