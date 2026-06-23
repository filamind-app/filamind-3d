<script setup lang="ts">
// The control dashboard: a fixed 2x2 of the things you reach for most - the live print job,
// temperatures (with quick material presets), motion (jog / home / Z babystep), and the webcam.
// Every write goes through the gated control store; values come from the live session store.
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSessionStore } from '@/core/store/session'
import { useControlStore } from '@/core/store/control'
import { useWriteGuard } from '@/core/useWriteGuard'

const { t } = useI18n()
const session = useSessionStore()
const ctl = useControlStore()
const { canWrite, blockedReason } = useWriteGuard()

interface Heater {
  temperature?: number
  target?: number
}
interface PrintStats {
  state?: string
  filename?: string
  print_duration?: number
  info?: { current_layer?: number | null; total_layer?: number | null }
}

const ext = computed(() => session.object<Heater>('extruder'))
const bed = computed(() => session.object<Heater>('heater_bed'))
const stats = computed<PrintStats>(() => session.object<PrintStats>('print_stats') ?? {})
const sdProg = computed(() => session.object<{ progress?: number }>('virtual_sdcard')?.progress)
const dispProg = computed(() => session.object<{ progress?: number }>('display_status')?.progress)

const progress = computed(() => Math.round((sdProg.value ?? dispProg.value ?? 0) * 100))
const layer = computed(() => stats.value.info ?? {})
const state = computed(() => stats.value.state ?? 'standby')
const active = computed(() => state.value === 'printing' || state.value === 'paused')

