<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { themes, type ThemeName, type RemoteView } from '@filamind-app/core'
import { settingsStore } from '@/core/settings'
import { useControlStore } from '@/core/store/control'
import { commandSender, busReady } from '@/core/sender'

const { t } = useI18n()
const router = useRouter()
const ctl = useControlStore()

const LIST_ID = 'command-palette-list'
const open = ref(false)
const query = ref('')
const active = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)
let opener: HTMLElement | null = null

// Keep the highlight valid as the filtered list shrinks/grows.
watch([query, open], () => (active.value = 0))

interface Command {
  id: string
  icon: string
  label: string
  run: () => void
}

const themeNames = Object.keys(themes) as ThemeName[]
function cycleTheme(): void {
  const i = themeNames.indexOf(settingsStore.value.theme)
  const next = themeNames[(i + 1) % themeNames.length]
  if (next) settingsStore.patch({ theme: next })
}

// Push the on-printer screen to a tab (only when the command bus is connected + identified).
const REMOTE_TABS: { view: RemoteView; key: string; icon: string }[] = [
  { view: 'status', key: 'screenStatus', icon: '📊' },
  { view: 'control', key: 'screenControl', icon: '🎛' },
  { view: 'settings', key: 'screenSettings', icon: '⚙️' },
]

const commands = computed<Command[]>(() => [
  {
    id: 'nav-dashboard',
    icon: '🏠',
    label: t('palette.cmd.dashboard'),
    run: () => void router.push('/'),
  },
  {
    id: 'nav-settings',
    icon: '⚙️',
    label: t('palette.cmd.settings'),
    run: () => void router.push('/settings'),
  },
  { id: 'theme-cycle', icon: '🎨', label: t('palette.cmd.cycleTheme'), run: cycleTheme },
  { id: 'home', icon: '🏠', label: t('palette.cmd.home'), run: () => void ctl.home() },
  { id: 'estop', icon: '⛔', label: t('palette.cmd.estop'), run: () => void ctl.emergencyStop() },
  ...(busReady.value
    ? [
        ...REMOTE_TABS.map((rt) => ({
          id: `screen-${rt.view}`,
          icon: rt.icon,
          label: t(`palette.cmd.${rt.key}`),
          run: () => void commandSender.navigate(rt.view),
        })),
        {
          id: 'screen-locate',
          icon: '📍',
          label: t('palette.cmd.screenLocate'),
          run: () => void commandSender.locate(),
        },
      ]
    : []),
])

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return commands.value
  return commands.value.filter((c) => c.label.toLowerCase().includes(q))
})

async function show(): Promise<void> {
  opener = document.activeElement as HTMLElement | null
  open.value = true
  query.value = ''
  active.value = 0
  await nextTick()
  inputEl.value?.focus()
}
function hide(): void {
  open.value = false
  opener?.focus() // return focus to where the user was (WCAG 2.4.3)
}
function select(cmd: Command): void {
  cmd.run()
  hide()
}
function runActive(): void {
  const cmd = filtered.value[active.value]
  if (cmd) select(cmd)
}

function onKey(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    if (open.value) hide()
    else void show()
    return
  }
  if (!open.value) return
  if (e.key === 'Tab') {
    e.preventDefault() // trap focus: the input is the only focusable element in the dialog
    inputEl.value?.focus()
  } else if (e.key === 'Escape') hide()
  else if (e.key === 'ArrowDown') {
    e.preventDefault()
    active.value = Math.min(active.value + 1, filtered.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    active.value = Math.max(active.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    runActive()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <button class="fm-btn trigger" :aria-label="t('palette.open')" @click="show">
    <span aria-hidden="true">⌘</span>
    <span class="trigger-label">{{ t('palette.open') }}</span>
    <kbd>K</kbd>
  </button>

  <teleport to="body">
    <div v-if="open" class="backdrop" @click.self="hide">
      <div class="palette" role="dialog" aria-modal="true" :aria-label="t('palette.open')">
        <input
          ref="inputEl"
          v-model="query"
          class="palette-input"
          type="text"
          role="combobox"
          :aria-label="t('palette.placeholder')"
          :aria-expanded="true"
          :aria-controls="LIST_ID"
          :aria-activedescendant="filtered.length ? `palette-opt-${active}` : undefined"
          :placeholder="t('palette.placeholder')"
        />
        <ul :id="LIST_ID" class="palette-list" role="listbox">
          <li
            v-for="(c, i) in filtered"
            :id="`palette-opt-${i}`"
            :key="c.id"
            role="option"
            :aria-selected="i === active"
            :class="['palette-item', { active: i === active }]"
            @mouseenter="active = i"
            @click="select(c)"
          >
            <span aria-hidden="true">{{ c.icon }}</span>
            <span>{{ c.label }}</span>
          </li>
          <li v-if="filtered.length === 0" class="palette-empty">{{ t('palette.empty') }}</li>
        </ul>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.trigger-label {
  font-size: 0.85rem;
}
.trigger kbd {
  font-size: 0.7rem;
  padding: 0.05rem 0.35rem;
  border: 1px solid var(--fm-border);
  border-radius: 5px;
  color: var(--fm-text-muted);
}
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  z-index: 50;
}
.palette {
  width: min(560px, 92vw);
  background: var(--fm-surface);
  border: 1px solid var(--fm-border);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
}
.palette-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.9rem 1rem;
  background: var(--fm-surface-2);
  color: var(--fm-text);
  border: 0;
  border-bottom: 1px solid var(--fm-border);
  font-size: 0.95rem;
  outline: none;
}
.palette-list {
  list-style: none;
  margin: 0;
  padding: 0.4rem;
  max-height: 50vh;
  overflow: auto;
}
.palette-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 0.75rem;
  border-radius: 9px;
  cursor: pointer;
  color: var(--fm-text);
}
.palette-item.active {
  background: var(--fm-surface-2);
}
.palette-empty {
  padding: 0.9rem;
  color: var(--fm-text-muted);
  text-align: center;
}
</style>
