<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useClipboard } from '@vueuse/core'
import UBadge from '@nuxt/ui/components/Badge.vue'
import AppButton from '~/components/ui/AppButton.vue'
import { useAdminService } from '~/services/api'
import { get } from '~/utils/lodash'
import { adminModalUiCompact, adminModalUiMedia } from '~/utils/admin-modal-ui'

definePageMeta({
  layout: 'admin',
  title: 'Partner details',
  description: 'View and manage partner profile'
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
const adminService = useAdminService()
const { copy } = useClipboard()

/** Must match key in `partners/index.vue` */
const selectedPartnerFromList = useState<Record<string, unknown> | null>(
  'admin-partners-selected-profile',
  () => null
)

const profileId = computed(() => String(route.params.id ?? ''))

const profile = ref<Record<string, unknown> | null>(null)

watch(
  () => [profileId.value, selectedPartnerFromList.value] as const,
  ([id, fromList]) => {
    if (!id || !fromList || String(fromList.id ?? '').trim() !== id.trim()) {
      profile.value = null
      return
    }
    profile.value = { ...fromList }
  },
  { immediate: true }
)

function syncStateFromProfile() {
  if (profile.value) {
    selectedPartnerFromList.value = { ...profile.value }
  }
}

function pickStr(p: Record<string, unknown> | null, ...keys: string[]): string {
  if (!p) return ''
  for (const k of keys) {
    const v = get(p, k)
    if (v != null && String(v).trim() !== '') return String(v).trim()
  }
  return ''
}

/** Merge PATCH response into local profile (handles common API shapes). */
function applyUpdateResponse(res: unknown) {
  if (!profile.value) return
  const raw = res as Record<string, unknown>
  if (!raw || typeof raw !== 'object') return
  const inner =
    (get(raw, 'data') as Record<string, unknown> | undefined) ??
    (get(raw, 'profile') as Record<string, unknown> | undefined) ??
    raw
  if (inner && typeof inner === 'object' && !Array.isArray(inner) && 'id' in inner) {
    profile.value = { ...profile.value, ...inner }
  } else if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
    profile.value = { ...profile.value, ...inner }
  }
  syncStateFromProfile()
}

const coverUrl = computed(() => pickStr(profile.value, 'coverImageUrl', 'coverUrl', 'coverImage', 'bannerUrl', 'headerImageUrl'))

const avatarUrl = computed(() =>
  pickStr(profile.value, 'profileImageUrl', 'profileImage', 'logoUrl', 'logo', 'avatarUrl', 'businessLogoUrl')
)

const approvalStatus = computed(() => String(get(profile.value, 'approvalStatus') ?? '—'))

const fieldDefs: { key: string; label: string }[] = [
  { key: 'accountType', label: 'Account type' },
  { key: 'reraNumber', label: 'RERA number' },
  { key: 'businessEmail', label: 'Business email' },
  { key: 'businessPhone', label: 'Business phone' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'pincode', label: 'PIN code' },
  { key: 'address', label: 'Address' },
  { key: 'country', label: 'Country' },
  { key: 'website', label: 'Website' },
  { key: 'userId', label: 'User ID' },
  { key: 'createdAt', label: 'Created' },
  { key: 'updatedAt', label: 'Updated' },
  { key: 'rejectionReason', label: 'Rejection reason' },
  { key: 'approvedAt', label: 'Approved at' },
  { key: 'rejectedAt', label: 'Rejected at' }
]

const mediaKeys = new Set([
  'coverImageUrl',
  'coverUrl',
  'coverImage',
  'bannerUrl',
  'headerImageUrl',
  'profileImageUrl',
  'profileImage',
  'logoUrl',
  'logo',
  'avatarUrl',
  'businessLogoUrl'
])

/** Profile keys that hold documents or file URLs — hidden from “Additional fields” JSON. */
const DOCUMENT_ROOT_KEYS = [
  'documents',
  'kycDocuments',
  'attachments',
  'files',
  'uploadedDocuments',
  'businessDocuments',
  'verificationDocuments',
  'partnerDocuments',
  'verificationDocs',
  'mediaFiles'
] as const

const DOCUMENT_SCALAR_URL_KEYS = [
  'reraCertificateUrl',
  'reraDocumentUrl',
  'panDocumentUrl',
  'gstCertificateUrl',
  'aadharDocumentUrl',
  'aadhaarDocumentUrl',
  'incorporationCertificateUrl',
  'businessProofUrl',
  'certificateUrl',
  'licenseDocumentUrl',
  'addressProofUrl',
  'idProofUrl',
  'gstDocumentUrl',
  'companyRegistrationUrl'
] as const

type PartnerDocItem = {
  id: string
  url: string
  label: string
  kind: 'image' | 'pdf' | 'video' | 'other'
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()
}

function looksLikeHttpUrl(s: string): boolean {
  const t = s.trim()
  return /^https?:\/\//i.test(t) || t.startsWith('blob:') || (t.startsWith('/') && t.length > 2)
}

function guessDocKind(url: string, mime?: string): PartnerDocItem['kind'] {
  const m = (mime || '').toLowerCase()
  if (m.startsWith('image/')) return 'image'
  if (m === 'application/pdf' || m.includes('pdf')) return 'pdf'
  if (m.startsWith('video/')) return 'video'
  const path = (url.split('?')[0] ?? url).toLowerCase()
  if (/\.(png|jpe?g|gif|webp|svg|avif|bmp)(\W|$)/i.test(path)) return 'image'
  if (/\.pdf(\W|$)/i.test(path)) return 'pdf'
  if (/\.(mp4|webm|mov|mkv)(\W|$)/i.test(path)) return 'video'
  return 'other'
}

function docFromUnknown(raw: unknown, index: number, groupLabel: string): PartnerDocItem | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const u = raw.trim()
    if (!looksLikeHttpUrl(u)) return null
    return {
      id: `${groupLabel}-${index}-${u.slice(-24)}`,
      url: u,
      label: `${groupLabel} ${index + 1}`,
      kind: guessDocKind(u)
    }
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const url = pickStr(
    o as Record<string, unknown>,
    'url',
    'fileUrl',
    'documentUrl',
    'href',
    'path',
    'src',
    'publicUrl',
    'signedUrl',
    'downloadUrl',
    'file',
    'link'
  )
  if (!url || !looksLikeHttpUrl(url)) return null
  const mime = String(o.mimeType ?? o.contentType ?? o.mime ?? '')
  const label = String(
    o.name ?? o.title ?? o.documentType ?? o.type ?? o.label ?? o.category ?? `${groupLabel} ${index + 1}`
  ).slice(0, 96)
  return {
    id: String(o.id ?? `${groupLabel}-${index}-${url.slice(-20)}`),
    url,
    label: label || `${groupLabel} ${index + 1}`,
    kind: guessDocKind(url, mime)
  }
}

