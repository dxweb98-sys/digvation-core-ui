import type {
  AddOnOffering,
  AddOnOfferingInput,
  AddOnOfferingTransitionInput,
  CatalogPrice,
  ReplaceAddOnOfferingGrantsInput,
  UpdateAddOnOfferingInput,
  UpsertCatalogPriceInput,
} from '../types/commercial-catalog';

export interface CommercialCatalogDataSource {
  getProductPrices(productId: string): Promise<CatalogPrice[]>;
  upsertProductPrice(
    productId: string,
    input: UpsertCatalogPriceInput,
  ): Promise<CatalogPrice>;
  getProductAddOns(productId: string): Promise<AddOnOffering[]>;
  getAddOn(addOnOfferingId: string): Promise<AddOnOffering | null>;
  createAddOn(input: AddOnOfferingInput): Promise<AddOnOffering>;
  updateAddOn(input: UpdateAddOnOfferingInput): Promise<AddOnOffering>;
  upsertAddOnPrice(
    addOnOfferingId: string,
    input: UpsertCatalogPriceInput,
  ): Promise<CatalogPrice>;
  replaceAddOnGrants(input: ReplaceAddOnOfferingGrantsInput): Promise<void>;
  transitionAddOn(input: AddOnOfferingTransitionInput): Promise<AddOnOffering>;
}
