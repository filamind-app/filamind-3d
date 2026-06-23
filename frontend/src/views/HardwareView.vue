<script setup lang="ts">
// Hardware overview for THIS printer, read straight from Moonraker (no catalog backend): host/OS/CPU
// from machine.system_info + printer.info, the MCUs with their chip + firmware version, and the
// configured components (steppers, drivers, heaters, sensors, fans, probe, ...) derived from the
// Klipper config sections. Read-only - a faithful picture of what the machine actually runs.
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { connector } from '@/core/session'

const { t } = useI18n()

interface SysInfo {
  host: string
  klipper: string
  os: string
  cpu: string
  memory: string
}
interface Mcu {
  name: string
  chip: string
  version: string
}
interface Group {
  key: string
  items: string[]
}

const loading = ref(true)
const error = ref('')
const sys = ref<SysInfo | null>(null)
const mcus = ref<Mcu[]>([])
const groups = ref<Group[]>([])

// Klipper config section prefix -> component group. First match wins; order matters (tmc before
// stepper so a driver section isn't miscounted as a stepper).
const RULES: { group: string; test: (s: string) => boolean }[] = [
  { group: 'drivers', test: (s) => /^(tmc\d+|drv\d+)\b/.test(s) },
  { group: 'steppers', test: (s) => /^stepper_/.test(s) },
  { group: 'extruders', test: (s) => s === 'extruder' || /^extruder\d+$/.test(s) },
  { group: 'heaters', test: (s) => s === 'heater_bed' || /^heater_generic\b/.test(s) },
  { group: 'sensors', test: (s) => /^temperature_sensor\b/.test(s) },
  {
    group: 'fans',
    test: (s) =>
      s === 'fan' || /^(heater_fan|controller_fan|fan_generic|temperature_fan)\b/.test(s),
  },
  {
    group: 'probe',
    test: (s) =>
      s === 'probe' || s === 'bltouch' || s === 'smart_effector' || /^probe_eddy/.test(s),
  },
  { group: 'accel', test: (s) => /^(adxl345|lis2dw|mpu9250|mpu6050)\b/.test(s) },
  {
    group: 'leveling',
    test: (s) =>
      /^(bed_mesh|quad_gantry_level|z_tilt|screws_tilt_adjust|delta_calibrate)\b/.test(s),
  },
]
const GROUP_ORDER = [
  'steppers',
  'drivers',
  'extruders',
  'heaters',
  'sensors',
  'fans',
  'probe',
  'accel',
  'leveling',
]

