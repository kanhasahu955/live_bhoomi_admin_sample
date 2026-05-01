<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import { useListingsService, useAdminService } from '~/services/api'
import { get } from '~/utils/lodash'
import { extractListings } from '~/utils/api-extract'
import { adminModalUiCompact } from '~/utils/admin-modal-ui'
import {
  canAdminFullEditListing,
  canAdminRejectListing,
  isListingPublished,
  isListingSoftDeleted
} from '~/utils/listing-admin'

definePageMeta({
  layout: 'admin',
  title: 'Listing Details',
  description: 'View, edit, and publish a listing'
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { copy } = useClipboard()
const listingsService = useListingsService()
const adminService = useAdminService()

const listingId = computed(() => {
  const raw = route.params.id
  const s = Array.isArray(raw) ? raw[0] : raw
  return s != null && String(s) !== '' ? String(s) : ''
})

function goToListingEdit() {
  const id = listingId.value
  if (!id) {
    toast.add({
      title: 'Cannot open editor',
      description: 'Listing id is missing.',
      color: 'warning',
      icon: 'i-lucide-alert-circle'
    })
    return
  }
  if (listing.value && !canAdminFullEditListing(listing.value)) {
    toast.add({
      title: 'Editing locked',
      description: 'This listing was removed.',
      color: 'warning',
      icon: 'i-lucide-lock'
    })
    return
  }
  void router.push(`/listings/${id}/edit`)
}

const listing = ref<Record<string, unknown> | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)

const rejectModalOpen = ref(false)
const rejectReasonInput = ref('')

function extractListing(res: unknown): Record<string, unknown> | null {
  const obj = res as Record<string, unknown>
  if (!obj) return null
  const inner = get(obj, 'data') as Record<string, unknown> | undefined
  return (inner && typeof inner === 'object' && 'id' in inner ? inner : obj) as Record<string, unknown>
}

async function findListingInAdminList(id: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await adminService.listAdminListings({ page: 1, limit: 500 })
    const list = extractListings(res)
    const item = list.find((l) => String(get(l, 'id')) === id)
    return item ?? null
  } catch {
    return null
  }
}

async function loadListing() {
  if (!listingId.value) return
  loading.value = true
  error.value = null
  try {
    try {
      const res = await adminService.getListingById(listingId.value)
      listing.value = extractListing(res)
    } catch {
      const res = await listingsService.getById(listingId.value)
      listing.value = extractListing(res)
    }
    if (!listing.value?.id) {
      listing.value = await findListingInAdminList(listingId.value)
    }
  } catch {
    listing.value = await findListingInAdminList(listingId.value)
    if (!listing.value) {
      error.value = 'Failed to load listing'
    }
  } finally {
    loading.value = false
  }
}

function copyText(label: string, text: string) {
  const t = text.trim()
  if (!t) return
  copy(t)
  toast.add({ title: 'Copied', description: label, color: 'success', icon: 'i-lucide-copy-check' })
}

function copyPageLink() {
  if (typeof window === 'undefined') return
  copy(`${window.location.origin}${route.fullPath}`)
  toast.add({ title: 'Link copied', description: 'Page link is on your clipboard.', color: 'success', icon: 'i-lucide-link' })
}

