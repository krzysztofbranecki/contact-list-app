# Aplikacja lista kontaktów — Implementation Plan

## Overview

Greenfield: aplikacja webowa w Next.js (App Router) z PostgreSQL (hostowany
Supabase) i Drizzle ORM. Publicznie przeglądalna książka kontaktów, w której
rekord kontaktu jest jednocześnie kontem logowania (unikalny email + hashowane
hasło ze złożonością). Mutacje (dodawanie/edycja/usuwanie) wymagają
zalogowania na seedowane konto. Słowniki kategorii/podkategorii żyją w bazie.
Drugi deliverable: specyfikacja techniczna po polsku.

## Current State Analysis

Repo jest puste (tylko `context/` + initial commit). Frame brief
(`context/changes/contact-list-app/frame.md`) rozstrzygnął framing:

- Kontakt = konto logowania (email + hasło na rekordzie kontaktu) — potwierdzone przez użytkownika.
- Lista ORAZ szczegóły publiczne w odczycie; tylko mutacje za logowaniem.
- Konta seedowane; rejestracja poza zakresem.
- Konsekwencje: dodanie kontaktu tworzy konto, usunięcie kontaktu usuwa konto, edycja hasła zmienia czyjeś poświadczenia; hasło wyłącznie jako hash, nigdy nie zwracane do klienta.

## Desired End State

Działająca aplikacja uruchamialna przez `npm install && npm run dev` (z
`.env` wg `.env.example`), spełniająca wszystkie punkty zadania
rekrutacyjnego, z testami jednostkowymi logiki krytycznej i kompletną
specyfikacją techniczną w `docs/`. Weryfikacja: przejście checklisty
manualnej z faz 1–5 + zielone `npm run build`, `npm run lint`, `npm test`.

### Key Discoveries:

- Frame: `context/changes/contact-list-app/frame.md` — tabela hipotez i rozstrzygnięcia (sekcje „Hypothesis Investigation", „Cross-System Convention").
- Brak istniejącego kodu — wzorce przyjęte ze standardów stacku: `create-next-app` + `drizzle-orm`/`postgres-js` + `drizzle-kit` + `bcryptjs` + `jose` + `zod` + `vitest`.
- Server Actions w Next.js ≥14 mają wbudowaną ochronę origin (CSRF) — model bezpieczeństwa domyka guard sesji wewnątrz każdej akcji mutującej.

## What We're NOT Doing

- Rejestracja użytkowników / reset hasła / e-maile — konta pochodzą z seedu i z CRUD kontaktów.
- Supabase Auth, RLS, Supabase JS SDK — łączymy się z bazą wyłącznie przez Drizzle (decyzja: własna sesja + bcrypt).
- Testy e2e (Playwright) — tylko unit testy logiki krytycznej; przepływy UI weryfikowane ręcznie.
- Stylowanie ponad minimum — spec: „wygląd graficzny nieistotny"; Tailwind z domyślnego scaffolda wystarczy.
- Paginacja/wyszukiwarka listy — poza zakresem „prostej aplikacji".
- Zasilanie słownika wpisami użytkownika dla kategorii „inny" — wolny tekst trafia do kolumny na kontakcie, słownik pozostaje kuratorowany.

## Implementation Approach

Pięć faz przyrostowych, każda kończy się działającym stanem: fundament
(scaffold + schemat + seed) → uwierzytelnianie → CRUD → testy i hardening →
dokumentacja. Kod, identyfikatory i komentarze po angielsku; UI i dokumenty
po polsku. Jedyny punkt dostępu do bazy to moduł zapytań, który nigdy nie
selektuje `password_hash` w ścieżkach publicznych.

## Critical Implementation Details

- **Migracje vs pooler Supabase** — runtime łączy się przez transaction pooler (port 6543) i wymaga `postgres(url, { prepare: false })`; `drizzle-kit migrate` oraz seed muszą używać połączenia bezpośredniego/session (port 5432). Dwie zmienne: `DATABASE_URL` (pooler) i `DIRECT_URL` (migracje/seed).
- **Spójność podkategorii na poziomie DB** — złożony FK `(category_id, subcategory_id)` → `subcategories(category_id, id)` (wymaga unikalnego indeksu na `subcategories(category_id, id)`) gwarantuje, że wybrana podkategoria należy do wybranej kategorii. Reguły warunkowe per kod kategorii (służbowy→FK wymagany, inny→tekst wymagany, prywatny→oba puste) egzekwuje walidacja Zod + CHECK `NOT (subcategory_id IS NOT NULL AND subcategory_other IS NOT NULL)`.
- **Brak enumeracji użytkowników** — akcja logowania zwraca jeden generyczny komunikat dla złego emaila i złego hasła oraz wykonuje `bcrypt.compare` przeciw stałemu hashowi także gdy email nie istnieje (wyrównanie czasu odpowiedzi).
- **`password_hash` nigdy nie opuszcza serwera** — zapytania listy/szczegółów selektują jawną listę kolumn bez hasha; formularz edycji nie prefilluje pola hasła.

