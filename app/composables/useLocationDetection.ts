/**
 * Composable for detecting user location via browser geolocation
 * and resolving to city/address via reverse geocode API.
 */
import { ref, computed } from 'vue'
import { useMapService } from '~/services/api'
import { get } from '~/utils/lodash'

export interface DetectedLocation {
  city?: string
  state?: string
  locality?: string
  fullAddress?: string
  latitude?: number
  longitude?: number
}

function getCurrentPositionAsync(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator?.geolocation?.getCurrentPosition) {
      reject(new Error('Geolocation is not supported'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
      ...options
    })
  })
}

export function useLocationDetection() {
  const mapService = useMapService()
  const detectedLocation = ref<DetectedLocation | null>(null)
  const detectionError = ref<string | null>(null)

  const isSupported = computed(() => typeof navigator !== 'undefined' && !!navigator?.geolocation?.getCurrentPosition)
  const isDetecting = ref(false)
  const hasDetected = computed(() => !!detectedLocation.value)

  async function detect() {
    isDetecting.value = true
    detectionError.value = null
    detectedLocation.value = null

    try {
      const position = await getCurrentPositionAsync({ enableHighAccuracy: true })
      const lat = position.coords.latitude
      const lng = position.coords.longitude

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('Could not get coordinates')
      }

      const res = await mapService.reverseGeocode({ lat, lng }) as unknown
      const data = get(res, 'data') ?? res
      const results = Array.isArray(get(data, 'results')) ? get(data, 'results') : Array.isArray(get(data, 'features')) ? get(data, 'features') : [data]
      const first = Array.isArray(results) && results.length > 0 ? results[0] : (typeof data === 'object' ? data : {})

      const props = get(first, 'properties') ?? first
      const context = get(props, 'context') ?? props
      const locality = get(props, 'locality') ?? get(props, 'city') ?? get(context, 'locality') ?? get(context, 'city')
      const city = get(props, 'city') ?? get(props, 'locality') ?? get(context, 'city') ?? get(context, 'locality') ?? locality
      const state = get(props, 'state') ?? get(props, 'region') ?? get(context, 'state') ?? get(context, 'region')
      const fullAddress = get(props, 'formatted') ?? get(props, 'formatted_address') ?? get(first, 'place_name') ?? [locality, city, state].filter(Boolean).join(', ')

      detectedLocation.value = {
        city: city ?? locality,
        state,
        locality: locality ?? city,
        fullAddress: fullAddress || undefined,
        latitude: lat,
        longitude: lng
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Location detection failed'
      detectionError.value = msg
      detectedLocation.value = null
    } finally {
      isDetecting.value = false
    }
  }

  function clear() {
    detectedLocation.value = null
    detectionError.value = null
  }

  return {
    detectedLocation,
    detectionError,
    isDetecting,
    hasDetected,
    isSupported,
    detect,
    clear
  }
}
