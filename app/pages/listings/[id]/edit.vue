<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import AppButton from '~/components/ui/AppButton.vue'
import { useListingsService, useAdminService } from '~/services/api'
import { get } from '~/utils/lodash'
import { extractListings } from '~/utils/api-extract'
import { isListingSoftDeleted } from '~/utils/listing-admin'

definePageMeta({
  layout: 'admin',
  title: 'Update listing',
  description: 'Admin: edit listing fields (PATCH /admin/listings/:id)',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const listingsService = useListingsService()
const adminService = useAdminService()

const listingId = computed(() => {
  const raw = route.params.id
  const s = Array.isArray(raw) ? raw[0] : raw
  return s != null && String(s) !== '' ? String(s) : ''
})
const listing = ref<Record<string, unknown> | null>(null)
const loading = ref(true)
const saving = ref(false)
const loadError = ref<string | null>(null)

const form = ref({
  title: '',
  slug: '',
  description: '',
  thumbnailUrl: '',
  purpose: '',
  category: '',
  type: '',
  subType: '',
  subCategory: '',
  bhk: '',
  bedrooms: '',
  bathrooms: '',
  balconies: '',
  bedsPerRoom: '',
  totalUnits: '',
  priceType: '',
  amount: '',
  currency: '',
  pricingBasis: '',
  billingPeriod: '',
  negotiable: false,
  areaValue: '',
  areaUnit: '',
  areaType: '',
  country: '',
  state: '',
  city: '',
  locality: '',
  pincode: '',
  fullAddress: '',
  latitude: '',
  longitude: '',
  amenitiesText: '',
  highlightTagsText: '',
  isActive: true,
  isFeatured: false,
})

const categoryOptions = [
  { label: 'Residential', value: 'RESIDENTIAL' },
  { label: 'Commercial', value: 'COMMERCIAL' },
  { label: 'Industrial', value: 'INDUSTRIAL' },
  { label: 'Land', value: 'LAND' },
]

const typeOptions = [
  { label: 'Apartment', value: 'APARTMENT' },
  { label: 'Villa', value: 'VILLA' },
  { label: 'House', value: 'HOUSE' },
  { label: 'Plot', value: 'PLOT' },
  { label: 'Studio', value: 'STUDIO' },
  { label: 'PG', value: 'PG' },
  { label: 'Room', value: 'ROOM' },
]

const purposeOptions = [
  { label: 'Sale', value: 'SALE' },
  { label: 'Rent', value: 'RENT' },
]

const priceTypeOptions = [
  { label: 'Sale', value: 'SALE' },
  { label: 'Rent', value: 'RENT' },
]

const pricingBasisOptions = [
  { label: 'Full property', value: 'FULL_PROPERTY' },
  { label: 'Per unit', value: 'PER_UNIT' },
  { label: 'Per room', value: 'PER_ROOM' },
  { label: 'Per bed', value: 'PER_BED' },
  { label: 'Per sq ft', value: 'PER_SQFT' },
]

const billingPeriodOptions = [
  { label: 'Day', value: 'DAY' },
  { label: 'Week', value: 'WEEK' },
  { label: 'Month', value: 'MONTH' },
  { label: 'Year', value: 'YEAR' },
]

const areaTypeOptions = [
  { label: 'Metro', value: 'METRO' },
  { label: 'Non-metro', value: 'NON_METRO' },
]

function formatApiLabel(raw: string): string {
  return String(raw)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

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
    return list.find((l) => String(get(l, 'id')) === id) ?? null
  } catch {
    return null
  }
}

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function numStr(v: unknown): string {
  if (v == null || v === '') return ''
  const n = Number(v)
  return Number.isFinite(n) ? String(n) : ''
}

function arrToText(a: unknown): string {
  if (!Array.isArray(a)) return ''
  return a.map((x) => String(x).trim()).filter(Boolean).join(', ')
}

function normalizeEnum(raw: string, allowed: string[]): string {
  const t = raw.trim()
  if (!t) return ''
  const u = t.toUpperCase().replace(/\s+/g, '_')
  if (allowed.includes(t)) return t
  if (allowed.includes(u)) return u
  return t
}

function fillFormFromListing(l: Record<string, unknown>) {
  const cat = str(get(l, 'category'))
  const pur = str(get(l, 'purpose'))
  const pt = str(get(l, 'priceType'))
  const pb = str(get(l, 'pricingBasis'))
  const bp = str(get(l, 'billingPeriod'))
  const at = str(get(l, 'areaType'))
  const rawType = str(get(l, 'type'))
  const rawSub = str(get(l, 'subType'))

  form.value = {
    title: str(get(l, 'title') ?? get(l, 'project.name')),
    slug: str(get(l, 'slug')),
    description: str(get(l, 'description')),
    thumbnailUrl: str(get(l, 'thumbnailUrl')),
    purpose: normalizeEnum(pur, purposeOptions.map((o) => o.value)),
    category: normalizeEnum(cat, categoryOptions.map((o) => o.value)),
    type: rawType || rawSub,
    subType: rawSub,
    subCategory: str(get(l, 'subCategory')),
    bhk: str(get(l, 'bhk')),
    bedrooms: numStr(get(l, 'bedrooms')),
    bathrooms: numStr(get(l, 'bathrooms')),
    balconies: numStr(get(l, 'balconies')),
    bedsPerRoom: numStr(get(l, 'bedsPerRoom')),
    totalUnits: numStr(get(l, 'totalUnits')),
    priceType: normalizeEnum(pt, priceTypeOptions.map((o) => o.value)),
    amount: numStr(get(l, 'amount') ?? get(l, 'price')),
    currency: str(get(l, 'currency')),
    pricingBasis: normalizeEnum(pb, pricingBasisOptions.map((o) => o.value)),
    billingPeriod: normalizeEnum(bp, billingPeriodOptions.map((o) => o.value)),
    negotiable: Boolean(get(l, 'negotiable')),
    areaValue: numStr(get(l, 'areaValue') ?? get(l, 'area')),
    areaUnit: str(get(l, 'areaUnit')),
    areaType: normalizeEnum(at, areaTypeOptions.map((o) => o.value)),
    country: str(get(l, 'country')),
    state: str(get(l, 'state')),
    city: str(get(l, 'city')),
    locality: str(get(l, 'locality')),
    pincode: str(get(l, 'pincode')),
    fullAddress: str(get(l, 'fullAddress')),
    latitude: numStr(get(l, 'latitude')),
    longitude: numStr(get(l, 'longitude')),
    amenitiesText: arrToText(get(l, 'amenities')),
    highlightTagsText: arrToText(get(l, 'highlightTags')),
    isActive: get(l, 'isActive') !== false,
    isFeatured: Boolean(get(l, 'isFeatured')),
  }
}

function injectUnknown(
  current: string,
  base: { label: string; value: string }[],
): { label: string; value: string }[] {
  const v = current.trim()
  if (v && !base.some((o) => o.value === v)) {
    return [{ label: `${formatApiLabel(v)} (current)`, value: v }, ...base]
  }
  return base
}

const categorySelectItems = computed(() => injectUnknown(form.value.category, categoryOptions))
const typeSelectItems = computed(() => injectUnknown(form.value.type, typeOptions))
const purposeSelectItems = computed(() => injectUnknown(form.value.purpose, purposeOptions))
const priceTypeSelectItems = computed(() => injectUnknown(form.value.priceType, priceTypeOptions))
const pricingBasisSelectItems = computed(() => injectUnknown(form.value.pricingBasis, pricingBasisOptions))
const billingPeriodSelectItems = computed(() => injectUnknown(form.value.billingPeriod, billingPeriodOptions))
const areaTypeSelectItems = computed(() => injectUnknown(form.value.areaType, areaTypeOptions))

const formLocked = computed(() => Boolean(listing.value) && isListingSoftDeleted(listing.value))

async function loadListing() {
  if (!listingId.value) return
  loading.value = true
  loadError.value = null
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
    if (listing.value) {
      fillFormFromListing(listing.value)
    } else {
      loadError.value = 'Listing not found'
    }
  } catch {
    listing.value = await findListingInAdminList(listingId.value)
    if (listing.value) {
      fillFormFromListing(listing.value)
    } else {
      loadError.value = 'Failed to load listing'
    }
  } finally {
    loading.value = false
  }
}

