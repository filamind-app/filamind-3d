<script setup lang="ts">
defineProps<{ title: string; icon?: string }>()
</script>

<template>
  <section class="fm-card frame">
    <header class="frame-head">
      <span v-if="icon" class="frame-icon" aria-hidden="true">{{ icon }}</span>
      <h2 class="frame-title">{{ title }}</h2>
    </header>
    <div class="frame-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.frame {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.frame-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.frame-icon {
  font-size: 1.05rem;
}
.frame-title {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--fm-text);
}
.frame-body {
  min-height: 0;
}
</style>
