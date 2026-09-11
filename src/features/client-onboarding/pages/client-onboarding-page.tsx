import {
  DButton,
  DCard,
  DCardContent,
  DCheckbox,
  DConnectionError,
  DCurrencyInput,
  DDatePicker,
  DEmptyState,
  DInput,
  DLoadingIndicator,
  DSelect,
  DTextarea,
  DToggle,
  useToast,
} from '@digvation/ui';
import { useQueries } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import type { CapabilitySummary } from '../../capabilities/types/capability';
import {
  minorToMajorValue,
  majorToMinorValue,
} from '../../commercial-catalog/utils/money';
import {
  useProductAddOns,
  useProductPrices,
} from '../../commercial-catalog/hooks/use-commercial-catalog';
import type {
  CatalogPrice,
  CommercialAdjustmentType,
} from '../../commercial-catalog/types/commercial-catalog';
import {
  clientFormSchema,
  normalizeClientCode,
  type ClientFormValues,
} from '../../clients/schemas/client-form-schema';
import { PRODUCT_QUERY_KEYS } from '../../products/data/product-query-keys';
import { useProductDetail } from '../../products/hooks/use-product-detail';
import {
  productDataSource,
  useProductList,
} from '../../products/hooks/use-product-list';
import type { ProductListItem } from '../../products/types/product';
import { useCreateOrResumeClientOnboarding } from '../hooks/use-client-onboarding';
import type {
  ClientOnboardingDraft,
  ClientOnboardingResult,
  ClientProductRelationshipStatus,
  CreateClientOnboardingRequest,
  OnboardingProductDraft,
  OnboardingSubscriptionDraft,
} from '../types/client-onboarding';
import '../client-onboarding.css';

const STEPS = [
  'Client',
  'Products',
  'Features',
  'Capabilities',
  'Commercial',
  'Deployment',
  'Branding',
  'Review',
] as const;