function optStr(s: string): string | undefined {
  const t = s.trim()
  return t === '' ? undefined : t
}

function optNum(s: string): number | undefined {
  const t = s.trim()
  if (t === '') return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

function splitList(s: string): string[] {
  return s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean)
}

function buildPatchBody(): Record<string, unknown> {
  const f = form.value
  const body: Record<string, unknown> = {}
  const set = (key: string, val: unknown) => {
    if (val !== undefined) body[key] = val
  }
  set('title', optStr(f.title))
  set('slug', optStr(f.slug))
  set('description', optStr(f.description))
  set('thumbnailUrl', optStr(f.thumbnailUrl))
  set('purpose', optStr(f.purpose))
  set('category', optStr(f.category))
  set('type', optStr(f.type))
  set('subType', optStr(f.subType))
  set('subCategory', optStr(f.subCategory))
  set('bhk', optStr(f.bhk))
  set('bedrooms', optNum(f.bedrooms))
  set('bathrooms', optNum(f.bathrooms))
  set('balconies', optNum(f.balconies))
  set('bedsPerRoom', optNum(f.bedsPerRoom))
  set('totalUnits', optNum(f.totalUnits))
  set('priceType', optStr(f.priceType))
  set('amount', optNum(f.amount))
  set('currency', optStr(f.currency))
  set('pricingBasis', optStr(f.pricingBasis))
  set('billingPeriod', optStr(f.billingPeriod))
  body.negotiable = f.negotiable
  set('areaValue', optNum(f.areaValue))
  set('areaUnit', optStr(f.areaUnit))
  set('areaType', optStr(f.areaType))
  set('country', optStr(f.country))
  set('state', optStr(f.state))
  set('city', optStr(f.city))
  set('locality', optStr(f.locality))
  set('pincode', optStr(f.pincode))
  set('fullAddress', optStr(f.fullAddress))
  set('latitude', optNum(f.latitude))
  set('longitude', optNum(f.longitude))
  const am = splitList(f.amenitiesText)
  const tags = splitList(f.highlightTagsText)
  if (am.length) body.amenities = am
  if (tags.length) body.highlightTags = tags
  body.isActive = f.isActive
  body.isFeatured = f.isFeatured
  return body
}

