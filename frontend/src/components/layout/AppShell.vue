<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, RouterView } from 'vue-router'
import TrustRibbon from '@/components/system/TrustRibbon.vue'
import CommandPalette from '@/components/system/CommandPalette.vue'
import PromptDialog from '@/components/system/PromptDialog.vue'
import ControlToast from '@/components/control/ControlToast.vue'

const { t } = useI18n()
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main">{{ t('shell.skipToContent') }}</a>
    <header class="app-header">
      <div class="brand">
        <img src="/favicon.svg" alt="" width="22" height="22" />
        <span class="brand-name">FilaMind <strong>3d</strong></span>
      </div>
      <nav class="nav">
        <RouterLink to="/" class="nav-link">{{ t('shell.nav.dashboard') }}</RouterLink>
        <RouterLink to="/settings" class="nav-link">{{ t('shell.nav.settings') }}</RouterLink>
      </nav>
      <div class="header-right">
        <TrustRibbon />
        <CommandPalette />
      </div>
    </header>

    <main id="main" class="app-main" tabindex="-1">
      <RouterView />
    </main>

    <footer class="app-footer">
      <span>{{ t('shell.footer') }}</span>
      <span class="font-mono">v{{ appVersion }}</span>
    </footer>

    <PromptDialog />
    <ControlToast />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100%;
  display: flex;
  flex-direction: column;
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
.app-main:focus {
  outline: none;
}
.app-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--fm-border);
  background: var(--fm-surface);
  position: sticky;
  top: 0;
  z-index: 10;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-display);
}
.brand-name {
  color: var(--fm-text);
  letter-spacing: 0.5px;
}
.brand-name strong {
  color: var(--fm-primary);
}
.nav {
  display: flex;
  gap: 0.25rem;
}
.nav-link {
  padding: 0.4rem 0.7rem;
  border-radius: 8px;
  color: var(--fm-text-muted);
  text-decoration: none;
  font-size: 0.9rem;
}
.nav-link:hover {
  color: var(--fm-text);
  background: var(--fm-surface-2);
}
.nav-link.router-link-active {
  color: var(--fm-primary);
  background: var(--fm-surface-2);
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
.app-footer {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 1.25rem;
  border-top: 1px solid var(--fm-border);
  color: var(--fm-text-muted);
  font-size: 0.8rem;
}
</style>
