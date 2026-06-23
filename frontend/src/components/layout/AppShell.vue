<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView } from 'vue-router'
import TrustRibbon from '@/components/system/TrustRibbon.vue'
import CommandPalette from '@/components/system/CommandPalette.vue'
import PromptDialog from '@/components/system/PromptDialog.vue'
import ControlToast from '@/components/control/ControlToast.vue'
import PrinterSelector from '@/components/layout/PrinterSelector.vue'

const { t } = useI18n()
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

// Sidebar sections. Each maps to a route; the suite mockup's left nav. Items appear only once their
// view exists, so the nav never points at a stub.
const NAV = [
  { to: '/', key: 'dashboard', icon: '🎛' },
  { to: '/files', key: 'files', icon: '📁' },
  { to: '/console', key: 'console', icon: '⌨' },
  { to: '/config', key: 'config', icon: '📝' },
  { to: '/hardware', key: 'hardware', icon: '🔩' },
  { to: '/settings', key: 'settings', icon: '⚙' },
] as const
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main">{{ t('shell.skipToContent') }}</a>

    <aside class="sidebar">
      <div class="brand">
        <img src="/favicon.svg" alt="" width="22" height="22" />
        <span class="brand-name">FilaMind <strong>3d</strong></span>
      </div>
      <nav class="nav" :aria-label="t('shell.nav.sections')">
        <RouterLink v-for="n in NAV" :key="n.to" :to="n.to" class="nav-link">
          <span class="nav-icon" aria-hidden="true">{{ n.icon }}</span>
          <span class="nav-label">{{ t('shell.nav.' + n.key) }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-foot font-mono">v{{ appVersion }}</div>
    </aside>

    <div class="col">
      <header class="app-header">
        <PrinterSelector />
        <div class="header-right">
          <CommandPalette />
          <TrustRibbon />
        </div>
      </header>

      <main id="main" class="app-main" tabindex="-1">
        <RouterView />
      </main>
    </div>

    <PromptDialog />
    <ControlToast />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
}
.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 100;
  padding: 0.5rem 0.9rem;
  background: var(--fm-primary);
  color: var(--fm-primary-contrast);
  border-radius: 0 0 8px 0;
}
.skip-link:focus {
  left: 0;
}

.sidebar {
  width: 11rem;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-inline-end: 1px solid var(--fm-border);
  background: var(--fm-surface);
  padding: 0.9rem 0.6rem;
  gap: 0.4rem;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
  padding: 0 0.4rem 0.6rem;
}
.brand-name {
  color: var(--fm-text);
  letter-spacing: 0.5px;
  font-size: 0.95rem;
}
.brand-name strong {
  color: var(--fm-primary);
}
.nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  color: var(--fm-text-muted);
  text-decoration: none;
  font-size: 0.9rem;
  border-inline-start: 3px solid transparent;
}
.nav-link:hover {
  color: var(--fm-text);
  background: var(--fm-surface-2);
}
.nav-link.router-link-active {
  color: var(--fm-primary);
  background: var(--fm-surface-2);
  border-inline-start-color: var(--fm-primary);
}
.nav-icon {
  font-size: 1.05rem;
  width: 1.2rem;
  text-align: center;
}
.sidebar-foot {
  margin-top: auto;
  padding: 0.4rem;
  color: var(--fm-text-muted);
  font-size: 0.72rem;
}

.col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.app-main:focus {
  outline: none;
}
.app-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.7rem 1.25rem;
  border-bottom: 1px solid var(--fm-border);
  background: var(--fm-surface);
  position: sticky;
  top: 0;
  z-index: 10;
}
.header-right {
  margin-inline-start: auto;
  display: flex;
  align-items: center;
  gap: 1rem;
}
.app-main {
  flex: 1;
  padding: 1.25rem;
}

@media (max-width: 640px) {
  .app-shell {
    flex-direction: column;
  }
  .sidebar {
    width: auto;
    flex-direction: row;
    align-items: center;
    border-inline-end: none;
    border-bottom: 1px solid var(--fm-border);
    overflow-x: auto;
  }
  .nav {
    flex-direction: row;
  }
  .nav-label {
    display: none;
  }
  .sidebar-foot {
    display: none;
  }
}
</style>
