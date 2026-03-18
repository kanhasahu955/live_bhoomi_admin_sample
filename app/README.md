# Bhoominow Admin Panel

## Structure

```
app/
├── components/
│   └── admin/          # Reusable admin UI components
│       └── DataTable.vue
├── composables/        # Reusable hooks
│   ├── useAuth.ts
│   └── useAsyncData.ts
├── layouts/
│   ├── admin.vue       # Sidebar layout for authenticated pages
│   └── default.vue
├── middleware/
│   └── auth.global.ts  # Auth guard
├── pages/
│   ├── index.vue      # Dashboard
│   ├── login.vue
│   ├── users/
│   └── settings/
├── plugins/
│   └── axios.client.ts # Axios with interceptors
├── services/
│   └── api.ts          # Endpoints, services, composables
├── stores/
│   └── auth.ts         # Pinia auth store
└── types/
    └── api.ts
```

## Features

- **API**: Axios plugin → `useApi()` → endpoint services (auth, etc.)
- **Auth**: Pinia store + `useAuth()` composable + `createAuthMiddleware()` factory
- **Config**: `config/auth.ts` shared by middleware, plugins, composables
- **Theme**: Nuxt UI color mode (light/dark/system)
- **Routing**: File-based with `/admin/` base
- **State**: Pinia with persisted token cookie

## Adding New API Endpoints

1. Add endpoint constants and a service class in `services/api.ts`
2. Add `useYourResourceService()` composable

## Configuration

- `NUXT_PUBLIC_API_BASE` – API base URL (default: `https://api.bhoominow.com/api/v1`)
- Auth: Override `runtimeConfig.public.auth` in `nuxt.config` for `cookieName`, `loginPath`, `homePath`, `publicPaths`

## Reusable Hooks & Middleware

- **useAuth(options?)** – `loginRedirect`, `logoutRedirect` overrides
- **useFetchData(key, fetcher, options?)** – `watch`, `transform`, `onSuccess`, `onError`
- **createAuthMiddleware(options?)** – Custom cookie, paths for route guard
- **createApiPlugin(options?)** – Custom auth config for axios
