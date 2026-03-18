import type { Ref } from 'vue'
import { ref, watch } from 'vue'

export interface UseFetchDataOptions<T> {
  immediate?: boolean
  onSuccess?: (data: T) => void
  onError?: (err: unknown) => void
  /** Refetch when these refs change */
  watch?: Ref<unknown>[]
  /** Transform response before setting data */
  transform?: (data: T) => T
}

/**
 * Reusable async data fetcher with loading, error, retry.
 */
export function useFetchData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseFetchDataOptions<T> = {}
): {
  data: Ref<T | null>
  error: Ref<unknown>
  loading: Ref<boolean>
  execute: () => Promise<void>
  reset: () => void
} {
  const { immediate = true, onSuccess, onError, watch: watchRefs, transform } = options

  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<unknown>(null)
  const loading = ref(false)

  const execute = async () => {
    loading.value = true
    error.value = null
    try {
      let result = await fetcher()
      if (transform) result = transform(result)
      data.value = result
      onSuccess?.(result)
    } catch (err) {
      error.value = err
      onError?.(err)
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    data.value = null
    error.value = null
    loading.value = false
  }

  if (watchRefs?.length) {
    watch(watchRefs, execute, { deep: true })
  }

  if (immediate) {
    execute()
  }

  return { data, error, loading, execute, reset }
}
