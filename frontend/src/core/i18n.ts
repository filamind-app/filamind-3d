// vue-i18n setup bridged to @filamind-app/core's locale metadata (the single source for the
// 19-locale list, RTL, and CLDR plurals). English is bundled eagerly (offline-first first
// paint); the other locales lazy-load. Catalogs that don't exist for a locale fall back to en.

import { createI18n, type Composer } from 'vue-i18n'
import { LOCALES, DEFAULT_LOCALE, isRtl } from '@filamind-app/core'
import { settingsStore } from './settings'

type MessageTree = { [key: string]: string | MessageTree }

function assemble(modules: Record<string, { default: MessageTree }>): MessageTree {
  const out: MessageTree = {}
  for (const path in modules) {
    const file = path.split('/').pop()
    if (!file) continue
    out[file.replace('.json', '')] = modules[path]?.default ?? {}
  }
  return out
}

// English bundled at build time.
const enModules = import.meta.glob('../locales/en/*.json', { eager: true }) as Record<
  string,
  { default: MessageTree }
>
const enMessages = assemble(enModules)

// The other locales as lazy chunks (en is excluded — it's bundled eagerly above).
const lazyLocales = import.meta.glob(['../locales/*/*.json', '!../locales/en/*.json']) as Record<
  string,
  () => Promise<{ default: MessageTree }>
>

// Locales that actually ship a catalog on disk. The language switcher and locale detection
// both bound to these, so we never set <html lang> to a code that has no messages.
const shippedCodes = new Set<string>([DEFAULT_LOCALE])
for (const path in lazyLocales) {
  const m = /\/locales\/([^/]+)\//.exec(path)
  if (m?.[1]) shippedCodes.add(m[1])
}
export const availableLocales = LOCALES
export const shippedLocales = LOCALES.filter((l) => shippedCodes.has(l.code))

const initialMessages: Record<string, MessageTree> = { [DEFAULT_LOCALE]: enMessages }

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: initialMessages,
})

// legacy:false → the global is a Composer; cast once to avoid the union's `string` locale type.
export const composer = i18n.global as unknown as Composer

const loaded = new Set<string>([DEFAULT_LOCALE])

export async function loadLocale(code: string): Promise<void> {
  if (loaded.has(code)) return
  const out: MessageTree = {}
  for (const path in lazyLocales) {
    if (!path.includes(`/locales/${code}/`)) continue
    const loader = lazyLocales[path]
    if (!loader) continue
    const mod = await loader()
    const file = path.split('/').pop()
    if (file) out[file.replace('.json', '')] = mod.default
  }
  composer.setLocaleMessage(code, out)
  loaded.add(code)
}

export function applyDocumentLocale(code: string): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = code
  document.documentElement.dir = isRtl(code) ? 'rtl' : 'ltr'
}

export async function setLocale(code: string): Promise<void> {
  await loadLocale(code)
  composer.locale.value = code
  applyDocumentLocale(code)
}

/** Keep vue-i18n's active locale in sync with the settings store when the locale changes from
 *  somewhere other than the language picker — a roamed change from another surface, an import, or
 *  a reset. Local picks already call setLocale(); the current-locale guard dedupes those. */
export function initLocaleSync(): void {
  let current = composer.locale.value
  settingsStore.settings.subscribe((s) => {
    if (s.locale === current) return
    current = s.locale
    void setLocale(s.locale)
  })
}

/** Pick a locale that actually ships a catalog (never a code we have no messages for). */
export function detectLocale(stored?: string): string {
  if (stored && shippedCodes.has(stored)) return stored
  if (typeof navigator !== 'undefined' && navigator.language) {
    const nav = navigator.language
    if (shippedCodes.has(nav)) return nav
    const base = nav.split('-')[0]
    if (base && shippedCodes.has(base)) return base
  }
  return DEFAULT_LOCALE
}
