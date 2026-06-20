import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h, nextTick, type PropType } from 'vue'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { Observable } from '@filamind-app/core'
import { detectLocale, composer } from '@/core/i18n'
import { useObservable } from '@/core/useObservable'
import { getWidgets, _resetRegistry } from '@filamind-app/core'
import { aggregateSubscriptions } from '@/core/registry'
import { useSessionStore } from '@/core/store/session'
import { useControlStore } from '@/core/store/control'
import { registerWidgets } from '@/widgets'

describe('i18n detectLocale', () => {
  it('keeps a valid stored locale', () => {
    expect(detectLocale('ar')).toBe('ar')
  })
  it('falls back to en for an unknown stored locale', () => {
    expect(detectLocale('zz')).toBe('en')
  })
})

describe('core registry re-export', () => {
  it('aggregates nothing for unknown widget ids', () => {
    expect(aggregateSubscriptions(['does-not-exist'])).toEqual({})
  })
})

describe('session store trust gate', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('starts offline until a live connection seeds it', () => {
    const store = useSessionStore()
    expect(store.trust).toBe('offline')
    expect(store.live).toBe(false)
  })
})

describe('built-in widget registration', () => {
  it('registers the dashboard widgets including the jobs trio', () => {
    _resetRegistry()
    registerWidgets()
    const ids = getWidgets().map((w) => w.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'temperatures',
        'motion',
        'printStatus',
        'history',
        'queue',
        'excludeObject',
      ]),
    )
  })
})

describe('control write gate', () => {
  beforeEach(() => setActivePinia(createPinia()))
  it('refuses gated actions when the printer is not live (no connection)', async () => {
    const ctl = useControlStore()
    await ctl.home()
    expect(ctl.lastError).toBe('refused')
  })
})

describe('i18n interpolation', () => {
  it('substitutes {params} (compiler is bundled, not runtimeOnly)', () => {
    expect(composer.t('settings.version', { v: '1' })).toBe('FilaMind 3d v1')
    expect(composer.t('widgets.motion.homed', { axes: 'XYZ' })).toBe('Homed: XYZ')
  })
})

describe('useObservable', () => {
  it('mirrors a core Observable into a reactive ref for the component lifetime', async () => {
    const obs = new Observable(1)
    const Comp = defineComponent({
      props: { obs: { type: Object as PropType<Observable<number>>, required: true } },
      setup(props) {
        const r = useObservable(props.obs)
        return () => h('span', String(r.value))
      },
    })
    const wrapper = mount(Comp, { props: { obs } })
    expect(wrapper.text()).toBe('1')
    obs.set(5)
    await nextTick()
    expect(wrapper.text()).toBe('5')
    wrapper.unmount()
  })
})
