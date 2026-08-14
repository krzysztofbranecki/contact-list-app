import { z } from 'zod';

/**
 * Contact form validation (Zod) — server-side source of truth.
 *
 * The subcategory rules depend on the CODE of the selected category
 * ('business' | 'private' | 'other'), and codes live in the database, so the
 * schemas are built by factories that receive the category dictionary.
 * Error messages are Polish (they render next to form fields).
 */

/** Minimal category shape the factories need. */
export interface CategoryRef {
  id: number;
  code: string;
}

/**
 * Password complexity: min 8 chars, at least one lowercase, uppercase,
 * digit, and special character.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Hasło musi mieć co najmniej 8 znaków')
  .regex(/[a-z]/, 'Hasło musi zawierać małą literę')
  .regex(/[A-Z]/, 'Hasło musi zawierać wielką literę')
  .regex(/\d/, 'Hasło musi zawierać cyfrę')
  .regex(/[^A-Za-z0-9]/, 'Hasło musi zawierać znak specjalny');

/** Digits with optional +, spaces and dashes; 7–15 digits total. */
const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Telefon jest wymagany')
  .regex(/^\+?[0-9][0-9 -]*$/, 'Telefon może zawierać cyfry, spacje, „-" i „+"')
  .refine((v) => {
    const digits = v.replace(/\D/g, '');
    return digits.length >= 7 && digits.length <= 15;
  }, 'Telefon musi zawierać od 7 do 15 cyfr');

/** ISO date (yyyy-mm-dd from <input type="date">), strictly in the past. */
const birthDateSchema = z
  .string()
  .min(1, 'Data urodzenia jest wymagana')
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Nieprawidłowa data')
  .refine(
    (v) => new Date(v) < new Date(new Date().toDateString()),
    'Data urodzenia musi być datą z przeszłości',
  );

/**
 * Blank form inputs arrive as '' (empty field) or null (field not rendered —
 * e.g. subcategoryOther when the business category is selected). Normalize
 * both to undefined before parsing.
 */
const emptyToUndefined = (v: unknown) =>
  v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v;

/** Fields shared by create and update. */
const contactBase = z.object({
  firstName: z.string().trim().min(1, 'Imię jest wymagane'),
  lastName: z.string().trim().min(1, 'Nazwisko jest wymagane'),
  email: z
    .string()
    .trim()
    .min(1, 'Adres e-mail jest wymagany')
    .email('Nieprawidłowy adres e-mail'),
  categoryId: z.preprocess(
    emptyToUndefined,
    z.coerce.number({ message: 'Kategoria jest wymagana' }).int().positive(),
  ),
  subcategoryId: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().positive().optional(),
  ),
  subcategoryOther: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  phone: phoneSchema,
  birthDate: birthDateSchema,
});

/**
 * Cross-field subcategory rules, branched on the category code:
 * business → dictionary pick required, free text forbidden;
 * other    → free text required, dictionary pick forbidden;
 * private  → both forbidden.
 */
function subcategoryRules(categories: CategoryRef[]) {
  return (
    data: {
      categoryId: number;
      subcategoryId?: number;
      subcategoryOther?: string;
    },
    ctx: z.RefinementCtx,
  ) => {
    const code = categories.find((c) => c.id === data.categoryId)?.code;
    if (!code) {
      ctx.addIssue({
        code: 'custom',
        path: ['categoryId'],
        message: 'Nieprawidłowa kategoria',
      });
      return;
    }
    if (code === 'business') {
      if (data.subcategoryId === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['subcategoryId'],
          message: 'Wybierz podkategorię ze słownika',
        });
      }
      if (data.subcategoryOther !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['subcategoryOther'],
          message: 'Kategoria służbowa używa podkategorii ze słownika',
        });
      }
    } else if (code === 'other') {
      if (data.subcategoryOther === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['subcategoryOther'],
          message: 'Wpisz własną podkategorię',
        });
      }
      if (data.subcategoryId !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['subcategoryId'],
          message: 'Kategoria „inny" przyjmuje tylko własną podkategorię',
        });
      }
    } else {
      // 'private' (and any future code without subcategories)
      if (data.subcategoryId !== undefined || data.subcategoryOther !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['subcategoryId'],
          message: 'Ta kategoria nie ma podkategorii',
        });
      }
    }
  };
}

/** Create: password required and must satisfy complexity. */
export function contactCreateSchema(categories: CategoryRef[]) {
  return contactBase
    .extend({ password: passwordSchema })
    .superRefine(subcategoryRules(categories));
}

/**
 * Update: empty password = keep current credentials; a non-empty one must
 * satisfy the same complexity rules as on create.
 */
export function contactUpdateSchema(categories: CategoryRef[]) {
  return contactBase
    .extend({
      password: z.preprocess(emptyToUndefined, passwordSchema.optional()),
    })
    .superRefine(subcategoryRules(categories));
}