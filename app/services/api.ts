/**
 * API endpoints, services, and composables in one file.
 * Import: useAuthService, useAdminService, AUTH, AuthUser, etc.
 */
import type { ApiResponse } from '~/types/api'
import { useApi, BaseService, type IApiClient } from '~/config/api'

// ─── Endpoint Constants ──────────────────────────────────────────────────

export const AUTH = {
  register: '/auth/register',
  loginEmail: '/auth/login/email',
  logout: '/auth/logout',
  refreshToken: '/auth/refresh-token',
  sessions: '/auth/sessions',
  verifyAccount: '/auth/email/verify-account',
  forgotPassword: '/auth/forgot-password',
  resetPassword: '/auth/reset-password',
} as const

export const ADMIN = {
  profiles: '/admin/profiles',
  profileApprove: (id: string) => `/admin/profiles/${id}/approve`,
  profileReject: (id: string) => `/admin/profiles/${id}/reject`,
  projectPublish: (id: string) => `/admin/projects/${id}/publish`,
  projectReject: (id: string) => `/admin/projects/${id}/reject`,
  usersList: '/admin/users/list',
  userStatus: (id: string) => `/admin/users/${id}/status`,
  userRole: (id: string) => `/admin/users/${id}/role`,
  listingPublish: (id: string) => `/admin/listings/${id}/publish`,
} as const

export const OTP = { sendEmail: '/otp/send-email', resendEmail: '/otp/resend-email', verify: '/otp/verify' } as const
export const USER = { me: '/user/me', byId: (id: string) => `/user/${id}`, changePassword: '/user/change-password', softDelete: '/user/soft-delete', avatarUpload: '/user/me/avatar/upload' } as const
export const PROFILE = { me: '/profile/me', create: '/profile', search: '/profile' } as const
export const MEDIA = { upload: '/media/upload', byId: (id: string) => `/media/${id}`, softDelete: (id: string) => `/media/${id}`, hardDelete: (id: string) => `/media/${id}/permanent` } as const
export const PROJECTS = {
  create: '/projects', addressSuggestions: '/projects/address-suggestions',
  publicSearch: '/projects/public/search', mySearch: '/projects/me/search',
  myById: (id: string) => `/projects/me/${id}`, byId: (id: string) => `/projects/${id}`,
  draftSteps: '/projects/draft/steps', stages: (id: string) => `/projects/${id}/stages`,
  basic: (id: string) => `/projects/${id}/basic`, location: (id: string) => `/projects/${id}/location`,
  media: (id: string) => `/projects/${id}/media`, amenities: (id: string) => `/projects/${id}/amenities`,
  units: (id: string) => `/projects/${id}/units`,
} as const
export const LISTINGS = {
  create: '/listings', draftSteps: '/listings/draft/steps',
  publicSearch: '/listings/public/search', mySearch: '/listings/me/search',
  myById: (id: string) => `/listings/me/${id}`, byProject: (id: string) => `/listings/by-project/${id}`,
  byId: (id: string) => `/listings/${id}`, stages: (id: string) => `/listings/${id}/stages`,
  propertyStructure: (id: string) => `/listings/${id}/property-structure`,
  basicDetails: (id: string) => `/listings/${id}/basic-details`, priceArea: (id: string) => `/listings/${id}/price-area`,
  location: (id: string) => `/listings/${id}/location`, media: (id: string) => `/listings/${id}/media`,
  amenities: (id: string) => `/listings/${id}/amenities`,
} as const
export const CHAT = { conversations: '/chat/conversations', messages: (id: string) => `/chat/conversations/${id}/messages` } as const
export const HEALTH = { check: '/health' } as const
export const APP_VERSION = { byPlatform: (p: string) => `/app-version/${p}`, createOrUpdate: '/app-version' } as const
export const MAP = { autocomplete: '/map/autocomplete', placeDetails: '/map/place-details', reverseGeocode: '/map/reverse-geocode' } as const

// ─── Types ────────────────────────────────────────────────────────────────

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload { email: string; password: string; name?: string }
export interface AuthUser { id: string; email: string; name?: string; role?: string }

// ─── Service Classes ──────────────────────────────────────────────────────

export class AuthService extends BaseService {
  constructor(api: IApiClient) { super(api) }
  login(payload: LoginPayload) { return this.api.post(AUTH.loginEmail, payload) }
  register(payload: RegisterPayload) { return this.api.post(AUTH.register, payload) }
  logout() { return this.api.post<ApiResponse<void>>(AUTH.logout) }
  refreshToken() { return this.api.post<{ token: string }>(AUTH.refreshToken) }
  sessions() { return this.api.get<unknown>(AUTH.sessions) }
  verifyAccount(body: { email: string; otp: string }) { return this.api.post(AUTH.verifyAccount, body) }
  forgotPassword(body: { email: string }) { return this.api.post(AUTH.forgotPassword, body) }
  resetPassword(body: { token: string; password: string }) { return this.api.post(AUTH.resetPassword, body) }
}

