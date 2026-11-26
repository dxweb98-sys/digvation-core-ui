import { Link, useParams } from 'react-router';
import { formatInstant } from '../../../shared/format/date';
import { formatPhone } from '../../../shared/format/phone';
import { Page, PageHeader } from '../../../shared/ui/page';
import { useRecordTrail } from '../../../shared/ui/record-trail';
import type { Business, ClientDetail } from '../clients-api';
import { clientPaths } from '../client-paths';
import { useClientsCopy } from '../clients-copy';
import { useClient } from '../clients-queries';
import {
  BillingRows,
  BrandSummary,
  CardHeading,
  ContactRow,
  EmptyRow,
  InfoCard,
  InfoRow,
  LinkRow,
  RecordStatusPill,
} from '../components/client-parts';
import { ClientPageState } from '../components/client-page-state';
import '../clients.css';

/** Business page (docs/design/07-clients.html, section C): read from the client detail, no extra request. */
export function BusinessPage() {
  const { clientId = '', businessId = '' } = useParams();
  const copy = useClientsCopy();
  const detail = useClient(clientId);
  const business = detail.data?.businesses.find((item) => item.id === businessId);
  const clientName = detail.data ? (detail.data.client.full_name ?? detail.data.client.code) : '';
  useRecordTrail(
    business
      ? [
          { label: copy.title, to: clientPaths.list },
          { label: clientName, to: clientPaths.client(clientId) },
          { label: business.alias },
        ]
      : null,
  );

  if (!detail.data) return <ClientPageState query={detail} />;
  if (!business) return <ClientPageState query={{ ...detail, isError: false }} notFound={copy.businessNotFound} />;
  return <BusinessView detail={detail.data} business={business} />;
}

function BusinessView({ detail, business }: { detail: ClientDetail; business: Business }) {
  const copy = useClientsCopy();
  const { client } = detail;
  const legal = business.legal_entity;

  return (
    <Page>
      <PageHeader
        title={business.alias}
        meta={
          <span className="clients-meta-line">
            <span className="clients-code">{business.code}</span>
            <span className="clients-muted">{copy.businessOf}</span>
            <Link to={clientPaths.client(client.id)} className="clients-inline-link">
              {client.full_name ?? client.code}
            </Link>
          </span>
        }
      />
      <div className="clients-grid">
        <div className="clients-main">
          <section>
            <CardHeading title={copy.billing} first />
            <InfoCard label={copy.billing}>
              <BillingRows billTo={business.bill_to} recipients={business.recipients} contact={business.contact} />
            </InfoCard>
          </section>
          <section>
            <CardHeading title={copy.brands} count={business.brands.length} first />
            <InfoCard label={copy.brands}>
              {business.brands.length ? (
                business.brands.map((brand) => (
                  <LinkRow
                    key={brand.id}
                    to={clientPaths.brand(client.id, brand.id)}
                    label={brand.name}
                    aside={<RecordStatusPill status={brand.status} />}
                  >
                    <BrandSummary brand={brand} />
                  </LinkRow>
                ))
              ) : (
                <EmptyRow>{copy.noBrands}</EmptyRow>
              )}
            </InfoCard>
          </section>
          <section>
            <CardHeading title={copy.contacts} count={business.contacts.length} first />
            <InfoCard label={copy.contacts}>
              {business.contacts.length ? (
                business.contacts.map((contact) => <ContactRow key={contact.id} contact={contact} brands={business.brands} />)
              ) : (
                <EmptyRow>{copy.noContacts}</EmptyRow>
              )}
            </InfoCard>
          </section>
        </div>
        <aside className="clients-side">
          <CardHeading title={copy.legalEntity} first />
          <InfoCard label={copy.legalEntity}>
            {legal ? (
              <>
                <InfoRow label={copy.legalFields.name}>{legal.legal_name}</InfoRow>
                <InfoRow label={copy.legalFields.tax}>{legal.tax_identifier}</InfoRow>
                <InfoRow label={copy.legalFields.address}>{legal.address}</InfoRow>
                <InfoRow label={copy.legalFields.status}>
                  <RecordStatusPill status={legal.status} />
                </InfoRow>
              </>
            ) : (
              <EmptyRow>{copy.noLegalEntity}</EmptyRow>
            )}
          </InfoCard>
          <CardHeading title={copy.businessData} />
          <InfoCard label={copy.businessData}>
            <InfoRow label={copy.fields.address}>
              {business.address || <span className="clients-muted">{copy.usesClient.address}</span>}
            </InfoRow>
            <InfoRow label={copy.fields.email}>
              {business.email || <span className="clients-muted">{copy.usesClient.email}</span>}
            </InfoRow>
            <InfoRow label={copy.fields.phone}>
              {formatPhone(business.phone) || <span className="clients-muted">{copy.usesClient.phone}</span>}
            </InfoRow>
            <InfoRow label={copy.fields.registered}>{formatInstant(business.created_at)}</InfoRow>
          </InfoCard>
        </aside>
      </div>
    </Page>
  );
}
