<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ControlBar from '@/components/control/ControlBar.vue'
import WidgetHost from '@/components/dashboard/WidgetHost.vue'

const { t } = useI18n()
</script>

<template>
  <div class="dashboard">
    <h1 class="page-title">{{ t('dashboard.title') }}</h1>
    <ControlBar />
    <WidgetHost />
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.page-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--fm-text);
}
</style>
