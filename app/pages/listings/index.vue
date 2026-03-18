<script setup lang="ts">
import { ref, computed, onMounted, watch, h, resolveComponent } from 'vue'
import { useListingsService, useAdminService } from '~/services/api'
import { get } from '~/utils/lodash'

definePageMeta({
  layout: 'admin',
  title: 'Listings'
})

const listingsService = useListingsService()
const adminService = useAdminService()

const listings = ref<Record<string, unknown>[]>([])
const metadata = ref<{ total: number; page: number; limit: number; totalPages: number } | null>(null)
const loading = ref(false)
const actionLoading = ref<string | null>(null)
const page = ref(1)
const limit = 10
const locationFilter = ref('')

function formatPrice(value: unknown): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString()}`
}

const columns = computed(() => [
  {
    id: 'listing',
    header: 'Listing',
    size: 240,
    cell: ({ row }) => {
      const url = get(row.original, 'thumbnailUrl')
      const title = get(row.original, 'title') ?? get(row.original, 'project.name') ?? 'Untitled'
      const id = get(row.original, 'id')
      const thumb = url
        ? h('img', { src: String(url), alt: '', class: 'size-10 shrink-0 rounded border border-gray-200 object-cover dark:border-gray-700' })
        : h('div', { class: 'flex size-10 shrink-0 items-center justify-center rounded border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800' }, [
          h(resolveComponent('UIcon'), { name: 'i-lucide-home', class: 'size-5 text-gray-400' })
        ])
      return h('div', { class: 'flex items-center gap-3' }, [
        thumb,
        h(
          resolveComponent('NuxtLink'),
          { to: `/listings/${id}`, class: 'font-medium text-gray-900 hover:underline dark:text-white' },
          () => title
        )
      ])
    }
  },
  { accessorKey: 'category', header: 'Category', size: 120 },
  { accessorKey: 'type', header: 'Type', size: 110 },
  { accessorKey: 'purpose', header: 'Purpose', size: 100 },
  {
    id: 'approvalStatus',
    header: 'Status',
    size: 110,
    cell: ({ row }) => {
      const status = get(row.original, 'approvalStatus') ?? get(row.original, 'status') as string
      const color = status === 'PUBLISHED' ? 'success' : status === 'REJECTED' ? 'error' : 'neutral'
      return h(resolveComponent('UBadge'), { color, size: 'xs' }, () => status ?? '—')
    }
  },
  {
    id: 'price',
    header: 'Price',
    size: 140,
    cell: ({ row }) => {
      const amount = get(row.original, 'amount') ?? get(row.original, 'price')
      const priceType = get(row.original, 'priceType')
      const billingPeriod = get(row.original, 'billingPeriod')
      if (!amount) return '—'
      const formatted = formatPrice(amount)
      if (priceType === 'RENT' && billingPeriod) {
        const period = String(billingPeriod).toLowerCase()
        return `${formatted}/${period}`
      }
      return formatted
    }
  },
  {
    id: 'location',
    header: 'Location',
    size: 120,
    cell: ({ row }) => {
      const city = get(row.original, 'city') ?? get(row.original, 'project.city')
      return city ?? '—'
    }
  },
  {
    id: 'actions',
    header: '',
    size: 140,
    cell: ({ row }) => {
      const id = get(row.original, 'id') as string
      const status = get(row.original, 'approvalStatus') ?? get(row.original, 'status') as string
      const isLoading = actionLoading.value === id
      return h('div', { class: 'flex flex-row flex-nowrap items-center justify-end gap-2 sm:gap-3' }, [
        h(
          resolveComponent('UButton'),
          {
            size: 'sm',
            variant: 'soft',
            icon: 'i-lucide-external-link',
            to: `/listings/${id}`,
            'aria-label': 'View',
            class: '!rounded-lg !px-3 !py-2.5 !font-medium transition-all hover:!shadow-md'
          }
        ),
        status !== 'PUBLISHED' && h(
          resolveComponent('UButton'),
          {
            size: 'sm',
            variant: 'soft',
            icon: 'i-lucide-check',
            loading: isLoading,
            'aria-label': 'Publish',
            class: '!rounded-lg !px-3 !py-2.5 !font-medium !text-emerald-700 dark:!text-emerald-400 transition-all hover:!shadow-md',
            onClick: () => publishListing(id)
          }
        ),
      ].filter(Boolean))
    }
  }
])

const searchParams = computed(() => {
  const params: Record<string, string | number> = { page: page.value, limit }
  const city = locationFilter.value.trim()
  if (city) params.city = city
  return params
})

async function loadListings() {
  loading.value = true
  try {
    const res = await listingsService.searchPublic(searchParams.value) as unknown
    const data = get(res, 'data') ?? res
    listings.value = get(data, 'listings') ?? get(res, 'listings') ?? []
    metadata.value = get(data, 'metadata') ?? get(res, 'metadata') ?? null
  } catch {
    listings.value = []
    metadata.value = null
  } finally {
    loading.value = false
  }
}

async function publishListing(id: string) {
  actionLoading.value = id
  try {
    await adminService.publishListing(id)
    await loadListings()
  } finally {
    actionLoading.value = null
  }
}

function onRowSelect(_e: Event, row: { original: Record<string, unknown> }) {
  const id = get(row.original, 'id')
  if (id) navigateTo(`/listings/${id}`)
}

function applyLocationFilter() {
  page.value = 1
  loadListings()
}

onMounted(loadListings)
watch([page], loadListings)
</script>

<template>
  <AppStack gap="xl">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <AppPageHeader
        title="Listings"
        description="Manage and moderate property listings"
      />
      <AppButton
        icon="i-lucide-plus"
        size="sm"
        class="w-full shrink-0 cursor-pointer sm:w-auto !rounded-xl !px-4 !py-2.5 !font-semibold !shadow-md !shadow-emerald-500/20 transition-all hover:!shadow-lg hover:!shadow-emerald-500/30"
      >
        Add Listing
      </AppButton>
    </div>

    <!-- Location filter -->
    <div class="rounded-xl border border-gray-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-gray-700/80 dark:bg-gray-900">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div class="flex min-w-0 flex-1 items-center gap-3 sm:max-w-[280px]">
          <UIcon name="i-lucide-map-pin" class="size-5 shrink-0 text-gray-500 dark:text-gray-400" />
          <UInput
            v-model="locationFilter"
            placeholder="Filter by city or location"
            class="min-w-0 flex-1"
            @keydown.enter="applyLocationFilter"
          />
        </div>
        <div class="flex flex-wrap items-center gap-3 sm:gap-4">
          <AppButton
            v-if="locationFilter"
            size="sm"
            variant="outline"
            class="!inline-flex min-h-8 cursor-pointer items-center justify-center gap-1.5 !rounded-md border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            @click="locationFilter = ''; page = 1; loadListings()"
          >
            <UIcon name="i-lucide-x" class="size-3.5 shrink-0" />
            <span>Clear</span>
          </AppButton>
          <AppButton
            size="sm"
            color="success"
            class="profile-btn-primary cursor-pointer"
            @click="applyLocationFilter"
          >
            <UIcon name="i-lucide-search" class="size-3.5 shrink-0" />
            <span>Apply</span>
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Table -->
    <AppCard :padding="false" class="mt-6 overflow-hidden sm:mt-8">
      <UCard :ui="{ root: 'overflow-x-auto', body: 'p-0' }">
        <UTable
          :data="listings"
          :columns="columns"
          :loading="loading"
          empty="No listings found."
          :on-select="onRowSelect"
        />
      </UCard>
      <div
        v-if="metadata && metadata.total > 0"
        class="flex flex-col items-center justify-between gap-4 border-t border-gray-200 px-4 py-4 dark:border-gray-800 sm:flex-row sm:gap-4"
      >
        <p class="order-2 text-center text-sm text-gray-500 dark:text-gray-400 sm:order-1 sm:text-left">
          Showing {{ (metadata.page - 1) * metadata.limit + 1 }}–{{ Math.min(metadata.page * metadata.limit, metadata.total) }} of {{ metadata.total }}
        </p>
        <div class="order-1 flex w-full justify-center gap-3 sm:order-2 sm:w-auto sm:justify-end">
          <UButton
            size="sm"
            variant="outline"
            icon="i-lucide-chevron-left"
            :disabled="metadata.page <= 1"
            class="!rounded-xl !cursor-pointer !px-4 !py-2.5 !font-semibold transition-all hover:!shadow-md disabled:!cursor-not-allowed disabled:opacity-50"
            @click="page = Math.max(1, metadata.page - 1)"
          >
            Previous
          </UButton>
          <UButton
            size="sm"
            variant="outline"
            trailing-icon="i-lucide-chevron-right"
            :disabled="metadata.page >= metadata.totalPages"
            class="!rounded-xl !cursor-pointer !px-4 !py-2.5 !font-semibold transition-all hover:!shadow-md disabled:!cursor-not-allowed disabled:opacity-50"
            @click="page = Math.min(metadata.totalPages, metadata.page + 1)"
          >
            Next
          </UButton>
        </div>
      </div>
    </AppCard>
  </AppStack>
</template>
