<script setup lang="ts">
import { computed, defineAsyncComponent, type Component } from 'vue'
import { useI18n } from 'vue-i18n'
import { getWidgets } from '@/core/registry'
import WidgetFrame from './WidgetFrame.vue'

const { t, te } = useI18n()

const widgets = computed(() =>
  getWidgets('3d').map((def) => {
    const key = `widgets.${def.id}.title`
    return {
      id: def.id,
      icon: def.icon,
      title: te(key) ? t(key) : def.title,
      component: defineAsyncComponent(() => def.component() as Promise<{ default: Component }>),
    }
  }),
)
</script>

<template>
  <div class="widget-grid">
    <WidgetFrame v-for="w in widgets" :key="w.id" :title="w.title" :icon="w.icon">
      <component :is="w.component" />
    </WidgetFrame>
  </div>
</template>

<style scoped>
.widget-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}
</style>
