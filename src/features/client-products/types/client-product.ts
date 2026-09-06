export type ClientProductStatus = 'PROVISIONING' | 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'DECOMMISSIONED';

export interface ClientProduct {
  id: string;
  clientId: string;
  productId: string;
  status: ClientProductStatus;
  statusChangedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientProductSummary extends ClientProduct {
  productName: string;
  productCode: string;
}

export interface ProductClientSummary extends ClientProduct {
  clientDisplayName: string;
  clientCode: string;
}

export interface AssignableProduct {
  id: string;
  code: string;
  name: string;
}

export interface AssignClientProductInput {
  clientId: string;
  productId: string;
}

export interface ClientProductStatusTransitionInput {
  clientProductId: string;
  targetStatus: ClientProductStatus;
  reason: string;
}
