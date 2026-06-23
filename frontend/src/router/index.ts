// Hash-history router: robust for static hosting under any sub-path on the printer
// (no server rewrite needed). Routes are lazy-loaded views.

import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
  { path: '/files', name: 'files', component: () => import('@/views/FilesView.vue') },
  { path: '/console', name: 'console', component: () => import('@/views/ConsoleView.vue') },
  { path: '/config', name: 'config', component: () => import('@/views/ConfigView.vue') },
  { path: '/hardware', name: 'hardware', component: () => import('@/views/HardwareView.vue') },
  { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