const fmtMem = (kb?: number): string => (kb ? `${(kb / (1024 * 1024)).toFixed(2)} GB` : '')
// "mcu" is the main board; "mcu toolhead_mcu" -> "toolhead_mcu".
const mcuLabel = (section: string): string =>
  section === 'mcu' ? t('hardware.mainMcu') : section.replace(/^mcu\s+/, '')

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const [info, machine, cfg] = await Promise.all([
      connector.call<{ hostname?: string; software_version?: string }>('printer.info'),
      connector.call<{
        system_info?: {
          cpu_info?: {
            cpu_count?: number
            processor?: string
            bits?: string
            total_memory?: number
          }
          distribution?: { name?: string } | string
        }
      }>('machine.system_info'),
      connector.call<{ status?: { configfile?: { config?: Record<string, unknown> } } }>(
        'printer.objects.query',
        { objects: { configfile: ['config'] } },
      ),
    ])

    const ci = machine.system_info?.cpu_info ?? {}
    const distro = machine.system_info?.distribution
    const os = typeof distro === 'string' ? distro : (distro?.name ?? '')
    const cores = ci.cpu_count ? `${ci.cpu_count} ${t('hardware.cores')}` : ''
    const cpu = [ci.processor, ci.bits, cores].filter(Boolean).join(' · ')
    sys.value = {
      host: info.hostname ?? t('hardware.unknown'),
      klipper: info.software_version ?? t('hardware.unknown'),
      os: os || t('hardware.unknown'),
      cpu: cpu || t('hardware.unknown'),
      memory: fmtMem(ci.total_memory),
    }

    const sections = Object.keys(cfg.status?.configfile?.config ?? {})

    // MCUs: the config's mcu sections, enriched with each one's chip + firmware version.
    const mcuSections = sections.filter((s) => s === 'mcu' || /^mcu\s+/.test(s))
    if (mcuSections.length) {
      const q = await connector.call<{
        status?: Record<string, { mcu_version?: string; mcu_constants?: { MCU?: string } }>
      }>('printer.objects.query', {
        objects: Object.fromEntries(mcuSections.map((s) => [s, null])),
      })
      mcus.value = mcuSections.map((s) => {
        const d = q.status?.[s]
        return {
          name: mcuLabel(s),
          chip: d?.mcu_constants?.MCU ?? t('hardware.unknown'),
          version: d?.mcu_version ?? t('hardware.unknown'),
        }
      })
    } else {
      mcus.value = []
    }

    // Components: bucket each config section into its hardware group (first matching rule).
    const buckets: Record<string, string[]> = {}
    for (const s of sections) {
      const rule = RULES.find((r) => r.test(s))
      if (rule) (buckets[rule.group] ??= []).push(s)
    }
    groups.value = GROUP_ORDER.filter((g) => buckets[g]?.length).map((g) => ({
      key: g,
      items: buckets[g]!.sort(),
    }))
  } catch {
    error.value = t('hardware.error')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const hasComponents = computed(() => groups.value.length > 0)
</script>

<template>
  <div class="hardware">
    <div class="head">
      <h1 class="page-title">{{ t('hardware.title') }}</h1>
      <button
        class="fm-btn"
        type="button"
        :disabled="loading"
        :title="t('hardware.refresh')"
        @click="load"
      >
        ↻
      </button>
    </div>

    <p v-if="error" role="alert" class="fm-card error">{{ error }}</p>
    <p v-if="loading" class="muted">{{ t('hardware.loading') }}</p>

    <template v-else>
      <section v-if="sys" class="fm-card block">
        <h2 class="block-title">{{ t('hardware.system') }}</h2>
        <dl class="kv">
          <dt>{{ t('hardware.host') }}</dt>
          <dd>{{ sys.host }}</dd>
          <dt>{{ t('hardware.klipper') }}</dt>
          <dd class="mono">{{ sys.klipper }}</dd>
          <dt>{{ t('hardware.os') }}</dt>
          <dd>{{ sys.os }}</dd>
          <dt>{{ t('hardware.cpu') }}</dt>
          <dd>{{ sys.cpu }}</dd>
          <dd v-if="sys.memory" class="span">{{ t('hardware.memory') }}: {{ sys.memory }}</dd>
        </dl>
      </section>

      <section v-if="mcus.length" class="fm-card block">
        <h2 class="block-title">{{ t('hardware.mcus') }}</h2>
        <ul class="mcu-list">
          <li v-for="m in mcus" :key="m.name" class="mcu">
            <span class="mcu-name">{{ m.name }}</span>
            <span class="mcu-chip mono">{{ m.chip }}</span>
            <span class="mcu-ver mono">{{ m.version }}</span>
          </li>
        </ul>
      </section>

      <section v-if="hasComponents" class="fm-card block">
        <h2 class="block-title">{{ t('hardware.components') }}</h2>
        <div class="groups">
          <div v-for="g in groups" :key="g.key" class="group">
            <div class="group-head">
              <span class="group-name">{{ t('hardware.group.' + g.key) }}</span>
              <span class="group-count">{{ g.items.length }}</span>
            </div>
            <div class="chips">
              <span v-for="it in g.items" :key="it" class="chip mono">{{ it }}</span>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.hardware {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.page-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--fm-text);
}
.muted {
  color: var(--fm-text-muted);
  padding: 0.5rem 0;
}
.error {
  background: var(--fm-danger, crimson);
  color: #fff;
  padding: 0.5rem 0.8rem;
}
.block {
  padding: 0.9rem 1rem;
}
.block-title {
  margin: 0 0 0.7rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--fm-primary);
}
.mono {
  font-family: var(--font-mono);
}
.kv {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.35rem 1rem;
  margin: 0;
  font-size: 0.88rem;
}
.kv dt {
  color: var(--fm-text-muted);
}
.kv dd {
  margin: 0;
  color: var(--fm-text);
  word-break: break-word;
}
.kv dd.span {
  grid-column: 1 / -1;
  color: var(--fm-text-muted);
}
.mcu-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.mcu {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.mcu-name {
  font-size: 0.9rem;
  color: var(--fm-text);
  min-width: 7rem;
}
.mcu-chip {
  font-size: 0.8rem;
  color: var(--fm-primary);
}
.mcu-ver {
  font-size: 0.75rem;
  color: var(--fm-text-muted);
  margin-inline-start: auto;
}
.groups {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.group-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
}
.group-name {
  font-size: 0.82rem;
  color: var(--fm-text-muted);
  text-transform: capitalize;
}
.group-count {
  font-size: 0.7rem;
  color: var(--fm-primary-contrast);
  background: var(--fm-primary);
  border-radius: 999px;
  padding: 0.02rem 0.4rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.chip {
  font-size: 0.74rem;
  color: var(--fm-text);
  background: var(--fm-surface-2, rgba(0, 0, 0, 0.18));
  border: 1px solid var(--fm-border);
  border-radius: 6px;
  padding: 0.12rem 0.45rem;
}
</style>