export class AdminService extends BaseService {
  constructor(api: IApiClient) { super(api) }
  listProfiles(params?: Record<string, string | number>) { return this.api.get(ADMIN.profiles, params) }
  approveProfile(profileId: string) { return this.api.patch<ApiResponse<unknown>>(ADMIN.profileApprove(profileId)) }
  rejectProfile(profileId: string, body?: { reason?: string }) { return this.api.patch(ADMIN.profileReject(profileId), body) }
  publishProject(projectId: string) { return this.api.patch(ADMIN.projectPublish(projectId)) }
  rejectProject(projectId: string, body?: { reason?: string }) { return this.api.patch(ADMIN.projectReject(projectId), body) }
  listUsers(params?: Record<string, string | number>) { return this.api.get(ADMIN.usersList, params) }
  updateUserStatus(userId: string, body: { status: string }) { return this.api.patch(ADMIN.userStatus(userId), body) }
  updateUserRole(userId: string, body: { role: string }) { return this.api.patch(ADMIN.userRole(userId), body) }
  publishListing(listingId: string) { return this.api.patch(ADMIN.listingPublish(listingId)) }
}

export class UserService extends BaseService {
  constructor(api: IApiClient) { super(api) }
  me() { return this.api.get<AuthUser>(USER.me) }
  updateMe(body: Partial<AuthUser & { fullName?: string; phone?: string; bio?: string }>) { return this.api.patch<ApiResponse<AuthUser>>(USER.me, body) }
  getById(id: string) { return this.api.get<AuthUser>(USER.byId(id)) }
  changePassword(body: { currentPassword: string; newPassword: string }) { return this.api.patch<ApiResponse<void>>(USER.changePassword, body) }
  softDelete() { return this.api.delete<ApiResponse<void>>(USER.softDelete) }
  uploadAvatar(body: FormData) { return this.api.post<ApiResponse<{ avatarUrl?: string }>>(USER.avatarUpload, body) }
}

export class ProfileService extends BaseService {
  constructor(api: IApiClient) { super(api) }
  me() { return this.api.get(PROFILE.me) }
  updateMe(body: Record<string, unknown>) { return this.api.patch(PROFILE.me, body) }
  create(body?: Record<string, unknown>) { return this.api.post(PROFILE.create, body) }
  search(params?: Record<string, string | number>) { return this.api.get(PROFILE.search, params) }
}

export class MediaService extends BaseService {
  constructor(api: IApiClient) { super(api) }
  upload(body: FormData) { return this.api.post<ApiResponse<unknown>>(MEDIA.upload, body) }
  getById(id: string) { return this.api.get(MEDIA.byId(id)) }
  softDelete(id: string) { return this.api.delete<ApiResponse<void>>(MEDIA.softDelete(id)) }
  hardDelete(id: string) { return this.api.delete<ApiResponse<void>>(MEDIA.hardDelete(id)) }
}

export class ProjectsService extends BaseService {
  constructor(api: IApiClient) { super(api) }
  createDraft() { return this.api.post<ApiResponse<unknown>>(PROJECTS.create) }
  addressSuggestions(params?: Record<string, string | number>) { return this.api.get(PROJECTS.addressSuggestions, params) }
  searchPublic(params?: Record<string, string | number>) { return this.api.get(PROJECTS.publicSearch, params) }
  searchMine(params?: Record<string, string | number>) { return this.api.get(PROJECTS.mySearch, params) }
  getMineById(projectId: string) { return this.api.get(PROJECTS.myById(projectId)) }
  getById(projectId: string) { return this.api.get(PROJECTS.byId(projectId)) }
  getDraftSteps() { return this.api.get(PROJECTS.draftSteps) }
  getStages(projectId: string) { return this.api.get(PROJECTS.stages(projectId)) }
  getBasic(projectId: string) { return this.api.get(PROJECTS.basic(projectId)) }
  updateBasic(projectId: string, body: Record<string, unknown>) { return this.api.patch(PROJECTS.basic(projectId), body) }
  getLocation(projectId: string) { return this.api.get(PROJECTS.location(projectId)) }
  updateLocation(projectId: string, body: Record<string, unknown>) { return this.api.patch(PROJECTS.location(projectId), body) }
  getMedia(projectId: string) { return this.api.get(PROJECTS.media(projectId)) }
  updateMedia(projectId: string, body: Record<string, unknown>) { return this.api.patch(PROJECTS.media(projectId), body) }
  getAmenities(projectId: string) { return this.api.get(PROJECTS.amenities(projectId)) }
  updateAmenities(projectId: string, body: Record<string, unknown>) { return this.api.patch(PROJECTS.amenities(projectId), body) }
  getUnits(projectId: string) { return this.api.get(PROJECTS.units(projectId)) }
  updateUnits(projectId: string, body: Record<string, unknown>) { return this.api.patch(PROJECTS.units(projectId), body) }
}

