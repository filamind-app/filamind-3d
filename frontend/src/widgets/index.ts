// Built-in widgets register themselves into the core registry. Each is a lazy chunk and
// declares the printer objects it needs, so the session subscribes once for all of them.

import { registerWidget } from '@/core/registry'

export function registerWidgets(): void {
  registerWidget({
    id: 'temperatures',
    title: 'Temperatures',
    icon: '🌡️',
    component: () => import('./temperatures/TemperaturesWidget.vue'),
    subscriptions: {
      extruder: ['temperature', 'target', 'power'],
      heater_bed: ['temperature', 'target', 'power'],
    },
    targets: ['3d', 'screen'],
  })

  registerWidget({
    id: 'motion',
    title: 'Motion',
    icon: '🎯',
    component: () => import('./motion/MotionWidget.vue'),
    subscriptions: {
      toolhead: ['position', 'homed_axes'],
      motion_report: ['live_position'],
    },
    targets: ['3d', 'screen'],
  })

  // id must match the i18n namespace `widgets.<id>.*` (WidgetHost derives the title key from it).
  registerWidget({
    id: 'printStatus',
    title: 'Print Status',
    icon: '🖨️',
    component: () => import('./print-status/PrintStatusWidget.vue'),
    subscriptions: {
      print_stats: null,
      virtual_sdcard: ['progress'],
      display_status: ['progress', 'message'],
    },
    targets: ['3d', 'screen'],
  })

  // history + queue fetch via Moonraker server.* RPC (no printer-object subscription).
  registerWidget({
    id: 'history',
    title: 'Print History',
    icon: '🕘',
    component: () => import('./history/HistoryWidget.vue'),
    targets: ['3d', 'screen'],
  })

  registerWidget({
    id: 'queue',
    title: 'Job Queue',
    icon: '📋',
    component: () => import('./queue/QueueWidget.vue'),
    targets: ['3d', 'screen'],
  })

  registerWidget({
    id: 'excludeObject',
    title: 'Exclude Object',
    icon: '⊘',
    component: () => import('./exclude-object/ExcludeObjectWidget.vue'),
    subscriptions: { exclude_object: null },
    targets: ['3d', 'screen'],
  })
}