function extractPartnerDocuments(p: Record<string, unknown> | null): PartnerDocItem[] {
  if (!p) return []
  const out: PartnerDocItem[] = []
  const seen = new Set<string>()
  const add = (d: PartnerDocItem) => {
    if (seen.has(d.url)) return
    seen.add(d.url)
    out.push(d)
  }

  for (const key of DOCUMENT_ROOT_KEYS) {
    const val = p[key]
    const label = humanizeKey(key)
    if (Array.isArray(val)) {
      val.forEach((item, i) => {
        const d = docFromUnknown(item, i, label)
        if (d) add(d)
      })
    } else {
      const d = docFromUnknown(val, 0, label)
      if (d) add(d)
    }
  }

  for (const key of DOCUMENT_SCALAR_URL_KEYS) {
    const u = pickStr(p, key)
    if (u && looksLikeHttpUrl(u)) {
      add({
        id: key,
        url: u,
        label: humanizeKey(key.replace(/Url$/i, '').replace(/Document$/i, ' document')),
        kind: guessDocKind(u)
      })
    }
  }

  const nestedDocFields = ['reraDocument', 'addressProof', 'idProof', 'businessProof', 'gstDocument', 'panDocument'] as const
  for (const key of nestedDocFields) {
    const d = docFromUnknown(p[key], 0, humanizeKey(key))
    if (d) add(d)
  }

  return out
}

const documentItems = computed(() => extractPartnerDocuments(profile.value))

const docFilter = ref<'all' | PartnerDocItem['kind']>('all')

const docCounts = computed(() => {
  const all = documentItems.value
  return {
    all: all.length,
    image: all.filter((d) => d.kind === 'image').length,
    pdf: all.filter((d) => d.kind === 'pdf').length,
    video: all.filter((d) => d.kind === 'video').length,
    other: all.filter((d) => d.kind === 'other').length
  }
})

const filteredDocumentItems = computed(() => {
  const all = documentItems.value
  const f = docFilter.value
  if (f === 'all') return all
  return all.filter((d) => d.kind === f)
})

const previewOpen = ref(false)
const previewIndex = ref(0)

const previewDoc = computed(() => documentItems.value[previewIndex.value] ?? null)

function openDocumentPreview(index: number) {
  previewIndex.value = index
  previewOpen.value = true
}

function openDocumentPreviewByDoc(doc: PartnerDocItem) {
  const i = documentItems.value.findIndex((d) => d.id === doc.id)
  previewIndex.value = i >= 0 ? i : 0
  previewOpen.value = true
}

function closeDocumentPreview() {
  previewOpen.value = false
}

function previewNext() {
  const n = documentItems.value.length
  if (n <= 0) return
  previewIndex.value = (previewIndex.value + 1) % n
}

function previewPrev() {
  const n = documentItems.value.length
  if (n <= 0) return
  previewIndex.value = (previewIndex.value - 1 + n) % n
}

const brokenThumbUrls = ref<Set<string>>(new Set())

function onThumbError(url: string) {
  const next = new Set(brokenThumbUrls.value)
  next.add(url)
  brokenThumbUrls.value = next
}

function openInNewTab(url: string) {
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer')
}

function copyText(label: string, text: string) {
  const t = text.trim()
  if (!t) return
  copy(t)
  toast.add({
    title: 'Copied',
    description: label,
    color: 'success',
    icon: 'i-lucide-copy-check'
  })
}

function copyPartnerPageLink() {
  if (typeof window === 'undefined') return
  copy(`${window.location.origin}${route.fullPath}`)
  toast.add({
    title: 'Link copied',
    description: 'Share this URL to open this partner in the admin.',
    color: 'success',
    icon: 'i-lucide-link'
  })
}

const mapSearchQuery = computed(() => {
  const p = profile.value
  if (!p) return ''
  return [get(p, 'address'), get(p, 'city'), get(p, 'state'), get(p, 'pincode'), get(p, 'country')]
    .filter(Boolean)
    .map(String)
    .join(', ')
})

const mapsUrl = computed(() => {
  const q = mapSearchQuery.value.trim()
  if (!q) return ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
})

const websiteHref = computed(() => {
  const w = String(get(profile.value, 'website') ?? '').trim()
  if (!w) return ''
  return w.startsWith('http') ? w : `https://${w}`
})

function onPreviewKeydown(e: KeyboardEvent) {
  if (!previewOpen.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    previewOpen.value = false
  }
  if (documentItems.value.length <= 1) return
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    previewNext()
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    previewPrev()
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') window.addEventListener('keydown', onPreviewKeydown)
})

onUnmounted(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onPreviewKeydown)
})

watch(profileId, () => {
  docFilter.value = 'all'
})

function formatValue(key: string, value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)
  const s = String(value)
  if (/At$/i.test(key) || key === 'createdAt' || key === 'updatedAt') {
    try {
      const d = new Date(s)
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }
    } catch {
      /* fall through */
    }
  }
  return s
}

function badgeColor(status: string) {
  if (status === 'APPROVED') return 'success'
  if (status === 'REJECTED') return 'error'
  if (status === 'PENDING') return 'warning'
  return 'neutral'
}

const readOnlyRows = computed(() => {
  const p = profile.value
  if (!p) return []
  const rows: { key: string; label: string; value: string }[] = []
  for (const { key, label } of fieldDefs) {
    const raw = get(p, key)
    if (raw === undefined || raw === null || raw === '') continue
    rows.push({ key, label, value: formatValue(key, raw) })
  }
  return rows
})

const shownDetailKeys = computed(
  () =>
    new Set([
      ...fieldDefs.map((f) => f.key),
      'businessName',
      'tagline',
      'description',
      'approvalStatus',
      ...mediaKeys,
      ...DOCUMENT_ROOT_KEYS,
      ...DOCUMENT_SCALAR_URL_KEYS,
      'reraDocument',
      'addressProof',
      'idProof',
      'businessProof',
      'gstDocument',
      'panDocument'
    ])
)

