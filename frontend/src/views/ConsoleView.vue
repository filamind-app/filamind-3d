<script setup lang="ts">
// G-code console: send commands and watch Klipper's responses. Uses a dedicated, lightweight
// MoonrakerClient (like the command-bus sender) so tapping notify_gcode_response never clobbers the
// main data session's callbacks. Sends go through the gated control store (write-arbiter + safe mode).
import { onMounted, onUnmounted, nextTick, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { MoonrakerClient } from '@filamind-app/core'

import { moonrakerWsUrl } from '@/core/session'
import { useControlStore } from '@/core/store/control'
import { useWriteGuard } from '@/core/useWriteGuard'

const { t } = useI18n()
const ctl = useControlStore()
const { canWrite, blockedReason } = useWriteGuard()

interface Line {
  id: number
  kind: 'sent' | 'recv'
  text: string
}
const lines = ref<Line[]>([])
const input = ref('')
const history = ref<string[]>([])
let histIdx = -1
let seq = 0
const logEl = useTemplateRef<HTMLElement>('logEl')

// A second, read-only connection dedicated to the console response stream.
const tap = new MoonrakerClient({ url: moonrakerWsUrl })

function push(kind: Line['kind'], text: string): void {
  lines.value.push({ id: seq++, kind, text })
  if (lines.value.length > 500) lines.value.splice(0, lines.value.length - 500)
  void nextTick(() => {
    const el = logEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

onMounted(async () => {
  tap.setCallbacks({
    onUpdate: (method, params) => {
      if (method === 'notify_gcode_response' && Array.isArray(params)) {
        for (const l of params as string[]) push('recv', String(l))
      }
    },
  })
  try {
    await tap.connect()
  } catch {
    push('recv', t('console.connectError'))
  }
})
onUnmounted(() => tap.close())

async function send(): Promise<void> {
  const cmd = input.value.trim()
  if (!cmd) return
  push('sent', cmd)
  history.value.push(cmd)
  histIdx = history.value.length
  input.value = ''
  await ctl.runGcode(cmd)
  if (ctl.lastError) push('recv', `!! ${t('console.error.' + ctl.lastError)}`)
}

// Up/Down recall previous commands (classic console behaviour).
function onKey(e: KeyboardEvent): void {
  if (e.key === 'ArrowUp') {
    if (histIdx > 0) {
      histIdx--
      input.value = history.value[histIdx] ?? ''
      e.preventDefault()
    }
  } else if (e.key === 'ArrowDown') {
    if (histIdx < history.value.length - 1) {
      histIdx++
      input.value = history.value[histIdx] ?? ''
    } else {
      histIdx = history.value.length
      input.value = ''
    }
    e.preventDefault()
  }
}

const QUICK = ['G28', 'M115', 'STATUS', 'FIRMWARE_RESTART']
function quick(cmd: string): void {
  input.value = cmd
  void send()
}
</script>

<template>
  <div class="console">
    <h1 class="page-title">{{ t('console.title') }}</h1>

    <div ref="logEl" class="log" role="log" aria-live="polite">
      <p v-if="!lines.length" class="empty">{{ t('console.empty') }}</p>
      <p v-for="l in lines" :key="l.id" class="line" :class="l.kind">
        <span class="marker" aria-hidden="true">{{ l.kind === 'sent' ? '›' : '‹' }}</span>
        <span class="txt">{{ l.text }}</span>
      </p>
    </div>

    <div class="quick">
      <button
        v-for="q in QUICK"
        :key="q"
        class="fm-btn quick-btn"
        type="button"
        :disabled="!canWrite"
        :title="canWrite ? '' : blockedReason"
        @click="quick(q)"
      >
        {{ q }}
      </button>
    </div>

    <form class="entry" @submit.prevent="send">
      <input
        v-model="input"
        class="cmd"
        type="text"
        autocomplete="off"
        spellcheck="false"
        :placeholder="t('console.placeholder')"
        :aria-label="t('console.title')"
        @keydown="onKey"
      />
      <button class="fm-btn send" type="submit" :disabled="!canWrite || !input.trim()">
        {{ t('console.send') }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.console {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  height: 100%;
}
.page-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--fm-text);
}
.log {
  flex: 1;
  min-height: 16rem;
  overflow-y: auto;
  border: 1px solid var(--fm-border);
  border-radius: 10px;
  background: var(--fm-surface-2, rgba(0, 0, 0, 0.2));
  padding: 0.6rem 0.8rem;
  font-family: var(--font-mono);
  font-size: 0.82rem;
}
.empty {
  color: var(--fm-text-muted);
}
.line {
  display: flex;
  gap: 0.5rem;
  margin: 0.05rem 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.line.sent .txt {
  color: var(--fm-primary);
}
.line.recv .txt {
  color: var(--fm-text);
}
.marker {
  color: var(--fm-text-muted);
  flex-shrink: 0;
}
.quick {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.quick-btn {
  font-size: 0.78rem;
  padding: 0.25rem 0.6rem;
}
.entry {
  display: flex;
  gap: 0.5rem;
}
.cmd {
  flex: 1;
  border: 1px solid var(--fm-border);
  border-radius: 8px;
  background: var(--fm-surface);
  color: var(--fm-text);
  padding: 0.5rem 0.7rem;
  font-family: var(--font-mono);
  font-size: 0.9rem;
}
.send {
  flex-shrink: 0;
}
</style>
