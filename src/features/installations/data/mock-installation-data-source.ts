import { normalizeInstallationCode } from '../schemas/installation-form-schema';
import type { InstallationDataSource } from './installation-data-source';
import type { ClientProductOption, Installation, InstallationStatus, InstallationSummary } from '../types/installation';

const CLIENT_PRODUCTS = [
  { id: 'client-product-nova-pos', clientId: 'client-nova', clientName: 'Nova Salon', productName: 'Digvation POS', productCode: 'DIGVATION-POS' },
  { id: 'client-product-nova-workshop', clientId: 'client-nova', clientName: 'Nova Salon', productName: 'Digvation Workshop', productCode: 'DIGVATION-WORKSHOP' },
  { id: 'client-product-poseidon-site', clientId: 'client-poseidon', clientName: 'Poseidon Filter', productName: 'Company Website', productCode: 'COMPANY-SITE' },
  { id: 'client-product-fortuna-site', clientId: 'client-fortuna', clientName: 'Fortuna Emporos', productName: 'Company Website', productCode: 'COMPANY-SITE' },
] as const;

const INSTALLATIONS: Installation[] = [
  { id: 'installation-nova-pos-production', clientProductId: 'client-product-nova-pos', code: 'NOVA-POS-PROD', name: 'Nova POS Production', environment: 'PRODUCTION', status: 'ACTIVE', deploymentMode: 'DEDICATED', infrastructureOwnership: 'DIGVATION', managedByDigvation: true, region: 'Jakarta', applicationUrl: 'https://pos.novasalon.digvation.id', createdAt: '2026-06-14T04:30:00.000Z', updatedAt: '2026-09-06T10:00:00.000Z' },
  { id: 'installation-nova-workshop-staging', clientProductId: 'client-product-nova-workshop', code: 'NOVA-WORKSHOP-STG', name: 'Nova Workshop Staging', environment: 'STAGING', status: 'PROVISIONING', deploymentMode: 'SHARED', infrastructureOwnership: 'DIGVATION', managedByDigvation: true, region: 'Singapore', createdAt: '2026-09-05T09:00:00.000Z', updatedAt: '2026-09-05T09:00:00.000Z' },
  { id: 'installation-poseidon-site-production', clientProductId: 'client-product-poseidon-site', code: 'POSEIDON-SITE-PROD', name: 'Poseidon Website', environment: 'PRODUCTION', status: 'ACTIVE', deploymentMode: 'DEDICATED', infrastructureOwnership: 'CLIENT', managedByDigvation: true, region: 'Jakarta', applicationUrl: 'https://poseidonfilter.id', createdAt: '2026-07-28T03:15:00.000Z', updatedAt: '2026-09-04T08:40:00.000Z' },
  { id: 'installation-fortuna-site-production', clientProductId: 'client-product-fortuna-site', code: 'FORTUNA-SITE-PROD', name: 'Fortuna Website', environment: 'PRODUCTION', status: 'SUSPENDED', deploymentMode: 'SHARED', infrastructureOwnership: 'DIGVATION', managedByDigvation: false, region: 'Singapore', applicationUrl: 'https://fortunaemporos.com', createdAt: '2026-08-07T06:00:00.000Z', updatedAt: '2026-09-01T02:45:00.000Z' },
];

const VALID_TRANSITIONS: Record<InstallationStatus, InstallationStatus[]> = {
  PROVISIONING: ['ACTIVE', 'DECOMMISSIONED'],
  ACTIVE: ['SUSPENDED', 'DECOMMISSIONED'],
  SUSPENDED: ['ACTIVE', 'DECOMMISSIONED'],
  DECOMMISSIONED: ['PROVISIONING'],
};

function copyInstallation(installation: Installation): Installation { return { ...installation }; }
function now() { return new Date().toISOString(); }
function resolveInstallation(installation: Installation): InstallationSummary {
  const clientProduct = CLIENT_PRODUCTS.find((candidate) => candidate.id === installation.clientProductId);
  if (!clientProduct) throw new Error('Installation references an unavailable client product.');
  return {
    ...copyInstallation(installation),
    clientId: clientProduct.clientId,
    clientName: clientProduct.clientName,
    productName: clientProduct.productName,
    productCode: clientProduct.productCode,
  };
}

export function createMockInstallationDataSource(): InstallationDataSource {
  const installations = INSTALLATIONS.map(copyInstallation);
  return {
    async getInstallations(query) {
      const search = query.search.trim().toLowerCase();
      const matches = installations.filter((installation) => {
        const resolved = resolveInstallation(installation);
        return (query.status === 'ALL' || installation.status === query.status)
          && (query.environment === 'ALL' || installation.environment === query.environment)
          && [installation.name, installation.code, resolved.clientName, resolved.productName].join(' ').toLowerCase().includes(search);
      });
      const totalPages = Math.max(1, Math.ceil(matches.length / query.limit));
      const page = Math.min(Math.max(query.page, 1), totalPages);
      return { installations: matches.slice((page - 1) * query.limit, page * query.limit).map(resolveInstallation), total: matches.length, totalPages };
    },
    async getInstallation(installationId) { const installation = installations.find((candidate) => candidate.id === installationId); return installation ? resolveInstallation(installation) : null; },
    async getClientInstallations(clientId) { return installations.filter((installation) => resolveInstallation(installation).clientId === clientId).map(resolveInstallation); },
    async getClientProductOptions(): Promise<ClientProductOption[]> { return CLIENT_PRODUCTS.map((clientProduct) => ({ id: clientProduct.id, label: `${clientProduct.clientName} · ${clientProduct.productName}` })); },
    async createInstallation(input) {
      const code = normalizeInstallationCode(input.code);
      if (installations.some((installation) => installation.code === code)) throw new Error('Installation code is already in use.');
      if (!CLIENT_PRODUCTS.some((clientProduct) => clientProduct.id === input.clientProductId)) throw new Error('Client product was not found.');
      const timestamp = now();
      const installation: Installation = { id: `installation-${code.toLowerCase()}`, ...input, code, name: input.name.trim(), region: input.region?.trim() || undefined, applicationUrl: input.applicationUrl?.trim() || undefined, status: 'PROVISIONING', createdAt: timestamp, updatedAt: timestamp };
      installations.unshift(installation);
      return resolveInstallation(installation);
    },
    async updateInstallation(installationId, input) {
      const installation = installations.find((candidate) => candidate.id === installationId);
      if (!installation) throw new Error('Installation was not found.');
      Object.assign(installation, { ...input, name: input.name.trim(), region: input.region?.trim() || undefined, applicationUrl: input.applicationUrl?.trim() || undefined, updatedAt: now() });
      return resolveInstallation(installation);
    },
    async transitionInstallationStatus(input) {
      const installation = installations.find((candidate) => candidate.id === input.installationId);
      if (!installation) throw new Error('Installation was not found.');
      if (!input.reason.trim()) throw new Error('A reason is required for lifecycle changes.');
      if (!VALID_TRANSITIONS[installation.status].includes(input.targetStatus)) throw new Error(`Cannot transition ${installation.status} to ${input.targetStatus}.`);
      installation.status = input.targetStatus; installation.updatedAt = now();
      return copyInstallation(installation);
    },
  };
}
