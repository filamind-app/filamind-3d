// The widget registry IS the core's - single source across surfaces. The app re-exports
// it so feature code imports from one place and stays decoupled from the package path.

export { registerWidget, getWidget, getWidgets, aggregateSubscriptions } from '@filamind-app/core'
export type { WidgetDefinition, SurfaceTarget } from '@filamind-app/core'
