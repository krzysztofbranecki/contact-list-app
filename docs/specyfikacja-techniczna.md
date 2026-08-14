# Specyfikacja techniczna — Aplikacja „Lista kontaktów"

Aplikacja webowa w Next.js (App Router) z bazą PostgreSQL (hostowany
Supabase) i Drizzle ORM. Publicznie przeglądalna lista kontaktów, w której
rekord kontaktu jest jednocześnie kontem logowania (unikalny e-mail +
hashowane hasło). Operacje dodawania, edycji i usuwania wymagają zalogowania.
Słowniki kategorii i podkategorii przechowywane są w bazie danych.

Dokument pokrywa trzy wymagane punkty zadania:

1. [Opis poszczególnych modułów i funkcji](#1-opis-modułów-i-funkcji)
2. [Wykorzystane biblioteki](#2-wykorzystane-biblioteki)
3. [Sposób kompilacji i uruchomienia](#3-sposób-kompilacji-i-uruchomienia)

---

## 1. Opis modułów i funkcji

### 1.1. Warstwa bazy danych (`src/db/`)

#### `schema.ts` — schemat bazy (Drizzle ORM)

| Tabela | Kolumny | Uwagi |
| --- | --- | --- |
| `categories` | `id` PK, `code` UNIQUE, `name` | Słownik kategorii. `code` (`business` / `private` / `other`) to stabilny klucz, na którym gałęzi się logika; `name` to polska etykieta. |
| `subcategories` | `id` PK, `category_id` FK, `name` | Słownik podkategorii (kuratorowany — tylko kategoria służbowa). Unikalny indeks `(category_id, id)` oraz unikalność `(category_id, name)`. |
| `contacts` | `id` PK, `first_name`, `last_name`, `email` UNIQUE, `password_hash`, `category_id` FK, `subcategory_id` NULL, `subcategory_other` NULL, `phone`, `birth_date`, `created_at`, `updated_at` | Kontakt = konto logowania. |

Spójność danych na poziomie bazy:

- **złożony klucz obcy** `(category_id, subcategory_id)` → `subcategories(category_id, id)` gwarantuje, że wybrana podkategoria należy do wybranej kategorii;
- **CHECK** `contacts_subcategory_exclusive` — kontakt nigdy nie ma jednocześnie podkategorii słownikowej i tekstowej;
- **unikalny indeks** `contacts_email_lower_idx` na `lower(email)` (migracja `0001`) — unikalność e-maila niewrażliwa na wielkość liter, niezależnie od warstwy walidacji.

Uwaga do migracji `0000`: wygenerowany przez drizzle-kit plik został ręcznie
skorygowany — `CREATE UNIQUE INDEX` na `subcategories(category_id, id)` musi
wykonać się PRZED dodaniem złożonego klucza obcego, który ten indeks
referencjonuje (drizzle-kit emituje odwrotną kolejność). Ponowne generowanie
migracji od zera wymagałoby powtórzenia tej korekty.

#### `index.ts` — klient bazy (runtime)

Eksportuje `db` (instancja Drizzle nad `postgres-js`). Łączy się przez
transaction pooler Supabase (`DATABASE_URL`, port 6543) z `prepare: false`
(pooler nie wspiera prepared statements).

#### `queries.ts` — jedyny punkt dostępu do danych

Niezmiennik bezpieczeństwa: ścieżki publiczne selektują jawną listę kolumn
**bez `password_hash`**; hash zwraca wyłącznie `getContactWithHashByEmail`,
używane tylko przez akcję logowania.

| Funkcja | Sygnatura | Opis |
| --- | --- | --- |
| `listContacts` | `() => Promise<{id, firstName, lastName, email, categoryName}[]>` | Dane podstawowe listy (join z kategorią), sortowanie po nazwisku. |
| `getContact` | `(id: number) => Promise<ContactDetails \| null>` | Wszystkie pola poza hashem + etykiety słownikowe (dla szczegółów i formularza edycji). |
| `getContactWithHashByEmail` | `(email: string) => Promise<{id, email, passwordHash} \| null>` | Wyłącznie do uwierzytelniania. |
| `listCategories` | `() => Promise<Category[]>` | Słownik kategorii. |
| `listSubcategories` | `(categoryId: number) => Promise<{id, name}[]>` | Podkategorie danej kategorii. |
| `insertContact` | `(values: ContactWriteValues & {passwordHash: string}) => Promise<number>` | Dodanie kontaktu (= utworzenie konta); zwraca id. |
| `updateContact` | `(id: number, values: ContactWriteValues) => Promise<void>` | Aktualizacja; brak `passwordHash` w `values` = hasło bez zmian. |
| `deleteContact` | `(id: number) => Promise<void>` | Usunięcie kontaktu (= usunięcie konta). |

#### `seed.ts` — idempotentny seed

Uruchamiany przez `yarn db:seed` (połączenie `DIRECT_URL`). Wstawia
(upsert-or-skip po kluczach unikalnych): 3 kategorie, 4 podkategorie służbowe
(Szef, Klient, Współpracownik, Dostawca) i 3 kontakty startowe z hasłem
bcrypt. Bezpieczny do wielokrotnego uruchomienia.

### 1.2. Uwierzytelnianie (`src/lib/auth/`)

#### `password.ts`

| Funkcja | Sygnatura | Opis |
| --- | --- | --- |
| `hashPassword` | `(plain: string) => Promise<string>` | Hash bcrypt (koszt 12). |
| `verifyPassword` | `(plain: string, hash: string) => Promise<boolean>` | Weryfikacja hasła. |
| `DUMMY_HASH` | `string` | Prekomputowany hash do wyrównania czasu odpowiedzi logowania, gdy e-mail nie istnieje (ochrona przed enumeracją kont). |

#### `token.ts` — czysta logika JWT (testowalna bez Next.js)

| Funkcja | Sygnatura | Opis |
| --- | --- | --- |
| `signSessionToken` | `(contactId: number, email: string, ttlSeconds?) => Promise<string>` | Podpisuje JWT HS256 (jose); payload: `sub` = id kontaktu, `email`; domyślna ważność 24 h. |
| `verifySessionToken` | `(token: string) => Promise<SessionPayload \| null>` | Weryfikuje podpis i ważność; `null` dla tokenu przeterminowanego, sfałszowanego lub uszkodzonego. |

#### `session.ts` — sesja w cookie

Adapter nad `token.ts` korzystający z `next/headers`:

| Funkcja | Sygnatura | Opis |
| --- | --- | --- |
| `createSession` | `(contactId: number, email: string) => Promise<void>` | Podpisuje token i ustawia cookie `session`: **httpOnly**, `secure` (produkcja), `sameSite=lax`, 24 h. |
| `getSession` | `() => Promise<Session \| null>` | Odczyt i weryfikacja cookie; token jest honorowany tylko, jeśli kontakt z sesji **nadal istnieje w bazie** — usunięcie konta unieważnia jego żywe sesje przy najbliższym żądaniu. Owinięte w React `cache()` (jedno sprawdzenie na żądanie). |
| `destroySession` | `() => Promise<void>` | Usunięcie cookie (wylogowanie). |

#### `guard.ts`

| Funkcja | Sygnatura | Opis |
| --- | --- | --- |
| `requireAuth` | `() => Promise<Session>` | Właściwa granica bezpieczeństwa: wywoływana na początku **każdej** mutującej Server Action; przy braku ważnej sesji przekierowuje na `/login` (przerywa akcję). |

#### `constants.ts`

`SESSION_COOKIE` — nazwa cookie sesyjnego, w module bez zależności, aby mógł
go importować `src/proxy.ts` (edge runtime).

### 1.3. Walidacja (`src/lib/validation/contact.ts`)

Schematy Zod budowane fabrykami na podstawie słownika kategorii z bazy
(reguły zależą od `code` kategorii). Komunikaty błędów po polsku. Walidacja
po stronie serwera jest źródłem prawdy.

| Eksport | Opis |
| --- | --- |
| `contactCreateSchema(categories)` | Hasło **wymagane** ze złożonością: min 8 znaków, mała i wielka litera, cyfra, znak specjalny. |
| `contactUpdateSchema(categories)` | Hasło **opcjonalne** — puste pole oznacza „bez zmiany"; niepuste musi spełniać złożoność. |
| `passwordSchema` | Współdzielona reguła złożoności hasła. |

Reguły wspólne: e-mail (format, normalizacja do lowercase), telefon
(cyfry/spacje/`+`/`-`, 7–15 cyfr), data urodzenia (ścisły format
`RRRR-MM-DD`, realna data kalendarzowa, rok ≥ 1900, w przeszłości; hasło
dodatkowo ograniczone do 72 znaków — limit bcrypta). Reguły podkategorii per
kategoria (`superRefine`): służbowa → wymagany wybór ze słownika (id
weryfikowane względem słownika); inna → wymagany dowolny tekst; prywatna →
brak podkategorii.

### 1.4. Akcje serwerowe (`src/lib/actions/`)

Wszystkie funkcje to Next.js Server Actions (`'use server'`).

#### `auth.ts`

| Funkcja | Sygnatura | Opis |
| --- | --- | --- |
| `login` | `(prev: LoginState, formData: FormData) => Promise<LoginState>` | Logowanie: lookup po e-mailu, `bcrypt.compare` (przy braku konta — porównanie z `DUMMY_HASH` dla wyrównania czasu), jeden generyczny komunikat błędu dla każdej przyczyny, redirect na listę. |
| `logout` | `() => Promise<void>` | Czyści sesję, redirect na listę. |

#### `contacts.ts`

| Funkcja | Sygnatura | Opis |
| --- | --- | --- |
| `createContact` | `(prev: ContactFormState, formData: FormData) => Promise<ContactFormState>` | `requireAuth` → walidacja Zod → hash hasła → INSERT → `revalidatePath` → redirect. |
| `editContact` | `(id: number, prev, formData) => Promise<ContactFormState>` | Jak wyżej; puste hasło zachowuje obecne poświadczenia. **Hasło może zmienić wyłącznie właściciel konta** (id z sesji = id edytowanego kontaktu) — formularz ukrywa pole dla cudzych rekordów, a akcja egzekwuje regułę po stronie serwera. Wywoływana przez `bind(null, id)`. |
| `removeContact` | `(id: number) => Promise<void>` | `requireAuth` → DELETE → `revalidatePath` → redirect. |

Obsługa błędów: naruszenie unikalności e-maila (Postgres `23505`) mapowane na
polski komunikat przy polu; błędy walidacji wracają per pole wraz z echem
wpisanych wartości (bez hasła) i licznikiem `serial` wymuszającym remount
formularza (React 19 resetuje pola po akcji).

### 1.5. Trasy i komponenty (`src/app/`, `src/components/`, `src/proxy.ts`)

| Trasa / plik | Dostęp | Opis |
| --- | --- | --- |
| `/` (`app/page.tsx`) | publiczny | Redirect na `/contacts`. |
| `/contacts` (`app/contacts/page.tsx`) | publiczny | Lista: imię i nazwisko, e-mail, kategoria; przycisk „Dodaj kontakt" tylko przy sesji. |
| `/contacts/[id]` (`app/contacts/[id]/page.tsx`) | publiczny | Szczegóły (wszystkie pola poza hashem); `notFound()` dla złego id; Edytuj/Usuń tylko przy sesji. |
| `/contacts/new`, `/contacts/[id]/edit` | zalogowani | Formularze na wspólnym `ContactForm`; strony wywołują `requireAuth()`. |
| `/login` (`app/login/page.tsx`) | publiczny | Formularz logowania; zalogowanych przekierowuje na listę. |
| `src/proxy.ts` | — | Proxy Next.js 16 (następca middleware): przekierowuje żądania bez cookie sesyjnego z tras formularzy na `/login`. Celowo sprawdza tylko **obecność** cookie — pełna weryfikacja odbywa się w `requireAuth()` wewnątrz akcji. |

Komponenty (`src/components/`):

- `ui/button.tsx` — `Button` (warianty primary/secondary/danger) i `buttonStyles()` dla linków stylizowanych na przycisk;
- `ui/field.tsx` — `Field` (label + kontrolka + błędy), `Input`, `Select`, `FieldErrors` — wspólne prymitywy formularzy;
- `contact-form.tsx` — wspólny formularz dodawania/edycji z warunkowym polem podkategorii (select słownikowy dla służbowej, tekst dla innej, brak dla prywatnej);
- `delete-contact-button.tsx` — usuwanie z potwierdzeniem (`confirm`);
- `site-header.tsx` — nagłówek z linkiem do listy i stanem sesji (e-mail + Wyloguj / Zaloguj się).

### 1.6. Testy jednostkowe (`vitest.config.mts`, `src/**/*.test.ts`)

38 testów bez połączenia z bazą i bez runtime'u Next.js:

- `src/lib/auth/password.test.ts` — roundtrip hash/verify, odrzucenie złego hasła, sól, `DUMMY_HASH`;
- `src/lib/auth/token.test.ts` — roundtrip podpisu, odrzucenie tokenu przeterminowanego, sfałszowanego, z innym sekretem i uszkodzonego;
- `src/lib/validation/contact.test.ts` — przypadki brzegowe złożoności hasła (w tym limit 72 znaków bcrypt), reguły podkategorii dla wszystkich kategorii (w tym id spoza słownika), semantyka pustego hasła w edycji, normalizacja e-maila do lowercase, ścisły format daty urodzenia.

---

## 2. Wykorzystane biblioteki

| Biblioteka | Rola w projekcie |
| --- | --- |
| `next` 16 | Framework aplikacji: App Router, Server Components, Server Actions, proxy. |
| `react` / `react-dom` 19 | Warstwa UI (w tym `useActionState` do obsługi formularzy). |
| `drizzle-orm` + `postgres` | Typowany dostęp do PostgreSQL przez klienta `postgres-js`. |
| `drizzle-kit` | Generowanie i uruchamianie migracji SQL ze schematu. |
| `bcryptjs` | Hashowanie i weryfikacja haseł (koszt 12), bez natywnych zależności. |
| `jose` | Podpisywanie i weryfikacja JWT sesji (HS256). |
| `zod` | Walidacja danych formularzy po stronie serwera. |
| `tailwindcss` | Minimalne stylowanie (wygląd zgodnie z zadaniem nieistotny). |
| `vitest` | Testy jednostkowe logiki krytycznej. |
| `tsx` | Uruchamianie skryptu seed w TypeScript. |
| `dotenv` | Wczytywanie `.env` w skryptach poza runtime'em Next (seed, drizzle-kit). |
| `typescript`, `eslint` + `eslint-config-next` | Typowanie i statyczna analiza. |

---

## 3. Sposób kompilacji i uruchomienia

### Wymagania

- Node.js ≥ 20 (z Corepack — dla Yarn 4),
- projekt PostgreSQL w [Supabase](https://supabase.com) (darmowy plan wystarcza).

### Konfiguracja

```bash
corepack enable          # aktywuje Yarn 4 zapisany w projekcie
yarn install             # instalacja zależności
cp .env.example .env     # i uzupełnij wartości:
```

| Zmienna | Skąd wziąć |
| --- | --- |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string → **Transaction mode** (port 6543). |
| `DIRECT_URL` | Jak wyżej, **Session mode** (port 5432) — używane tylko przez migracje i seed. |
| `SESSION_SECRET` | Dowolny losowy ciąg ≥ 32 znaki, np. `openssl rand -base64 32`. |

### Baza danych

```bash
yarn db:migrate   # aplikuje migracje z katalogu drizzle/
yarn db:seed      # słowniki + 3 konta startowe (idempotentny)
```

### Uruchomienie

```bash
yarn dev          # tryb deweloperski — http://localhost:3000
yarn build        # kompilacja produkcyjna
yarn start        # serwer produkcyjny (po build)
```

### Weryfikacja

```bash
yarn test         # testy jednostkowe (Vitest)
yarn lint         # ESLint
```

### Konta startowe (seed)

Hasło wspólne: **`Haslo123!`**

- `jan.kowalski@example.com`
- `anna.nowak@example.com`
- `piotr.zielinski@example.com`