const extraRows = computed(() => {
  const p = profile.value
  if (!p) return []
  const rows: { label: string; value: string }[] = []
  const keys = Object.keys(p).filter((k) => !shownDetailKeys.value.has(k) && !k.startsWith('_'))
  keys.sort()
  for (const key of keys) {
    const raw = p[key]
    if (raw === undefined || raw === null || raw === '') continue
    let val: string
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      val = JSON.stringify(raw)
    } else if (Array.isArray(raw)) {
      val = raw.map(String).join(', ')
    } else {
      val = formatValue(key, raw)
    }
    if (val === '—' || val === '{}') continue
    rows.push({
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim(),
      value: val
    })
  }
  return rows
})

const displayTitle = computed(() => {
  const p = profile.value
  if (!p) return 'Partner details'
  return String(get(p, 'businessName') ?? 'Partner')
})

const taglineDisplay = computed(() => String(get(profile.value, 'tagline') ?? ''))

const descriptionDisplay = computed(() => String(get(profile.value, 'description') ?? ''))

function goBack() {
  router.push('/partners')
}

/* ─── Edit form ─── */
const editing = ref(false)
const saveLoading = ref(false)

const editForm = ref({
  businessName: '',
  tagline: '',
  businessEmail: '',
  businessPhone: '',
  city: '',
  state: '',
  pincode: '',
  address: '',
  country: '',
  website: '',
  description: '',
  reraNumber: '',
  coverImageUrl: '',
  profileImageUrl: ''
})

function fillEditForm() {
  const p = profile.value
  if (!p) return
  editForm.value = {
    businessName: String(get(p, 'businessName') ?? ''),
    tagline: String(get(p, 'tagline') ?? ''),
    businessEmail: String(get(p, 'businessEmail') ?? ''),
    businessPhone: String(get(p, 'businessPhone') ?? ''),
    city: String(get(p, 'city') ?? ''),
    state: String(get(p, 'state') ?? ''),
    pincode: String(get(p, 'pincode') ?? ''),
    address: String(get(p, 'address') ?? ''),
    country: String(get(p, 'country') ?? ''),
    website: String(get(p, 'website') ?? ''),
    description: String(get(p, 'description') ?? ''),
    reraNumber: String(get(p, 'reraNumber') ?? ''),
    coverImageUrl: pickStr(p, 'coverImageUrl', 'coverUrl', 'coverImage', 'bannerUrl'),
    profileImageUrl: pickStr(p, 'profileImageUrl', 'profileImage', 'logoUrl', 'logo', 'avatarUrl')
  }
}

function startEdit() {
  fillEditForm()
  editing.value = true
}

function cancelEdit() {
  editing.value = false
}

