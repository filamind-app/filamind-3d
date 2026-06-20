// Read-only job/history/queue queries. These are Moonraker server.* RPC (not printer objects),
// so widgets fetch them on demand via the core connector. Mutations live in control.ts (gated).

import { connector } from './session'

export interface HistoryJob {
  job_id: string
  filename: string
  status: string
  total_duration: number
}

export interface QueueJob {
  job_id: string
  filename: string
}

export const jobs = {
  history: (limit = 8) =>
    connector.call<{ jobs?: HistoryJob[] }>('server.history.list', { limit, order: 'desc' }),
  queueStatus: () =>
    connector.call<{ queued_jobs?: QueueJob[]; queue_state?: string }>('server.job_queue.status'),
}
