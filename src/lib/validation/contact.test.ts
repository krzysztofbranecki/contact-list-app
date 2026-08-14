import { describe, expect, it } from 'vitest';
import {
  contactCreateSchema,
  contactUpdateSchema,
  type CategoryRef,
} from './contact';

/** Category dictionary mirroring the seed (ids are arbitrary). */
const CATEGORIES: CategoryRef[] = [
  { id: 1, code: 'business' },
  { id: 2, code: 'private' },
  { id: 3, code: 'other' },
];

/** A fully valid "create" input for the private category. */
const VALID = {
  firstName: 'Jan',
  lastName: 'Kowalski',
  email: 'jan@example.com',
  password: 'Haslo123!',
  categoryId: '2',
  subcategoryId: null,
  subcategoryOther: null,
  phone: '+48 600 100 200',
  birthDate: '1990-01-01',
};

/** Collects the field names that failed validation. */
function failedFields(result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) {
  return result.success ? [] : result.error!.issues.map((i) => String(i.path[0]));
}

const create = (overrides: Record<string, unknown>) =>
  contactCreateSchema(CATEGORIES).safeParse({ ...VALID, ...overrides });

const update = (overrides: Record<string, unknown>) =>
  contactUpdateSchema(CATEGORIES).safeParse({ ...VALID, ...overrides });

describe('password complexity (create)', () => {
  it.each([
    ['too short', 'Ha1!'],
    ['no lowercase', 'HASLO123!'],
    ['no uppercase', 'haslo123!'],
    ['no digit', 'HasloAbc!'],
    ['no special character', 'Haslo1234'],
  ])('rejects a password with %s', (_label, password) => {
    expect(failedFields(create({ password }))).toContain('password');
  });

  it('accepts a compliant password', () => {
    expect(create({ password: 'Haslo123!' }).success).toBe(true);
  });
});

describe('subcategory rules per category', () => {
  it('business requires a dictionary subcategory', () => {
    expect(
      failedFields(create({ categoryId: '1', subcategoryId: null })),
    ).toContain('subcategoryId');
  });

  it('business accepts a dictionary subcategory', () => {
    expect(create({ categoryId: '1', subcategoryId: '7' }).success).toBe(true);
  });

  it('business rejects free text', () => {
    expect(
      failedFields(
        create({ categoryId: '1', subcategoryId: '7', subcategoryOther: 'x' }),
      ),
    ).toContain('subcategoryOther');
  });

  it('other requires free text', () => {
    expect(
      failedFields(create({ categoryId: '3', subcategoryOther: null })),
    ).toContain('subcategoryOther');
  });

  it('other accepts free text and rejects a dictionary pick', () => {
    expect(
      create({ categoryId: '3', subcategoryOther: 'Sąsiad' }).success,
    ).toBe(true);
    expect(
      failedFields(
        create({ categoryId: '3', subcategoryOther: 'Sąsiad', subcategoryId: '7' }),
      ),
    ).toContain('subcategoryId');
  });

  it('private rejects any subcategory', () => {
    expect(
      failedFields(create({ categoryId: '2', subcategoryId: '7' })),
    ).toContain('subcategoryId');
    expect(
      failedFields(create({ categoryId: '2', subcategoryOther: 'x' })),
    ).toContain('subcategoryId');
  });

  it('rejects an unknown category id', () => {
    expect(failedFields(create({ categoryId: '99' }))).toContain('categoryId');
  });
});

describe('update password semantics', () => {
  it('accepts an empty password (keep current credentials)', () => {
    expect(update({ password: '' }).success).toBe(true);
    expect(update({ password: null }).success).toBe(true);
  });

  it('enforces complexity when a new password is provided', () => {
    expect(failedFields(update({ password: 'slabe' }))).toContain('password');
    expect(update({ password: 'NoweHaslo1!' }).success).toBe(true);
  });

  it('create does NOT accept an empty password', () => {
    expect(failedFields(create({ password: '' }))).toContain('password');
  });
});

describe('remaining field rules', () => {
  it('rejects a malformed email', () => {
    expect(failedFields(create({ email: 'not-an-email' }))).toContain('email');
  });

  it('rejects a phone with too few digits', () => {
    expect(failedFields(create({ phone: '12 34' }))).toContain('phone');
  });

  it('rejects a phone with letters', () => {
    expect(failedFields(create({ phone: '600abc200' }))).toContain('phone');
  });

  it('rejects a birth date in the future', () => {
    expect(failedFields(create({ birthDate: '2999-01-01' }))).toContain(
      'birthDate',
    );
  });

  it('rejects blank required fields', () => {
    expect(failedFields(create({ firstName: '  ' }))).toContain('firstName');
    expect(failedFields(create({ lastName: '' }))).toContain('lastName');
  });
});