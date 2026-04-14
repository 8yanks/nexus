import type {
  AuditEntry,
  AuditEventType,
  AuditModule,
} from '@/types/audit'

export interface AuditLoggerOptions {
  maxEntries?: number
  now?: () => number
  idGen?: () => string
}

/**
 * In-memory, ring-buffered audit trail. Every NEXUS module writes here so
 * the full decision chain (data → signal → AI → sentinel → trader) can be
 * replayed and inspected.
 */
export class AuditLogger {
  private entries: AuditEntry[] = []
  private readonly max: number
  private readonly now: () => number
  private readonly idGen: () => string
  private seq = 0
  private listeners = new Set<(e: AuditEntry) => void>()

  constructor(opts: AuditLoggerOptions = {}) {
    this.max = opts.maxEntries ?? 5000
    this.now = opts.now ?? (() => Date.now())
    this.idGen =
      opts.idGen ??
      (() => `audit_${Date.now().toString(36)}_${(this.seq++).toString(36)}`)
  }

  log(
    module: AuditModule,
    eventType: AuditEventType,
    summary: string,
    data: Record<string, unknown> = {},
    source = `${module}_engine`,
  ): AuditEntry {
    const entry: AuditEntry = {
      id: this.idGen(),
      timestamp: this.now(),
      eventType,
      module,
      summary,
      data,
      _source: source,
    }
    this.entries.push(entry)
    if (this.entries.length > this.max) {
      this.entries.splice(0, this.entries.length - this.max)
    }
    for (const l of this.listeners) l(entry)
    return entry
  }

  list(filter?: {
    module?: AuditModule
    eventType?: AuditEventType
    since?: number
  }): AuditEntry[] {
    let out = this.entries
    if (filter?.module) out = out.filter((e) => e.module === filter.module)
    if (filter?.eventType)
      out = out.filter((e) => e.eventType === filter.eventType)
    if (filter?.since !== undefined)
      out = out.filter((e) => e.timestamp >= filter.since!)
    return out.slice()
  }

  subscribe(fn: (e: AuditEntry) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  clear(): void {
    this.entries = []
  }

  size(): number {
    return this.entries.length
  }
}

export const auditLogger = new AuditLogger()