async function save() {
  if (!listingId.value || !form.value.title.trim()) return
  if (listing.value && isListingSoftDeleted(listing.value)) {
    toast.add({
      title: 'Cannot save',
      description: 'This listing was removed.',
      color: 'warning',
      icon: 'i-lucide-lock',
    })
    return
  }
  saving.value = true
  try {
    const body = buildPatchBody()
    const res = await adminService.updateListing(listingId.value, body)
    const updated = extractListing(res)
    if (updated && get(updated, 'id')) {
      listing.value = { ...(listing.value ?? {}), ...updated } as Record<string, unknown>
      fillFormFromListing(listing.value)
    } else {
      await loadListing()
    }
    toast.add({
      title: 'Saved',
      description: 'Listing updated.',
      color: 'success',
      icon: 'i-lucide-check',
    })
    await router.push(`/listings/${listingId.value}`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Update failed'
    toast.add({ title: 'Update failed', description: msg, color: 'error', icon: 'i-lucide-alert-circle' })
  } finally {
    saving.value = false
  }
}

watch(
  listingId,
  () => {
    loadListing()
  },
  { immediate: true },
)
</script>

<template>
  <div class="min-h-full min-w-0 w-full overflow-x-hidden pb-10">
    <header
      class="sticky top-0 z-30 -mx-1 mb-6 rounded-2xl border border-gray-200/70 bg-white/90 px-3 py-4 shadow-sm shadow-gray-200/40 backdrop-blur-xl dark:border-gray-700/80 dark:bg-gray-950/85 dark:shadow-none sm:-mx-2 sm:px-5 sm:py-5"
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <NuxtLink
            :to="`/listings/${listingId}`"
            class="flex w-fit shrink-0 items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-emerald-200 hover:bg-emerald-50/50 hover:text-emerald-800 dark:border-gray-600 dark:bg-gray-800/90 dark:text-gray-200 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
          >
            <UIcon name="i-lucide-arrow-left" class="size-4" />
            Back to listing
          </NuxtLink>
          <div class="min-w-0">
            <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              Update listing
            </h1>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Loads via GET <span class="font-mono text-xs">/admin/listings/:id</span>, saves with
              <span class="font-mono text-xs">PATCH /admin/listings/:id</span> (including published listings).
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <AppButton variant="outline" color="neutral" size="sm" class="rounded-xl" :to="`/listings/${listingId}`">
            Cancel
          </AppButton>
          <AppButton
            color="primary"
            size="sm"
            icon="i-lucide-save"
            class="rounded-xl shadow-md shadow-emerald-600/20"
            :loading="saving"
            :disabled="!form.title.trim() || loading || formLocked"
            @click="save"
          >
            Save changes
          </AppButton>
        </div>
      </div>
    </header>

    <div
      v-if="loading"
      class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200/80 bg-white/80 py-16 dark:border-gray-700/80 dark:bg-gray-900/80"
    >
      <div class="h-12 w-12 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-500 dark:border-gray-700" />
      <p class="text-sm text-gray-500 dark:text-gray-400">Loading listing…</p>
    </div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-red-200/80 bg-red-50/90 px-4 py-6 text-center dark:border-red-900/50 dark:bg-red-950/30"
    >
      <p class="font-medium text-red-800 dark:text-red-300">{{ loadError }}</p>
      <AppButton variant="outline" color="neutral" size="sm" class="mt-4" to="/listings">
        Back to listings
      </AppButton>
    </div>

    <div v-else class="space-y-6">
      <div
        v-if="formLocked"
        class="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100"
      >
        <p class="font-medium">This listing was removed (soft-deleted).</p>
        <p class="mt-1 text-amber-900/90 dark:text-amber-200/90">
          Saving is disabled. Data is still visible from the admin GET response.
        </p>
      </div>
      <fieldset
        class="min-w-0 space-y-6 border-0 p-0"
        :disabled="formLocked"
      >
      <section
        class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900"
      >
        <div
          class="border-b border-gray-100 bg-gradient-to-r from-gray-50/90 to-transparent px-4 py-3 dark:border-gray-800 dark:from-gray-800/40 sm:px-5"
        >
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Basics</h2>
          <p class="text-xs text-gray-500 dark:text-gray-400">Title, slug, description, thumbnail</p>
        </div>
        <div class="grid gap-4 p-4 sm:grid-cols-2 sm:gap-5 sm:p-5">
          <div class="sm:col-span-2 space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Title *</label>
            <input
              v-model="form.title"
              type="text"
              class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white"
            >
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Slug</label>
            <input
              v-model="form.slug"
              type="text"
              class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white"
            >
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Thumbnail URL</label>
            <input
              v-model="form.thumbnailUrl"
              type="url"
              class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white"
            >
          </div>
          <div class="sm:col-span-2 space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</label>
            <textarea
              v-model="form.description"
              rows="5"
              class="w-full resize-y rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white"
            />
          </div>
        </div>
      </section>

      <section
        class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900"
      >
        <div
          class="border-b border-gray-100 bg-gradient-to-r from-emerald-50/50 to-transparent px-4 py-3 dark:border-gray-800 dark:from-emerald-950/20 sm:px-5"
        >
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Property classification</h2>
        </div>
        <div class="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 sm:p-5">
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Category</label>
            <USelect v-model="form.category" :items="categorySelectItems" :disabled="formLocked" size="md" class="relative z-[1] w-full rounded-xl" />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Type</label>
            <USelect v-model="form.type" :items="typeSelectItems" :disabled="formLocked" size="md" class="relative z-[1] w-full rounded-xl" />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Purpose</label>
            <USelect v-model="form.purpose" :items="purposeSelectItems" :disabled="formLocked" size="md" class="relative z-[1] w-full rounded-xl" />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sub type</label>
            <input
              v-model="form.subType"
              type="text"
              class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white"
            >
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Sub category</label>
            <input
              v-model="form.subCategory"
              type="text"
              class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white"
            >
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">BHK</label>
            <input
              v-model="form.bhk"
              type="text"
              class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white"
            >
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Bedrooms</label>
            <input v-model="form.bedrooms" type="text" inputmode="decimal" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Bathrooms</label>
            <input v-model="form.bathrooms" type="text" inputmode="decimal" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Balconies</label>
            <input v-model="form.balconies" type="text" inputmode="decimal" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Beds / room</label>
            <input v-model="form.bedsPerRoom" type="text" inputmode="decimal" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Total units</label>
            <input v-model="form.totalUnits" type="text" inputmode="decimal" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
        </div>
      </section>

      <section
        class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900"
      >
        <div class="border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Price</h2>
        </div>
        <div class="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 sm:p-5">
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Price type</label>
            <USelect v-model="form.priceType" :items="priceTypeSelectItems" :disabled="formLocked" size="md" class="relative z-[1] w-full rounded-xl" />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Amount</label>
            <input v-model="form.amount" type="text" inputmode="decimal" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Currency</label>
            <input v-model="form.currency" type="text" placeholder="INR" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pricing basis</label>
            <USelect v-model="form.pricingBasis" :items="pricingBasisSelectItems" :disabled="formLocked" size="md" class="relative z-[1] w-full rounded-xl" />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Billing period</label>
            <USelect v-model="form.billingPeriod" :items="billingPeriodSelectItems" :disabled="formLocked" size="md" class="relative z-[1] w-full rounded-xl" />
          </div>
          <div class="flex items-end pb-1">
            <label class="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
              <input v-model="form.negotiable" type="checkbox" class="size-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500">
              Negotiable
            </label>
          </div>
        </div>
      </section>

      <section
        class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900"
      >
        <div class="border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Area</h2>
        </div>
        <div class="grid gap-4 p-4 sm:grid-cols-3 sm:gap-5 sm:p-5">
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Area value</label>
            <input v-model="form.areaValue" type="text" inputmode="decimal" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Area unit</label>
            <input v-model="form.areaUnit" type="text" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Area type</label>
            <USelect v-model="form.areaType" :items="areaTypeSelectItems" :disabled="formLocked" size="md" class="relative z-[1] w-full rounded-xl" />
          </div>
        </div>
      </section>

      <section
        class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900"
      >
        <div class="border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Location</h2>
        </div>
        <div class="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5 sm:p-5">
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Country</label>
            <input v-model="form.country" type="text" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">State</label>
            <input v-model="form.state" type="text" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">City</label>
            <input v-model="form.city" type="text" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Locality</label>
            <input v-model="form.locality" type="text" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Pincode</label>
            <input v-model="form.pincode" type="text" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="sm:col-span-2 lg:col-span-3 space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Full address</label>
            <textarea v-model="form.fullAddress" rows="2" class="w-full resize-y rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white" />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Latitude</label>
            <input v-model="form.latitude" type="text" inputmode="decimal" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Longitude</label>
            <input v-model="form.longitude" type="text" inputmode="decimal" class="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white">
          </div>
        </div>
      </section>

      <section
        class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900"
      >
        <div class="border-b border-gray-100 px-4 py-3 dark:border-gray-800 sm:px-5">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Amenities &amp; visibility</h2>
        </div>
        <div class="space-y-4 p-4 sm:p-5">
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Amenities</label>
            <textarea
              v-model="form.amenitiesText"
              rows="3"
              placeholder="Comma or newline separated"
              class="w-full resize-y rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white"
            />
          </div>
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Highlight tags</label>
            <textarea
              v-model="form.highlightTagsText"
              rows="2"
              placeholder="Comma or newline separated"
              class="w-full resize-y rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-3 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-950/80 dark:text-white"
            />
          </div>
          <div class="flex flex-wrap gap-6">
            <label class="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
              <input v-model="form.isActive" type="checkbox" class="size-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500">
              Active
            </label>
            <label class="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
              <input v-model="form.isFeatured" type="checkbox" class="size-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500">
              Featured
            </label>
          </div>
        </div>
      </section>

      </fieldset>

      <div class="flex flex-wrap justify-end gap-2 border-t border-gray-200/80 pt-6 dark:border-gray-700">
        <AppButton variant="outline" color="neutral" size="sm" class="rounded-xl" :to="`/listings/${listingId}`">
          Cancel
        </AppButton>
        <AppButton
          color="primary"
          size="sm"
          icon="i-lucide-save"
          class="rounded-xl"
          :loading="saving"
          :disabled="!form.title.trim() || formLocked"
          @click="save"
        >
          Save changes
        </AppButton>
      </div>
    </div>
  </div>
</template>
