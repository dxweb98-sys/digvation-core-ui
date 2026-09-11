import { normalizeInstallationCode } from '../schemas/installation-form-schema';
import type { InstallationDataSource } from './installation-data-source';
import type {
  BrandingProfile,
  ClientOption,
  ClientProductOption,
  Installation,
  InstallationStatus,
} from '../types/installation';

const CLIENTS: ClientOption[] = [
  { id: 'client-nova', label: 'Nova Salon · NOVA', status: 'ACTIVE' },
  { id: 'client-fortuna', label: 'Fortuna Emporos · FORTUNA', status: 'ACTIVE' },
];

const CLIENT_PRODUCTS: ClientProductOption[] = [
  { id: 'client-product-nova-pos', clientId: 'client-nova', productId: 'product-pos', productCode: 'POS', productName: 'Digvation POS', status: 'ACTIVE', label: 'Digvation POS · POS' },
  { id: 'client-product-nova-workshop', clientId: 'client-nova', productId: 'product-workshop', productCode: 'WORKSHOP', productName: 'Digvation Workshop', status: 'TRIAL', label: 'Digvation Workshop · WORKSHOP' },
  { id: 'client-product-fortuna-pos', clientId: 'client-fortuna', productId: 'product-pos', productCode: 'POS', productName: 'Digvation POS', status: 'ACTIVE', label: 'Digvation POS · POS' },
];

const DIGVATION_BRANDING: BrandingProfile = { mode: 'DIGVATION' };

const INSTALLATIONS: Installation[] = [
  {
    id: 'installation-nova-production',
    clientId: 'client-nova',
    clientCode: 'NOVA',
    clientName: 'Nova Salon',
    code: 'NOVA-PROD',
    name: 'Nova Production',
    environment: 'PRODUCTION',
    status: 'ACTIVE',
    deploymentMode: 'DEDICATED',
    infrastructureOwnership: 'DIGVATION',
    managedByDigvation: true,
    region: 'Jakarta',
    applicationUrl: 'https://nova.example.test',
    statusChangedAt: '2026-09-01T00:00:00.000Z',
    products: CLIENT_PRODUCTS.filter((item) => item.clientId === 'client-nova').map((item) => ({
      clientProductId: item.id,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      clientProductStatus: item.status,
    })),
    branding: {
      mode: 'WHITE_LABEL',
      brandName: 'Nova Salon',
      customDomain: 'app.novasalon.test',
      supportEmail: 'support@novasalon.test',
    },
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
  },
];

