import { api, seg, type Query } from '../../shared/api/client';
import type { Dto } from '../../shared/api/types';

export type Service = Dto<'ClientServiceDto'>;
export type ServiceStatus = Service['status'];
export type HeldAddOn = Dto<'ClientAddOnDto'>;

/** core-v2 client-service.lifecycle.ts, shared by services and the add-ons they hold. */
export const SERVICE_TRANSITIONS: Record<ServiceStatus, readonly ServiceStatus[]> = {
  PROVISIONING: ['TRIAL', 'ACTIVE', 'CANCELLED'],
  TRIAL: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
  ACTIVE: ['SUSPENDED', 'CANCELLED'],
  SUSPENDED: ['ACTIVE', 'CANCELLED'],
  CANCELLED: ['DECOMMISSIONED'],
  DECOMMISSIONED: [],
};

/** A service that has not been cancelled or decommissioned can still change. */
export function isOpenService(status: ServiceStatus) {
  return status !== 'CANCELLED' && status !== 'DECOMMISSIONED';
}

const service = (clientId: string, serviceId: string) => `/clients/${seg(clientId)}/services/${seg(serviceId)}`;
type Transition = Dto<'ServiceTransitionDto'>;

export const servicesApi = {
  all: (query: Query) => api.list<Service>('/services', query),
  ofClient: (clientId: string) => api.get<Dto<'ClientServiceListDto'>>(`/clients/${seg(clientId)}/services`),
  detail: (clientId: string, serviceId: string) => api.get<Service>(service(clientId, serviceId)),
  create: (clientId: string, body: Dto<'CreateClientServiceDto'>) =>
    api.post<Dto<'ServiceMutationResponseDto'>>(`/clients/${seg(clientId)}/services`, body),
  setFeatures: (clientId: string, serviceId: string, featureIds: string[]) =>
    api.put(`${service(clientId, serviceId)}/features`, { feature_ids: featureIds }),
  transition: (clientId: string, serviceId: string, body: Transition) =>
    api.patch(`${service(clientId, serviceId)}/status`, body),
  addAddOn: (clientId: string, serviceId: string, addOnId: string) =>
    api.post(`${service(clientId, serviceId)}/add-ons`, { add_on_id: addOnId }),
  transitionAddOn: (clientId: string, serviceId: string, heldId: string, body: Transition) =>
    api.patch(`${service(clientId, serviceId)}/add-ons/${seg(heldId)}/status`, body),
};