## Phase 1: Fundament — scaffold, schemat bazy, seed

### Overview

Działający projekt Next.js podpięty do hostowanego Supabase, z pełnym
schematem, migracjami i seedem (słowniki + konta startowe).

### Changes Required:

#### 1. Scaffold projektu

**File**: katalog główny repo (`package.json`, `src/app/*`, configi)

**Intent**: `create-next-app` (TypeScript, App Router, Tailwind, ESLint, `src/`); dodanie zależności: `drizzle-orm`, `postgres`, `drizzle-kit`, `bcryptjs`, `jose`, `zod`, `vitest`. Scaffold musi zachować istniejący katalog `context/`.

**Contract**: `npm run dev|build|lint` działają; struktura `src/app`, `src/lib`, `src/db`.

#### 2. Konfiguracja Drizzle + połączenie

**File**: `drizzle.config.ts`, `src/db/index.ts`

**Intent**: klient `postgres-js` dla runtime (pooler, `prepare: false`) i konfiguracja `drizzle-kit` na `DIRECT_URL`.

**Contract**: `src/db/index.ts` eksportuje `db` (drizzle); env: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET` opisane w `.env.example`.

#### 3. Schemat bazy

**File**: `src/db/schema.ts`

**Intent**: trzy tabele odzwierciedlające model z frame'a: słowniki + kontakty-konta.

**Contract**:
- `categories`: `id` PK, `code` text unique (`business`/`private`/`other` — stabilny klucz logiki), `name` text (etykieta PL).
- `subcategories`: `id` PK, `category_id` FK→categories, `name` text; unikalny indeks `(category_id, id)`.
- `contacts`: `id` PK, `first_name`, `last_name` NOT NULL; `email` text NOT NULL UNIQUE; `password_hash` text NOT NULL; `category_id` FK NOT NULL; `subcategory_id` nullable; `subcategory_other` text nullable; `phone` text NOT NULL; `birth_date` date NOT NULL; `created_at`/`updated_at`. Złożony FK `(category_id, subcategory_id)` → `subcategories(category_id, id)`; CHECK: co najwyżej jedno z `subcategory_id`/`subcategory_other`.

#### 4. Migracje + seed

**File**: `drizzle/` (wygenerowane migracje), `src/db/seed.ts`, skrypty w `package.json`

**Intent**: `drizzle-kit generate` + `migrate`; seed idempotentny (upsert po `code`/`email`): 3 kategorie, podkategorie służbowe (np. szef, klient, współpracownik, dostawca), 3 kontakty startowe z hasłami bcrypt (dane logowania udokumentowane w README).

**Contract**: `npm run db:migrate` i `npm run db:seed` działają na `DIRECT_URL`.

### Success Criteria:

#### Automated Verification:

- Build przechodzi: `npm run build`
- Lint przechodzi: `npm run lint`
- Migracje aplikują się czysto: `npm run db:migrate`
- Seed wykonuje się bez błędu (i powtórnie — idempotencja): `npm run db:seed`

#### Manual Verification:

- Tabele i dane seedowe widoczne w Supabase (Table Editor): 3 kategorie, podkategorie, 3 kontakty z hashami (nie plaintext)
- Próba wstawienia kontaktu z podkategorią z innej kategorii odrzucona przez FK

**Implementation Note**: po zakończeniu fazy i zielonych kryteriach automatycznych zatrzymaj się na ręczne potwierdzenie przed kolejną fazą.

---

## Phase 2: Uwierzytelnianie

### Overview

Logowanie/wylogowanie oparte o tabelę kontaktów: bcrypt + podpisany cookie
sesyjny (jose), helper guard dla mutacji i middleware dla chronionych stron.

### Changes Required:

#### 1. Hasła i sesja

**File**: `src/lib/auth/password.ts`, `src/lib/auth/session.ts`

**Intent**: hash/verify bcrypt (cost 12); sesja jako JWT HS256 (jose) w cookie httpOnly, `secure`, `sameSite=lax`, ważność 24h; `createSession(contactId)`, `getSession()`, `destroySession()`.

**Contract**: payload sesji: `{ sub: contactId, email }`; sekret z `SESSION_SECRET`.

#### 2. Akcje logowania

**File**: `src/app/login/page.tsx`, `src/lib/actions/auth.ts`

**Intent**: strona logowania (formularz email+hasło, PL) i Server Actions `login`/`logout`. Login: lookup po emailu, `bcrypt.compare` (także przeciw dummy hash gdy brak usera), generyczny błąd, redirect na listę.

**Contract**: `login(formData)` waliduje Zod; `logout()` czyści cookie; oba `"use server"`.

#### 3. Guard + middleware

**File**: `src/lib/auth/guard.ts`, `src/middleware.ts`

**Intent**: `requireAuth()` — rzuca/przekierowuje gdy brak ważnej sesji; wywoływany na początku każdej mutującej Server Action (obrona właściwa). Middleware przekierowuje niezalogowanych z `/contacts/new` i `/contacts/[id]/edit` na `/login` (UX, nie jedyna ochrona).

**Contract**: matcher middleware: `/contacts/new`, `/contacts/:id/edit`.

#### 4. Nagłówek z informacją o sesji

**File**: `src/app/layout.tsx` (+ mały komponent)

**Intent**: pasek z linkami Lista / Zaloguj lub email zalogowanego + Wyloguj — czyni granicę dostępu widoczną dla recenzenta.

**Contract**: odczyt sesji w Server Component przez `getSession()`.

### Success Criteria:

#### Automated Verification:

- Build przechodzi: `npm run build`
- Lint przechodzi: `npm run lint`

#### Manual Verification:

- Logowanie na konto z seedu działa i ustawia cookie httpOnly
- Błędny email i błędne hasło dają ten sam generyczny komunikat
- `/contacts/new` bez sesji przekierowuje na `/login`
- Wylogowanie czyści sesję

---

## Phase 3: CRUD kontaktów

### Overview

Publiczna lista i szczegóły (Server Components, bez hasła) oraz chronione
formularze dodawania/edycji/usuwania na Server Actions z pełną walidacją Zod.

### Changes Required:

#### 1. Moduł zapytań

**File**: `src/db/queries.ts`

**Intent**: jedyny punkt dostępu do danych: `listContacts()` (dane podstawowe: imię, nazwisko, email, kategoria), `getContact(id)` (wszystko poza hashem), `getContactWithHashByEmail(email)` (tylko dla auth), `listCategories()`, `listSubcategories(categoryId)`, mutacje `insertContact`/`updateContact`/`deleteContact`.

**Contract**: ścieżki publiczne selektują jawną listę kolumn bez `password_hash`.

#### 2. Walidacja

**File**: `src/lib/validation/contact.ts`

**Intent**: schematy Zod: `contactCreateSchema` (hasło wymagane) i `contactUpdateSchema` (hasło opcjonalne — puste pole = bez zmiany), wspólny rdzeń pól + `superRefine` egzekwujący reguły podkategorii per kod kategorii.

**Contract**: złożoność hasła: min 8 znaków, mała litera, wielka litera, cyfra, znak specjalny. `birth_date` — data w przeszłości. `phone` — podstawowy wzorzec (cyfry, spacje, `+`, `-`, 7–15 cyfr). Komunikaty błędów po polsku.

#### 3. Strony publiczne

**File**: `src/app/page.tsx` (redirect → `/contacts`), `src/app/contacts/page.tsx`, `src/app/contacts/[id]/page.tsx`

**Intent**: lista (dane podstawowe, link do szczegółów) i szczegóły (wszystkie pola poza hasłem, etykiety kategorii/podkategorii ze słownika). Przyciski Dodaj/Edytuj/Usuń renderowane tylko przy aktywnej sesji.

**Contract**: Server Components; `notFound()` dla nieistniejącego id.

#### 4. Formularze i akcje mutujące

**File**: `src/app/contacts/new/page.tsx`, `src/app/contacts/[id]/edit/page.tsx`, `src/lib/actions/contacts.ts`, komponent formularza (Client Component)

**Intent**: wspólny formularz create/edit: pola modelu, select kategorii (ze słownika w DB), warunkowe pole podkategorii (select ze słownika dla „służbowy", input tekstowy dla „inny", brak dla „prywatny"). Akcje `createContact`/`updateContact`/`deleteContact`: `requireAuth()` → walidacja Zod → hash hasła gdy podane → mutacja → `revalidatePath` → redirect. Naruszenie unikalności emaila (Postgres 23505) mapowane na polski komunikat przy polu.

**Contract**: błędy walidacji wracają do formularza per pole (`useActionState`); usuwanie z potwierdzeniem; formularz edycji nie prefilluje hasła.

### Success Criteria:

#### Automated Verification:

- Build przechodzi: `npm run build`
- Lint przechodzi: `npm run lint`

#### Manual Verification:

- Anonimowo: lista i szczegóły widoczne, hasło nigdzie nie występuje (także w HTML źródła), brak przycisków mutacji
- Zalogowany: dodanie kontaktu z każdą z 3 kategorii (warunkowe pole podkategorii działa), edycja bez zmiany hasła zachowuje logowanie tego kontaktu, edycja ze zmianą hasła pozwala zalogować się nowym hasłem, usunięcie działa
- Duplikat emaila → polski komunikat przy polu; hasło niespełniające złożoności odrzucone; podkategoria wymagana/zabroniona zgodnie z kategorią
- Nowo dodany kontakt może się zalogować (kontakt = konto)

---

## Phase 4: Testy + hardening bezpieczeństwa

### Overview

Unit testy logiki krytycznej (Vitest) i przegląd bezpieczeństwa + komentarze
w kodzie (wymóg zadania).

### Changes Required:

#### 1. Testy jednostkowe

**File**: `vitest.config.ts`, `src/lib/validation/contact.test.ts`, `src/lib/auth/password.test.ts`, `src/lib/auth/session.test.ts`

**Intent**: walidacja — złożoność hasła (przypadki brzegowe), reguły warunkowe podkategorii per kategoria, hasło opcjonalne tylko w update; auth — roundtrip hash/verify, roundtrip sign/verify sesji + odrzucenie przeterminowanego/sfałszowanego tokenu.

**Contract**: `npm test` uruchamia Vitest; testy bez połączenia z bazą.

#### 2. Przegląd bezpieczeństwa + komentarze

**File**: przekrojowo (bez nowych plików)

**Intent**: checklist: każda mutująca akcja zaczyna się od `requireAuth()`; żadna ścieżka publiczna nie selektuje hasha; cookie httpOnly+secure+sameSite; walidacja wyłącznie po stronie serwera jako źródło prawdy; brak sekretów w repo (`.env` w `.gitignore`, `.env.example` bez wartości). Uzupełnienie komentarzy (EN, JSDoc na modułach i funkcjach) tam, gdzie ich brakuje — wymóg spec.

**Contract**: niezmienniki z sekcji „Critical Implementation Details" zachowane.

### Success Criteria:

#### Automated Verification:

- Testy przechodzą: `npm test`
- Build i lint przechodzą: `npm run build && npm run lint`

#### Manual Verification:

- Checklist bezpieczeństwa z pkt 2 przejrzany punkt po punkcie
- Kod ma komentarze na wszystkich modułach `src/lib` i `src/db`

---

## Phase 5: Dokumentacja

### Overview

Obowiązkowy deliverable zadania: specyfikacja techniczna PL + README z
uruchomieniem.

### Changes Required:

#### 1. Specyfikacja techniczna

**File**: `docs/specyfikacja-techniczna.md`

**Intent**: dokument po polsku pokrywający dokładnie trzy wymagane punkty zadania: (a) opis poszczególnych modułów i funkcji (mapa: schema, queries, actions, auth, walidacja — z sygnaturami), (b) wykorzystane biblioteki z jednozdaniowym uzasadnieniem każdej, (c) sposób kompilacji i uruchomienia (env, migracje, seed, dev/build/start, testy).

**Contract**: struktura odpowiada literalnie trzem bulletom ze spec zadania; opisy zgodne z finalnym kodem (pisane po fazach 1–4).

#### 2. README

**File**: `README.md`

**Intent**: skrócona instrukcja: wymagania, konfiguracja Supabase + `.env`, komendy, dane logowania kont z seedu, link do specyfikacji.

**Contract**: recenzent uruchamia projekt wyłącznie na podstawie README.

### Success Criteria:

#### Automated Verification:

- Pliki istnieją: `ls docs/specyfikacja-techniczna.md README.md`
- Build końcowy przechodzi: `npm run build`

#### Manual Verification:

- Specyfikacja pokrywa wszystkie 3 wymagane punkty i zgadza się z kodem
- Czysty checkout + README wystarczają do uruchomienia aplikacji

---

## Testing Strategy

### Unit Tests:

- Złożoność hasła: za krótkie / brak wielkiej litery / brak cyfry / brak znaku specjalnego / poprawne
- Podkategoria: służbowy bez FK → błąd; inny bez tekstu → błąd; prywatny z czymkolwiek → błąd; kombinacje poprawne
- Update: puste hasło przechodzi, niepuste musi spełniać złożoność
- Sesja: sign/verify roundtrip, token przeterminowany i ze złym podpisem odrzucone
- Hash: verify(poprawne)=true, verify(błędne)=false

### Integration Tests:

- Brak (decyzja: bez e2e) — przepływy pokryte checklistami manualnymi faz 2–3

### Manual Testing Steps:

1. Anonimowe przeglądanie listy i szczegółów; brak śladu hasła w HTML
2. Logowanie kontem z seedu; pełny cykl CRUD z trzema wariantami kategorii
3. Nowo dodany kontakt loguje się swoim hasłem; po edycji hasła — nowym
4. Duplikat emaila, słabe hasło, niespójna podkategoria — polskie błędy przy polach
5. Wylogowanie odbiera dostęp do mutacji (formularze przekierowują, akcje odrzucają)

## Performance Considerations

Skala zadania (dziesiątki kontaktów) nie wymaga optymalizacji. Jedyny realny
punkt: połączenia przez pooler Supabase z `prepare: false` (serverless-safe).

## Migration Notes

Baza od zera — brak danych zastanych. Migracje Drizzle są źródłem prawdy
schematu; seed idempotentny, bezpieczny do wielokrotnego uruchomienia.

## References

- Frame brief: `context/changes/contact-list-app/frame.md`
- Treść zadania rekrutacyjnego: wklejona w wywołaniu `/10x-frame` (2026-08-13), zreferowana w frame briefie
- Decyzje z sesji planistycznej: własna sesja + bcrypt; hasło opcjonalne przy edycji; podkategoria „inny" jako kolumna tekstowa; hostowany Supabase; unit testy logiki krytycznej; polski UI + polska spec, kod i komentarze EN

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Fundament — scaffold, schemat bazy, seed

#### Automated

- [x] 1.1 Build przechodzi: `npm run build` — 5a6a525
- [x] 1.2 Lint przechodzi: `npm run lint` — 5a6a525
- [x] 1.3 Migracje aplikują się czysto: `npm run db:migrate` — 5a6a525
- [x] 1.4 Seed wykonuje się bez błędu (i powtórnie — idempotencja): `npm run db:seed` — 5a6a525

#### Manual

- [x] 1.5 Tabele i dane seedowe widoczne w Supabase (3 kategorie, podkategorie, 3 kontakty z hashami) — 5a6a525
- [x] 1.6 Wstawienie kontaktu z podkategorią z innej kategorii odrzucone przez FK — 5a6a525

### Phase 2: Uwierzytelnianie

#### Automated

- [ ] 2.1 Build przechodzi: `npm run build`
- [ ] 2.2 Lint przechodzi: `npm run lint`

#### Manual

- [ ] 2.3 Logowanie na konto z seedu działa i ustawia cookie httpOnly
- [ ] 2.4 Błędny email i błędne hasło dają ten sam generyczny komunikat
- [ ] 2.5 `/contacts/new` bez sesji przekierowuje na `/login`
- [ ] 2.6 Wylogowanie czyści sesję

### Phase 3: CRUD kontaktów

#### Automated

- [ ] 3.1 Build przechodzi: `npm run build`
- [ ] 3.2 Lint przechodzi: `npm run lint`

#### Manual

- [ ] 3.3 Anonimowo: lista i szczegóły widoczne, hasło nigdzie nie występuje, brak przycisków mutacji
- [ ] 3.4 Zalogowany: pełny CRUD działa, warunkowe pole podkategorii dla 3 kategorii
- [ ] 3.5 Duplikat emaila / słabe hasło / niespójna podkategoria → polskie błędy przy polach
- [ ] 3.6 Nowo dodany kontakt może się zalogować; edycja hasła zmienia poświadczenia

### Phase 4: Testy + hardening bezpieczeństwa

#### Automated

- [ ] 4.1 Testy przechodzą: `npm test`
- [ ] 4.2 Build i lint przechodzą: `npm run build && npm run lint`

#### Manual

- [ ] 4.3 Checklist bezpieczeństwa przejrzany punkt po punkcie
- [ ] 4.4 Komentarze na wszystkich modułach `src/lib` i `src/db`

### Phase 5: Dokumentacja

#### Automated

- [ ] 5.1 Pliki istnieją: `ls docs/specyfikacja-techniczna.md README.md`
- [ ] 5.2 Build końcowy przechodzi: `npm run build`

#### Manual

- [ ] 5.3 Specyfikacja pokrywa 3 wymagane punkty zadania i zgadza się z kodem
- [ ] 5.4 Czysty checkout + README wystarczają do uruchomienia
