export interface ApiResponse<T> {
  data?: T
  message?: string
  success?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    perPage: number
    totalPages: number
  }
}
