<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useUserService, normalizeAuthUser } from '~/services/api'
import { adminModalUiCompact } from '~/utils/admin-modal-ui'

definePageMeta({
  layout: 'admin',
  title: 'Profile'
})

const auth = useAuth()
const userService = useUserService()

interface Verification {
  email_verified?: boolean
  phone_verified?: boolean
  is_kyc_verified?: boolean
  verified_at?: string
}

interface Subscription {
  plan?: string
  status?: string
  started_at?: string
  expires_at?: string | null
  canceled_at?: string | null
  payment_provider?: string | null
  payment_customer_id?: string | null
}

interface Approval {
  status?: string
  approved_by?: string | null
  approved_at?: string | null
  rejected_by?: string | null
  rejected_at?: string | null
  rejection_reason?: string | null
}

interface UserMeData {
  id?: string
  email?: string
  phone?: string | null
  googleAuthId?: string | null
  fullName?: string
  avatarUrl?: string | null
  bio?: string | null
  accountType?: string
  systemRole?: string
  accountStatus?: string
  verification?: Verification
  subscription?: Subscription
  approval?: Approval
  createdAt?: string
  updatedAt?: string
}

interface UserMeResponse {
  success?: boolean
  data?: UserMeData
}

const profile = ref<UserMeData | null>(null)
const loading = ref(false)
const saving = ref(false)
const passwordSaving = ref(false)
const avatarUploading = ref(false)
const deleteLoading = ref(false)
const showDeleteModal = ref(false)
const error = ref<string | null>(null)
const success = ref<string | null>(null)
const avatarInputRef = ref<HTMLInputElement | null>(null)

const editForm = ref({
  fullName: '',
  phone: '',
  bio: ''
})

const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const staggerDelays = [0, 80, 160, 240, 320, 400]

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString()
  } catch {
    return dateStr
  }
}

function formatStatus(s: string | undefined) {
  if (!s) return '—'
  return s.replace(/_/g, ' ')
}

async function loadProfile() {
  loading.value = true
  error.value = null
  try {
    const res = await userService.me() as UserMeResponse | UserMeData
    const data = (res as UserMeResponse)?.data ?? (res as UserMeData)
    profile.value = data ?? null
    if (profile.value) {
      editForm.value = {
        fullName: profile.value.fullName ?? '',
        phone: profile.value.phone ?? '',
        bio: profile.value.bio ?? ''
      }
      const synced = normalizeAuthUser({
        id: profile.value.id,
        email: profile.value.email,
        name: profile.value.fullName,
        fullName: profile.value.fullName,
        accountType: profile.value.accountType,
        systemRole: profile.value.systemRole
      })
      if (synced) auth.setUser(synced)
    }
  } catch {
    profile.value = auth.user ? { fullName: auth.user.name, email: auth.user.email } : null
    if (profile.value) {
      editForm.value = {
        fullName: profile.value.fullName ?? '',
        phone: profile.value.phone ?? '',
        bio: profile.value.bio ?? ''
      }
    }
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  saving.value = true
  error.value = null
  success.value = null
  try {
    const res = await userService.updateMe({
      fullName: editForm.value.fullName,
      phone: editForm.value.phone || undefined,
      bio: editForm.value.bio || undefined
    }) as UserMeResponse | UserMeData
    const updated = (res as UserMeResponse)?.data ?? (res as UserMeData)
    if (updated) {
      profile.value = { ...profile.value, ...updated }
      success.value = 'Profile updated successfully'
    }
  } catch {
    error.value = 'Failed to update profile'
  } finally {
    saving.value = false
  }
}

async function changePassword() {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    error.value = 'New passwords do not match'
    return
  }
  if (passwordForm.value.newPassword.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }
  passwordSaving.value = true
  error.value = null
  success.value = null
  try {
    await userService.changePassword({
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    })
    success.value = 'Password changed successfully'
    passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  } catch {
    error.value = 'Failed to change password. Check your current password.'
  } finally {
    passwordSaving.value = false
  }
}

function triggerAvatarUpload() {
  avatarInputRef.value?.click()
}

