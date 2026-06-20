<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/core/store/session'
import { useControlStore } from '@/core/store/control'
import { useWriteGuard } from '@/core/useWriteGuard'

const { t } = useI18n()
const session = useSessionStore()
const ctl = useControlStore()
const { canWrite } = useWriteGuard()

interface ExcludeObjectState {
  objects?: { name: string }[]
  excluded_objects?: string[]
  current_object?: string | null
}

const raw = computed(() => session.object<ExcludeObjectState>('exclude_object'))
const configured = computed(() => raw.value !== undefined)
const objects = computed(() => raw.value?.objects ?? [])
const excluded = computed(() => new Set(raw.value?.excluded_objects ?? []))
const current = computed(() => raw.value?.current_object ?? null)

// Klipper's standard gcode param parser splits on whitespace, so EXCLUDE_OBJECT can only
// target single-token names. Names are normally slicer-sanitized; guard against the rest.
const isTargetable = (name: string): boolean => /^\S+$/.test(name)
</script>

<template>
  <div class="exclude">
    <p class="help">{{ t('widgets.excludeObject.help') }}</p>

    <p v-if="!session.live" class="muted">{{ t('shell.trust.offline') }}</p>
    <p v-else-if="!configured" class="muted">{{ t('widgets.excludeObject.notConfigured') }}</p>
    <p v-else-if="objects.length === 0" class="muted">{{ t('widgets.excludeObject.none') }}</p>
    <ul v-else class="list">
      <li v-for="o in objects" :key="o.name" class="row">
        <span class="name" :title="o.name">{{ o.name }}</span>
        <span v-if="excluded.has(o.name)" class="tag excluded">
          {{ t('widgets.excludeObject.excluded') }}
        </span>
        <span v-else-if="o.name === current" class="tag current">
          {{ t('widgets.excludeObject.current') }}
        </span>
        <button
          v-else-if="isTargetable(o.name)"
          class="fm-btn small"
          type="button"
          :disabled="!canWrite"
          :aria-label="`${t('widgets.excludeObject.exclude')} ${o.name}`"
          @click="ctl.excludeObject(o.name)"
        >
          {{ t('widgets.excludeObject.exclude') }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.exclude {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.help {
  margin: 0;
  font-size: 0.78rem;
  color: var(--fm-text-muted);
}
.muted {
  margin: 0;
  font-size: 0.85rem;
  color: var(--fm-text-muted);
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}
.name {
  font-size: 0.82rem;
  color: var(--fm-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.small {
  font-size: 0.78rem;
  padding: 0.3rem 0.6rem;
}
.tag {
  flex: none;
  font-size: 0.72rem;
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
}
.tag.excluded {
  color: var(--fm-danger);
  border: 1px solid var(--fm-danger);
}
.tag.current {
  color: var(--fm-accent);
  border: 1px solid var(--fm-accent);
}
</style>
