/**
 * Centralized API config, client, and base classes.
 * Single source of truth for axios, IApiClient, BaseApiClient, BaseService.
 */
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import axios from 'axios'
import { useNuxtApp } from 'nuxt/app'

// ─── IApiClient & Base Classes ─────────────────────────────────────────────

export interface IApiClient {
  get<T>(path: string, params?: Record<string, string | number>): Promise<T>
  post<T>(path: string, body?: unknown): Promise<T>
  patch<T>(path: string, body?: unknown): Promise<T>
  delete<T>(path: string): Promise<T>
}

const unwrap = <T>(res: { data?: { data?: T } }) =>
  (res?.data as { data?: T })?.data ?? (res?.data as T)

export class BaseApiClient implements IApiClient {
  constructor(protected readonly axios: AxiosInstance) {}

  async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const res = await this.axios.get(path, { params })
    return unwrap(res) as T
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.axios.post(path, body)
    return unwrap(res) as T
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.axios.patch(path, body)
    return unwrap(res) as T
  }

  async delete<T>(path: string): Promise<T> {
    const res = await this.axios.delete(path)
    return unwrap(res) as T
  }
}

export abstract class BaseService {
  constructor(protected readonly api: IApiClient) {}
}

// ─── Config ───────────────────────────────────────────────────────────────

export interface ApiConfig {
  baseURL: string
  timeout?: number
  headers?: Record<string, string>
}

const DEFAULT_TIMEOUT = 30000
const DEFAULT_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' }

export function buildApiBaseUrl(base?: string): string {
  const raw = base || 'https://api.bhoominow.com'
  const trimmed = String(raw).replace(/\/$/, '')
  return trimmed.includes('/api/v1') ? trimmed : `${trimmed}/api/v1`
}

export function createApiClient(config: ApiConfig): AxiosInstance {
  return axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? DEFAULT_TIMEOUT,
    headers: { ...DEFAULT_HEADERS, ...config.headers }
  })
}

export function attachAuthInterceptor(api: AxiosInstance, getToken: () => string | null): void {
  api.interceptors.request.use(
    (req: InternalAxiosRequestConfig) => {
      const token = getToken()
      if (token) req.headers.Authorization = `Bearer ${token}`
      return req
    },
    (err) => Promise.reject(err)
  )
}

export function attachResponseInterceptor(api: AxiosInstance, onUnauthorized: () => void): void {
  api.interceptors.response.use(
    (res: AxiosResponse) => res,
    (err) => {
      if (err.response?.status === 401) onUnauthorized()
      return Promise.reject(err)
    }
  )
}

export function createApiService(axios: AxiosInstance): IApiClient {
  return new BaseApiClient(axios)
}

export function useApi(): IApiClient {
  const { $api } = useNuxtApp()
  return createApiService($api as AxiosInstance)
}
