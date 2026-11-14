import { api, seg, type Query } from '../../shared/api/client';
import type { Dto } from '../../shared/api/types';

export type Contract = Dto<'ContractDto'>;
export type ContractStatus = Contract['status'];
export type Term = Dto<'ContractTermDto'>;
export type OneOffCharge = Dto<'OneOffChargeDto'>;
export type ContractAddOn = Dto<'ContractAddOnDto'>;
export type AdjustmentType = Term['adjustment_type'];

export const CANCELLABLE: readonly ContractStatus[] = ['PENDING', 'TRIAL', 'ACTIVE', 'SUSPENDED'];

/** A renewal draft is a draft term CORE prefilled from the term it renews. */
export function isRenewalDraft(term: Term) {
  return term.status === 'DRAFT' && term.renewed_from_id !== null;
}

/** Confirming a renewal draft whose price or cycle changed needs a reason. */
export function renewalChanged(term: Term) {
  return (
    isRenewalDraft(term) &&
    term.prefilled_amount !== null &&
    (term.prefilled_amount !== term.agreed_amount || (term.prefilled_cycle ?? term.billing_cycle) !== term.billing_cycle)
  );
}

const contract = (contractId: string) => `/contracts/${seg(contractId)}`;
const term = (contractId: string, termId: string) => `${contract(contractId)}/terms/${seg(termId)}`;

export const contractsApi = {
  list: (query: Query) => api.list<Contract>('/contracts', query),
  detail: (contractId: string) => api.get<Contract>(contract(contractId)),
  create: (body: Dto<'CreateContractDto'>) => api.post<Dto<'ContractMutationResponseDto'>>('/contracts', body),
  update: (contractId: string, body: Dto<'UpdateContractDto'>) => api.patch(contract(contractId), body),
  transition: (contractId: string, body: Dto<'ContractTransitionDto'>) => api.patch(`${contract(contractId)}/status`, body),
  cancel: (contractId: string, body: Dto<'CancelContractDto'>) => api.post(`${contract(contractId)}/cancel`, body),

  addTerm: (contractId: string, body: Dto<'CreateTermDto'>) => api.post(`${contract(contractId)}/terms`, body),
  updateTerm: (contractId: string, termId: string, body: Dto<'UpdateTermDto'>) =>
    api.patch(term(contractId, termId), body),
  confirmTerm: (contractId: string, termId: string, body: Dto<'ConfirmTermDto'>) =>
    api.post(`${term(contractId, termId)}/confirm`, body),
  addCharge: (contractId: string, termId: string, body: Dto<'CreateOneOffChargeDto'>) =>
    api.post(`${term(contractId, termId)}/one-off-charges`, body),
  removeCharge: (contractId: string, termId: string, chargeId: string) =>
    api.delete(`${term(contractId, termId)}/one-off-charges/${seg(chargeId)}`),

  addAddOn: (contractId: string, body: Dto<'CreateContractAddOnDto'>) => api.post(`${contract(contractId)}/add-ons`, body),
  endAddOn: (contractId: string, contractAddOnId: string, effectiveUntil: string) =>
    api.patch(`${contract(contractId)}/add-ons/${seg(contractAddOnId)}`, { effective_until: effectiveUntil }),
};
