// Proxy re-export — canonical source is packages/shared-infra/src/health.ts
export {
  updateComponentHealth,
  getSystemHealth,
  getComponentHealth,
  markHealthy,
  markDegraded,
  markDown,
  type HealthStatus,
  type ComponentHealth,
  type SystemHealth,
} from '@nexus/shared-infra'