async function saveProfile() {
  const id = profileId.value
  if (!id || !profile.value) return
  saveLoading.value = true
  try {
    const f = editForm.value
    const body: Record<string, unknown> = {
      businessName: f.businessName.trim(),
      tagline: f.tagline.trim(),
      businessEmail: f.businessEmail.trim(),
      businessPhone: f.businessPhone.trim(),
      city: f.city.trim(),
      state: f.state.trim(),
      pincode: f.pincode.trim(),
      address: f.address.trim(),
      country: f.country.trim(),
      website: f.website.trim(),
      description: f.description.trim(),
      reraNumber: f.reraNumber.trim()
    }
    if (f.coverImageUrl.trim()) body.coverImageUrl = f.coverImageUrl.trim()
    if (f.profileImageUrl.trim()) {
      body.profileImageUrl = f.profileImageUrl.trim()
      body.logoUrl = f.profileImageUrl.trim()
    }
    const res = await adminService.updateProfile(id, body)
    applyUpdateResponse(res)
    if (profile.value) {
      profile.value = {
        ...profile.value,
        ...body,
        ...(f.coverImageUrl.trim() ? { coverImageUrl: f.coverImageUrl.trim() } : {}),
        ...(f.profileImageUrl.trim()
          ? { profileImageUrl: f.profileImageUrl.trim(), logoUrl: f.profileImageUrl.trim() }
          : {})
      }
      syncStateFromProfile()
    }
    editing.value = false
    toast.add({
      title: 'Profile updated',
      description: 'Partner details were saved.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Update failed'
    toast.add({
      title: 'Could not save',
      description: msg,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    saveLoading.value = false
  }
}

/* ─── Approve / Reject ─── */
const confirmOpen = ref(false)
const confirmKind = ref<'approve' | 'reject'>('approve')
const actionLoading = ref(false)
const rejectReason = ref('')

function openApproveConfirm() {
  confirmKind.value = 'approve'
  rejectReason.value = ''
  confirmOpen.value = true
}

function openRejectConfirm() {
  confirmKind.value = 'reject'
  rejectReason.value = ''
  confirmOpen.value = true
}

const confirmTitle = computed(() =>
  confirmKind.value === 'approve' ? 'Approve partner' : 'Reject partner'
)

async function runConfirmedAction() {
  const id = profileId.value
  if (!id || !profile.value) return
  actionLoading.value = true
  try {
    if (confirmKind.value === 'approve') {
      const res = await adminService.approveProfile(id)
      applyUpdateResponse(res)
      profile.value = { ...profile.value, approvalStatus: 'APPROVED' }
      syncStateFromProfile()
      toast.add({
        title: 'Partner approved',
        description: `${displayTitle.value} is now approved.`,
        color: 'success',
        icon: 'i-lucide-check-circle'
      })
    } else {
      const reason = rejectReason.value.trim()
      const res = await adminService.rejectProfile(id, reason ? { reason } : undefined)
      applyUpdateResponse(res)
      profile.value = {
        ...profile.value,
        approvalStatus: 'REJECTED',
        ...(reason ? { rejectionReason: reason } : {})
      }
      syncStateFromProfile()
      toast.add({
        title: 'Partner rejected',
        description: reason ? 'Reason recorded.' : `${displayTitle.value} was rejected.`,
        color: 'warning',
        icon: 'i-lucide-ban'
      })
    }
    confirmOpen.value = false
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Request failed'
    toast.add({
      title: confirmKind.value === 'approve' ? 'Approve failed' : 'Reject failed',
      description: msg,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    })
  } finally {
    actionLoading.value = false
  }
}

const showApprove = computed(() => approvalStatus.value !== 'APPROVED')
const showReject = computed(() => approvalStatus.value !== 'REJECTED')

const docFilterOptions = computed(() => {
  const c = docCounts.value
  const opts: { id: typeof docFilter.value; label: string; icon: string; count: number }[] = [
    { id: 'all', label: 'All', icon: 'i-lucide-layout-grid', count: c.all }
  ]
  if (c.image) opts.push({ id: 'image', label: 'Images', icon: 'i-lucide-image', count: c.image })
  if (c.pdf) opts.push({ id: 'pdf', label: 'PDF', icon: 'i-lucide-file-text', count: c.pdf })
  if (c.video) opts.push({ id: 'video', label: 'Video', icon: 'i-lucide-clapperboard', count: c.video })
  if (c.other) opts.push({ id: 'other', label: 'Other', icon: 'i-lucide-file', count: c.other })
  return opts
})
</script>

<template>
  <div class="partner-detail min-h-full min-w-0 w-full overflow-x-hidden pb-12">
    <!-- Top bar -->
    <div
      class="sticky top-0 z-30 -mx-1 mb-6 flex flex-col gap-4 border-b border-gray-200/70 bg-white/85 px-1 py-4 backdrop-blur-xl dark:border-gray-800/80 dark:bg-gray-950/80 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
    >
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <NuxtLink
          to="/partners"
          class="group inline-flex shrink-0 items-center gap-2 rounded-xl border border-gray-200/90 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/70 hover:shadow-md dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/40"
        >
          <UIcon name="i-lucide-arrow-left" class="size-4 transition group-hover:-translate-x-0.5" />
          Partners
        </NuxtLink>
        <div class="min-w-0 border-l border-gray-200 pl-3 dark:border-gray-700">
          <div class="flex items-center gap-2">
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-600/30"
            >
              <UIcon name="i-lucide-building-2" class="size-4" />
            </span>
            <div class="min-w-0">
              <p class="truncate text-lg font-bold tracking-tight text-gray-900 dark:text-white">
                {{ profile ? displayTitle : 'Partner' }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Partner command center
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="profile"
        class="flex flex-wrap items-center gap-1.5"
      >
        <AppButton
          v-if="!editing"
          variant="outline"
          size="sm"
          icon="i-lucide-link"
          class="border-gray-200 bg-white/80 dark:border-gray-600 dark:bg-gray-900/80"
          :disabled="actionLoading || saveLoading"
          @click="copyPartnerPageLink"
        >
          Copy link
        </AppButton>
        <AppButton
          v-if="!editing && showApprove"
          color="success"
          size="sm"
          icon="i-lucide-badge-check"
          class="!font-semibold !shadow-md !shadow-emerald-600/20"
          :disabled="actionLoading || saveLoading"
          @click="openApproveConfirm"
        >
          Approve
        </AppButton>
        <AppButton
          v-if="!editing && showReject"
          color="error"
          size="sm"
          icon="i-lucide-shield-x"
          class="!font-semibold !shadow-md !shadow-rose-600/20"
          :disabled="actionLoading || saveLoading"
          @click="openRejectConfirm"
        >
          Reject
        </AppButton>
        <AppButton
          v-if="!editing"
          variant="outline"
          size="sm"
          icon="i-lucide-pencil"
          class="border-gray-300 dark:border-gray-600"
          :disabled="actionLoading || saveLoading"
          @click="startEdit"
        >
          Edit profile
        </AppButton>
        <template v-else>
          <AppButton
            variant="outline"
            size="sm"
            :disabled="saveLoading"
            @click="cancelEdit"
          >
            Cancel
          </AppButton>
          <AppButton
            color="success"
            size="sm"
            icon="i-lucide-save"
            class="!font-semibold !shadow-md !shadow-emerald-600/20"
            :loading="saveLoading"
            @click="saveProfile"
          >
            Save changes
          </AppButton>
        </template>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="!profile"
      class="relative flex flex-col items-center justify-center gap-5 overflow-hidden rounded-3xl border border-gray-200/90 bg-gradient-to-b from-gray-50 via-white to-emerald-50/30 px-6 py-20 shadow-xl shadow-gray-200/40 dark:border-gray-800 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950/20 dark:shadow-none"
    >
      <div
        class="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-500/10"
      />
      <div
        class="pointer-events-none absolute -bottom-20 -left-20 size-56 rounded-full bg-teal-400/10 blur-3xl dark:bg-teal-500/10"
      />
      <div
        class="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-2xl shadow-emerald-600/35 ring-4 ring-emerald-500/20"
      >
        <UIcon name="i-lucide-building-2" class="size-12" />
      </div>
      <p class="max-w-md text-center text-gray-600 dark:text-gray-400">
        No profile data loaded. Open this partner from the
        <span class="font-medium text-gray-900 dark:text-white">Partners</span>
        list.
      </p>
      <AppButton variant="outline" @click="goBack">Back to partners</AppButton>
    </div>

    <!-- Main card -->
    <div
      v-else
      class="partner-detail-shell overflow-hidden rounded-3xl border border-gray-200/90 bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] transition-shadow duration-300 hover:shadow-[0_28px_70px_-12px_rgba(16,185,129,0.12)] dark:border-gray-800 dark:bg-[linear-gradient(180deg,rgb(17_24_39)_0%,rgb(3_7_18)_100%)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_32px_64px_-12px_rgba(0,0,0,0.55)] dark:ring-white/[0.06] dark:hover:shadow-[0_28px_70px_-12px_rgba(16,185,129,0.08)]"
    >
      <!-- Cover -->
      <div class="relative h-44 sm:h-52 md:h-60">
        <img
          v-if="coverUrl"
          :src="coverUrl"
          alt=""
          class="absolute inset-0 h-full w-full object-cover"
        >
        <div
          v-else
          class="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700"
        />
        <div
          class="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(255,255,255,0.35),transparent)] opacity-90 dark:opacity-40"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/35 to-transparent dark:from-black/80"
        />
        <div class="absolute right-4 top-4 flex flex-wrap items-center justify-end gap-2">
          <UBadge
            :color="badgeColor(approvalStatus)"
            size="md"
            class="font-semibold uppercase tracking-wide shadow-lg backdrop-blur-sm"
          >
            {{ approvalStatus }}
          </UBadge>
        </div>
        <div class="absolute bottom-4 left-4 right-4 sm:left-10 sm:right-auto">
          <p class="text-xs font-medium uppercase tracking-widest text-emerald-200/90">
            Partner workspace
          </p>
          <p class="mt-1 line-clamp-2 text-xl font-bold text-white drop-shadow-md sm:text-2xl">
            {{ displayTitle }}
          </p>
        </div>
      </div>

      <!-- Body -->
      <div class="relative px-5 pb-8 pt-0 sm:px-10">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
          <!-- Avatar -->
          <div
            class="pd-avatar -mt-16 sm:-mt-20 relative z-10 h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-gradient-to-br from-emerald-50 to-teal-100 shadow-2xl shadow-emerald-900/25 ring-2 ring-emerald-500/20 dark:border-gray-900 dark:from-emerald-950 dark:to-teal-950 dark:shadow-black/40 dark:ring-emerald-400/15 sm:h-36 sm:w-36"
          >
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="displayTitle"
              class="h-full w-full object-cover"
            >
            <div v-else class="flex h-full w-full items-center justify-center">
              <UIcon name="i-lucide-building-2" class="size-16 text-emerald-500/80 dark:text-emerald-400/70" />
            </div>
          </div>
          <div class="min-w-0 flex-1 pb-1 sm:pb-2">
            <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              {{ displayTitle }}
            </h1>
            <p
              v-if="taglineDisplay && !editing"
              class="mt-1 text-base text-gray-600 dark:text-gray-400"
            >
              {{ taglineDisplay }}
            </p>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span
                v-if="get(profile, 'accountType')"
                class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/60"
              >
                <UIcon name="i-lucide-briefcase" class="size-3.5" />
                {{ get(profile, 'accountType') }}
              </span>
              <span
                v-if="get(profile, 'city') || get(profile, 'state')"
                class="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200/80 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700"
              >
                <UIcon name="i-lucide-map-pin" class="size-3.5" />
                {{ [get(profile, 'city'), get(profile, 'state')].filter(Boolean).join(', ') }}
              </span>
              <span
                v-if="documentItems.length && !editing"
                class="inline-flex items-center gap-1.5 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-900 ring-1 ring-cyan-200/80 dark:bg-cyan-950/40 dark:text-cyan-300 dark:ring-cyan-800/50"
              >
                <UIcon name="i-lucide-files" class="size-3.5" />
                {{ documentItems.length }} document{{ documentItems.length === 1 ? '' : 's' }}
              </span>
            </div>

            <!-- Stat strip -->
            <div
              v-if="!editing"
              class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
            >
              <div
                class="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/90 p-3 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:to-gray-950/80"
              >
                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400">
                  <UIcon name="i-lucide-fingerprint" class="size-5" />
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Profile ID</p>
                  <p class="truncate font-mono text-xs font-semibold text-gray-900 dark:text-white">{{ profileId }}</p>
                </div>
                <button
                  type="button"
                  class="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-emerald-600 dark:hover:bg-gray-800 dark:hover:text-emerald-400"
                  title="Copy ID"
                  @click="copyText('Profile ID copied', profileId)"
                >
                  <UIcon name="i-lucide-copy" class="size-4" />
                </button>
              </div>
              <div
                class="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/90 p-3 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:to-gray-950/80"
              >
                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <UIcon name="i-lucide-shield-check" class="size-5" />
                </span>
                <div class="min-w-0">
                  <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</p>
                  <p class="text-sm font-bold text-gray-900 dark:text-white">{{ approvalStatus }}</p>
                </div>
              </div>
              <div
                class="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/90 p-3 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:to-gray-950/80"
              >
                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                  <UIcon name="i-lucide-library" class="size-5" />
                </span>
                <div class="min-w-0">
                  <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Files</p>
                  <p class="text-sm font-bold text-gray-900 dark:text-white">{{ documentItems.length }}</p>
                </div>
              </div>
              <div
                class="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-gray-50/90 p-3 shadow-sm dark:border-gray-800 dark:from-gray-900 dark:to-gray-950/80"
              >
                <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
                  <UIcon name="i-lucide-award" class="size-5" />
                </span>
                <div class="min-w-0">
                  <p class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">RERA</p>
                  <p class="truncate text-sm font-bold text-gray-900 dark:text-white">
                    {{ get(profile, 'reraNumber') || '—' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Quick actions -->
            <div
              v-if="!editing"
              class="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-gray-200/80 bg-gray-50/80 p-2 dark:border-gray-700 dark:bg-gray-900/50"
            >
              <span class="pl-2 pr-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Quick</span>
              <a
                v-if="get(profile, 'businessEmail')"
                :href="`mailto:${get(profile, 'businessEmail')}`"
                class="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200/80 transition hover:ring-emerald-300 hover:shadow-md dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:ring-emerald-700"
              >
                <UIcon name="i-lucide-mail" class="size-3.5 text-emerald-600" />
                Email
              </a>
              <a
                v-if="get(profile, 'businessPhone')"
                :href="`tel:${String(get(profile, 'businessPhone')).replace(/\s/g, '')}`"
                class="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200/80 transition hover:ring-emerald-300 hover:shadow-md dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:ring-emerald-700"
              >
                <UIcon name="i-lucide-phone" class="size-3.5 text-emerald-600" />
                Call
              </a>
              <a
                v-if="websiteHref"
                :href="websiteHref"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200/80 transition hover:ring-emerald-300 hover:shadow-md dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:ring-emerald-700"
              >
                <UIcon name="i-lucide-globe" class="size-3.5 text-emerald-600" />
                Website
              </a>
              <a
                v-if="mapsUrl"
                :href="mapsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm ring-1 ring-gray-200/80 transition hover:ring-emerald-300 hover:shadow-md dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600 dark:hover:ring-emerald-700"
              >
                <UIcon name="i-lucide-map" class="size-3.5 text-emerald-600" />
                Maps
              </a>
            </div>
          </div>
        </div>

        <!-- Edit form -->
        <div
          v-if="editing"
          class="mt-8 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/90 via-white to-gray-50/80 p-5 shadow-inner dark:border-emerald-500/15 dark:from-emerald-950/30 dark:via-gray-950 dark:to-gray-950 sm:p-7"
        >
          <h2 class="mb-5 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
            <UIcon name="i-lucide-pencil-line" class="size-4" />
            Edit profile
          </h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-1.5 sm:col-span-2">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Business name</label>
              <UInput v-model="editForm.businessName" size="md" class="w-full rounded-xl" />
            </div>
            <div class="space-y-1.5 sm:col-span-2">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tagline</label>
              <UInput v-model="editForm.tagline" size="md" class="w-full rounded-xl" />
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Cover image URL</label>
              <UInput v-model="editForm.coverImageUrl" size="md" class="w-full rounded-xl" placeholder="https://…" />
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Profile image URL</label>
              <UInput v-model="editForm.profileImageUrl" size="md" class="w-full rounded-xl" placeholder="https://…" />
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Business email</label>
              <UInput v-model="editForm.businessEmail" type="email" size="md" class="w-full rounded-xl" />
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Business phone</label>
              <UInput v-model="editForm.businessPhone" size="md" class="w-full rounded-xl" />
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">RERA number</label>
              <UInput v-model="editForm.reraNumber" size="md" class="w-full rounded-xl" />
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Website</label>
              <UInput v-model="editForm.website" size="md" class="w-full rounded-xl" />
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">City</label>
              <UInput v-model="editForm.city" size="md" class="w-full rounded-xl" />
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">State</label>
              <UInput v-model="editForm.state" size="md" class="w-full rounded-xl" />
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">PIN code</label>
              <UInput v-model="editForm.pincode" size="md" class="w-full rounded-xl" />
            </div>
            <div class="space-y-1.5">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Country</label>
              <UInput v-model="editForm.country" size="md" class="w-full rounded-xl" />
            </div>
            <div class="space-y-1.5 sm:col-span-2">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Address</label>
              <UInput v-model="editForm.address" size="md" class="w-full rounded-xl" />
            </div>
            <div class="space-y-1.5 sm:col-span-2">
              <label class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</label>
              <textarea
                v-model="editForm.description"
                rows="4"
                class="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
                placeholder="About the business…"
              />
            </div>
          </div>
        </div>

        <!-- View layout: main + sidebar -->
        <div v-else class="mt-10 grid gap-8 lg:grid-cols-12 lg:items-start lg:gap-10">
          <div class="min-w-0 space-y-8 lg:col-span-8">
            <!-- About -->
            <section
              v-if="descriptionDisplay"
              class="overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white via-gray-50/80 to-emerald-50/30 p-6 shadow-sm dark:border-gray-700/80 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/20 sm:p-7"
            >
              <div class="mb-4 flex items-center gap-2">
                <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/25 dark:text-emerald-400">
                  <UIcon name="i-lucide-text-align-left" class="size-4" />
                </span>
                <h3 class="text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                  About
                </h3>
              </div>
              <p class="whitespace-pre-wrap text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {{ descriptionDisplay }}
              </p>
            </section>

            <!-- Documents -->
            <section
              v-if="documentItems.length"
              class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900/60"
            >
              <div
                class="flex flex-col gap-3 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-emerald-50/40 px-5 py-4 dark:border-gray-800 dark:from-gray-900 dark:to-emerald-950/20 sm:flex-row sm:items-center sm:justify-between sm:px-6"
              >
                <div class="flex items-center gap-3">
                  <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                    <UIcon name="i-lucide-folder-open" class="size-5" />
                  </span>
                  <div>
                    <h3 class="text-base font-bold text-gray-900 dark:text-white">
                      Documents &amp; verification
                    </h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      Preview images, open PDFs and files in a new tab
                    </p>
                  </div>
                </div>
                <span
                  class="inline-flex w-fit items-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600"
                >
                  {{ documentItems.length }} file{{ documentItems.length === 1 ? '' : 's' }}
                </span>
              </div>
              <div
                v-if="documentItems.length > 1"
                class="flex flex-wrap items-center gap-2 border-b border-gray-100 px-5 py-3 dark:border-gray-800 sm:px-6"
              >
                <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">Filter</span>
                <button
                  v-for="opt in docFilterOptions"
                  :key="opt.id"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                  :class="
                    docFilter === opt.id
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-400/40'
                      : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200/80 hover:bg-gray-200/80 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700'
                  "
                  @click="docFilter = opt.id"
                >
                  <UIcon :name="opt.icon" class="size-3.5" />
                  {{ opt.label }}
                  <span
                    class="rounded-md px-1.5 py-0.5 text-[10px] font-bold opacity-90"
                    :class="docFilter === opt.id ? 'bg-white/20' : 'bg-gray-200/80 dark:bg-gray-900/60'"
                  >{{ opt.count }}</span>
                </button>
              </div>
              <div
                v-if="!filteredDocumentItems.length && documentItems.length"
                class="px-5 py-12 text-center sm:px-6"
              >
                <UIcon name="i-lucide-filter-x" class="mx-auto size-10 text-gray-400" />
                <p class="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">Nothing in this filter</p>
                <AppButton size="sm" variant="soft" class="mt-3" @click="docFilter = 'all'">
                  Show all files
                </AppButton>
              </div>
              <div v-else class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3">
                <div
                  v-for="doc in filteredDocumentItems"
                  :key="doc.id"
                  class="pd-doc-card group flex flex-col overflow-hidden rounded-2xl border border-gray-200/90 bg-gray-50/50 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300/70 hover:shadow-xl hover:shadow-emerald-900/10 dark:border-gray-700 dark:bg-gray-950/50 dark:hover:border-emerald-700/50"
                >
                  <button
                    type="button"
                    class="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 text-left outline-none ring-emerald-500/40 focus-visible:ring-2 dark:bg-gray-800"
                    @click="openDocumentPreviewByDoc(doc)"
                  >
                    <img
                      v-if="doc.kind === 'image' && !brokenThumbUrls.has(doc.url)"
                      :src="doc.url"
                      :alt="doc.label"
                      class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                      @error="onThumbError(doc.url)"
                    >
                    <div
                      v-else
                      class="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-gray-100 to-gray-200/80 dark:from-gray-800 dark:to-gray-900"
                    >
                      <UIcon
                        :name="
                          doc.kind === 'pdf'
                            ? 'i-lucide-file-text'
                            : doc.kind === 'video'
                              ? 'i-lucide-clapperboard'
                              : 'i-lucide-file'
                        "
                        class="size-14 text-gray-500 dark:text-gray-400"
                      />
                      <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {{ doc.kind === 'pdf' ? 'PDF' : doc.kind === 'video' ? 'Video' : 'File' }}
                      </span>
                    </div>
                    <div
                      class="absolute inset-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    >
                      <span
                        class="rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-gray-900 shadow-lg dark:bg-gray-900 dark:text-white"
                      >
                        <UIcon name="i-lucide-maximize-2" class="mb-0.5 mr-1 inline size-3.5 align-text-bottom" />
                        Preview
                      </span>
                    </div>
                  </button>
                  <div class="flex flex-1 flex-col gap-2 border-t border-gray-100/90 p-3 dark:border-gray-800">
                    <p class="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white" :title="doc.label">
                      {{ doc.label }}
                    </p>
                    <div class="mt-auto flex flex-wrap gap-1.5">
                      <AppButton
                        size="xs"
                        variant="soft"
                        icon="i-lucide-eye"
                        class="!rounded-lg !text-xs"
                        @click="openDocumentPreviewByDoc(doc)"
                      >
                        View
                      </AppButton>
                      <AppButton
                        size="xs"
                        variant="outline"
                        icon="i-lucide-external-link"
                        class="!rounded-lg !text-xs"
                        @click="openInNewTab(doc.url)"
                      >
                        Open
                      </AppButton>
                      <AppButton
                        size="xs"
                        variant="ghost"
                        icon="i-lucide-copy"
                        class="!rounded-lg !text-xs"
                        @click="copyText('File URL copied', doc.url)"
                      >
                        URL
                      </AppButton>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <p
              v-else
              class="rounded-xl border border-dashed border-gray-200/70 bg-gray-50/40 px-4 py-4 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950/30 dark:text-gray-400"
            >
              <UIcon name="i-lucide-inbox" class="mx-auto mb-2 size-8 opacity-60" />
              No documents in this profile. Lists such as
              <span class="font-mono text-xs text-gray-600 dark:text-gray-300">documents</span>
              or certificate URLs are picked up automatically.
            </p>
          </div>

          <!-- Sidebar -->
          <aside
            class="space-y-5 lg:col-span-4 lg:sticky lg:top-24 lg:self-start"
          >
            <div
              class="overflow-hidden rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/40 shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-500/10 backdrop-blur-sm dark:border-emerald-900/40 dark:from-emerald-950/40 dark:via-gray-900 dark:to-teal-950/20 dark:ring-emerald-500/5"
            >
              <div class="border-b border-emerald-200/50 bg-gradient-to-r from-emerald-600/12 to-teal-600/10 px-4 py-3 dark:border-emerald-800/50">
                <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                  <UIcon name="i-lucide-phone" class="size-4" />
                  Contact
                </h3>
              </div>
              <ul class="space-y-0 divide-y divide-emerald-100/80 dark:divide-emerald-900/30">
                <li v-if="get(profile, 'businessEmail')" class="flex items-start gap-2 px-4 py-3">
                  <UIcon name="i-lucide-mail" class="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <a
                    :href="`mailto:${get(profile, 'businessEmail')}`"
                    class="min-w-0 flex-1 break-all text-sm font-medium text-gray-800 underline-offset-2 hover:text-emerald-700 hover:underline dark:text-gray-200 dark:hover:text-emerald-400"
                  >{{ get(profile, 'businessEmail') }}</a>
                  <button
                    type="button"
                    class="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-emerald-100/80 hover:text-emerald-700 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-300"
                    title="Copy email"
                    @click="copyText('Email copied', String(get(profile, 'businessEmail')))"
                  >
                    <UIcon name="i-lucide-copy" class="size-3.5" />
                  </button>
                </li>
                <li v-if="get(profile, 'businessPhone')" class="flex items-start gap-2 px-4 py-3">
                  <UIcon name="i-lucide-phone" class="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <a
                    :href="`tel:${String(get(profile, 'businessPhone')).replace(/\s/g, '')}`"
                    class="min-w-0 flex-1 text-sm font-medium text-gray-800 hover:text-emerald-700 dark:text-gray-200 dark:hover:text-emerald-400"
                  >{{ get(profile, 'businessPhone') }}</a>
                  <button
                    type="button"
                    class="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-emerald-100/80 hover:text-emerald-700 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-300"
                    title="Copy phone"
                    @click="copyText('Phone copied', String(get(profile, 'businessPhone')))"
                  >
                    <UIcon name="i-lucide-copy" class="size-3.5" />
                  </button>
                </li>
                <li v-if="get(profile, 'website')" class="flex items-start gap-2 px-4 py-3">
                  <UIcon name="i-lucide-globe" class="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <a
                    :href="String(get(profile, 'website')).startsWith('http') ? String(get(profile, 'website')) : `https://${get(profile, 'website')}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="min-w-0 flex-1 break-all text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >{{ get(profile, 'website') }}</a>
                  <button
                    type="button"
                    class="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-emerald-100/80 hover:text-emerald-700 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-300"
                    title="Copy URL"
                    @click="copyText('Website URL copied', websiteHref)"
                  >
                    <UIcon name="i-lucide-copy" class="size-3.5" />
                  </button>
                </li>
                <li
                  v-if="!get(profile, 'businessEmail') && !get(profile, 'businessPhone') && !get(profile, 'website')"
                  class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No contact links on file
                </li>
              </ul>
            </div>

            <div
              class="overflow-hidden rounded-2xl border border-gray-200/80 bg-white/90 shadow-md ring-1 ring-gray-200/40 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/90 dark:ring-white/5"
            >
              <div class="border-b border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/30">
                <h3 class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  <UIcon name="i-lucide-list-tree" class="size-4" />
                  Record details
                </h3>
              </div>
              <dl class="max-h-[min(28rem,55vh)] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                <div
                  v-for="row in readOnlyRows"
                  :key="row.key"
                  class="group/row px-4 py-2.5 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                >
                  <dt class="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500">
                    {{ row.label }}
                  </dt>
                  <dd class="mt-0.5 flex items-start justify-between gap-2">
                    <span class="break-words text-sm text-gray-900 dark:text-gray-100">{{ row.value }}</span>
                    <button
                      type="button"
                      class="shrink-0 rounded-md p-1 text-gray-400 opacity-70 transition hover:bg-gray-200 hover:text-gray-700 sm:opacity-0 sm:group-hover/row:opacity-100 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                      title="Copy value"
                      @click="copyText(`${row.label} copied`, row.value)"
                    >
                      <UIcon name="i-lucide-copy" class="size-3.5" />
                    </button>
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>

        <!-- Extra API fields (full width) -->
        <div v-if="!editing && extraRows.length" class="mt-10 border-t border-gray-100 pt-8 dark:border-gray-800">
          <h3 class="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <UIcon name="i-lucide-braces" class="size-4" />
            Additional fields
          </h3>
          <dl class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="(er, idx) in extraRows"
              :key="idx"
              class="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 dark:border-gray-800 dark:bg-gray-950/40"
            >
              <dt class="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {{ er.label }}
              </dt>
              <dd class="mt-1 break-all text-sm text-gray-800 dark:text-gray-200">{{ er.value }}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>

    <!-- Document preview -->
    <UModal
      v-model:open="previewOpen"
      :title="previewDoc?.label ?? 'Preview'"
      :ui="adminModalUiMedia"
    >
      <template #body>
        <div v-if="previewDoc" class="space-y-4">
          <div
            class="relative flex max-h-[min(72vh,640px)] min-h-[200px] items-center justify-center overflow-hidden rounded-2xl bg-gray-950/5 dark:bg-gray-950"
          >
            <img
              v-if="previewDoc.kind === 'image'"
              :src="previewDoc.url"
              :alt="previewDoc.label"
              class="max-h-[min(72vh,640px)] w-full object-contain"
            >
            <iframe
              v-else-if="previewDoc.kind === 'pdf'"
              :src="previewDoc.url"
              title="PDF preview"
              class="h-[min(72vh,640px)] min-h-[320px] w-full rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900"
            />
            <video
              v-else-if="previewDoc.kind === 'video'"
              :src="previewDoc.url"
              controls
              class="max-h-[min(72vh,640px)] w-full"
            />
            <div
              v-else
              class="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
            >
              <UIcon name="i-lucide-file-warning" class="size-16 text-amber-500" />
              <p class="max-w-sm text-sm text-gray-600 dark:text-gray-400">
                Inline preview isn’t available for this file type. Open it in a new tab to view or download.
              </p>
              <AppButton color="primary" icon="i-lucide-external-link" @click="openInNewTab(previewDoc.url)">
                Open in new tab
              </AppButton>
            </div>
          </div>
          <p
            v-if="previewDoc.kind === 'pdf'"
            class="text-center text-xs text-gray-500 dark:text-gray-400"
          >
            If the preview stays blank (blocked by the file host),
            <button
              type="button"
              class="font-semibold text-emerald-600 underline hover:text-emerald-700 dark:text-emerald-400"
              @click="openInNewTab(previewDoc.url)"
            >
              open the PDF
            </button>
            in a new tab.
          </p>
          <div v-if="documentItems.length > 1" class="flex items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
            <AppButton variant="outline" size="sm" icon="i-lucide-chevron-left" @click="previewPrev">
              Previous
            </AppButton>
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">
              {{ previewIndex + 1 }} / {{ documentItems.length }}
            </span>
            <AppButton
              variant="outline"
              size="sm"
              icon="i-lucide-chevron-right"
              @click="previewNext"
            >
              Next
            </AppButton>
          </div>
        </div>
      </template>
      <template #footer="{ close }">
        <div class="lb-modal-footer-document">
          <p
            v-if="documentItems.length > 1"
            class="flex flex-wrap items-center gap-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400"
          >
            <span class="inline-flex items-center gap-1">
              <kbd class="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold dark:border-gray-600 dark:bg-gray-800">←</kbd>
              <kbd class="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold dark:border-gray-600 dark:bg-gray-800">→</kbd>
              <span>navigate</span>
            </span>
            <span class="text-gray-300 dark:text-gray-600">·</span>
            <span class="inline-flex items-center gap-1">
              <kbd class="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold dark:border-gray-600 dark:bg-gray-800">Esc</kbd>
              <span>close</span>
            </span>
          </p>
          <div v-else class="hidden sm:block" aria-hidden="true" />
          <div class="lb-modal-footer-document__actions">
            <AppButton variant="outline" color="neutral" size="sm" class="lb-modal-btn-cancel" @click="close()">
              Close
            </AppButton>
            <AppButton
              v-if="previewDoc"
              variant="outline"
              color="neutral"
              size="sm"
              icon="i-lucide-copy"
              class="lb-modal-btn-cancel"
              @click="copyText('File URL copied', previewDoc.url)"
            >
              Copy URL
            </AppButton>
            <AppButton
              v-if="previewDoc"
              color="primary"
              size="sm"
              icon="i-lucide-external-link"
              class="lb-modal-btn-submit"
              @click="openInNewTab(previewDoc.url)"
            >
              Open
            </AppButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Confirm modal -->
    <UModal
      v-model:open="confirmOpen"
      :title="confirmTitle"
      :ui="adminModalUiCompact"
    >
      <template #body>
        <div class="space-y-5">
          <div
            class="flex gap-4 rounded-2xl border border-gray-200/80 bg-gradient-to-br from-gray-50 to-white p-4 dark:border-gray-700 dark:from-gray-900 dark:to-gray-950"
          >
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-inner"
              :class="
                confirmKind === 'approve'
                  ? 'bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/30 dark:text-emerald-400'
                  : 'bg-rose-500/15 text-rose-600 ring-1 ring-rose-500/30 dark:text-rose-400'
              "
            >
              <UIcon
                :name="confirmKind === 'approve' ? 'i-lucide-badge-check' : 'i-lucide-shield-alert'"
                class="size-6"
              />
            </div>
            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              <template v-if="confirmKind === 'approve'">
                Approve
                <span class="font-semibold text-gray-900 dark:text-white">{{ displayTitle }}</span>
                — they will appear as approved to users.
              </template>
              <template v-else>
                Reject
                <span class="font-semibold text-gray-900 dark:text-white">{{ displayTitle }}</span>
                . You can add a reason for your records.
              </template>
            </p>
          </div>
          <div v-if="confirmKind === 'reject'" class="space-y-2">
            <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Reason (optional)</label>
            <textarea
              v-model="rejectReason"
              rows="3"
              placeholder="e.g. Incomplete RERA documentation"
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
            :disabled="actionLoading"
            @click="close()"
          >
            Cancel
          </AppButton>
          <AppButton
            v-if="confirmKind === 'approve'"
            color="success"
            size="sm"
            class="lb-modal-btn-submit"
            :loading="actionLoading"
            @click="runConfirmedAction"
          >
            Confirm approval
          </AppButton>
          <AppButton
            v-else
            color="error"
            size="sm"
            class="lb-modal-btn-submit"
            :loading="actionLoading"
            @click="runConfirmedAction"
          >
            Confirm rejection
          </AppButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.partner-detail-shell {
  animation: pd-shell-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes pd-shell-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.pd-avatar {
  animation: pd-avatar-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
}

@keyframes pd-avatar-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.pd-doc-card {
  will-change: transform;
}
</style>