async function onAvatarSelected(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !profile.value) return
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!validTypes.includes(file.type)) {
    error.value = 'Please select a valid image (JPEG, PNG, WebP, or GIF)'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    error.value = 'Image must be less than 5MB'
    return
  }
  avatarUploading.value = true
  error.value = null
  success.value = null
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await userService.uploadAvatar(formData) as { avatarUrl?: string } | { data?: { avatarUrl?: string } }
    const avatarUrl = (res as { data?: { avatarUrl?: string } })?.data?.avatarUrl ?? (res as { avatarUrl?: string })?.avatarUrl
    if (avatarUrl) {
      profile.value = { ...profile.value, avatarUrl }
      success.value = 'Avatar updated successfully'
      auth.setUser?.({ id: profile.value.id ?? '', email: profile.value.email ?? '', name: profile.value.fullName })
    }
  } catch {
    error.value = 'Failed to upload avatar'
  } finally {
    avatarUploading.value = false
    input.value = ''
  }
}

async function deleteAccount() {
  deleteLoading.value = true
  error.value = null
  try {
    await userService.softDelete()
    auth.logout()
    navigateTo('/login')
  } catch {
    error.value = 'Failed to delete account'
  } finally {
    deleteLoading.value = false
    showDeleteModal.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="profile-page min-h-full">
    <AppPageHeader
      title="Profile"
      description="View and manage your account"
      class="profile-animate-fade-up opacity-0"
    />

    <!-- Notifications with animation -->
    <Transition name="profile-notification">
      <div
        v-if="error"
        class="profile-animate-fade-up opacity-0 mb-4 flex items-center gap-2 rounded-xl border border-red-200/80 bg-red-50/95 px-3 py-2.5 text-sm text-red-700 shadow-sm backdrop-blur dark:border-red-800/60 dark:bg-red-900/25 dark:text-red-400"
      >
        <UIcon name="i-lucide-alert-circle" class="h-5 w-5 shrink-0" />
        {{ error }}
      </div>
    </Transition>
    <Transition name="profile-notification">
      <div
        v-if="success"
        class="profile-animate-fade-up opacity-0 mb-4 flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/95 px-3 py-2.5 text-sm text-emerald-700 shadow-sm backdrop-blur dark:border-emerald-800/60 dark:bg-emerald-900/25 dark:text-emerald-400"
      >
        <UIcon name="i-lucide-check-circle" class="h-5 w-5 shrink-0" />
        {{ success }}
      </div>
    </Transition>

    <!-- Loading state -->
    <div
      v-if="loading"
      class="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200/80 bg-white/80 py-12 shadow-sm backdrop-blur dark:border-gray-700/80 dark:bg-gray-900/80"
    >
      <div class="relative">
        <div class="h-14 w-14 animate-spin rounded-full border-2 border-gray-200 border-t-emerald-500 dark:border-gray-700" />
        <UIcon name="i-lucide-user" class="absolute inset-0 m-auto h-6 w-6 text-emerald-500" />
      </div>
      <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Loading your profile...</p>
    </div>

    <template v-else-if="profile">
      <!-- Profile hero card -->
      <div
        class="profile-animate-scale-in opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900"
        :style="{ animationDelay: `${staggerDelays[0]}ms` }"
      >
        <div class="relative overflow-hidden">
          <!-- Decorative gradient bar -->
          <div class="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />
          <div class="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10" />

          <div class="relative flex flex-col items-start gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
            <input
              ref="avatarInputRef"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              class="hidden"
              @change="onAvatarSelected"
            >
            <button
              type="button"
              class="group relative shrink-0 cursor-pointer rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              :disabled="avatarUploading"
              @click="triggerAvatarUpload"
            >
              <div
                v-if="profile.avatarUrl"
                class="profile-card-hover h-20 w-20 overflow-hidden rounded-xl bg-gray-100 ring-2 ring-white shadow-lg dark:bg-gray-800 dark:ring-gray-900"
              >
                <img :src="profile.avatarUrl" alt="Avatar" class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105">
              </div>
              <div
                v-else
                class="profile-card-hover flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-2xl font-bold text-white shadow-xl shadow-emerald-500/20 ring-2 ring-white dark:ring-gray-900"
              >
                {{ (profile.fullName || profile.email || '?')[0].toUpperCase() }}
              </div>
              <div
                :class="[
                  'absolute inset-0 flex items-center justify-center rounded-xl bg-black/40 transition-opacity',
                  avatarUploading ? 'opacity-70' : 'opacity-0 group-hover:opacity-100'
                ]"
              >
                <UIcon
                  v-if="avatarUploading"
                  name="i-lucide-loader-2"
                  class="h-8 w-8 animate-spin text-white"
                />
                <UIcon v-else name="i-lucide-camera" class="h-8 w-8 text-white" />
              </div>
            </button>
            <div class="min-w-0 flex-1">
              <h2 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
                {{ profile.fullName || 'No name' }}
              </h2>
              <p class="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <UIcon name="i-lucide-mail" class="h-4 w-4" />
                {{ profile.email }}
              </p>
              <div class="mt-2 flex flex-wrap gap-1.5">
                <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm dark:bg-emerald-900/40 dark:text-emerald-400">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {{ formatStatus(profile.accountType) || '—' }}
                </span>
                <span class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                  {{ formatStatus(profile.accountStatus) || '—' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-5 grid gap-4 lg:grid-cols-3">
        <!-- Main column: form + password -->
        <div class="space-y-4 lg:col-span-2">
          <!-- Personal info form -->
          <div
            class="profile-card-hover profile-animate-fade-up opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900"
            :style="{ animationDelay: `${staggerDelays[1]}ms` }"
          >
            <div class="border-b border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/30">
              <h3 class="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                  <UIcon name="i-lucide-user" class="h-4 w-4" />
                </span>
                Personal Information
              </h3>
            </div>
            <div class="p-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="profile-input-focus sm:col-span-2 sm:col-start-1 rounded-lg p-0.5">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Full name</label>
                  <input
                    v-model="editForm.fullName"
                    type="text"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    placeholder="Your name"
                  >
                </div>
                <div class="profile-input-focus rounded-lg p-0.5">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    :value="profile.email"
                    type="email"
                    class="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500 dark:border-gray-600 dark:bg-gray-800/50 dark:text-gray-400"
                    disabled
                  >
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Email cannot be changed</p>
                </div>
                <div class="profile-input-focus rounded-lg p-0.5">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
                  <input
                    v-model="editForm.phone"
                    type="tel"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    placeholder="Phone number"
                  >
                </div>
                <div class="profile-input-focus sm:col-span-2 rounded-lg p-0.5">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                  <textarea
                    v-model="editForm.bio"
                    rows="2"
                    class="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    placeholder="Tell us about yourself"
                  />
                </div>
              </div>
              <div class="mt-4 flex justify-end">
                <AppButton
                  :loading="saving"
                  size="sm"
                  color="success"
                  icon="i-lucide-check"
                  label="Save changes"
                  class="profile-btn-primary w-full sm:w-auto"
                  @click="saveProfile"
                />
              </div>
            </div>
          </div>

          <!-- Change password -->
          <div
            class="profile-card-hover profile-animate-fade-up opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-900"
            :style="{ animationDelay: `${staggerDelays[2]}ms` }"
          >
            <div class="border-b border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/30">
              <h3 class="flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                  <UIcon name="i-lucide-lock" class="h-4 w-4" />
                </span>
                Change Password
              </h3>
            </div>
            <div class="p-4">
              <div class="space-y-4">
                <div class="profile-input-focus rounded-lg p-0.5">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Current password</label>
                  <input
                    v-model="passwordForm.currentPassword"
                    type="password"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    placeholder="Enter current password"
                    autocomplete="current-password"
                  >
                </div>
                <div class="profile-input-focus rounded-lg p-0.5">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">New password</label>
                  <input
                    v-model="passwordForm.newPassword"
                    type="password"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    placeholder="Enter new password"
                    autocomplete="new-password"
                  >
                </div>
                <div class="profile-input-focus rounded-lg p-0.5">
                  <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm new password</label>
                  <input
                    v-model="passwordForm.confirmPassword"
                    type="password"
                    class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                    placeholder="Confirm new password"
                    autocomplete="new-password"
                  >
                </div>
              </div>
              <div class="mt-4 flex justify-end">
                <AppButton
                  :loading="passwordSaving"
                  size="sm"
                  variant="outline"
                  color="success"
                  icon="i-lucide-key-round"
                  label="Update password"
                  class="profile-btn-secondary w-full sm:w-auto"
                  @click="changePassword"
                />
              </div>
            </div>
          </div>

          <!-- Delete account -->
          <div
            class="profile-card-hover profile-animate-fade-up opacity-0 overflow-hidden rounded-2xl border border-red-200/60 bg-white shadow-sm dark:border-red-900/40 dark:bg-gray-900"
            :style="{ animationDelay: `${staggerDelays[2]}ms` }"
          >
            <div class="border-b border-red-100 bg-red-50/50 px-4 py-3 dark:border-red-900/40 dark:bg-red-950/20">
              <h3 class="flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                  <UIcon name="i-lucide-trash-2" class="h-4 w-4" />
                </span>
                Danger zone
              </h3>
            </div>
            <div class="p-4">
              <p class="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Once you delete your account, there is no going back. This will permanently remove your account and associated data.
              </p>
              <div class="flex justify-end">
                <AppButton
                  :loading="deleteLoading"
                  size="sm"
                  variant="outline"
                  color="error"
                  icon="i-lucide-trash-2"
                  label="Delete account"
                  class="profile-btn-danger w-full sm:w-auto"
                  @click="showDeleteModal = true"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar: status cards -->
        <div class="space-y-4 lg:col-span-1">
          <!-- Account -->
          <div
            class="profile-card-hover profile-animate-slide-right opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-700/80 dark:bg-gray-900"
            :style="{ animationDelay: `${staggerDelays[3]}ms` }"
          >
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                <UIcon name="i-lucide-badge-check" class="h-4 w-4" />
              </span>
              Account
            </h3>
            <dl class="space-y-2">
              <div class="rounded-lg bg-gray-50/80 px-2.5 py-1.5 dark:bg-gray-800/50">
                <dt class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Role</dt>
                <dd class="mt-0.5 font-medium text-gray-900 dark:text-white">{{ formatStatus(profile.systemRole) || '—' }}</dd>
              </div>
              <div class="rounded-lg bg-gray-50/80 px-2.5 py-1.5 dark:bg-gray-800/50">
                <dt class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Member since</dt>
                <dd class="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{{ formatDate(profile.createdAt) }}</dd>
              </div>
            </dl>
          </div>

          <!-- Verification -->
          <div
            v-if="profile.verification"
            class="profile-card-hover profile-animate-slide-right opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-700/80 dark:bg-gray-900"
            :style="{ animationDelay: `${staggerDelays[4]}ms` }"
          >
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                <UIcon name="i-lucide-shield-check" class="h-4 w-4" />
              </span>
              Verification
            </h3>
            <div class="space-y-1.5">
              <div class="flex items-center justify-between rounded-lg bg-gray-50/80 px-2.5 py-1.5 dark:bg-gray-800/50">
                <span class="text-sm text-gray-600 dark:text-gray-300">Email</span>
                <span
                  :class="profile.verification.email_verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'"
                  class="flex items-center gap-1.5 text-sm font-medium"
                >
                  <UIcon v-if="profile.verification.email_verified" name="i-lucide-check" class="h-4 w-4" />
                  {{ profile.verification.email_verified ? 'Verified' : '—' }}
                </span>
              </div>
              <div class="flex items-center justify-between rounded-lg bg-gray-50/80 px-2.5 py-1.5 dark:bg-gray-800/50">
                <span class="text-sm text-gray-600 dark:text-gray-300">Phone</span>
                <span
                  :class="profile.verification.phone_verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'"
                  class="flex items-center gap-1.5 text-sm font-medium"
                >
                  <UIcon v-if="profile.verification.phone_verified" name="i-lucide-check" class="h-4 w-4" />
                  {{ profile.verification.phone_verified ? 'Verified' : '—' }}
                </span>
              </div>
              <div class="flex items-center justify-between rounded-lg bg-gray-50/80 px-2.5 py-1.5 dark:bg-gray-800/50">
                <span class="text-sm text-gray-600 dark:text-gray-300">KYC</span>
                <span
                  :class="profile.verification.is_kyc_verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'"
                  class="flex items-center gap-1.5 text-sm font-medium"
                >
                  <UIcon v-if="profile.verification.is_kyc_verified" name="i-lucide-check" class="h-4 w-4" />
                  {{ profile.verification.is_kyc_verified ? 'Verified' : '—' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Subscription -->
          <div
            v-if="profile.subscription"
            class="profile-card-hover profile-animate-slide-right opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-700/80 dark:bg-gray-900"
            :style="{ animationDelay: `${staggerDelays[4]}ms` }"
          >
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                <UIcon name="i-lucide-credit-card" class="h-4 w-4" />
              </span>
              Subscription
            </h3>
            <dl class="space-y-2">
              <div class="rounded-lg bg-gray-50/80 px-2.5 py-1.5 dark:bg-gray-800/50">
                <dt class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Plan</dt>
                <dd class="mt-0.5 font-medium text-gray-900 dark:text-white">{{ profile.subscription.plan || '—' }}</dd>
              </div>
              <div class="rounded-lg bg-gray-50/80 px-2.5 py-1.5 dark:bg-gray-800/50">
                <dt class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</dt>
                <dd class="mt-0.5 font-medium text-gray-900 dark:text-white">{{ profile.subscription.status || '—' }}</dd>
              </div>
              <div class="rounded-lg bg-gray-50/80 px-2.5 py-1.5 dark:bg-gray-800/50">
                <dt class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Expires</dt>
                <dd class="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{{ profile.subscription.expires_at ? formatDate(profile.subscription.expires_at) : 'Never' }}</dd>
              </div>
            </dl>
          </div>

          <!-- Approval -->
          <div
            v-if="profile.approval"
            class="profile-card-hover profile-animate-slide-right opacity-0 overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-700/80 dark:bg-gray-900"
            :style="{ animationDelay: `${staggerDelays[5]}ms` }"
          >
            <h3 class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                <UIcon name="i-lucide-file-check" class="h-4 w-4" />
              </span>
              Approval
            </h3>
            <dl class="space-y-2">
              <div class="rounded-lg bg-gray-50/80 px-2.5 py-1.5 dark:bg-gray-800/50">
                <dt class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Status</dt>
                <dd class="mt-0.5 font-medium text-gray-900 dark:text-white">{{ formatStatus(profile.approval.status) || '—' }}</dd>
              </div>
              <div v-if="profile.approval.rejection_reason" class="rounded-lg bg-gray-50/80 px-2.5 py-1.5 dark:bg-gray-800/50">
                <dt class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Rejection reason</dt>
                <dd class="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{{ profile.approval.rejection_reason }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </template>

    <div
      v-else
      class="profile-animate-fade-up opacity-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200/80 bg-white py-12 dark:border-gray-700/80 dark:bg-gray-900"
    >
      <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <UIcon name="i-lucide-user-x" class="h-10 w-10 text-gray-400 dark:text-gray-500" />
      </div>
      <p class="text-gray-500 dark:text-gray-400">Unable to load profile</p>
    </div>

    <!-- Delete account confirmation modal -->
    <UModal v-model:open="showDeleteModal" title="Delete account" :ui="adminModalUiCompact">
      <template #body>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete your account? This action cannot be undone.
        </p>
      </template>
      <template #footer="{ close }">
        <div class="admin-btn-modal-footer">
          <AppButton variant="outline" color="neutral" size="sm" class="lb-modal-btn-cancel" @click="close()">
            Cancel
          </AppButton>
          <AppButton
            :loading="deleteLoading"
            color="error"
            size="sm"
            icon="i-lucide-trash-2"
            class="lb-modal-btn-submit"
            @click="deleteAccount"
          >
            Delete account
          </AppButton>
        </div>
      </template>
    </UModal>
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
</style>
