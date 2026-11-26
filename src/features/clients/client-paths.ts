const part = encodeURIComponent;

export const clientPaths = {
  list: '/clients',
  client: (clientId: string) => `/clients/${part(clientId)}`,
  business: (clientId: string, businessId: string) => `/clients/${part(clientId)}/businesses/${part(businessId)}`,
  brand: (clientId: string, brandId: string) => `/clients/${part(clientId)}/brands/${part(brandId)}`,
};