const RELATIONSHIP_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'TRIAL', label: 'Trial' },
  { value: 'PROVISIONING', label: 'Provisioning' },
];
const ENVIRONMENT_OPTIONS = [
  { value: 'PRODUCTION', label: 'Production' },
  { value: 'STAGING', label: 'Staging' },
  { value: 'DEVELOPMENT', label: 'Development' },
];
const DEPLOYMENT_OPTIONS = [
  { value: 'SHARED', label: 'Shared' },
  { value: 'DEDICATED', label: 'Dedicated' },
];
const OWNERSHIP_OPTIONS = [
  { value: 'DIGVATION', label: 'Digvation' },
  { value: 'CLIENT', label: 'Client' },
];
const BRANDING_OPTIONS = [
  { value: 'DIGVATION', label: 'Digvation' },
  { value: 'WHITE_LABEL', label: 'White-label' },
];
const ADJUSTMENT_OPTIONS = [
  { value: 'NONE', label: 'No adjustment' },
  { value: 'NEGOTIATED', label: 'Negotiated' },
  { value: 'PROMOTIONAL', label: 'Promotional' },
  { value: 'GRANDFATHERED', label: 'Grandfathered' },
  { value: 'COMPLIMENTARY', label: 'Complimentary' },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createRequestKey() {
  return `client-onboarding:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

function emptySubscription(): OnboardingSubscriptionDraft {
  return {
    enabled: false,
    startsAt: today(),
    adjustmentType: 'NONE',
    autoRenew: false,
    renewalNoticeDays: 30,
    addOnOfferingIds: [],
  };
}

function initialDraft(): ClientOnboardingDraft {
  return {
    client: {
      code: '',
      displayName: '',
      legalName: '',
      organizationEmail: '',
      organizationPhone: '',
      website: '',
      taxIdentifier: '',
      country: 'Indonesia',
      timezone: 'Asia/Jakarta',
      address: '',
      notes: '',
    },
    products: [],
    capabilityIds: [],
    installation: {
      code: '',
      name: '',
      environment: 'PRODUCTION',
      deploymentMode: 'SHARED',
      infrastructureOwnership: 'DIGVATION',
      managedByDigvation: true,
      region: 'Indonesia',
      applicationUrl: '',
      branding: { mode: 'DIGVATION' },
    },
  };
}

function clean(value?: string) {
  return value?.trim() || undefined;
}

function isoDate(value?: string) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : undefined;
}

function buildRequest(
  draft: ClientOnboardingDraft,
  requestKey: string,
): CreateClientOnboardingRequest {
  const client = draft.client;
  return {
    request_key: requestKey,
    client: {
      code: normalizeClientCode(client.code),
      display_name: client.displayName.trim(),
      legal_name: clean(client.legalName),
      organization_email: clean(client.organizationEmail),
      organization_phone: clean(client.organizationPhone),
      website: clean(client.website),
      tax_identifier: clean(client.taxIdentifier),
      country: clean(client.country),
      timezone: clean(client.timezone),
      address: clean(client.address),
      notes: clean(client.notes),
    },
    products: draft.products.map((product) => {
      const commercial = product.subscription;
      const subscription =
        commercial.enabled && commercial.billingCycle && commercial.currency
          ? {
              starts_at: isoDate(commercial.startsAt)!,
              ends_at: isoDate(commercial.endsAt),
              billing_cycle: commercial.billingCycle,
              currency: commercial.currency,
              agreed_amount_minor:
                commercial.agreedAmountMinor !== commercial.listAmountMinor
                  ? commercial.agreedAmountMinor
                  : undefined,
              adjustment_type: commercial.adjustmentType,
              adjustment_reason: clean(commercial.adjustmentReason),
              auto_renew: commercial.autoRenew,
              renewal_notice_days: commercial.renewalNoticeDays,
              grace_period_days: commercial.gracePeriodDays,
              contract_reference: clean(commercial.contractReference),
              payment_terms_days: commercial.paymentTermsDays,
            }
          : undefined;
      return {
        product_id: product.productId,
        feature_ids: product.featureIds,
        relationship_status: product.relationshipStatus,
        subscription,
        add_ons: subscription
          ? commercial.addOnOfferingIds.map((addOnOfferingId) => ({
              add_on_offering_id: addOnOfferingId,
              effective_from: subscription.starts_at,
              adjustment_type: 'NONE' as CommercialAdjustmentType,
            }))
          : [],
      };
    }),
    capability_ids: draft.capabilityIds,
    installation: {
      code: draft.installation.code.trim().toUpperCase(),
      name: draft.installation.name.trim(),
      environment: draft.installation.environment,
      deployment_mode: draft.installation.deploymentMode,
      infrastructure_ownership: draft.installation.infrastructureOwnership,
      managed_by_digvation: draft.installation.managedByDigvation,
      region: clean(draft.installation.region),
      application_url: clean(draft.installation.applicationUrl),
      branding:
        draft.installation.branding.mode === 'DIGVATION'
          ? { mode: 'DIGVATION' }
          : {
              mode: 'WHITE_LABEL',
              brand_name: clean(draft.installation.branding.brandName),
              logo_url: clean(draft.installation.branding.logoUrl),
              favicon_url: clean(draft.installation.branding.faviconUrl),
              primary_color: clean(draft.installation.branding.primaryColor),
              secondary_color: clean(draft.installation.branding.secondaryColor),
              custom_domain: clean(draft.installation.branding.customDomain),
              support_name: clean(draft.installation.branding.supportName),
              support_email: clean(draft.installation.branding.supportEmail),
            },
    },
  };
}

function validateStep(step: number, draft: ClientOnboardingDraft) {
  if (step === 0) {
    const result = clientFormSchema.safeParse({
      ...draft.client,
      code: normalizeClientCode(draft.client.code),
    });
    return result.success
      ? null
      : result.error.issues[0]?.message ?? 'Complete the Client identity.';
  }
  if (step === 1 && draft.products.length === 0) {
    return 'Select at least one Product.';
  }
  if (step === 4) {
    for (const product of draft.products) {
      const commercial = product.subscription;
      if (!commercial.enabled) continue;
      if (product.relationshipStatus === 'PROVISIONING') {
        return 'A Product with a subscription must start in Trial or Active state.';
      }
      if (
        !commercial.billingCycle ||
        !commercial.currency ||
        commercial.listAmountMinor === undefined
      ) {
        return 'Choose a catalog price for every enabled subscription.';
      }
      if (!commercial.startsAt) return 'Choose a subscription start date.';
      if (
        commercial.agreedAmountMinor !== commercial.listAmountMinor &&
        commercial.adjustmentType === 'NONE'
      ) {
        return 'Choose an adjustment type when agreed price differs from list price.';
      }
      if (
        commercial.adjustmentType !== 'NONE' &&
        !commercial.adjustmentReason?.trim()
      ) {
        return 'Provide an adjustment reason for adjusted pricing.';
      }
      if (
        commercial.adjustmentType === 'COMPLIMENTARY' &&
        commercial.agreedAmountMinor !== 0
      ) {
        return 'Complimentary pricing must have an agreed price of zero.';
      }
    }
  }
  if (step === 5) {
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(draft.installation.code.trim())) {
      return 'Installation code must use letters, numbers, hyphens, or underscores.';
    }
    if (!draft.installation.name.trim()) return 'Installation name is required.';
  }
  if (step === 6) {
    if (
      draft.installation.deploymentMode === 'DEDICATED' &&
      draft.installation.branding.mode !== 'WHITE_LABEL'
    ) {
      return 'Dedicated installations require white-label branding.';
    }
    if (
      draft.installation.branding.mode === 'WHITE_LABEL' &&
      !draft.installation.branding.brandName?.trim()
    ) {
      return 'White-label branding requires a brand name.';
    }
  }
  return null;
}

function StepShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <DCard variant="outlined">
      <DCardContent>
        <div className="onboarding-step-heading">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="onboarding-step-content">{children}</div>
      </DCardContent>
    </DCard>
  );
}

function ClientStep({
  value,
  onChange,
}: {
  value: ClientFormValues;
  onChange: (value: ClientFormValues) => void;
}) {
  const set = <K extends keyof ClientFormValues>(key: K, next: ClientFormValues[K]) =>
    onChange({ ...value, [key]: next });
  return (
    <StepShell
      title="Client identity"
      description="Create the control-plane Client and capture the organization profile used by the rest of the composition."
    >
      <div className="onboarding-grid two-columns">
        <DInput
          label="Client Code *"
          value={value.code}
          hint="Stable machine-readable identity."
          onChange={(next) => set('code', normalizeClientCode(next))}
        />
        <DInput
          label="Display Name *"
          value={value.displayName}
          onChange={(next) => set('displayName', next)}
        />
        <DInput label="Legal Name" value={value.legalName ?? ''} onChange={(next) => set('legalName', next)} />
        <DInput label="Organization Email" value={value.organizationEmail ?? ''} onChange={(next) => set('organizationEmail', next)} />
        <DInput label="Organization Phone" value={value.organizationPhone ?? ''} onChange={(next) => set('organizationPhone', next)} />
        <DInput label="Website" value={value.website ?? ''} onChange={(next) => set('website', next)} />
        <DInput label="Tax Identifier" value={value.taxIdentifier ?? ''} onChange={(next) => set('taxIdentifier', next)} />
        <DInput label="Country" value={value.country ?? ''} onChange={(next) => set('country', next)} />
        <DInput label="Timezone" value={value.timezone ?? ''} onChange={(next) => set('timezone', next)} />
      </div>
      <DTextarea label="Address" value={value.address ?? ''} onChange={(next) => set('address', next)} />
      <DTextarea label="Notes" value={value.notes ?? ''} onChange={(next) => set('notes', next)} />
    </StepShell>
  );
}

function ProductsStep({
  products,
  selected,
  onChange,
}: {
  products: ProductListItem[];
  selected: OnboardingProductDraft[];
  onChange: (products: OnboardingProductDraft[]) => void;
}) {
  return (
    <StepShell
      title="Products"
      description="Select Product entitlements for this Client. Product is the commercial and technical top-level entitlement; Capabilities are selected separately later."
    >
      <div className="onboarding-choice-list">
        {products.map((product) => {
          const current = selected.find((item) => item.productId === product.id);
          return (
            <div className="onboarding-choice-row" key={product.id}>
              <DCheckbox
                checked={Boolean(current)}
                onChange={(event) => {
                  if (event.target.checked) {
                    onChange([
                      ...selected,
                      {
                        productId: product.id,
                        relationshipStatus: 'ACTIVE',
                        featureIds: [],
                        subscription: emptySubscription(),
                      },
                    ]);
                  } else {
                    onChange(selected.filter((item) => item.productId !== product.id));
                  }
                }}
              />
              <div className="onboarding-choice-copy">
                <strong>{product.name}</strong>
                <code>{product.code}</code>
                <span>{product.description ?? 'No description recorded.'}</span>
              </div>
              {current ? (
                <DSelect
                  label="Initial state"
                  value={current.relationshipStatus}
                  clearable={false}
                  options={RELATIONSHIP_OPTIONS}
                  onValueChange={(next) => {
                    if (typeof next !== 'string') return;
                    onChange(
                      selected.map((item) =>
                        item.productId === product.id
                          ? {
                              ...item,
                              relationshipStatus: next as ClientProductRelationshipStatus,
                              subscription:
                                next === 'PROVISIONING'
                                  ? {
                                      ...item.subscription,
                                      enabled: false,
                                      addOnOfferingIds: [],
                                    }
                                  : item.subscription,
                            }
                          : item,
                      ),
                    );
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </StepShell>
  );
}

function ProductFeaturesEditor({
  product,
  name,
  code,
  onChange,
}: {
  product: OnboardingProductDraft;
  name: string;
  code: string;
  onChange: (product: OnboardingProductDraft) => void;
}) {
  const detailQuery = useProductDetail(product.productId);
  if (detailQuery.isPending) {
    return (
      <div className="onboarding-inline-state">
        <DLoadingIndicator label={`Loading ${name} features`} />
      </div>
    );
  }
  if (detailQuery.isError) {
    return (
      <DConnectionError
        title={`${name} features unavailable`}
        message="ProductFeature catalog could not be loaded."
        detail={detailQuery.error.message}
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }
  const features =
    detailQuery.data?.features.filter((feature) => feature.status === 'ACTIVE') ?? [];
  return (
    <section className="onboarding-product-section">
      <header>
        <div><h3>{name}</h3><code>{code}</code></div>
        <span>{product.featureIds.length} selected</span>
      </header>
      {features.length ? (
        <div className="onboarding-choice-list compact">
          {features.map((feature) => (
            <label className="onboarding-check-row" key={feature.id}>
              <DCheckbox
                checked={product.featureIds.includes(feature.id)}
                onChange={(event) =>
                  onChange({
                    ...product,
                    featureIds: event.target.checked
                      ? [...product.featureIds, feature.id]
                      : product.featureIds.filter((id) => id !== feature.id),
                  })
                }
              />
              <span><strong>{feature.name}</strong><code>{feature.code}</code></span>
            </label>
          ))}
        </div>
      ) : (
        <DEmptyState
          title="No active Product Features"
          description="This Product has no selectable active features."
        />
      )}
    </section>
  );
}

function FeaturesStep({
  selected,
  products,
  onChange,
}: {
  selected: OnboardingProductDraft[];
  products: ProductListItem[];
  onChange: (product: OnboardingProductDraft) => void;
}) {
  return (
    <StepShell
      title="Product Features"
      description="Choose explicit ProductFeature entitlements. Product assignment never silently enables every feature."
    >
      <div className="onboarding-stack">
        {selected.map((product) => {
          const catalog = products.find((item) => item.id === product.productId);
          return (
            <ProductFeaturesEditor
              key={product.productId}
              product={product}
              name={catalog?.name ?? product.productId}
              code={catalog?.code ?? product.productId}
              onChange={onChange}
            />
          );
        })}
      </div>
    </StepShell>
  );
}

function CapabilitiesStep({
  products,
  selectedIds,
  onChange,
}: {
  products: OnboardingProductDraft[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const detailQueries = useQueries({
    queries: products.map((product) => ({
      queryKey: PRODUCT_QUERY_KEYS.detail(product.productId),
      queryFn: () => productDataSource.getProductDetail(product.productId),
    })),
  });
  const compatible = useMemo(() => {
    const byId = new Map<
      string,
      { capability: CapabilitySummary; productCodes: string[] }
    >();
    for (const query of detailQueries) {
      const detail = query.data;
      if (!detail) continue;
      for (const capability of detail.capabilities) {
        if (capability.status !== 'ACTIVE') continue;
        const existing = byId.get(capability.id);
        if (existing) existing.productCodes.push(detail.product.code);
        else byId.set(capability.id, { capability, productCodes: [detail.product.code] });
      }
    }
    return [...byId.values()].sort((a, b) =>
      a.capability.code.localeCompare(b.capability.code),
    );
  }, [detailQueries]);

  if (detailQueries.some((query) => query.isPending)) {
    return (
      <StepShell title="Capabilities" description="Loading compatibility catalog.">
        <div className="onboarding-inline-state">
          <DLoadingIndicator label="Loading compatible capabilities" />
        </div>
      </StepShell>
    );
  }
  if (detailQueries.some((query) => query.isError)) {
    return (
      <StepShell
        title="Capabilities"
        description="Reusable capabilities are granted at Client level, never underneath one ClientProduct."
      >
        <DConnectionError
          title="Capability compatibility unavailable"
          message="One or more Product catalogs could not be loaded."
        />
      </StepShell>
    );
  }

  return (
    <StepShell
      title="Capabilities"
      description="Grant reusable Client-level Capabilities compatible with at least one selected Product."
    >
      {compatible.length ? (
        <div className="onboarding-choice-list compact">
          {compatible.map(({ capability, productCodes }) => (
            <label className="onboarding-check-row" key={capability.id}>
              <DCheckbox
                checked={selectedIds.includes(capability.id)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...selectedIds, capability.id]
                      : selectedIds.filter((id) => id !== capability.id),
                  )
                }
              />
              <span>
                <strong>{capability.name}</strong>
                <code>{capability.code}</code>
                <small>Compatible via {productCodes.join(', ')}</small>
              </span>
            </label>
          ))}
        </div>
      ) : (
        <DEmptyState
          title="No compatible capabilities"
          description="The selected Products do not expose any active reusable capability compatibility."
        />
      )}
    </StepShell>
  );
}

function priceLabel(price: CatalogPrice) {
  return `${price.billingCycle.replace('_', ' ')} · ${price.currency} ${minorToMajorValue(
    price.amountMinor,
  ).toLocaleString()}`;
}

function CommercialEditor({
  product,
  name,
  code,
  onChange,
}: {
  product: OnboardingProductDraft;
  name: string;
  code: string;
  onChange: (product: OnboardingProductDraft) => void;
}) {
  const pricesQuery = useProductPrices(product.productId);
  const addOnsQuery = useProductAddOns(product.productId);
  const commercial = product.subscription;
  const prices = pricesQuery.data ?? [];
  const matchingAddOns = (addOnsQuery.data ?? []).filter(
    (offering) =>
      offering.status === 'ACTIVE' &&
      offering.prices.some(
        (price) =>
          price.billingCycle === commercial.billingCycle &&
          price.currency === commercial.currency,
      ),
  );
  const update = (next: Partial<OnboardingSubscriptionDraft>) =>
    onChange({ ...product, subscription: { ...commercial, ...next } });
  const canSubscribe = product.relationshipStatus !== 'PROVISIONING' && prices.length > 0;

  return (
    <section className="onboarding-product-section">
      <header>
        <div><h3>{name}</h3><code>{code}</code></div>
        <span>{product.relationshipStatus}</span>
      </header>
      {pricesQuery.isPending || addOnsQuery.isPending ? (
        <div className="onboarding-inline-state">
          <DLoadingIndicator label={`Loading ${name} commercial catalog`} />
        </div>
      ) : null}
      {pricesQuery.isError || addOnsQuery.isError ? (
        <DConnectionError
          title="Commercial catalog unavailable"
          message={`Pricing or add-ons for ${name} could not be loaded.`}
        />
      ) : null}
      {!pricesQuery.isPending && !pricesQuery.isError ? (
        <>
          <DToggle
            label="Create commercial subscription"
            checked={commercial.enabled}
            disabled={!canSubscribe}
            onChange={(enabled) => {
              const first = prices[0];
              if (!enabled) {
                update({ enabled: false, addOnOfferingIds: [] });
                return;
              }
              if (!first) return;
              update({
                enabled: true,
                billingCycle: first.billingCycle,
                currency: first.currency,
                listAmountMinor: first.amountMinor,
                agreedAmountMinor: first.amountMinor,
                adjustmentType: 'NONE',
                adjustmentReason: '',
                addOnOfferingIds: [],
              });
            }}
          />
          {!canSubscribe ? (
            <p className="onboarding-note">
              Subscription unavailable: set the Product to Trial/Active and ensure at least
              one catalog price exists.
            </p>
          ) : null}
          {commercial.enabled ? (
            <div className="onboarding-commercial-fields">
              <DSelect
                label="Catalog Price *"
                value={
                  commercial.billingCycle && commercial.currency
                    ? `${commercial.billingCycle}|${commercial.currency}`
                    : ''
                }
                options={prices.map((price) => ({
                  value: `${price.billingCycle}|${price.currency}`,
                  label: priceLabel(price),
                }))}
                clearable={false}
                onValueChange={(value) => {
                  if (typeof value !== 'string') return;
                  const selected = prices.find(
                    (price) => `${price.billingCycle}|${price.currency}` === value,
                  );
                  if (!selected) return;
                  update({
                    billingCycle: selected.billingCycle,
                    currency: selected.currency,
                    listAmountMinor: selected.amountMinor,
                    agreedAmountMinor: selected.amountMinor,
                    adjustmentType: 'NONE',
                    adjustmentReason: '',
                    addOnOfferingIds: [],
                  });
                }}
              />
              <div className="onboarding-grid two-columns">
                <DDatePicker
                  label="Starts *"
                  value={commercial.startsAt}
                  clearable={false}
                  onChange={(value) => update({ startsAt: value })}
                />
                <DDatePicker
                  label="Ends"
                  value={commercial.endsAt ?? ''}
                  minDate={commercial.startsAt}
                  onChange={(value) => update({ endsAt: value })}
                />
                <DCurrencyInput
                  label="Agreed Price *"
                  value={minorToMajorValue(
                    commercial.agreedAmountMinor ?? commercial.listAmountMinor ?? 0,
                  )}
                  currencySymbol={commercial.currency ?? '—'}
                  onValueChange={(amount) => {
                    const agreedAmountMinor = majorToMinorValue(amount);
                    update({
                      agreedAmountMinor,
                      adjustmentType:
                        agreedAmountMinor === commercial.listAmountMinor
                          ? 'NONE'
                          : commercial.adjustmentType === 'NONE'
                            ? 'NEGOTIATED'
                            : commercial.adjustmentType,
                    });
                  }}
                />
                <DSelect
                  label="Price Adjustment"
                  value={commercial.adjustmentType}
                  options={ADJUSTMENT_OPTIONS}
                  clearable={false}
                  onValueChange={(value) => {
                    if (typeof value !== 'string') return;
                    const adjustmentType = value as CommercialAdjustmentType;
                    update({
                      adjustmentType,
                      agreedAmountMinor:
                        adjustmentType === 'COMPLIMENTARY'
                          ? 0
                          : adjustmentType === 'NONE'
                            ? commercial.listAmountMinor
                            : commercial.agreedAmountMinor,
                    });
                  }}
                />
              </div>
              {commercial.adjustmentType !== 'NONE' ? (
                <DInput
                  label="Adjustment Reason *"
                  value={commercial.adjustmentReason ?? ''}
                  onChange={(value) => update({ adjustmentReason: value })}
                />
              ) : null}
              <div className="onboarding-grid two-columns">
                <DInput
                  label="Contract Reference"
                  value={commercial.contractReference ?? ''}
                  onChange={(value) => update({ contractReference: value })}
                />
                <DInput
                  label="Payment Terms (days)"
                  type="number"
                  value={String(commercial.paymentTermsDays ?? '')}
                  onChange={(value) =>
                    update({ paymentTermsDays: value ? Number(value) : undefined })
                  }
                />
                <DInput
                  label="Renewal Notice (days)"
                  type="number"
                  value={String(commercial.renewalNoticeDays)}
                  onChange={(value) => update({ renewalNoticeDays: Number(value || 0) })}
                />
                <DInput
                  label="Grace Period (days)"
                  type="number"
                  value={String(commercial.gracePeriodDays ?? '')}
                  onChange={(value) =>
                    update({ gracePeriodDays: value ? Number(value) : undefined })
                  }
                />
              </div>
              <DToggle
                label="Auto renew"
                checked={commercial.autoRenew}
                onChange={(autoRenew) => update({ autoRenew })}
              />
              <div className="onboarding-subsection">
                <h4>Commercial add-ons</h4>
                <p>
                  Only active add-ons priced for the selected billing cycle and currency are
                  selectable.
                </p>
                {matchingAddOns.length ? (
                  matchingAddOns.map((offering) => (
                    <label className="onboarding-check-row" key={offering.id}>
                      <DCheckbox
                        checked={commercial.addOnOfferingIds.includes(offering.id)}
                        onChange={(event) =>
                          update({
                            addOnOfferingIds: event.target.checked
                              ? [...commercial.addOnOfferingIds, offering.id]
                              : commercial.addOnOfferingIds.filter((id) => id !== offering.id),
                          })
                        }
                      />
                      <span><strong>{offering.name}</strong><code>{offering.code}</code></span>
                    </label>
                  ))
                ) : (
                  <p className="onboarding-note">No matching active add-ons.</p>
                )}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function CommercialStep({
  selected,
  products,
  onChange,
}: {
  selected: OnboardingProductDraft[];
  products: ProductListItem[];
  onChange: (product: OnboardingProductDraft) => void;
}) {
  return (
    <StepShell
      title="Commercial & Pricing"
      description="Create the agreed subscription snapshot from catalog prices. ProductFeature and Capability contracts themselves are not micro-priced here."
    >
      <div className="onboarding-stack">
        {selected.map((product) => {
          const catalog = products.find((item) => item.id === product.productId);
          return (
            <CommercialEditor
              key={product.productId}
              product={product}
              name={catalog?.name ?? product.productId}
              code={catalog?.code ?? product.productId}
              onChange={onChange}
            />
          );
        })}
      </div>
    </StepShell>
  );
}

function DeploymentStep({
  draft,
  onChange,
}: {
  draft: ClientOnboardingDraft;
  onChange: (draft: ClientOnboardingDraft) => void;
}) {
  const installation = draft.installation;
  const set = (next: Partial<ClientOnboardingDraft['installation']>) =>
    onChange({ ...draft, installation: { ...installation, ...next } });
  return (
    <StepShell
      title="Deployment"
      description="Define one Client-scoped Installation. Selected Products will be bound to this Installation as a composition, not as separate owners."
    >
      <div className="onboarding-grid two-columns">
        <DInput
          label="Installation Code *"
          value={installation.code}
          onChange={(value) =>
            set({ code: value.trim().toUpperCase().replace(/\s+/g, '-') })
          }
        />
        <DInput
          label="Installation Name *"
          value={installation.name}
          onChange={(value) => set({ name: value })}
        />
        <DSelect
          label="Environment *"
          value={installation.environment}
          clearable={false}
          options={ENVIRONMENT_OPTIONS}
          onValueChange={(value) =>
            typeof value === 'string' &&
            set({ environment: value as ClientOnboardingDraft['installation']['environment'] })
          }
        />
        <DSelect
          label="Deployment Mode *"
          value={installation.deploymentMode}
          clearable={false}
          options={DEPLOYMENT_OPTIONS}
          onValueChange={(value) => {
            if (typeof value !== 'string') return;
            const deploymentMode =
              value as ClientOnboardingDraft['installation']['deploymentMode'];
            onChange({
              ...draft,
              installation: {
                ...installation,
                deploymentMode,
                branding:
                  deploymentMode === 'DEDICATED'
                    ? { ...installation.branding, mode: 'WHITE_LABEL' }
                    : installation.branding,
              },
            });
          }}
        />
        <DSelect
          label="Infrastructure Ownership *"
          value={installation.infrastructureOwnership}
          clearable={false}
          options={OWNERSHIP_OPTIONS}
          onValueChange={(value) =>
            typeof value === 'string' &&
            set({
              infrastructureOwnership:
                value as ClientOnboardingDraft['installation']['infrastructureOwnership'],
            })
          }
        />
        <DInput
          label="Region"
          value={installation.region ?? ''}
          onChange={(value) => set({ region: value })}
        />
        <DInput
          label="Application URL"
          value={installation.applicationUrl ?? ''}
          onChange={(value) => set({ applicationUrl: value })}
        />
      </div>
      <DToggle
        label="Managed by Digvation"
        checked={installation.managedByDigvation}
        onChange={(managedByDigvation) => set({ managedByDigvation })}
      />
      {installation.deploymentMode === 'DEDICATED' ? (
        <p className="onboarding-note strong">
          Dedicated deployment requires WHITE_LABEL branding. The next step is locked to that
          policy.
        </p>
      ) : null}
    </StepShell>
  );
}

function BrandingStep({
  draft,
  onChange,
}: {
  draft: ClientOnboardingDraft;
  onChange: (draft: ClientOnboardingDraft) => void;
}) {
  const branding = draft.installation.branding;
  const set = (next: Partial<typeof branding>) =>
    onChange({
      ...draft,
      installation: {
        ...draft.installation,
        branding: { ...branding, ...next },
      },
    });
  const dedicated = draft.installation.deploymentMode === 'DEDICATED';
  return (
    <StepShell
      title="Branding"
      description="Branding is independent from Product and Capability entitlement. Dedicated installations are always white-label by policy."
    >
      <DSelect
        label="Branding Mode *"
        value={branding.mode}
        options={dedicated ? [{ value: 'WHITE_LABEL', label: 'White-label' }] : BRANDING_OPTIONS}
        clearable={false}
        disabled={dedicated}
        onValueChange={(value) =>
          typeof value === 'string' && set({ mode: value as typeof branding.mode })
        }
      />
      {branding.mode === 'WHITE_LABEL' ? (
        <div className="onboarding-grid two-columns">
          <DInput label="Brand Name *" value={branding.brandName ?? ''} onChange={(value) => set({ brandName: value })} />
          <DInput label="Custom Domain" value={branding.customDomain ?? ''} onChange={(value) => set({ customDomain: value })} />
          <DInput label="Logo URL" value={branding.logoUrl ?? ''} onChange={(value) => set({ logoUrl: value })} />
          <DInput label="Favicon URL" value={branding.faviconUrl ?? ''} onChange={(value) => set({ faviconUrl: value })} />
          <DInput label="Primary Color" placeholder="#0F172A" value={branding.primaryColor ?? ''} onChange={(value) => set({ primaryColor: value })} />
          <DInput label="Secondary Color" placeholder="#FFFFFF" value={branding.secondaryColor ?? ''} onChange={(value) => set({ secondaryColor: value })} />
          <DInput label="Support Name" value={branding.supportName ?? ''} onChange={(value) => set({ supportName: value })} />
          <DInput label="Support Email" value={branding.supportEmail ?? ''} onChange={(value) => set({ supportEmail: value })} />
        </div>
      ) : (
        <p className="onboarding-note">
          Digvation branding will be used for this shared Installation.
        </p>
      )}
    </StepShell>
  );
}

function ReviewStep({
  draft,
  products,
}: {
  draft: ClientOnboardingDraft;
  products: ProductListItem[];
}) {
  return (
    <StepShell
      title="Review"
      description="Nothing has been written yet. The final action below sends one idempotent command; the backend owns orchestration and safe retry."
    >
      <div className="onboarding-review-grid">
        <section>
          <h3>Client</h3>
          <strong>{draft.client.displayName}</strong>
          <code>{draft.client.code}</code>
          <p>{draft.client.legalName || 'No legal name'}</p>
        </section>
        <section>
          <h3>Installation</h3>
          <strong>{draft.installation.name}</strong>
          <code>{draft.installation.code}</code>
          <p>
            {draft.installation.environment} · {draft.installation.deploymentMode} ·{' '}
            {draft.installation.branding.mode}
          </p>
        </section>
        <section>
          <h3>Products</h3>
          {draft.products.map((product) => {
            const catalog = products.find((item) => item.id === product.productId);
            return (
              <p key={product.productId}>
                <strong>{catalog?.name ?? product.productId}</strong> ·{' '}
                {product.relationshipStatus} · {product.featureIds.length} features ·{' '}
                {product.subscription.enabled ? 'subscription' : 'no subscription'}
              </p>
            );
          })}
        </section>
        <section>
          <h3>Capabilities</h3>
          <p>
            {draft.capabilityIds.length
              ? `${draft.capabilityIds.length} Client-level capability grant(s)`
              : 'No reusable capabilities selected'}
          </p>
        </section>
      </div>
      <div className="onboarding-provisioning-note">
        <strong>Result boundary</strong>
        <span>
          Core composition will finish at READY_FOR_PROVISIONING. Runtime/infrastructure
          deployment is intentionally a separate handoff.
        </span>
      </div>
    </StepShell>
  );
}

function SuccessState({
  result,
  onOpenClient,
  onOpenInstallation,
  onStartAnother,
}: {
  result: ClientOnboardingResult;
  onOpenClient: () => void;
  onOpenInstallation: () => void;
  onStartAnother: () => void;
}) {
  return (
    <div className="onboarding-result">
      <DCard variant="outlined">
        <DCardContent>
          <p className="page-eyebrow">Core composition complete</p>
          <h2>Ready for provisioning</h2>
          <p>
            The Client, entitlement composition, commercial terms, Installation, and branding
            were orchestrated through one idempotent backend command.
          </p>
          <dl>
            <div><dt>Onboarding</dt><dd><code>{result.onboardingId}</code></dd></div>
            <div><dt>Status</dt><dd>{result.status}</dd></div>
            <div><dt>Product relationships</dt><dd>{result.productRelationships.length}</dd></div>
            <div><dt>Client capabilities</dt><dd>{result.clientCapabilityIds.length}</dd></div>
          </dl>
          <div className="onboarding-result-actions">
            <DButton variant="outline" onClick={onStartAnother}>Onboard Another Client</DButton>
            {result.clientId ? <DButton variant="outline" onClick={onOpenClient}>Open Client</DButton> : null}
            {result.installationId ? <DButton onClick={onOpenInstallation}>Open Installation</DButton> : null}
          </div>
        </DCardContent>
      </DCard>
    </div>
  );
}

export function ClientOnboardingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ClientOnboardingDraft>(() => initialDraft());
  const [requestKey, setRequestKey] = useState(createRequestKey);
  const [stepError, setStepError] = useState<string | null>(null);
  const [result, setResult] = useState<ClientOnboardingResult | null>(null);
  const onboarding = useCreateOrResumeClientOnboarding();
  const productsQuery = useProductList({
    search: '',
    status: 'ACTIVE',
    page: 1,
    limit: 100,
  });
  const products = productsQuery.data?.products ?? [];

  function updateProduct(next: OnboardingProductDraft) {
    setDraft((current) => ({
      ...current,
      products: current.products.map((product) =>
        product.productId === next.productId ? next : product,
      ),
    }));
  }

  function next() {
    const error = validateStep(step, draft);
    if (error) {
      setStepError(error);
      return;
    }
    setStepError(null);
    if (step === 0) {
      setDraft((current) => ({
        ...current,
        installation: {
          ...current.installation,
          code:
            current.installation.code || `${normalizeClientCode(current.client.code)}-PROD`,
          name:
            current.installation.name || `${current.client.displayName.trim()} Production`,
        },
      }));
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function submit() {
    for (let current = 0; current < STEPS.length - 1; current += 1) {
      const error = validateStep(current, draft);
      if (error) {
        setStep(current);
        setStepError(error);
        return;
      }
    }
    setStepError(null);
    try {
      const response = await onboarding.mutateAsync(buildRequest(draft, requestKey));
      setResult(response);
      showToast({
        title: 'Client onboarding composed',
        description: 'Core composition is ready for runtime provisioning.',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        title: 'Client onboarding failed',
        description:
          error instanceof Error
            ? `${error.message} Retry uses the same idempotency key.`
            : 'The onboarding command failed. Retry is safe with the same request key.',
        variant: 'danger',
      });
    }
  }

  function reset() {
    setDraft(initialDraft());
    setStep(0);
    setStepError(null);
    setResult(null);
    setRequestKey(createRequestKey());
    onboarding.reset();
  }

  if (productsQuery.isPending) {
    return (
      <div className="onboarding-page-state">
        <DLoadingIndicator label="Loading onboarding catalog" />
      </div>
    );
  }
  if (productsQuery.isError) {
    return (
      <div className="onboarding-page-state">
        <DConnectionError
          title="Onboarding catalog unavailable"
          message="Active Products could not be loaded."
          detail={productsQuery.error.message}
          onRetry={() => void productsQuery.refetch()}
        />
      </div>
    );
  }
  if (result?.status === 'READY_FOR_PROVISIONING') {
    return (
      <div className="client-onboarding-page">
        <div className="onboarding-page-heading">
          <div><p className="page-eyebrow">Customer control plane</p><h1>Client Onboarding</h1></div>
        </div>
        <SuccessState
          result={result}
          onStartAnother={reset}
          onOpenClient={() => navigate(`/clients/${result.clientId}`)}
          onOpenInstallation={() => navigate('/installations')}
        />
      </div>
    );
  }

  return (
    <div className="client-onboarding-page">
      <div className="onboarding-page-heading">
        <div>
          <p className="page-eyebrow">Customer control plane</p>
          <h1>Client Onboarding</h1>
          <p>
            Compose Client identity, Product Features, reusable Capabilities, commercial terms,
            deployment, and branding before one final create-and-provision command.
          </p>
        </div>
        <code className="onboarding-request-key">{requestKey}</code>
      </div>
      <ol className="onboarding-stepper" aria-label="Client onboarding progress">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={
              index === step ? 'is-current' : index < step ? 'is-complete' : ''
            }
          >
            <button
              type="button"
              disabled={index > step}
              onClick={() => {
                if (index <= step) {
                  setStep(index);
                  setStepError(null);
                }
              }}
            >
              <span>{index + 1}</span>
              {label}
            </button>
          </li>
        ))}
      </ol>
      {stepError ? <div className="onboarding-error" role="alert">{stepError}</div> : null}
      {onboarding.isError ? (
        <div className="onboarding-error" role="alert">
          <strong>Orchestration failed.</strong> {onboarding.error.message} The same request key is
          preserved, so retrying the final action resumes safely.
        </div>
      ) : null}

      {step === 0 ? (
        <ClientStep
          value={draft.client}
          onChange={(client) => setDraft((current) => ({ ...current, client }))}
        />
      ) : null}
      {step === 1 ? (
        <ProductsStep
          products={products}
          selected={draft.products}
          onChange={(nextProducts) =>
            setDraft((current) => ({
              ...current,
              products: nextProducts,
              capabilityIds: [],
            }))
          }
        />
      ) : null}
      {step === 2 ? (
        <FeaturesStep
          selected={draft.products}
          products={products}
          onChange={updateProduct}
        />
      ) : null}
      {step === 3 ? (
        <CapabilitiesStep
          products={draft.products}
          selectedIds={draft.capabilityIds}
          onChange={(capabilityIds) =>
            setDraft((current) => ({ ...current, capabilityIds }))
          }
        />
      ) : null}
      {step === 4 ? (
        <CommercialStep
          selected={draft.products}
          products={products}
          onChange={updateProduct}
        />
      ) : null}
      {step === 5 ? <DeploymentStep draft={draft} onChange={setDraft} /> : null}
      {step === 6 ? <BrandingStep draft={draft} onChange={setDraft} /> : null}
      {step === 7 ? <ReviewStep draft={draft} products={products} /> : null}

      <div className="onboarding-page-actions">
        <DButton
          variant="outline"
          disabled={step === 0 || onboarding.isPending}
          onClick={() => {
            setStepError(null);
            setStep((current) => Math.max(0, current - 1));
          }}
        >
          Back
        </DButton>
        <div className="onboarding-page-actions-right">
          <DButton
            variant="outline"
            disabled={onboarding.isPending}
            onClick={() => navigate('/clients')}
          >
            Cancel
          </DButton>
          {step < STEPS.length - 1 ? (
            <DButton onClick={next}>Continue</DButton>
          ) : (
            <DButton loading={onboarding.isPending} onClick={() => void submit()}>
              Create &amp; Provision
            </DButton>
          )}
        </div>
      </div>
    </div>
  );
}
