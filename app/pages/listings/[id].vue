<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useListingsService, useAdminService } from '~/services/api'
import { get } from '~/utils/lodash'

definePageMeta({
  layout: 'admin',
  title: 'Listing Details'
})

const route = useRoute()
const router = useRouter()
const listingsService = useListingsService()
const adminService = useAdminService()

const listingId = computed(() => route.params.id as string)
const listing = ref<Record<string, unknown> | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

function extractListing(res: unknown): Record<string, unknown> | null {
  const obj = res as Record<string, unknown>
  if (!obj) return null
  const inner = get(obj, 'data') as Record<string, unknown> | undefined
  return (inner && typeof inner === 'object' && 'id' in inner ? inner : obj) as Record<string, unknown>
}

async function loadListing() {
  if (!listingId.value) return
  loading.value = true
  error.value = null
  try {
    const res = await listingsService.getById(listingId.value)
    listing.value = extractListing(res)
    if (!listing.value?.id) {
      const listRes = await listingsService.searchPublic({ page: 1, limit: 100 }) as unknown
      const data = get(listRes, 'data') ?? listRes
      const list = get(data, 'listings') ?? get(listRes, 'listings') ?? []
      const item = list.find((l) => String(get(l, 'id')) === listingId.value) as Record<string, unknown> | undefined
      listing.value = item ?? null
    }
  } catch {
    try {
      const listRes = await listingsService.searchPublic({ page: 1, limit: 100 }) as unknown
      const data = get(listRes, 'data') ?? listRes
      const list = get(data, 'listings') ?? get(listRes, 'listings') ?? []
      const item = list.find((l) => String(get(l, 'id')) === listingId.value) as Record<string, unknown> | undefined
      listing.value = item ?? null
    } catch {
      error.value = 'Failed to load listing'
      listing.value = null
    }
  } finally {
    loading.value = false
  }
}

async function publishListing() {
  if (!listingId.value) return
  saving.value = true
  error.value = null
  try {
    await adminService.publishListing(listingId.value)
    await loadListing()
  } catch {
    error.value = 'Failed to publish listing'
  } finally {
    saving.value = false
  }
}

function formatPrice(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString()}`
}

function formatArea(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return `${n.toLocaleString()} sq ft`
}

function formatDate(value: unknown): string {
  if (!value) return '—'
  try {
    const d = new Date(String(value))
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return String(value)
  }
}

const displayName = computed(() => {
  const p = listing.value
  return get(p, 'title') ?? get(p, 'project.name') ?? 'Listing'
})

const amenities = computed(() => {
  const a = get(listing.value, 'amenities')
  return Array.isArray(a) ? a : []
})

const highlightTags = computed(() => {
  const t = get(listing.value, 'highlightTags')
  return Array.isArray(t) ? t.filter((x: unknown) => x && String(x) !== 'Na') : []
})

function mapUrl(): string {
  const lat = get(listing.value, 'latitude')
  const lng = get(listing.value, 'longitude')
  const addr = get(listing.value, 'fullAddress') || [get(listing.value, 'locality'), get(listing.value, 'city'), get(listing.value, 'state')].filter(Boolean).join(', ')
  if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return `https://www.google.com/maps?q=${lat},${lng}`
  }
  if (addr) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(addr))}`
  }
  return ''
}

const hasMapUrl = computed(() => !!mapUrl())

const hasCoords = computed(() => {
  const lat = get(listing.value, 'latitude')
  const lng = get(listing.value, 'longitude')
  return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))
})

const osmEmbedUrl = computed(() => {
  const lat = Number(get(listing.value, 'latitude'))
  const lng = Number(get(listing.value, 'longitude'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  const delta = 0.015
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join(',')
  const marker = `${lat},${lng}`
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${encodeURIComponent(marker)}`
})

function goBack() {
  router.push('/listings')
}

onMounted(loadListing)
</script>

