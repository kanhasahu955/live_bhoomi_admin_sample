/**
 * Shared Nuxt UI `UModal` `:ui` presets for a consistent admin look
 * (rounded shell, soft header/footer, mint-friendly neutrals).
 *
 * Note: theme defaults include `flex flex-col` on content — keep that so header/body/footer
 * stack correctly inside the dialog (replacing `content` entirely drops it otherwise).
 */
const shellContentFlex = 'flex flex-col min-h-0 focus:outline-none'

export const adminModalUiCompact = {
  content:
    'max-w-[92vw] sm:max-w-md overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-2xl shadow-gray-900/[0.08] ring-1 ring-black/[0.04] dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/40 dark:ring-white/[0.06] ' +
    shellContentFlex,
  header:
    'border-b border-gray-200/80 bg-gradient-to-b from-white via-white to-gray-50/40 px-5 py-4 dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950/80 shrink-0',
  body:
    'flex-1 min-h-0 overflow-y-auto bg-white px-5 py-5 sm:px-6 sm:py-6 dark:bg-gray-900',
  footer:
    'shrink-0 border-t border-gray-200/80 bg-gradient-to-b from-gray-50/90 via-gray-50/70 to-gray-100/50 px-5 py-4 dark:border-gray-800 dark:from-gray-900/95 dark:via-gray-950/90 dark:to-gray-950 sm:px-6'
} as const

export const adminModalUiWide = {
  ...adminModalUiCompact,
  content:
    'max-w-[94vw] sm:max-w-2xl overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-2xl shadow-gray-900/[0.08] ring-1 ring-black/[0.04] dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/40 dark:ring-white/[0.06] ' +
    shellContentFlex,
  header:
    'border-b border-gray-200/80 bg-gradient-to-b from-white via-white to-gray-50/40 px-5 py-4 sm:px-8 sm:py-5 dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950/80 shrink-0',
  title: 'text-lg font-semibold tracking-tight text-gray-900 dark:text-white',
  description: 'mt-1 text-sm leading-relaxed text-gray-500 dark:text-gray-400',
  body:
    'flex-1 min-h-0 overflow-y-auto bg-gray-50/60 px-5 py-6 sm:px-8 sm:py-7 dark:bg-gray-950/50',
  footer:
    'shrink-0 border-t border-gray-200/80 bg-gradient-to-b from-gray-50/95 via-white/90 to-gray-50/80 px-5 py-4 dark:border-gray-800 dark:from-gray-900/95 dark:via-gray-950/90 dark:to-gray-950 sm:px-8'
} as const

export const adminModalUiMedia = {
  ...adminModalUiCompact,
  content:
    'max-w-[96vw] sm:max-w-4xl lg:max-w-5xl overflow-hidden rounded-2xl border border-gray-200/70 bg-white shadow-2xl shadow-gray-900/[0.08] ring-1 ring-black/[0.04] dark:border-gray-800 dark:bg-gray-900 dark:shadow-black/40 dark:ring-white/[0.06] ' +
    shellContentFlex,
  header:
    'border-b border-gray-200/80 bg-gradient-to-b from-white via-white to-gray-50/40 px-4 py-3 dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950/80 sm:px-5 sm:py-4 shrink-0',
  body:
    'flex-1 min-h-0 overflow-y-auto bg-white px-4 py-4 sm:px-5 sm:py-5 dark:bg-gray-900',
  footer:
    'shrink-0 border-t border-gray-200/80 bg-gradient-to-b from-gray-50/90 via-gray-50/70 to-gray-100/50 px-4 py-3 dark:border-gray-800 dark:from-gray-900/95 dark:via-gray-950/90 dark:to-gray-950 sm:px-5 sm:py-4'
} as const

/** Modal that must sit above fixed nav / stacking contexts (e.g. user detail). */
export function adminModalUiStacked() {
  return {
    ...adminModalUiCompact,
    content: `${adminModalUiCompact.content} z-[100]`,
    overlay: 'z-[90]'
  } as const
}