const eta = computed(() => {
  const frac = sdProg.value ?? dispProg.value ?? 0
  const elapsed = stats.value.print_duration ?? 0
  if (!active.value || frac <= 0.01 || elapsed <= 0) return ''
  const m = Math.round((elapsed * (1 - frac)) / frac / 60)
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`
})

const fmt = (n?: number): string => `${Math.round(n ?? 0)}°`

// --- temperatures: a tiny rolling sparkline + one-tap material presets -------------------
const history = ref<number[]>([])
const extTemp = computed(() => ext.value?.temperature ?? 0)
// Keep the last 24 hotend samples for the sparkline (the store updates ~1 Hz).
watch(extTemp, (v) => {
  history.value = [...history.value.slice(-23), v]
})
const spark = computed(() => {
  const xs = history.value.length ? history.value : [extTemp.value]
  const max = Math.max(60, ...xs)
  const pts = xs.map((v, i) => {
    const x = xs.length > 1 ? (i / (xs.length - 1)) * 200 : 0
    const y = 30 - (v / max) * 28
    return `${x.toFixed(0)},${y.toFixed(1)}`
  })
  return pts.join(' ')
})

interface Preset {
  name: string
  ext: number
  bed: number
}
const presets: Preset[] = [
  { name: 'PLA', ext: 210, bed: 60 },
  { name: 'PETG', ext: 240, bed: 80 },
  { name: 'ABS', ext: 250, bed: 100 },
]
function applyPreset(p: Preset): void {
  void ctl.runGcode(`M104 S${p.ext}\nM140 S${p.bed}`)
}
const activePreset = computed(
  () => presets.find((p) => p.ext === Math.round(ext.value?.target ?? -1))?.name,
)

// --- motion: relative jog, home, Z babystep ---------------------------------------------
function jog(axis: 'X' | 'Y' | 'Z', dist: number): void {
  const feed = axis === 'Z' ? 600 : 3000
  void ctl.runGcode(`G91\nG1 ${axis}${dist} F${feed}\nG90`)
}
function babystep(d: number): void {
  void ctl.runGcode(`SET_GCODE_OFFSET Z_ADJUST=${d} MOVE=1`)
}
const zOffset = computed(() => {
  const g = session.object<{ homing_origin?: number[] }>('gcode_move')
  return g?.homing_origin?.[2] ?? 0
})

// --- webcam: same-origin MJPEG (crowsnest); falls back to a placeholder if absent ---------
const camOk = ref(true)
const camUrl = '/webcam/?action=stream'

const isPrinting = computed(() => state.value === 'printing')
const isPaused = computed(() => state.value === 'paused')
</script>

<template>
  <div class="grid">
    <!-- Print job -->
    <section class="fm-card card">
      <header class="card-head">
        <span class="muted">{{ active ? t('dashboard.' + state) : t('dashboard.job') }}</span>
        <span v-if="eta" class="muted">{{ t('dashboard.eta') }} {{ eta }}</span>
      </header>
      <template v-if="active">
        <div class="file" :title="stats.filename || ''">{{ stats.filename || '—' }}</div>
        <div class="bar"><div class="bar-fill" :style="{ width: progress + '%' }"></div></div>
        <div class="bar-foot">
          <span v-if="layer.total_layer" class="muted"
            >{{ t('dashboard.layer') }} {{ layer.current_layer ?? 0 }} /
            {{ layer.total_layer }}</span
          >
          <span class="accent">{{ progress }}%</span>
        </div>
        <div class="row">
          <button
            v-if="isPrinting"
            class="fm-btn"
            :disabled="!canWrite"
            :title="canWrite ? '' : blockedReason"
            @click="ctl.pause()"
          >
            ⏸ {{ t('control.pause') }}
          </button>
          <button v-if="isPaused" class="fm-btn" :disabled="!canWrite" @click="ctl.resume()">
            ▶ {{ t('control.resume') }}
          </button>
        </div>
      </template>
      <p v-else class="muted empty">{{ t('dashboard.noJob') }}</p>
    </section>

    <!-- Temperatures -->
    <section class="fm-card card">
      <header class="card-head">
        <span class="muted">{{ t('dashboard.temps') }}</span>
      </header>
      <div class="temps">
        <span
          >🔥 {{ fmt(ext?.temperature) }}<i class="tgt">/{{ fmt(ext?.target) }}</i></span
        >
        <span
          >🛏 {{ fmt(bed?.temperature) }}<i class="tgt">/{{ fmt(bed?.target) }}</i></span
        >
      </div>
      <svg class="spark" viewBox="0 0 200 32" preserveAspectRatio="none">
        <polyline :points="spark" fill="none" stroke="var(--fm-primary)" stroke-width="1.5" />
      </svg>
      <div class="chips">
        <button
          v-for="p in presets"
          :key="p.name"
          class="chip"
          :class="{ on: activePreset === p.name }"
          :disabled="!canWrite"
          :title="canWrite ? `${p.ext}° / ${p.bed}°` : blockedReason"
          @click="applyPreset(p)"
        >
          {{ p.name }}
        </button>
      </div>
    </section>

    <!-- Motion -->
    <section class="fm-card card">
      <header class="card-head">
        <span class="muted">{{ t('dashboard.motion') }}</span>
      </header>
      <div class="motion">
        <div class="pad">
          <button class="jog" :disabled="!canWrite" aria-label="Y+" @click="jog('Y', 10)">▲</button>
          <button class="jog" :disabled="!canWrite" aria-label="X-" @click="jog('X', -10)">
            ◀
          </button>
          <button
            class="jog home"
            :disabled="!canWrite"
            :title="t('control.home')"
            @click="ctl.home()"
          >
            ⌂
          </button>
          <button class="jog" :disabled="!canWrite" aria-label="X+" @click="jog('X', 10)">▶</button>
          <button class="jog" :disabled="!canWrite" aria-label="Y-" @click="jog('Y', -10)">
            ▼
          </button>
        </div>
        <div class="zcol">
          <div class="zrow">
            <button class="jog" :disabled="!canWrite" @click="jog('Z', 1)">Z▲</button>
            <button class="jog" :disabled="!canWrite" @click="jog('Z', -1)">Z▼</button>
          </div>
          <div class="baby">
            <span class="muted">{{ t('dashboard.babystep') }}</span>
            <div class="zrow">
              <button class="fm-btn tiny" :disabled="!canWrite" @click="babystep(-0.02)">
                −0.02
              </button>
              <b class="zval">{{ zOffset.toFixed(2) }}</b>
              <button class="fm-btn tiny" :disabled="!canWrite" @click="babystep(0.02)">
                +0.02
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Webcam -->
    <section class="fm-card card">
      <header class="card-head">
        <span class="muted">{{ t('dashboard.webcam') }}</span>
        <span v-if="camOk" class="live">● {{ t('dashboard.live') }}</span>
      </header>
      <div class="cam">
        <img v-if="camOk" :src="camUrl" alt="" @error="camOk = false" />
        <div v-else class="cam-empty">🎥</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}
@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.9rem 1rem;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
}
.muted {
  color: var(--fm-text-muted);
}
.accent {
  color: var(--fm-primary);
  font-weight: 600;
}
.empty {
  padding: 1.4rem 0;
  text-align: center;
}
.file {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--fm-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bar {
  height: 0.5rem;
  border-radius: 999px;
  background: var(--fm-surface-2, rgba(127, 127, 127, 0.2));
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: var(--fm-primary);
  transition: width 0.4s ease;
}
.bar-foot {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}
.row {
  display: flex;
  gap: 0.5rem;
}
.temps {
  display: flex;
  gap: 1.1rem;
  font-size: 1.05rem;
  color: var(--fm-text);
}
.tgt {
  color: var(--fm-text-muted);
  font-size: 0.8rem;
  font-style: normal;
}
.spark {
  width: 100%;
  height: 2rem;
}
.chips {
  display: flex;
  gap: 0.4rem;
}
.chip {
  border: 1px solid var(--fm-border, rgba(127, 127, 127, 0.3));
  background: transparent;
  color: var(--fm-text-muted);
  border-radius: 6px;
  padding: 0.2rem 0.7rem;
  font-size: 0.8rem;
  cursor: pointer;
}
.chip.on {
  color: var(--fm-primary);
  border-color: var(--fm-primary);
}
.chip:disabled {
  opacity: 0.45;
  cursor: default;
}
.motion {
  display: flex;
  gap: 1rem;
  align-items: center;
}
.pad {
  display: grid;
  grid-template-columns: repeat(3, 2.1rem);
  grid-auto-rows: 2.1rem;
  gap: 0.3rem;
  /* place the 5 buttons into a plus shape */
  grid-template-areas:
    '. up .'
    'left home right'
    '. down .';
}
.pad .jog:nth-child(1) {
  grid-area: up;
}
.pad .jog:nth-child(2) {
  grid-area: left;
}
.pad .jog:nth-child(3) {
  grid-area: home;
}
.pad .jog:nth-child(4) {
  grid-area: right;
}
.pad .jog:nth-child(5) {
  grid-area: down;
}
.jog {
  border: 1px solid var(--fm-border, rgba(127, 127, 127, 0.3));
  background: var(--fm-surface-2, rgba(127, 127, 127, 0.12));
  color: var(--fm-primary);
  border-radius: 7px;
  font-size: 0.85rem;
  cursor: pointer;
  min-height: 2.1rem;
}
.jog.home {
  color: var(--fm-success, var(--fm-primary));
}
.jog:disabled {
  opacity: 0.45;
  cursor: default;
}
.zcol {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.zrow {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}
.baby {
  font-size: 0.75rem;
}
.fm-btn.tiny {
  padding: 0.15rem 0.4rem;
  font-size: 0.75rem;
}
.zval {
  font-family: var(--font-mono);
  color: var(--fm-text);
  min-width: 2.4rem;
  text-align: center;
}
.cam {
  border-radius: 7px;
  overflow: hidden;
  background: var(--fm-surface-2, rgba(0, 0, 0, 0.3));
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cam img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cam-empty {
  font-size: 2rem;
  opacity: 0.35;
}
.live {
  color: var(--fm-danger, crimson);
  font-size: 0.7rem;
}
</style>
