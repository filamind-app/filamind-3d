<script setup lang="ts">
// System readiness report - the "probe" a first install runs, surfaced here as a live health check
// of the host that runs FilaMind 3d: OS, host, Python, CPU, memory, free disk, and that Klipper +
// Moonraker are up. Everything is read straight from Moonraker; nothing here changes the system.
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { connector } from '@/core/session'

const { t } = useI18n()

type Level = 'ok' | 'warn' | 'bad'
interface Check {
  key: string
  value: string
  level: Level
}

const loading = ref(true)
const error = ref('')
const checks = ref<Check[]>([])

const gb = (bytes?: number): number => (bytes ? bytes / 1024 ** 3 : 0)
const gbKb = (kb?: number): number => (kb ? kb / 1024 ** 2 : 0)

async function load(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    const [info, machine] = await Promise.all([
      connector.call<{ hostname?: string; software_version?: string; state?: string }>(
        'printer.info',
      ),
      connector.call<{
        system_info?: {
          cpu_info?: { cpu_count?: number; processor?: string; total_memory?: number }
          distribution?: { name?: string } | string
          python?: { version_string?: string } | string
        }
      }>('machine.system_info'),
    ])
    // Free disk lives on the file-root info, not in system_info; tolerate it being unavailable.
    let disk: { free?: number; total?: number } | null = null
    try {
      const dir = await connector.call<{ disk_usage?: { free?: number; total?: number } }>(
        'server.files.get_directory',
        { path: 'gcodes' },
      )
      disk = dir.disk_usage ?? null
    } catch {
      disk = null
    }

    const si = machine.system_info ?? {}
    const ci = si.cpu_info ?? {}
    const distro = si.distribution
    const os = typeof distro === 'string' ? distro : (distro?.name ?? '')
    const py = typeof si.python === 'string' ? si.python : (si.python?.version_string ?? '')
    const pyShort = (/(\d+\.\d+\.\d+)/.exec(py)?.[1] ?? py).trim()
    const memGb = gbKb(ci.total_memory)
    const ready = info.state === 'ready'

    const out: Check[] = []
    if (os) out.push({ key: 'os', value: os, level: 'ok' })
    if (info.hostname) out.push({ key: 'host', value: info.hostname, level: 'ok' })
    if (pyShort) out.push({ key: 'python', value: pyShort, level: 'ok' })
    if (ci.cpu_count || ci.processor) {
      const cpu = [ci.cpu_count ? `${ci.cpu_count} ${t('setup.cores')}` : '', ci.processor]
        .filter(Boolean)
        .join(' · ')
      out.push({ key: 'cpu', value: cpu, level: 'ok' })
    }
    if (memGb)
      out.push({
        key: 'memory',
        value: `${memGb.toFixed(2)} GB`,
        level: memGb < 0.5 ? 'warn' : 'ok',
      })
    if (disk?.total) {
      const free = gb(disk.free)
      const total = gb(disk.total)
      const tight = free < 2 || free / total < 0.1
      out.push({
        key: 'disk',
        value: `${free.toFixed(1)} GB / ${total.toFixed(1)} GB`,
        level: tight ? 'warn' : 'ok',
      })
    }
    out.push({
      key: 'klipper',
      value: `${ready ? t('setup.ready') : t('setup.notReady')}${
        info.software_version ? ` · ${info.software_version}` : ''
      }`,
      level: ready ? 'ok' : 'bad',
    })
    out.push({ key: 'moonraker', value: t('setup.connected'), level: 'ok' })

    checks.value = out
  } catch {
    error.value = t('setup.error')
  } finally {
    loading.value = false
  }
}
onMounted(load)

const ICON: Record<Level, string> = { ok: '✓', warn: '!', bad: '✕' }
</script>

<template>
  <div class="setup">
    <div class="head">
      <div>
        <h1 class="page-title">{{ t('setup.title') }}</h1>
        <p class="intro">{{ t('setup.intro') }}</p>
      </div>
      <button
        class="fm-btn"
        type="button"
        :disabled="loading"
        :title="t('setup.refresh')"
        @click="load"
      >
        ↻
      </button>
    </div>

    <p v-if="error" role="alert" class="fm-card error">{{ error }}</p>
    <p v-if="loading" class="muted">{{ t('setup.loading') }}</p>

    <section v-else class="fm-card report">
      <h2 class="report-title">{{ t('setup.heading') }}</h2>
      <ul class="grid">
        <li v-for="c in checks" :key="c.key" class="check" :class="c.level">
          <span class="ico" aria-hidden="true">{{ ICON[c.level] }}</span>
          <span class="label">{{ t('setup.checks.' + c.key) }}</span>
          <span class="value">{{ c.value }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.setup {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}
.page-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--fm-text);
}
.intro {
  margin: 0.2rem 0 0;
  font-size: 0.85rem;
  color: var(--fm-text-muted);
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
.report {
  padding: 0.9rem 1rem;
}
.report-title {
  margin: 0 0 0.7rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--fm-primary);
}
.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 0.5rem 1.2rem;
}
.check {
  display: grid;
  grid-template-columns: 1.2rem auto 1fr;
  align-items: baseline;
  gap: 0.5rem;
  font-size: 0.86rem;
}
.ico {
  font-weight: 700;
  text-align: center;
}
.check.ok .ico {
  color: var(--fm-success, #3fb950);
}
.check.warn .ico {
  color: var(--fm-warn, #d4a72c);
}
.check.bad .ico {
  color: var(--fm-danger, crimson);
}
.label {
  color: var(--fm-text-muted);
}
.value {
  color: var(--fm-text);
  text-align: end;
  word-break: break-word;
}
</style>