<template>
  <div class="min-h-full min-w-0 w-full overflow-x-hidden">
    <div class="flex flex-row flex-wrap items-center justify-between gap-4 min-w-0 overflow-hidden">
      <div class="flex min-w-0 items-center gap-4">
        <NuxtLink
          to="/listings"
          class="flex shrink-0 items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 hover:shadow-md dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800"
        >
          <UIcon name="i-lucide-arrow-left" class="size-4" />
          Back
        </NuxtLink>
        <AppPageHeader
          :title="listing ? String(displayName) : 'Listing Details'"
          description="View and manage listing details"
        />
      </div>
      <div v-if="listing" class="flex shrink-0 flex-row flex-nowrap items-center gap-3">
        <AppButton
          v-if="get(listing, 'approvalStatus') !== 'PUBLISHED' && get(listing, 'status') !== 'PUBLISHED'"
          size="sm"
          :loading="saving"
          class="!rounded-xl !px-4 !py-2.5 !font-semibold !shadow-md !shadow-emerald-500/25 transition-all hover:!shadow-lg hover:!shadow-emerald-500/30"
          @click="publishListing"
        >
          <UIcon name="i-lucide-check-circle" class="size-4" />
          Publish
        </AppButton>
      </div>
    </div>

    <div class="mt-4">
      <Transition name="profile-notification">
        <div
          v-if="error"
          class="profile-animate-fade-up opacity-0 mb-4 flex items-center gap-2 rounded-xl border border-red-200/80 bg-red-50/95 px-3 py-2.5 text-sm text-red-700 shadow-sm backdrop-blur dark:border-red-800/60 dark:bg-red-900/25 dark:text-red-400"
        >
          <UIcon name="i-lucide-alert-circle" class="h-5 w-5 shrink-0" />
          {{ error }}
        </div>
      </Transition>

      <!-- Loading -->
      <div
        v-if="loading"
        class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200/80 bg-white/80 py-12 shadow-sm backdrop-blur dark:border-gray-700/80 dark:bg-gray-900/80"
      >
        <div class="relative">
          <div class="h-14 w-14 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-500 dark:border-gray-700" />
          <UIcon name="i-lucide-home" class="absolute inset-0 m-auto h-6 w-6 text-emerald-500" />
        </div>
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Loading listing...</p>
      </div>

      <!-- Not found -->
      <div
        v-else-if="!listing"
        class="profile-animate-fade-up opacity-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200/80 bg-white py-12 dark:border-gray-700/80 dark:bg-gray-900"
      >
        <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <UIcon name="i-lucide-file-question" class="h-10 w-10 text-gray-400 dark:text-gray-500" />
        </div>
        <p class="text-gray-500 dark:text-gray-400">Listing not found</p>
        <AppButton
          variant="outline"
          size="sm"
          class="!rounded-xl !px-4 !py-2.5 !font-semibold transition-all hover:!shadow-md"
          @click="goBack"
        >
          Back to Listings
        </AppButton>
      </div>

      <template v-else-if="listing">
        <!-- Hero card - full-width with image -->
        <div class="profile-card-hover profile-animate-scale-in opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-xl shadow-gray-200/40 dark:border-gray-700/80 dark:bg-gray-900 dark:shadow-none">
          <div class="relative overflow-hidden">
            <div class="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
            <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.06),transparent)]" />
            <div class="relative flex flex-col sm:flex-row">
              <!-- Thumbnail - larger, more prominent -->
              <div class="project-hero-thumb relative flex h-48 w-full shrink-0 sm:h-52 sm:w-56 sm:min-w-[224px] sm:max-w-[224px] overflow-hidden bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-50 dark:from-emerald-950/50 dark:via-teal-950/30 dark:to-cyan-950/30">
                <img
                  v-if="get(listing, 'thumbnailUrl')"
                  :src="String(get(listing, 'thumbnailUrl'))"
                  :alt="String(displayName)"
                  class="h-full w-full object-cover"
                >
                <div v-else class="flex h-full w-full items-center justify-center">
                  <UIcon name="i-lucide-home" class="size-20 text-emerald-400/80 dark:text-emerald-500/60" />
                </div>
                <div class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                <div class="absolute bottom-2 left-2 flex gap-1.5">
                  <span v-if="get(listing, 'isFeatured')" class="inline-flex items-center gap-1 rounded-lg bg-amber-400/90 px-2 py-1 text-xs font-semibold text-amber-950 shadow-lg backdrop-blur-sm">
                    <UIcon name="i-lucide-star" class="size-3.5" />
                    Featured
                  </span>
                  <span
                    :class="(get(listing, 'approvalStatus') ?? get(listing, 'status')) === 'PUBLISHED' ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-amber-950'"
                    class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold shadow-lg backdrop-blur-sm"
                  >
                    <span class="h-1.5 w-1.5 rounded-full bg-white/90" />
                    {{ get(listing, 'approvalStatus') ?? get(listing, 'status') ?? '—' }}
                  </span>
                </div>
              </div>
              <div class="flex min-w-0 flex-1 flex-col justify-center p-4 sm:p-6">
                <h2 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl break-words">
                  {{ displayName }}
                </h2>
                <p v-if="get(listing, 'description')" class="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                  {{ get(listing, 'description') }}
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <span class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-3 py-1.5 text-xs font-medium text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {{ get(listing, 'category') ?? '—' }}
                  </span>
                  <span class="inline-flex items-center gap-1.5 rounded-lg border border-teal-200/80 bg-teal-50/80 px-3 py-1.5 text-xs font-medium text-teal-800 dark:border-teal-800/50 dark:bg-teal-950/40 dark:text-teal-300">
                    {{ get(listing, 'type') ?? get(listing, 'subType') ?? '—' }}
                  </span>
                  <span class="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200/80 bg-cyan-50/80 px-3 py-1.5 text-xs font-medium text-cyan-800 dark:border-cyan-800/50 dark:bg-cyan-950/40 dark:text-cyan-300">
                    {{ get(listing, 'purpose') ?? '—' }}
                  </span>
                  <span v-if="get(listing, 'bhk')" class="inline-flex items-center gap-1.5 rounded-lg border border-gray-200/80 bg-white/80 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-800/80 dark:text-gray-300">
                    {{ get(listing, 'bhk') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats strip - enhanced cards -->
        <div class="profile-animate-fade-up opacity-0 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div class="project-stat-card group flex items-center gap-3 sm:gap-4 rounded-xl border border-gray-200/80 bg-white/95 p-3 sm:p-4 shadow-md shadow-gray-200/40 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-emerald-200/30 dark:border-gray-700/80 dark:bg-gray-900/95 dark:shadow-gray-900/50 dark:hover:shadow-emerald-900/20 min-w-0 overflow-hidden">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
              <UIcon name="i-lucide-indian-rupee" class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Price</p>
              <p class="truncate text-sm font-bold text-gray-900 dark:text-white">
                {{ formatPrice(get(listing, 'amount') ?? get(listing, 'price')) }}
                <span v-if="get(listing, 'priceType') === 'RENT' && get(listing, 'billingPeriod')" class="text-xs font-normal text-gray-500">/{{ String(get(listing, 'billingPeriod')).toLowerCase() }}</span>
              </p>
            </div>
          </div>
          <div class="project-stat-card group flex items-center gap-3 sm:gap-4 rounded-xl border border-gray-200/80 bg-white/95 p-3 sm:p-4 shadow-md shadow-gray-200/40 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-teal-200/30 dark:border-gray-700/80 dark:bg-gray-900/95 dark:shadow-gray-900/50 dark:hover:shadow-teal-900/20 min-w-0 overflow-hidden">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/50 dark:text-teal-400">
              <UIcon name="i-lucide-maximize-2" class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Area</p>
              <p class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ formatArea(get(listing, 'areaValue') ?? get(listing, 'area')) }}</p>
            </div>
          </div>
          <div class="project-stat-card group flex items-center gap-3 sm:gap-4 rounded-xl border border-gray-200/80 bg-white/95 p-3 sm:p-4 shadow-md shadow-gray-200/40 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-cyan-200/30 dark:border-gray-700/80 dark:bg-gray-900/95 dark:shadow-gray-900/50 dark:hover:shadow-cyan-900/20 min-w-0 overflow-hidden">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-400">
              <UIcon name="i-lucide-eye" class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Views</p>
              <p class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ get(listing, 'viewCount') ?? 0 }}</p>
            </div>
          </div>
          <div class="project-stat-card group col-span-2 flex items-center gap-3 sm:gap-4 rounded-xl border border-gray-200/80 bg-white/95 p-3 sm:p-4 shadow-md shadow-gray-200/40 backdrop-blur-sm transition-all hover:shadow-lg hover:shadow-amber-200/30 sm:col-span-1 dark:border-gray-700/80 dark:bg-gray-900/95 dark:shadow-gray-900/50 dark:hover:shadow-amber-900/20 min-w-0 overflow-hidden">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
              <UIcon name="i-lucide-map-pin" class="size-5" />
            </div>
            <div class="min-w-0">
              <p class="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Location</p>
              <p class="truncate text-sm font-bold text-gray-900 dark:text-white">{{ get(listing, 'city') ?? get(listing, 'locality') ?? '—' }}</p>
            </div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3 min-w-0">
          <!-- Main column -->
          <div class="flex flex-col gap-4 lg:col-span-2 min-w-0">
            <!-- Property details -->
            <div class="profile-card-hover profile-animate-fade-up opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0">
              <div class="border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-gray-800/50 dark:to-transparent">
                <h3 class="flex items-center gap-2 font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25">
                    <UIcon name="i-lucide-info" class="h-4 w-4" />
                  </span>
                  Property Details
                </h3>
              </div>
              <div class="p-3 sm:p-4 overflow-hidden">
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 min-w-0">
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Price</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ formatPrice(get(listing, 'amount')) }}{{ get(listing, 'priceType') === 'RENT' && get(listing, 'billingPeriod') ? `/${String(get(listing, 'billingPeriod')).toLowerCase()}` : '' }}</dd>
                  </div>
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Negotiable</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(listing, 'negotiable') ? 'Yes' : 'No' }}</dd>
                  </div>
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(listing, 'category') ?? '—' }}</dd>
                  </div>
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Type</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(listing, 'type') ?? get(listing, 'subType') ?? '—' }}</dd>
                  </div>
                  <div v-if="get(listing, 'subType') && get(listing, 'subType') !== get(listing, 'type')" class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Sub Type</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(listing, 'subType') }}</dd>
                  </div>
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Purpose</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(listing, 'purpose') ?? '—' }}</dd>
                  </div>
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">BHK</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(listing, 'bhk') ?? '—' }}</dd>
                  </div>
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Bedrooms</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(listing, 'bedrooms') ?? '—' }}</dd>
                  </div>
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Bathrooms</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(listing, 'bathrooms') ?? '—' }}</dd>
                  </div>
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Balconies</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(listing, 'balconies') ?? '—' }}</dd>
                  </div>
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Units</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(listing, 'totalUnits') ?? '—' }}</dd>
                  </div>
                  <div v-if="get(listing, 'bedsPerRoom')" class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Beds per Room</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(listing, 'bedsPerRoom') }}</dd>
                  </div>
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Area</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ formatArea(get(listing, 'areaValue') ?? get(listing, 'area')) }}{{ get(listing, 'areaUnit') ? ` (${get(listing, 'areaUnit')})` : '' }}</dd>
                  </div>
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Pricing Basis</dt>
                    <dd class="mt-1 font-semibold text-gray-900 dark:text-white">{{ get(listing, 'pricingBasis') ?? '—' }}</dd>
                  </div>
                  <div v-if="get(listing, 'rejectionReason')" class="rounded-xl border border-red-100 bg-red-50/60 px-3 py-2 sm:px-4 sm:py-3 sm:col-span-2 dark:border-red-900/50 dark:bg-red-950/30 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Rejection Reason</dt>
                    <dd class="mt-1 text-sm font-medium text-red-800 dark:text-red-300 break-words">{{ get(listing, 'rejectionReason') }}</dd>
                  </div>
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 sm:col-span-2 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Listing ID</dt>
                    <dd class="mt-1 font-mono text-sm text-gray-900 dark:text-white break-all">{{ get(listing, 'id') }}</dd>
                  </div>
                  <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gray-800/30 sm:col-span-2 min-w-0 overflow-hidden">
                    <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Slug</dt>
                    <dd class="mt-1 truncate text-sm text-gray-900 dark:text-white">{{ get(listing, 'slug') ?? '—' }}</dd>
                  </div>
                </div>
              </div>
            </div>

            <!-- Description -->
            <div v-if="get(listing, 'description')" class="profile-card-hover profile-animate-fade-up opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0">
              <div class="border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-gray-800/50 dark:to-transparent">
                <h3 class="flex items-center gap-2 font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md shadow-teal-500/25">
                    <UIcon name="i-lucide-file-text" class="h-4 w-4" />
                  </span>
                  Description
                </h3>
              </div>
              <div class="p-3 sm:p-4 overflow-hidden min-w-0">
                <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400 break-words whitespace-pre-wrap">{{ get(listing, 'description') }}</p>
              </div>
            </div>

            <!-- Location -->
            <div v-if="get(listing, 'fullAddress') || get(listing, 'locality') || get(listing, 'city') || hasCoords" class="profile-card-hover profile-animate-fade-up opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0">
              <div class="border-b border-gray-100 bg-gradient-to-r from-amber-50/50 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-amber-950/20 dark:to-transparent">
                <h3 class="flex items-center gap-2 font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                  <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/25">
                    <UIcon name="i-lucide-map-pin" class="h-4 w-4" />
                  </span>
                  Location
                </h3>
              </div>
              <div class="p-3 sm:p-4 overflow-hidden min-w-0">
                <p v-if="get(listing, 'fullAddress') || get(listing, 'locality') || get(listing, 'city')" class="text-sm leading-relaxed text-gray-600 dark:text-gray-400 break-words">
                  {{ (get(listing, 'fullAddress') || [get(listing, 'locality'), get(listing, 'city'), get(listing, 'state'), get(listing, 'pincode'), get(listing, 'country')].filter(Boolean).join(', ')) || '—' }}
                </p>
                <p v-if="hasCoords" class="mt-2 font-mono text-xs text-gray-500 dark:text-gray-400 break-all">
                  {{ get(listing, 'latitude') }}, {{ get(listing, 'longitude') }}
                </p>
                <!-- Embedded map -->
                <div v-if="hasCoords && osmEmbedUrl" class="mt-4 overflow-hidden rounded-xl border border-gray-200/80 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
                  <div class="relative aspect-[16/9] w-full min-h-[200px]">
                    <iframe
                      :src="osmEmbedUrl"
                      class="absolute inset-0 h-full w-full border-0"
                      loading="lazy"
                      sandbox="allow-scripts"
                      referrerpolicy="no-referrer-when-downgrade"
                      title="Property location on map"
                    />
                  </div>
                  <div class="flex items-center justify-between gap-2 border-t border-gray-200/80 bg-white/80 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/50">
                    <span class="text-xs text-gray-500 dark:text-gray-400">OpenStreetMap</span>
                    <a
                      v-if="hasMapUrl"
                      :href="mapUrl()"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-500/25 transition-all hover:shadow-lg hover:shadow-emerald-500/30 hover:brightness-110"
                    >
                      <UIcon name="i-lucide-external-link" class="h-3.5 w-3.5" />
                      Open in Google Maps
                    </a>
                  </div>
                </div>
                <a
                  v-else-if="hasMapUrl"
                  :href="mapUrl()"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 sm:px-5 sm:py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/25 transition-all hover:shadow-lg hover:shadow-emerald-500/30 hover:brightness-110"
                >
                  <UIcon name="i-lucide-map" class="h-4 w-4" />
                  View on Map
                  <UIcon name="i-lucide-arrow-up-right" class="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>

          <!-- Sidebar -->
          <div class="flex flex-col gap-4 lg:col-span-1 min-w-0">
            <!-- Timeline -->
            <div class="profile-card-hover profile-animate-slide-right opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0">
              <div class="border-b border-gray-100 bg-gradient-to-r from-violet-50/50 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-violet-950/20 dark:to-transparent">
                <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-violet-500/25">
                    <UIcon name="i-lucide-calendar" class="h-4 w-4" />
                  </span>
                  Timeline
                </h3>
              </div>
              <dl class="flex flex-col gap-2 p-3 sm:p-4 overflow-hidden min-w-0">
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Created</dt>
                  <dd class="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{{ formatDate(get(listing, 'createdAt')) }}</dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Updated</dt>
                  <dd class="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{{ formatDate(get(listing, 'updatedAt')) }}</dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Published</dt>
                  <dd class="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{{ formatDate(get(listing, 'publishedAt')) }}</dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Views</dt>
                  <dd class="mt-0.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ get(listing, 'viewCount') ?? 0 }}</dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Likes</dt>
                  <dd class="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{{ get(listing, 'likeCount') ?? 0 }}</dd>
                </div>
                <div class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Rating</dt>
                  <dd class="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">{{ get(listing, 'ratingAvg') ?? 0 }} ({{ get(listing, 'reviewCount') ?? 0 }} reviews)</dd>
                </div>
              </dl>
            </div>

            <!-- Amenities -->
            <div v-if="amenities.length" class="profile-card-hover profile-animate-slide-right opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0">
              <div class="border-b border-gray-100 bg-gradient-to-r from-pink-50/50 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-pink-950/20 dark:to-transparent">
                <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white shadow-md shadow-pink-500/25">
                    <UIcon name="i-lucide-sparkles" class="h-4 w-4" />
                  </span>
                  Amenities
                </h3>
              </div>
              <div class="flex flex-wrap gap-2 p-3 sm:p-4 overflow-hidden min-w-0">
                <span
                  v-for="(a, i) in amenities"
                  :key="`amenity-${i}-${a}`"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-teal-50 px-3 py-1.5 text-xs font-medium capitalize text-emerald-800 shadow-sm dark:border-emerald-800/50 dark:from-emerald-950/40 dark:to-teal-950/40 dark:text-emerald-300"
                >
                  <UIcon name="i-lucide-check" class="size-3.5" />
                  {{ a }}
                </span>
              </div>
            </div>

            <!-- Highlight tags -->
            <div v-if="highlightTags.length" class="profile-card-hover profile-animate-slide-right opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0">
              <div class="border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-blue-950/20 dark:to-transparent">
                <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25">
                    <UIcon name="i-lucide-tags" class="h-4 w-4" />
                  </span>
                  Highlights
                </h3>
              </div>
              <div class="flex flex-wrap gap-2 p-3 sm:p-4 overflow-hidden min-w-0">
                <span
                  v-for="(t, i) in highlightTags"
                  :key="`tag-${i}-${t}`"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-blue-200/80 bg-blue-50/80 px-3 py-1.5 text-xs font-medium text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300"
                >
                  {{ t }}
                </span>
              </div>
            </div>

            <!-- References -->
            <div v-if="get(listing, 'userId') || get(listing, 'profileId') || get(listing, 'projectId')" class="profile-card-hover profile-animate-slide-right opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900 min-w-0">
              <div class="border-b border-gray-100 bg-gradient-to-r from-slate-50/80 to-transparent px-3 py-2 sm:px-4 sm:py-3 dark:border-gray-800 dark:bg-gradient-to-r dark:from-slate-900/50 dark:to-transparent">
                <h3 class="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                  <span class="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 text-white shadow-md shadow-slate-500/25">
                    <UIcon name="i-lucide-users" class="h-4 w-4" />
                  </span>
                  References
                </h3>
              </div>
              <dl class="flex flex-col gap-2 p-3 sm:p-4 overflow-hidden min-w-0">
                <div v-if="get(listing, 'userId')" class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">User ID</dt>
                  <dd class="mt-0.5 truncate font-mono text-sm font-medium text-gray-900 dark:text-white">{{ get(listing, 'userId') }}</dd>
                </div>
                <div v-if="get(listing, 'profileId')" class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Profile ID</dt>
                  <dd class="mt-0.5 truncate font-mono text-sm font-medium text-gray-900 dark:text-white">{{ get(listing, 'profileId') }}</dd>
                </div>
                <div v-if="get(listing, 'projectId')" class="rounded-xl border border-gray-100 bg-gray-50/60 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/30 min-w-0 overflow-hidden">
                  <dt class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Project</dt>
                  <dd class="mt-0.5">
                    <NuxtLink :to="`/projects/${get(listing, 'projectId')}`" class="text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
                      View Project
                    </NuxtLink>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.profile-animate-fade-up {
  animation: profile-fade-up 0.4s ease-out forwards;
}

.profile-animate-scale-in {
  animation: profile-scale-in 0.35s ease-out forwards;
}

.profile-animate-slide-right {
  animation: profile-slide-in-right 0.4s ease-out forwards;
}

.profile-notification-enter-active,
.profile-notification-leave-active {
  transition: all 0.3s ease;
}

.profile-notification-enter-from,
.profile-notification-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.project-hero-thumb {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.profile-card-hover:hover .project-hero-thumb {
  transform: scale(1.02);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

.project-stat-card {
  transition: all 0.25s ease;
}

.project-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
</style>
