import type { DashboardOverview } from '../types/dashboard';
import type { DashboardDataSource } from './dashboard-data-source';

export type MockDashboardState = 'populated' | 'empty' | 'error';

const POPULATED_DASHBOARD_OVERVIEW: DashboardOverview = {
  generatedAtLabel: 'Updated moments ago',
  summary: {
    clientCount: 4,
    managedInstallationCount: 5,
    healthyInstallationCount: 2,
    openIncidentCount: 2,
  },
  attentionItems: [
    {
      id: 'attention-nova-pos-api',
      severity: 'CRITICAL',
      clientName: 'Nova Salon',
      applicationName: 'Digvation POS',
      installationName: 'nova-pos-production',
      environment: 'Production',
      problem: 'POS API restart loop',
      probableCause: 'Out of memory',
      evidence: ['Memory 94%', '17 restarts', 'OOMKilled'],
      durationLabel: 'Active for 24 minutes',
    },
    {
      id: 'attention-fortuna-web',
      severity: 'WARNING',
      clientName: 'Fortuna Emporos',
      applicationName: 'Company Website',
      installationName: 'fortuna-web-production',
      environment: 'Production',
      problem: 'Elevated response latency',
      probableCause: 'Node memory pressure',
      evidence: ['p95 1.8s', 'Memory 82%', 'No failed requests'],
      durationLabel: 'Active for 11 minutes',
    },
  ],
  applicationHealth: [
    {
      id: 'health-nova-pos',
      clientName: 'Nova Salon',
      applicationName: 'Digvation POS',
      environment: 'Production',
      status: 'CRITICAL',
      runningVersion: '0.3.0-alpha.2',
      lastDeploymentLabel: '18 minutes ago',
    },
    {
      id: 'health-poseidon-web',
      clientName: 'Poseidon Filter',
      applicationName: 'Company Website',
      environment: 'Production',
      status: 'HEALTHY',
      runningVersion: '1.4.2',
      lastDeploymentLabel: '2 days ago',
    },
    {
      id: 'health-fortuna-web',
      clientName: 'Fortuna Emporos',
      applicationName: 'Company Website',
      environment: 'Production',
      status: 'DEGRADED',
      runningVersion: '2.1.0',
      lastDeploymentLabel: '4 hours ago',
    },
    {
      id: 'health-leaf-learning',
      clientName: 'Leaf Lab',
      applicationName: 'Learning Media',
      environment: 'Production',
      status: 'HEALTHY',
      runningVersion: '1.2.1',
      lastDeploymentLabel: '6 days ago',
    },
    {
      id: 'health-nova-staging',
      clientName: 'Nova Salon',
      applicationName: 'Digvation POS',
      environment: 'Staging',
      status: 'MAINTENANCE',
      runningVersion: '0.4.0-alpha.1',
    },
  ],
  infrastructure: [
    {
      id: 'node-stark',
      nodeName: 'stark',
      region: 'Singapore',
      status: 'DEGRADED',
      cpuUsagePercent: 68,
      memoryUsagePercent: 91,
      diskUsagePercent: 63,
      installationCount: 2,
    },
    {
      id: 'node-atlas',
      nodeName: 'atlas',
      region: 'Jakarta',
      status: 'HEALTHY',
      cpuUsagePercent: 31,
      memoryUsagePercent: 46,
      diskUsagePercent: 39,
      installationCount: 3,
    },
  ],
  recentDeployments: [
    {
      id: 'deployment-fortuna-web',
      clientName: 'Fortuna Emporos',
      applicationName: 'Company Website',
      serviceName: 'web',
      version: '2.1.0',
      environment: 'Production',
      status: 'SUCCESS',
      deployedAtLabel: '4 hours ago',
    },
    {
      id: 'deployment-nova-pos',
      clientName: 'Nova Salon',
      applicationName: 'Digvation POS',
      serviceName: 'api',
      version: '0.3.0-alpha.2',
      environment: 'Production',
      status: 'FAILED',
      deployedAtLabel: '18 minutes ago',
    },
    {
      id: 'deployment-poseidon-web',
      clientName: 'Poseidon Filter',
      applicationName: 'Company Website',
      serviceName: 'web',
      version: '1.4.2',
      environment: 'Production',
      status: 'SUCCESS',
      deployedAtLabel: '2 days ago',
    },
  ],
  recentEvents: [
    {
      id: 'event-oom-killed',
      type: 'OUT_OF_MEMORY_KILLED',
      title: 'Container terminated by OOM killer',
      description: 'nova-pos-api exceeded its memory allocation on stark.',
      occurredAtLabel: '6 minutes ago',
      clientName: 'Nova Salon',
      applicationName: 'Digvation POS',
      severity: 'CRITICAL',
    },
    {
      id: 'event-restarted',
      type: 'CONTAINER_RESTARTED',
      title: 'Container restarted',
      description: 'nova-pos-api restarted for the 17th time.',
      occurredAtLabel: '7 minutes ago',
      clientName: 'Nova Salon',
      applicationName: 'Digvation POS',
      severity: 'WARNING',
    },
    {
      id: 'event-incident-created',
      type: 'INCIDENT_CREATED',
      title: 'Incident created',
      description: 'POS availability investigation opened for Nova Salon.',
      occurredAtLabel: '19 minutes ago',
      clientName: 'Nova Salon',
      applicationName: 'Digvation POS',
      severity: 'CRITICAL',
    },
    {
      id: 'event-deployment-complete',
      type: 'DEPLOYMENT_COMPLETED',
      title: 'Deployment completed',
      description: 'Fortuna website version 2.1.0 is serving production traffic.',
      occurredAtLabel: '4 hours ago',
      clientName: 'Fortuna Emporos',
      applicationName: 'Company Website',
      severity: 'INFO',
    },
    {
      id: 'event-incident-resolved',
      type: 'INCIDENT_RESOLVED',
      title: 'Incident resolved',
      description: 'Poseidon website certificate renewal completed.',
      occurredAtLabel: 'Yesterday',
      clientName: 'Poseidon Filter',
      applicationName: 'Company Website',
      severity: 'INFO',
    },
  ],
};

const EMPTY_DASHBOARD_OVERVIEW: DashboardOverview = {
  generatedAtLabel: 'Updated moments ago',
  summary: {
    clientCount: 0,
    managedInstallationCount: 0,
    healthyInstallationCount: 0,
    openIncidentCount: 0,
  },
  attentionItems: [],
  applicationHealth: [],
  infrastructure: [],
  recentDeployments: [],
  recentEvents: [],
};

export function createMockDashboardDataSource(
  state: MockDashboardState,
): DashboardDataSource {
  return {
    async getOverview() {
      if (state === 'error') {
        throw new Error('Controlled mock dashboard failure.');
      }

      return state === 'empty'
        ? EMPTY_DASHBOARD_OVERVIEW
        : POPULATED_DASHBOARD_OVERVIEW;
    },
  };
}