const VALID_TRANSITIONS: Record<InstallationStatus, InstallationStatus[]> = {
  PROVISIONING: ['ACTIVE', 'SUSPENDED', 'DECOMMISSIONED'],
  ACTIVE: ['SUSPENDED', 'DECOMMISSIONED'],
  SUSPENDED: ['ACTIVE', 'DECOMMISSIONED'],
  DECOMMISSIONED: [],
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function now() {
  return new Date().toISOString();
}

function clientMeta(clientId: string) {
  const client = CLIENTS.find((item) => item.id === clientId);
  if (!client) throw new Error('Client was not found.');
  const [name, code] = client.label.split(' · ');
  return { clientName: name, clientCode: code };
}

function productBindings(clientId: string, ids: string[]) {
  return ids.map((id) => {
    const item = CLIENT_PRODUCTS.find((candidate) => candidate.id === id && candidate.clientId === clientId);
    if (!item) throw new Error('Every installation product must belong to the selected Client.');
    return {
      clientProductId: item.id,
      productId: item.productId,
      productCode: item.productCode,
      productName: item.productName,
      clientProductStatus: item.status,
    };
  });
}

function assertBranding(deploymentMode: Installation['deploymentMode'], branding: BrandingProfile) {
  if (deploymentMode === 'DEDICATED' && branding.mode !== 'WHITE_LABEL') {
    throw new Error('Dedicated installations require white-label branding.');
  }
  if (branding.mode === 'WHITE_LABEL' && !branding.brandName?.trim()) {
    throw new Error('White-label branding requires a brand name.');
  }
}

export function createMockInstallationDataSource(): InstallationDataSource {
  const installations = INSTALLATIONS.map(clone);
  return {
    async getInstallations(query) {
      const search = query.search.trim().toLowerCase();
      const matches = installations.filter((installation) =>
        (!query.clientId || installation.clientId === query.clientId) &&
        (query.status === 'ALL' || installation.status === query.status) &&
        (query.environment === 'ALL' || installation.environment === query.environment) &&
        [installation.name, installation.code, installation.clientName, ...installation.products.map((item) => item.productName)]
          .join(' ')
          .toLowerCase()
          .includes(search),
      );
      const totalPages = Math.max(1, Math.ceil(matches.length / query.limit));
      return {
        installations: matches.slice((query.page - 1) * query.limit, query.page * query.limit).map(clone),
        total: matches.length,
        totalPages,
      };
    },
    async getInstallation(installationId) {
      const item = installations.find((candidate) => candidate.id === installationId);
      return item ? clone(item) : null;
    },
    async getClientInstallations(clientId) {
      return installations.filter((item) => item.clientId === clientId).map(clone);
    },
    async getClientOptions() {
      return CLIENTS.map(clone);
    },
    async getClientProductOptions(clientId) {
      return CLIENT_PRODUCTS.filter((item) => item.clientId === clientId && !['CANCELLED', 'DECOMMISSIONED'].includes(item.status)).map(clone);
    },
    async createInstallation(input) {
      const code = normalizeInstallationCode(input.code);
      if (installations.some((item) => item.code === code)) throw new Error('Installation code is already in use.');
      assertBranding(input.deploymentMode, input.branding);
      const meta = clientMeta(input.clientId);
      const timestamp = now();
      const installation: Installation = {
        id: `installation-${code.toLowerCase()}`,
        clientId: input.clientId,
        clientCode: meta.clientCode,
        clientName: meta.clientName,
        code,
        name: input.name.trim(),
        environment: input.environment,
        status: 'PROVISIONING',
        deploymentMode: input.deploymentMode,
        infrastructureOwnership: input.infrastructureOwnership,
        managedByDigvation: input.managedByDigvation,
        region: input.region?.trim() || undefined,
        applicationUrl: input.applicationUrl?.trim() || undefined,
        statusChangedAt: timestamp,
        products: productBindings(input.clientId, input.clientProductIds),
        branding: clone(input.branding.mode === 'DIGVATION' ? DIGVATION_BRANDING : input.branding),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      installations.unshift(installation);
      return clone(installation);
    },
    async updateInstallation(installationId, input) {
      const installation = installations.find((item) => item.id === installationId);
      if (!installation) throw new Error('Installation was not found.');
      assertBranding(input.deploymentMode, installation.branding);
      Object.assign(installation, {
        ...input,
        name: input.name.trim(),
        region: input.region?.trim() || undefined,
        applicationUrl: input.applicationUrl?.trim() || undefined,
        updatedAt: now(),
      });
      return clone(installation);
    },
    async replaceInstallationProducts(input) {
      const installation = installations.find((item) => item.id === input.installationId);
      if (!installation) throw new Error('Installation was not found.');
      installation.products = productBindings(installation.clientId, input.clientProductIds);
      installation.updatedAt = now();
      return clone(installation);
    },
    async updateInstallationBranding(input) {
      const installation = installations.find((item) => item.id === input.installationId);
      if (!installation) throw new Error('Installation was not found.');
      assertBranding(installation.deploymentMode, input.branding);
      installation.branding = clone(input.branding.mode === 'DIGVATION' ? DIGVATION_BRANDING : input.branding);
      installation.updatedAt = now();
      return clone(installation);
    },
    async transitionInstallationStatus(input) {
      const installation = installations.find((item) => item.id === input.installationId);
      if (!installation) throw new Error('Installation was not found.');
      if (!input.reason.trim()) throw new Error('A reason is required for lifecycle changes.');
      if (!VALID_TRANSITIONS[installation.status].includes(input.targetStatus)) {
        throw new Error(`Cannot transition ${installation.status} to ${input.targetStatus}.`);
      }
      if (input.targetStatus === 'ACTIVE') assertBranding(installation.deploymentMode, installation.branding);
      installation.status = input.targetStatus;
      installation.statusChangedAt = now();
      installation.updatedAt = now();
      return clone(installation);
    },
  };
}
