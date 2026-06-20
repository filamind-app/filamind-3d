<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PromptDialog as PromptDialogData, PromptButton } from '@filamind-app/core'
import { useSessionStore } from '@/core/store/session'
import { useControlStore } from '@/core/store/control'

const { t } = useI18n()
const session = useSessionStore()
const ctl = useControlStore()

const dialog = ref<PromptDialogData | null>(null)
const panel = ref<HTMLElement | null>(null)
let opener: HTMLElement | null = null

// Klipper drives prompts over notify_gcode_response (parsed by core into show/end events).
// immediate: catch a show event already present when this component mounts.
watch(
  () => session.prompt,
  (ev) => {
    if (!ev) return
    if (ev.type === 'show') void open(ev.dialog)
    else close()
  },
  { immediate: true },
)

// Don't leave a stale modal up if the printer drops mid-prompt.
watch(
  () => session.live,
  (live) => {
    if (!live) close()
  },
)

async function open(d: PromptDialogData): Promise<void> {
  opener = document.activeElement as HTMLElement | null
  dialog.value = d
  await nextTick()
  const first = panel.value?.querySelector<HTMLElement>('button')
  ;(first ?? panel.value)?.focus()
}

function close(): void {
  if (!dialog.value) return
  dialog.value = null
  opener?.focus() // restore focus (WCAG 2.4.3)
}

async function clickButton(b: PromptButton): Promise<void> {
  if (b.gcode) {
    await ctl.runGcode(b.gcode)
    if (ctl.lastError) return // refused/failed → keep the dialog open with the error shown
  }
  close()
}

function trapTab(e: KeyboardEvent): void {
  const nodes = Array.from(panel.value?.querySelectorAll<HTMLElement>('button') ?? [])
  if (nodes.length === 0) return
  const first = nodes[0]!
  const last = nodes[nodes.length - 1]!
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

function onKey(e: KeyboardEvent): void {
  if (!dialog.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'Tab') {
    trapTab(e)
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <teleport to="body">
    <div v-if="dialog" class="backdrop" @click.self="close">
      <div
        ref="panel"
        class="prompt fm-card"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        :aria-labelledby="dialog.title ? 'prompt-title' : undefined"
        :aria-label="dialog.title ? undefined : t('prompt.title')"
      >
        <h2 v-if="dialog.title" id="prompt-title" class="prompt-title">{{ dialog.title }}</h2>
        <p v-for="(line, i) in dialog.text" :key="`t${i}`" class="prompt-line">{{ line }}</p>

        <p v-if="ctl.lastError" class="prompt-error" role="alert">
          {{ t('control.error.' + ctl.lastError) }}
        </p>

        <div class="prompt-actions">
          <button
            v-for="(b, i) in dialog.buttons"
            :key="`b${i}`"
            type="button"
            class="fm-btn"
            :class="{ 'fm-btn-primary': b.style === 'primary', warning: b.style === 'warning' }"
            @click="clickButton(b)"
          >
            {{ b.label }}
          </button>
          <!-- Always offer a keyboard-reachable way out (text-only prompts have no buttons). -->
          <button
            v-if="dialog.buttons.length === 0 && dialog.footer.length === 0"
            type="button"
            class="fm-btn"
            @click="close"
          >
            {{ t('prompt.close') }}
          </button>
        </div>

        <div v-if="dialog.footer.length" class="prompt-footer">
          <button
            v-for="(b, i) in dialog.footer"
            :key="`f${i}`"
            type="button"
            class="fm-btn"
            @click="clickButton(b)"
          >
            {{ b.label }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 60;
}
.prompt {
  width: min(440px, 92vw);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.prompt:focus {
  outline: none;
}
.prompt-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--fm-text);
}
.prompt-line {
  margin: 0;
  font-size: 0.9rem;
  color: var(--fm-text-muted);
}
.prompt-error {
  margin: 0;
  font-size: 0.85rem;
  color: var(--fm-danger);
}
.prompt-actions,
.prompt-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.prompt-footer {
  border-top: 1px solid var(--fm-border);
  padding-top: 0.75rem;
}
.warning {
  border-color: var(--fm-warning);
  color: var(--fm-warning);
}
</style>
