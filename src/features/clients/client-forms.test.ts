import { describe, expect, it } from 'vitest';
import { initialFormValues, validateForm } from '../../shared/forms/form-spec';
import {
  BRAND_CREATE_FIELDS,
  CLIENT_CREATE_FIELDS,
  NO_LEGAL_ENTITY,
  brandBody,
  brandFormValues,
  contactBody,
  contactFields,
  contactFormValues,
  createClientBody,
  groupBody,
  groupFields,
  groupFormValues,
  startGroupBody,
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
      primary_color: 'Gunakan warna hex seperti #1A2B3C.',
      website: 'Gunakan alamat lengkap yang dimulai dengan https://.',
    });
  });

  it('needs an email for a billing contact and maps the client scope to null', () => {
    const fields = contactFields([], []);
    const values = { ...contactFormValues(), name: 'Budi', is_billing: true };
    expect(validateForm(fields, values)).toEqual({ email: 'Kontak penagihan membutuhkan email.' });
    expect(contactBody({ ...values, email: 'budi@nova.id' })).toMatchObject({
      brand_id: null,
      group_id: null,
      is_billing: true,
    });
    expect(contactBody({ ...values, brand_id: 'brand:brand-1' })).toMatchObject({
      brand_id: 'brand-1',
      group_id: null,
    });
    expect(contactBody({ ...values, brand_id: 'group:group-1' })).toMatchObject({
      brand_id: null,
      group_id: 'group-1',
      is_pic: false,
    });
  });

  it('sends the empty legal entity choice as null, never the picker sentinel', () => {
    const fields = groupFields([{ id: 'le-1', name: 'PT Kreasi', client_id: 'c1' } as never]);
    const values = { ...groupFormValues(), name: 'Barbershops' };
    expect(validateForm(fields, values)).toEqual({});
    expect(groupBody(values)).toEqual({ name: 'Barbershops', notes: null, default_legal_entity_id: null });

    const withEntity = { ...values, default_legal_entity_id: 'le-1' };
    expect(groupBody(withEntity).default_legal_entity_id).toBe('le-1');
    expect(startGroupBody(withEntity)).toEqual({
      name: 'Barbershops',
      notes: null,
      default_legal_entity_id: 'le-1',
    });

    // Starting a group without a name lets CORE name it after the brand.
    expect(startGroupBody({ ...values, name: '' })).toEqual({ notes: null, default_legal_entity_id: null });

    const brandValues = { ...brandFormValues({ name: 'Nova Barber', legal_entity_id: null } as never) };
    expect(brandValues.legal_entity_id).toBe(NO_LEGAL_ENTITY);
    expect(brandBody(brandValues).legal_entity_id).toBeNull();
    expect(brandBody({ ...brandValues, legal_entity_id: 'le-1' }).legal_entity_id).toBe('le-1');
  });

  it('keeps the primary flag locked on the primary contact', () => {
    const primary = contactFields([], [], {
      id: 'c1',
      name: 'Nadia',
      is_primary: true,
      is_billing: false,
      is_technical: false,
      is_pic: true,
      created_at: '',
      updated_at: '',
    });
    expect(primary.find((field) => field.name === 'is_primary')?.disabled).toBe(true);
  });
});
