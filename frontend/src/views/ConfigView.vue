<script setup lang="ts">
// Klipper / Moonraker config editor. Lists the printer's config root (.cfg / .conf), opens a file
// over the REST file channel, and lets you edit + save it. Reading any file is always safe; saving
// is gated by the write guard AND limited to root-level files, because the shared upload channel
// places a file by its name at the root top level - it can't preserve a subdirectory, so saving a
// nested file would land it in the wrong place. Nested files therefore open read-only with a note.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { connector } from '@/core/session'
import { useControlStore } from '@/core/store/control'
import { useWriteGuard } from '@/core/useWriteGuard'

const { t } = useI18n()
const ctl = useControlStore()
const { canWrite, blockedReason } = useWriteGuard()

interface CfgFile {
  path: string
  modified?: number
  size?: number
}
const files = ref<CfgFile[]>([])
const loading = ref(true)
const listError = ref('')
const filter = ref('')

const current = ref<CfgFile | null>(null)
const original = ref('')
const draft = ref('')
const opening = ref(false)
const openError = ref('')
const saving = ref(false)
const saveError = ref('')
const savedAt = ref(0)
const confirmRestart = ref(false)

const CFG_RE = /\.(cfg|conf)$/i

async function refresh(): Promise<void> {
  loading.value = true
  listError.value = ''
  try {
    const list = await connector.call<CfgFile[]>('server.files.list', { root: 'config' })
    files.value = list
      .filter((f) => CFG_RE.test(f.path))
      // Root-level files first (the primary configs), then everything else, each alphabetical.
      .sort((a, b) => {
        const an = a.path.includes('/') ? 1 : 0
        const bn = b.path.includes('/') ? 1 : 0
        return an - bn || a.path.localeCompare(b.path)
      })
  } catch {
    listError.value = t('config.listError')
  } finally {
    loading.value = false
  }
}
onMounted(refresh)

const shown = computed(() => {
  const q = filter.value.trim().toLowerCase()
  return q ? files.value.filter((f) => f.path.toLowerCase().includes(q)) : files.value
})

const isNested = (p: string): boolean => p.includes('/')
const baseName = (p: string): string => p.split('/').pop() ?? p
const dirName = (p: string): string => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '')

const dirty = computed(() => current.value !== null && draft.value !== original.value)
const readOnly = computed(() => current.value !== null && isNested(current.value.path))
const canSave = computed(
  () => current.value !== null && !readOnly.value && dirty.value && canWrite.value && !saving.value,
)

async function open(f: CfgFile): Promise<void> {
  if (dirty.value && !window.confirm(t('config.discardConfirm'))) return
  opening.value = true
  openError.value = ''
  saveError.value = ''
  savedAt.value = 0
  confirmRestart.value = false
  current.value = f
  try {
    const blob = await connector.download(`config/${f.path}`)
    const text = await blob.text()
    original.value = text
    draft.value = text
  } catch {
    openError.value = t('config.openError')
    original.value = ''
    draft.value = ''
  } finally {
    opening.value = false
  }
}

function revert(): void {
  draft.value = original.value
  saveError.value = ''
}

async function save(): Promise<void> {
  const f = current.value
  if (!f || !canSave.value) return
  saving.value = true
  saveError.value = ''
  try {
    const file = new File([draft.value], f.path, { type: 'text/plain' })
    await connector.upload('config', file)
    original.value = draft.value
    savedAt.value = Date.now()
    void refresh()
  } catch {
    saveError.value = t('config.saveError')
  } finally {
    saving.value = false
  }
}

// After saving a config, Klipper needs a restart to apply it. Two-step confirm; gated like any write.
async function restart(): Promise<void> {
  if (!canWrite.value) return
  if (!confirmRestart.value) {
    confirmRestart.value = true
    return
  }
  confirmRestart.value = false
  await ctl.runGcode('FIRMWARE_RESTART')
}
</script>

