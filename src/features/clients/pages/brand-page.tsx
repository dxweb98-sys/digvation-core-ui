import { Link, useParams } from 'react-router';
import { Page, PageHeader } from '../../../shared/ui/page';
import { useRecordTrail } from '../../../shared/ui/record-trail';
import type { BrandDetail, ClientDetail } from '../clients-api';
import { clientPaths } from '../client-paths';
import { billsBrandContacts, businessTypeOf } from '../client-rules';
import { useClientsCopy } from '../clients-copy';
import { useBrand, useClient } from '../clients-queries';
import {
  BillingRows,
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

/**
 * Brand page (docs/design/07-clients.html, section D): GET /clients/{id}/brands/{brandId}.
 * The client detail (usually cached from the client page) gives the client name
 * for the breadcrumb and the contacts narrowed to this brand, which the brand
 * answer only lists by id.
 */
export function BrandPage() {
  const { clientId = '', brandId = '' } = useParams();
  const copy = useClientsCopy();
  const brand = useBrand(clientId, brandId);
  const detail = useClient(clientId);
  const business = detail.data?.businesses.find((item) => item.id === brand.data?.business_id);
  const clientName = detail.data ? (detail.data.client.full_name ?? detail.data.client.code) : '';
  useRecordTrail(
    brand.data && business
      ? [
          { label: copy.title, to: clientPaths.list },
          { label: clientName, to: clientPaths.client(clientId) },
          { label: business.alias, to: clientPaths.business(clientId, business.id) },
          { label: brand.data.name },
        ]
      : null,
  );

  if (!brand.data) return <ClientPageState query={brand} notFound={copy.brandNotFound} failed={copy.brandFailed} />;
  if (!detail.data) return <ClientPageState query={detail} />;
  return <BrandView brand={brand.data} detail={detail.data} />;
}

function BrandView({ brand, detail }: { brand: BrandDetail; detail: ClientDetail }) {
  const copy = useClientsCopy();
  const business = detail.businesses.find((item) => item.id === brand.business_id);
  const contacts = (business?.contacts ?? []).filter((contact) => contact.brand_id === brand.id);
  const colors = [brand.primary_color, brand.secondary_color].filter((color): color is string => Boolean(color));

  return (
    <Page>
      <PageHeader
        title={brand.name}
        meta={
          <span className="clients-meta-line">
            <span className="clients-code">{brand.code}</span>
            <RecordStatusPill status={brand.status} />
            <span className="clients-muted">{copy.brandOf}</span>
            <Link to={clientPaths.business(brand.client_id, brand.business.id)} className="clients-inline-link">
              {brand.business.alias}
            </Link>
          </span>
        }
      />
      <div className="clients-grid">
        <div className="clients-main">
          <section>
            <CardHeading title={copy.brandProfile} first />
            <InfoCard label={copy.brandProfile}>
              <InfoRow label={copy.brandFields.type}>{businessTypeOf(brand)}</InfoRow>
              <InfoRow label={copy.brandFields.website}>{brand.website}</InfoRow>
              <InfoRow label={copy.brandFields.description}>{brand.description}</InfoRow>
              <InfoRow label={copy.brandFields.colors}>
                {colors.length ? (
                  <span className="clients-swatches">
                    {colors.map((color) => (
                      <span key={color} className="clients-swatch">
                        <span className="clients-swatch-box" style={{ background: color }} aria-hidden="true" />
                        <span className="clients-code">{color}</span>
                      </span>
                    ))}
                  </span>
                ) : null}
              </InfoRow>
            </InfoCard>
          </section>
          <section>
            <CardHeading title={copy.brandBilling} first />
            <InfoCard label={copy.brandBilling}>
              <BillingRows
                billTo={brand.bill_to}
                recipients={brand.recipients}
                brandRecipients={billsBrandContacts(brand.id, business?.contacts ?? [])}
              />
            </InfoCard>
          </section>
          <section>
            <CardHeading title={copy.brandContacts} count={contacts.length} first />
            <InfoCard label={copy.brandContacts}>
              {contacts.length ? (
                contacts.map((contact) => (
                  <ContactRow key={contact.id} contact={contact} brands={business?.brands ?? []} showBrand={false} />
                ))
              ) : (
                <EmptyRow>{copy.noBrandContacts}</EmptyRow>
              )}
            </InfoCard>
          </section>
        </div>
        <aside className="clients-side">
          <CardHeading title={copy.business} first />
          <InfoCard label={copy.business}>
            <LinkRow to={clientPaths.business(brand.client_id, brand.business.id)} label={brand.business.alias}>
              <span className="clients-name clients-code">{brand.business.alias}</span>
              {business ? <span className="clients-muted clients-small">{business.bill_to.name}</span> : null}
            </LinkRow>
          </InfoCard>
          <p className="clients-muted clients-small clients-note">{copy.brandNote}</p>
        </aside>
      </div>
    </Page>
  );
}
