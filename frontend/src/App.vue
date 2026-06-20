<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import AppShell from '@/components/layout/AppShell.vue'
import { useSessionStore } from '@/core/store/session'
import { commandSender } from '@/core/sender'

const sessionStore = useSessionStore()
onMounted(() => {
  // The trust ribbon reflects connection health; this guards against an unhandled rejection.
  sessionStore.start().catch((e) => console.error('session start failed', e))
  // Bring up the cross-surface command bus (a separate Moonraker agent connection).
  commandSender.start().catch((e) => console.error('command bus start failed', e))
})
onUnmounted(() => commandSender.stop())
</script>

<template>
  <AppShell />
</template>
