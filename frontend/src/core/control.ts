// The machine-control write path. Every FilaMind-originated mutation funnels through the
// core WriteArbiter (§12 spine): refused unless the connection is live AND Klippy is ready,
// or while safe-mode is on. Emergency stop INTENTIONALLY bypasses the gate — the safety
// action must work even when state isn't trustworthy-live — but is still logged.

import { WriteArbiter, Logger } from '@filamind-app/core'
import { session, connector } from './session'

/** Ring-buffer log of every write (gated writes via the arbiter + the ungated e-stop). */
export const logger = new Logger()

export const arbiter = new WriteArbiter(() => {
  const ok = session.live.value && session.klippy.value === 'ready'
  return ok ? { ok: true } : { ok: false, reason: 'printer-not-live' }
}, logger)

const gcode = (script: string): Promise<unknown> =>
  connector.call('printer.gcode.script', { script })

export const control = {
  runGcode: (script: string) => arbiter.run('gcode', () => gcode(script)),
  home: () => arbiter.run('home', () => gcode('G28')),
  pause: () => arbiter.run('pause', () => connector.call('printer.print.pause')),
  resume: () => arbiter.run('resume', () => connector.call('printer.print.resume')),
  cancel: () => arbiter.run('cancel', () => connector.call('printer.print.cancel')),
  queueStart: () => arbiter.run('queue-start', () => connector.call('server.job_queue.start')),
  queuePause: () => arbiter.run('queue-pause', () => connector.call('server.job_queue.pause')),
  queueDelete: (id: string) =>
    arbiter.run('queue-delete', () =>
      connector.call('server.job_queue.delete_job', { job_ids: [id] }),
    ),
  // The caller must pass a single-token name (the widget only offers whitespace-free names) —
  // Klipper's standard gcode param parser splits on whitespace, so a spaced name would mistarget.
  excludeObject: (name: string) =>
    arbiter.run('exclude-object', () => gcode(`EXCLUDE_OBJECT NAME=${name}`)),
  /** Ungated on purpose — emergency stop must fire regardless of trust state. Still logged. */
  emergencyStop: (): Promise<unknown> => {
    logger.warn('emergency-stop')
    return connector.call('printer.emergency_stop')
  },
  setSafeMode: (on: boolean) => arbiter.setSafeMode(on),
}
