import type { BrandDetail, Business, Client, ClientDetail, Contact } from '../features/clients/clients-api';

/** Reference cases of docs/design/07-clients.html: Poseidon Filter and Nova Beauty Salon. Test-only. */
const at = '2026-11-24T03:05:00Z';

export function client(overrides: Partial<Client> = {}): Client {
  return {
    id: 'cln-1',
    code: 'DCLN-261124-0001',
    full_name: 'Poseidon Filter',
    email: 'owner@poseidon-filter.invalid',
    phone: '6281200000001',
    address: 'Jl. Contoh No. 1, Jakarta',
    status: 'ACTIVE',
    status_changed_at: at,
    created_at: at,
    updated_at: at,
    ...overrides,
  };
}

export function contact(overrides: Partial<Contact> = {}): Contact {
  return {
    id: 'ct-1',
    brand_id: null,
    name: 'Admin Nova',
    position: 'Admin kasir',
    email: 'admin@nova-salon.invalid',
    phone: '6281200000003',
    is_primary: true,
    is_billing: true,
    is_technical: false,
    is_pic: true,
    created_at: at,
    updated_at: at,
    ...overrides,
  };
}

const baseBusiness: Business = {
  id: 'biz-1',
  code: 'DBIZ-261124-0001',
  alias: 'POSEIDON',
  address: null,
  email: null,
  phone: null,
  notes: null,
  created_at: at,
  updated_at: at,
  legal_entity: {
    id: 'le-1',
    legal_name: 'PT Poseidon Filter Indonesia',
    tax_identifier: '01.234.567.8-012.000',
    address: 'Jl. Industri Raya No. 8, Bekasi',
    status: 'ACTIVE',
    created_at: at,
    updated_at: at,
  },
  brands: [
    {
      id: 'brd-1',
      code: 'DBRD-261124-0001',
      name: 'Poseidon Filter',
      description: 'Filter air rumah tangga dan industri.',
      website: 'poseidonfilter.id',
      primary_color: '#0E5FA8',
      secondary_color: '#7CC4F2',
      business_type: { id: 'bt-wt', code: 'WATER_TREATMENT', name: 'Water Treatment' },
      custom_business_type: null,
      status: 'ACTIVE',
      created_at: at,
      updated_at: at,
    },
  ],
  contacts: [],
  bill_to: {
    name: 'PT Poseidon Filter Indonesia',
    name_source: 'LEGAL_ENTITY',
    address: 'Jl. Industri Raya No. 8, Bekasi',
    address_source: 'LEGAL_ENTITY',
  },
  recipients: { emails: ['owner@poseidon-filter.invalid'], source: 'CLIENT' },
  contact: { email: 'owner@poseidon-filter.invalid', email_source: 'CLIENT', phone: '6281200000001', phone_source: 'CLIENT' },
};

export function business(overrides: Partial<Business> = {}): Business {
  return { ...baseBusiness, ...overrides };
}

export function detail(clientOverrides: Partial<Client> = {}, businesses: Business[] = [business()]): ClientDetail {
  return {
    client: client(clientOverrides),
    businesses,
    summary: {
      businesses: businesses.length,
      brands: businesses.reduce((n, item) => n + item.brands.length, 0),
      legal_entities: businesses.filter((item) => item.legal_entity).length,
      contacts: businesses.reduce((n, item) => n + item.contacts.length, 0),
    },
  };
}

/** Nova Beauty Salon: NOVA (alias, client address, a business billing contact) and NOVABARBER (legal entity, a brand-only contact). */
export function novaDetail(): ClientDetail {
  const nova = business({
    id: 'biz-nova',
    code: 'DBIZ-261124-0002',
    alias: 'NOVA',
    legal_entity: null,
    brands: [
      { ...baseBusiness.brands[0], id: 'brd-nova', code: 'DBRD-261124-0002', name: 'Nova Beauty Salon', website: 'novasalon.id', business_type: { id: 'bt-salon', code: 'SALON', name: 'Salon & Beauty' }, primary_color: null, secondary_color: null, description: null },
    ],
    contacts: [contact()],
    bill_to: { name: 'NOVA', name_source: 'ALIAS', address: 'Jl. Contoh No. 2, Jakarta', address_source: 'CLIENT' },
    recipients: { emails: ['admin@nova-salon.invalid'], source: 'CONTACTS' },
    contact: { email: 'admin@nova-salon.invalid', email_source: 'CONTACT', phone: '6281200000003', phone_source: 'CONTACT' },
  });
  const barber = business({
    id: 'biz-barber',
    code: 'DBIZ-261125-0003',
    alias: 'NOVABARBER',
    address: 'Jl. Kemang Raya No. 5, Jakarta',
    legal_entity: { ...baseBusiness.legal_entity!, id: 'le-2', legal_name: 'CV Nova Barber Indonesia', tax_identifier: '02.345.678.9-013.000', address: null },
    brands: [
      { ...baseBusiness.brands[0], id: 'brd-barber', code: 'DBRD-261125-0001', name: 'Nova Barber', website: null, description: null, primary_color: '#1F2937', secondary_color: null, business_type: null, custom_business_type: 'Barbershop' },
    ],
    contacts: [contact({ id: 'ct-rudi', brand_id: 'brd-barber', name: 'Rudi Hartono', position: 'Kepala barber', email: 'rudi@nova-salon.invalid', phone: '6281200000004', is_pic: false, is_technical: true })],
    bill_to: { name: 'CV Nova Barber Indonesia', name_source: 'LEGAL_ENTITY', address: 'Jl. Kemang Raya No. 5, Jakarta', address_source: 'BUSINESS' },
    recipients: { emails: ['owner@nova-salon.invalid'], source: 'CLIENT' },
    contact: { email: 'rudi@nova-salon.invalid', email_source: 'CONTACT', phone: '6281200000004', phone_source: 'CONTACT' },
  });
  return detail(
    { id: 'cln-2', code: 'DCLN-261124-0002', full_name: 'Nova Beauty Salon', email: 'owner@nova-salon.invalid', phone: '6281200000002', address: 'Jl. Contoh No. 2, Jakarta' },
    [nova, barber],
  );
}

export function brandDetail(source: ClientDetail, brandId: string, overrides: Partial<BrandDetail> = {}): BrandDetail {
  const owner = source.businesses.find((item) => item.brands.some((brand) => brand.id === brandId))!;
  const brand = owner.brands.find((item) => item.id === brandId)!;
  return {
    ...brand,
    client_id: source.client.id,
    business_id: owner.id,
    business: {
      id: owner.id,
      code: owner.code,
      alias: owner.alias,
      legal_entity_id: owner.legal_entity?.id ?? null,
      contact_ids: owner.contacts.map((item) => item.id),
    },
    bill_to: owner.bill_to,
    recipients: owner.recipients,
    contact: owner.contact,
    ...overrides,
  };
}