<template>
  <div class="config">
    <aside class="pane-list">
      <div class="list-head">
        <h1 class="page-title">{{ t('config.title') }}</h1>
        <button
          class="fm-btn icon"
          type="button"
          :disabled="loading"
          :title="t('config.refresh')"
          @click="refresh"
        >
          ↻
        </button>
      </div>
      <input
        v-model="filter"
        class="search"
        type="search"
        autocomplete="off"
        spellcheck="false"
        :placeholder="t('config.search')"
        :aria-label="t('config.search')"
      />

      <p v-if="listError" role="alert" class="fm-card error">{{ listError }}</p>
      <p v-if="loading" class="muted">{{ t('config.loading') }}</p>
      <p v-else-if="!shown.length" class="muted">{{ t('config.noFiles') }}</p>

      <ul v-else class="files">
        <li v-for="f in shown" :key="f.path">
          <button
            class="file"
            type="button"
            :class="{ active: current?.path === f.path }"
            @click="open(f)"
          >
            <span class="fname">{{ baseName(f.path) }}</span>
            <span v-if="isNested(f.path)" class="fdir">{{ dirName(f.path) }}</span>
          </button>
        </li>
      </ul>
    </aside>

    <section class="pane-edit">
      <p v-if="!current" class="muted placeholder">{{ t('config.selectPrompt') }}</p>

      <template v-else>
        <div class="edit-head">
          <div class="title-wrap">
            <span class="edit-path" :title="current.path">{{ current.path }}</span>
            <span v-if="readOnly" class="badge ro">{{ t('config.readOnly') }}</span>
            <span v-else-if="dirty" class="badge dirty">{{ t('config.unsaved') }}</span>
          </div>
          <div class="edit-actions">
            <button
              v-if="!readOnly"
              class="fm-btn"
              type="button"
              :disabled="!dirty || saving"
              @click="revert"
            >
              {{ t('config.revert') }}
            </button>
            <button
              v-if="!readOnly"
              class="fm-btn primary"
              type="button"
              :disabled="!canSave"
              :title="canWrite ? '' : blockedReason"
              @click="save"
            >
              {{ saving ? t('config.saving') : t('config.save') }}
            </button>
          </div>
        </div>

        <p v-if="readOnly" class="fm-card note">{{ t('config.nestedNote') }}</p>
        <p v-if="openError" role="alert" class="fm-card error">{{ openError }}</p>
        <p v-if="saveError" role="alert" class="fm-card error">{{ saveError }}</p>

        <div v-if="savedAt" class="fm-card saved">
          <span>{{ t('config.savedApply') }}</span>
          <span class="restart-wrap">
            <button
              class="fm-btn warn"
              type="button"
              :disabled="!canWrite"
              :title="canWrite ? '' : blockedReason"
              @click="restart"
            >
              {{ confirmRestart ? t('config.restartConfirm') : t('config.restart') }}
            </button>
            <button
              v-if="confirmRestart"
              class="fm-btn"
              type="button"
              @click="confirmRestart = false"
            >
              {{ t('config.cancel') }}
            </button>
          </span>
        </div>

        <p v-if="opening" class="muted">{{ t('config.opening') }}</p>
        <textarea
          v-else
          v-model="draft"
          class="editor font-mono"
          :readonly="readOnly"
          spellcheck="false"
          autocomplete="off"
          autocapitalize="off"
          wrap="off"
          :aria-label="current.path"
        ></textarea>
      </template>
    </section>
  </div>
</template>

<style scoped>
.config {
  display: grid;
  grid-template-columns: 16rem 1fr;
  gap: 1rem;
  height: 100%;
  min-height: 0;
}
.pane-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-height: 0;
  border-inline-end: 1px solid var(--fm-border);
  padding-inline-end: 1rem;
}
.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.page-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--fm-text);
}
.icon {
  flex-shrink: 0;
}
.search {
  border: 1px solid var(--fm-border);
  border-radius: 8px;
  background: var(--fm-surface);
  color: var(--fm-text);
  padding: 0.4rem 0.6rem;
  font-size: 0.85rem;
}
.muted {
  color: var(--fm-text-muted);
  padding: 0.5rem 0;
}
.placeholder {
  display: grid;
  place-items: center;
  height: 100%;
}
.error {
  background: var(--fm-danger, crimson);
  color: #fff;
  padding: 0.5rem 0.8rem;
}
.note {
  background: var(--fm-surface-2, rgba(0, 0, 0, 0.15));
  color: var(--fm-text-muted);
  padding: 0.5rem 0.8rem;
  font-size: 0.85rem;
}
.files {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.file {
  width: 100%;
  text-align: start;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  padding: 0.4rem 0.55rem;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--fm-text);
  cursor: pointer;
  border-inline-start: 3px solid transparent;
}
.file:hover {
  background: var(--fm-surface-2);
}
.file.active {
  background: var(--fm-surface-2);
  border-inline-start-color: var(--fm-primary);
}
.fname {
  font-size: 0.86rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fdir {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--fm-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pane-edit {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 0;
  min-height: 0;
}
.edit-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.title-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}
.edit-path {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--fm-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.badge {
  flex-shrink: 0;
  font-size: 0.68rem;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
}
.badge.ro {
  background: var(--fm-surface-2);
  color: var(--fm-text-muted);
}
.badge.dirty {
  background: var(--fm-primary);
  color: var(--fm-primary-contrast);
}
.edit-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}
.saved {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  background: var(--fm-surface-2, rgba(0, 0, 0, 0.15));
  color: var(--fm-text);
  padding: 0.5rem 0.8rem;
  font-size: 0.85rem;
}
.restart-wrap {
  display: flex;
  gap: 0.5rem;
}
.editor {
  flex: 1;
  min-height: 18rem;
  resize: vertical;
  border: 1px solid var(--fm-border);
  border-radius: 10px;
  background: var(--fm-surface-2, rgba(0, 0, 0, 0.2));
  color: var(--fm-text);
  padding: 0.7rem 0.85rem;
  font-size: 0.82rem;
  line-height: 1.5;
  white-space: pre;
  tab-size: 4;
}
.editor[readonly] {
  opacity: 0.85;
}

@media (max-width: 720px) {
  .config {
    grid-template-columns: 1fr;
  }
  .pane-list {
    border-inline-end: none;
    border-bottom: 1px solid var(--fm-border);
    padding-inline-end: 0;
    padding-bottom: 0.8rem;
    max-height: 14rem;
  }
}
</style>