export class ListingsService extends BaseService {
  constructor(api: IApiClient) { super(api) }
  createDraft(body?: { projectId?: string; profileId?: string; purpose?: string; category?: string; type?: string }) { return this.api.post<ApiResponse<unknown>>(LISTINGS.create, body) }
  getDraftSteps() { return this.api.get(LISTINGS.draftSteps) }
  searchPublic(params?: Record<string, string | number>) { return this.api.get(LISTINGS.publicSearch, params) }
  searchMine(params?: Record<string, string | number>) { return this.api.get(LISTINGS.mySearch, params) }
  getMineById(listingId: string) { return this.api.get(LISTINGS.myById(listingId)) }
  getByProject(projectId: string, params?: Record<string, string | number>) { return this.api.get(LISTINGS.byProject(projectId), params) }
  getById(listingId: string) { return this.api.get(LISTINGS.byId(listingId)) }
  getStages(listingId: string) { return this.api.get(LISTINGS.stages(listingId)) }
  getPropertyStructure(listingId: string) { return this.api.get(LISTINGS.propertyStructure(listingId)) }
  updatePropertyStructure(listingId: string, body: Record<string, unknown>) { return this.api.patch(LISTINGS.propertyStructure(listingId), body) }
  getBasicDetails(listingId: string) { return this.api.get(LISTINGS.basicDetails(listingId)) }
  updateBasicDetails(listingId: string, body: Record<string, unknown>) { return this.api.patch(LISTINGS.basicDetails(listingId), body) }
  getPriceArea(listingId: string) { return this.api.get(LISTINGS.priceArea(listingId)) }
  updatePriceArea(listingId: string, body: Record<string, unknown>) { return this.api.patch(LISTINGS.priceArea(listingId), body) }
  getLocation(listingId: string) { return this.api.get(LISTINGS.location(listingId)) }
  updateLocation(listingId: string, body: Record<string, unknown>) { return this.api.patch(LISTINGS.location(listingId), body) }
  getMedia(listingId: string) { return this.api.get(LISTINGS.media(listingId)) }
  updateMedia(listingId: string, body: Record<string, unknown>) { return this.api.patch(LISTINGS.media(listingId), body) }
  getAmenities(listingId: string) { return this.api.get(LISTINGS.amenities(listingId)) }
  updateAmenities(listingId: string, body: Record<string, unknown>) { return this.api.patch(LISTINGS.amenities(listingId), body) }
}

export class ChatService extends BaseService {
  constructor(api: IApiClient) { super(api) }
  listConversations(params?: Record<string, string | number>) { return this.api.get(CHAT.conversations, params) }
  getOrCreateConversation(body?: Record<string, unknown>) { return this.api.post<ApiResponse<unknown>>(CHAT.conversations, body) }
  listMessages(conversationId: string, params?: Record<string, string | number>) { return this.api.get(CHAT.messages(conversationId), params) }
}

export class HealthService extends BaseService {
  constructor(api: IApiClient) { super(api) }
  check() { return this.api.get(HEALTH.check) }
}

export class AppVersionService extends BaseService {
  constructor(api: IApiClient) { super(api) }
  getByPlatform(platform: 'android' | 'ios' | string) { return this.api.get(APP_VERSION.byPlatform(platform)) }
  createOrUpdate(body: Record<string, unknown>) { return this.api.post<ApiResponse<unknown>>(APP_VERSION.createOrUpdate, body) }
}

export class MapService extends BaseService {
  constructor(api: IApiClient) { super(api) }
  autocomplete(params?: Record<string, string | number>) { return this.api.get(MAP.autocomplete, params) }
  placeDetails(params?: Record<string, string | number>) { return this.api.get(MAP.placeDetails, params) }
  reverseGeocode(params?: Record<string, string | number>) { return this.api.get(MAP.reverseGeocode, params) }
}

export class OtpService extends BaseService {
  constructor(api: IApiClient) { super(api) }
  sendEmail(body: { email: string }) { return this.api.post<ApiResponse<unknown>>(OTP.sendEmail, body) }
  resendEmail(body: { email: string }) { return this.api.post<ApiResponse<unknown>>(OTP.resendEmail, body) }
  verify(body: { email: string; otp: string }) { return this.api.post<ApiResponse<unknown>>(OTP.verify, body) }
}

// ─── Composables ───────────────────────────────────────────────────────────

export function useAuthService() { return new AuthService(useApi()) }
export function useAdminService() { return new AdminService(useApi()) }
export function useUserService() { return new UserService(useApi()) }
export function useProfileService() { return new ProfileService(useApi()) }
export function useMediaService() { return new MediaService(useApi()) }
export function useProjectsService() { return new ProjectsService(useApi()) }
export function useListingsService() { return new ListingsService(useApi()) }
export function useChatService() { return new ChatService(useApi()) }
export function useHealthService() { return new HealthService(useApi()) }
export function useAppVersionService() { return new AppVersionService(useApi()) }
export function useMapService() { return new MapService(useApi()) }
export function useOtpService() { return new OtpService(useApi()) }
