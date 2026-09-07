import { resolveClientProductDataSource } from '../../client-products/data/resolve-client-product-data-source';
import { resolveInstallationDataSource } from '../../installations/data/resolve-installation-data-source';
import { resolveInfrastructureDataSource } from '../../infrastructure/data/resolve-infrastructure-data-source';
import { resolveOperationsDataSource } from '../../operations/data/resolve-operations-data-source';
import { resolveRuntimeDataSource } from '../../runtime/data/resolve-runtime-data-source';
import { HEALTH_RANK, rollupHealth, type ObservedState, type RuntimeServiceDetail } from '../../runtime/types/runtime';
import type { ClientMonitoringDataSource } from './client-monitoring-data-source';
import type { ClientMonitoring, ClientMonitoringRecord } from './client-monitoring';

const ACTIVE_INCIDENT_STATUSES = new Set(['OPEN', 'ACKNOWLEDGED']);

function latestObserved(services: RuntimeServiceDetail[]) {
  return services.flatMap((service) => service.instances.map((instance) => instance.lastObservedAt).filter((value): value is string => Boolean(value))).sort().at(-1);
}

function runtimeStatus(services: RuntimeServiceDetail[]): ObservedState {
  const states = services.flatMap((service) => service.instances.map((instance) => instance.observedState));
  if (states.includes('FAILED')) return 'FAILED';
  if (states.includes('STOPPING')) return 'STOPPING';
  if (states.includes('STARTING')) return 'STARTING';
  if (states.includes('RUNNING')) return 'RUNNING';
  if (states.includes('STOPPED')) return 'STOPPED';
  return 'UNKNOWN';
}

export function createMockClientMonitoringDataSource(): ClientMonitoringDataSource {
  const clientProducts = resolveClientProductDataSource();
  const installations = resolveInstallationDataSource();
  const infrastructure = resolveInfrastructureDataSource();
  const runtime = resolveRuntimeDataSource();
  const operations = resolveOperationsDataSource();

  return {
    async getClientMonitoring(clientId: string): Promise<ClientMonitoring> {
      const [products, clientInstallations, incidents, deployments] = await Promise.all([
        clientProducts.getClientProducts(clientId),
        installations.getClientInstallations(clientId),
        operations.getIncidents(),
        operations.getDeployments(),
      ]);

      const productById = new Map(products.map((product) => [product.id, product]));
      const records = await Promise.all(clientInstallations.map(async (installation): Promise<ClientMonitoringRecord> => {
        const [runtimeServices, bindings] = await Promise.all([
          runtime.getInstallationRuntime(installation.id),
          installation.deploymentMode === 'DEDICATED' ? infrastructure.getInstallationBindings(installation.id) : Promise.resolve([]),
        ]);
        const deployment = deployments
          .filter((candidate) => candidate.installationId === installation.id && candidate.status === 'SUCCEEDED')
          .sort((left, right) => (right.completedAt ?? right.deployedAt ?? right.createdAt).localeCompare(left.completedAt ?? left.deployedAt ?? left.createdAt))[0];
        const activeIncidents = incidents.filter((incident) => incident.installationId === installation.id && ACTIVE_INCIDENT_STATUSES.has(incident.status));
        const health = runtimeServices.reduce((worst, service) => HEALTH_RANK[service.healthStatus] > HEALTH_RANK[worst] ? service.healthStatus : worst, rollupHealth([]));
        const maintenanceState = installation.deploymentMode === 'DEDICATED'
          ? bindings.some((binding) => binding.node?.lifecycleStatus === 'MAINTENANCE') ? 'MAINTENANCE' : 'ACTIVE'
          : 'NOT_APPLICABLE';
        const clientProduct = productById.get(installation.clientProductId);
        if (!clientProduct) throw new Error('Installation is outside the client product scope.');
        return { clientProduct, installation, health, runtimeStatus: runtimeStatus(runtimeServices), runtimeServices, currentDeployment: deployment, lastObservedAt: latestObserved(runtimeServices), activeIncidents, maintenanceState, infrastructureBindings: bindings };
      }));

      return {
        clientId,
        overview: {
          productsMonitored: new Set(records.map((record) => record.clientProduct.id)).size,
          installations: records.length,
          systemsRequiringAttention: records.filter((record) => record.health === 'DEGRADED' || record.health === 'UNHEALTHY' || record.activeIncidents.length > 0).length,
          activeIncidents: records.reduce((total, record) => total + record.activeIncidents.length, 0),
        },
        records,
      };
    },
  };
}