async function publishListing() {
  if (!listingId.value) return
  if (listing.value && isListingPublished(listing.value)) {
    toast.add({
      title: 'Already published',
      description: 'This listing is already live.',
      color: 'neutral',
      icon: 'i-lucide-info'
    })
    return
  }
  saving.value = true
  error.value = null
  try {
    await adminService.publishListing(listingId.value)
    await loadListing()
    toast.add({ title: 'Published', description: 'This listing is now published.', color: 'success', icon: 'i-lucide-check-circle' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to publish listing'
    error.value = msg
    toast.add({ title: 'Publish failed', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    saving.value = false
  }
}

function openRejectModal() {
  rejectReasonInput.value = ''
  rejectModalOpen.value = true
}

function setRejectModalOpen(value: boolean) {
  rejectModalOpen.value = value
}

async function confirmRejectListing() {
  if (!listingId.value) return
  if (listing.value && !canAdminRejectListing(listing.value)) {
    rejectModalOpen.value = false
    toast.add({
      title: 'Cannot reject',
      description: 'Use reject when the listing is in pending review or published (not already rejected).',
      color: 'warning',
      icon: 'i-lucide-info'
    })
    return
  }
  saving.value = true
  error.value = null
  const reason = rejectReasonInput.value.trim()
  try {
    await adminService.rejectListing(listingId.value, reason ? { reason } : undefined)
    rejectModalOpen.value = false
    rejectReasonInput.value = ''
    await loadListing()
    toast.add({
      title: 'Rejected',
      description: reason ? 'Reason recorded.' : 'Listing rejected.',
      color: 'warning',
      icon: 'i-lucide-ban'
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to reject listing'
    error.value = msg
    toast.add({ title: 'Reject failed', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
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

watch(
  listingId,
  () => {
    loadListing()
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-full min-w-0 w-full overflow-x-hidden">
    <header
      class="sticky top-0 z-30 -mx-1 mb-6 rounded-2xl border border-gray-200/70 bg-white/90 px-3 py-4 shadow-sm shadow-gray-200/40 backdrop-blur-xl dark:border-gray-700/80 dark:bg-gray-950/85 dark:shadow-none sm:-mx-2 sm:px-5 sm:py-5"
    >
      <div class="flex flex-col gap-5">
        <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <NuxtLink
            to="/listings"
            class="flex w-fit shrink-0 items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-800 dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
          >
            <UIcon name="i-lucide-arrow-left" class="size-4" />
            All listings
          </NuxtLink>
          <div class="min-w-0 flex-1">
            <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              {{ listing ? String(displayName) : loading ? 'Loading…' : 'Listing' }}
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              <template v-if="listing && isListingSoftDeleted(listing)">
                Admin view of a soft-deleted listing (included in GET /admin/listings/:id).
              </template>
              <template v-else-if="listing && isListingPublished(listing)">
                Published — use Update to edit, Reject to send back to draft, or Publish is already applied.
              </template>
              <template v-else>
                Edit fields on the update page, then publish when this listing is ready to go live.
              </template>
            </p>
          </div>
        </div>

        <div
          v-if="listing"
          class="border-t border-gray-200/80 pt-4 dark:border-gray-700/80"
        >
          <div class="lb-detail-action-panel min-w-0">
            <p class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Actions
            </p>
            <div class="lb-detail-toolbar">
              <AppButton
                v-if="canAdminFullEditListing(listing)"
                type="button"
                color="primary"
                size="sm"
                class="lb-detail-action-btn lb-detail-action-btn--primary"
                @click="goToListingEdit"
              >
                <UIcon name="i-lucide-pencil" class="size-4 shrink-0" />
                Update listing
              </AppButton>
              <AppButton
                v-if="!isListingSoftDeleted(listing)"
                variant="outline"
                color="primary"
                size="sm"
                :disabled="isListingPublished(listing)"
                :loading="saving"
                class="lb-detail-action-btn"
                @click="publishListing"
              >
                <UIcon name="i-lucide-check" class="size-4 shrink-0" />
                {{ isListingPublished(listing) ? 'Published' : 'Publish' }}
              </AppButton>
              <AppButton
                v-if="canAdminRejectListing(listing)"
                variant="outline"
                color="error"
                size="sm"
                :loading="saving"
                class="lb-detail-action-btn"
                @click="openRejectModal"
              >
                <UIcon name="i-lucide-x" class="size-4 shrink-0" />
                Reject
              </AppButton>
              <span class="lb-detail-toolbar__divider" aria-hidden="true" />
              <AppButton
                variant="outline"
                color="neutral"
                size="sm"
                class="lb-detail-action-btn"
                @click="copyText('Listing ID', String(get(listing, 'id') ?? ''))"
              >
                <UIcon name="i-lucide-hash" class="size-4 shrink-0" />
                Copy listing ID
              </AppButton>
              <AppButton
                variant="outline"
                color="neutral"
                size="sm"
                class="lb-detail-action-btn"
                @click="copyPageLink"
              >
                <UIcon name="i-lucide-link" class="size-4 shrink-0" />
                Copy page link
              </AppButton>
            </div>
          </div>
        </div>
      </div>
    </header>

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
          color="neutral"
          size="sm"
          class="lb-detail-action-btn"
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

    <UModal
      :open="rejectModalOpen"
      title="Reject listing"
      :ui="adminModalUiCompact"
      @update:open="setRejectModalOpen"
    >
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            For <span class="font-mono text-xs">PENDING_REVIEW</span> or published listings. Calls
            <span class="font-mono text-xs">PATCH …/reject</span> — approval becomes
            <span class="font-mono text-xs">REJECTED</span> and the owner can revise. Optional reason for the lister.
          </p>
          <div class="space-y-2">
            <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Reason (optional)</label>
            <textarea
              v-model="rejectReasonInput"
              rows="3"
              placeholder="e.g. Incomplete documentation"
              class="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-inner placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
            />
          </div>
        </div>
      </template>
      <template #footer="{ close }">
        <div class="admin-btn-modal-footer">
          <AppButton
            variant="outline"
            color="neutral"
            size="sm"
            class="lb-modal-btn-cancel"
            :disabled="saving"
            @click="close()"
          >
            Cancel
          </AppButton>
          <AppButton
            color="error"
            size="sm"
            class="lb-modal-btn-submit"
            :loading="saving"
            @click="confirmRejectListing"
          >
            Confirm rejection
          </AppButton>
        </div>
      </template>
    </UModal>
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
