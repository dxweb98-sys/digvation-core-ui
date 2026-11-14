import { describe, expect, it } from 'vitest';
import { initialFormValues, validateForm } from '../../shared/forms/form-spec';
import {
  BRAND_CREATE_FIELDS,
  CLIENT_CREATE_FIELDS,
  contactBody,
  contactFields,
  contactFormValues,
  createClientBody,
} from './client-forms';

describe('client forms', () => {
  it('builds the create body with an uppercased code, nulls for empty fields and the primary contact', () => {
    const values = {
      ...initialFormValues(CLIENT_CREATE_FIELDS),
      code: 'nova',
      display_name: ' Nova ',
      email: '',
      'primary_contact.name': 'Nadia',
      'primary_contact.email': 'nadia@nova.id',
      'primary_contact.is_billing': true,
    };
    expect(validateForm(CLIENT_CREATE_FIELDS, values)).toEqual({});
    expect(createClientBody(values)).toMatchObject({
      code: 'NOVA',
      display_name: 'Nova',
      email: null,
      primary_contact: { name: 'Nadia', email: 'nadia@nova.id', is_billing: true, is_technical: false },
    });
  });

  it('requires the code, name and primary contact', () => {
    expect(Object.keys(validateForm(CLIENT_CREATE_FIELDS, initialFormValues(CLIENT_CREATE_FIELDS))).sort()).toEqual([
      'code',
      'display_name',
      'primary_contact.name',
    ]);
  });

  it('checks brand colors and addresses', () => {
    const errors = validateForm(BRAND_CREATE_FIELDS, {
      ...initialFormValues(BRAND_CREATE_FIELDS),
      code: 'NOVA_B',
      name: 'Nova Barber',
      primary_color: 'red',
      website: 'nova.id',
    });
    expect(errors).toEqual({
      primary_color: 'Use a hex color such as #1A2B3C.',
      website: 'Use a full address starting with https://.',
    });
  });

  it('needs an email for a billing contact and maps the client scope to null', () => {
    const fields = contactFields([]);
    const values = { ...contactFormValues(), name: 'Budi', is_billing: true };
    expect(validateForm(fields, values)).toEqual({ email: 'A billing contact needs an email.' });
    expect(contactBody({ ...values, email: 'budi@nova.id' })).toMatchObject({ brand_id: null, is_billing: true });
    expect(contactBody({ ...values, brand_id: 'brand-1' }).brand_id).toBe('brand-1');
  });

  it('keeps the primary flag locked on the primary contact', () => {
    const primary = contactFields([], {
      id: 'c1',
      name: 'Nadia',
      is_primary: true,
      is_billing: false,
      is_technical: false,
      created_at: '',
      updated_at: '',
    });
    expect(primary.find((field) => field.name === 'is_primary')?.disabled).toBe(true);
  });
});
