# Aplikacja lista kontaktów — Plan Brief

> Full plan: `context/changes/contact-list-app/plan.md`
> Frame brief: `context/changes/contact-list-app/frame.md`

## What & Why

Zadanie rekrutacyjne (Next.js Full Stack Developer): publicznie przeglądalna
książka kontaktów w Next.js (Supabase + Drizzle), w której rekord kontaktu
jest jednocześnie kontem logowania (unikalny email + hashowane hasło ze
złożonością), CRUD wymaga zalogowania na seedowane konto, słowniki
kategorii/podkategorii żyją w bazie — plus obowiązkowy dokument specyfikacji
technicznej jako drugi artefakt oddania.

## Starting Point

Repo jest puste (greenfield). Frame brief rozstrzygnął trzy nośne
niejasności specyfikacji: kontakt = konto, lista + szczegóły publiczne w
odczycie, konta z seedu (bez rejestracji).

## Desired End State

Recenzent klonuje repo, konfiguruje `.env` wg README, uruchamia migracje +
seed i ma działającą aplikację: anonimowo przegląda listę i szczegóły,
po zalogowaniu wykonuje pełny CRUD z warunkowym polem podkategorii, a w
`docs/` znajduje polską specyfikację techniczną pokrywającą wymagane punkty.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| --- | --- | --- | --- |
| Semantyka pola „hasło" | Kontakt = konto logowania | Jedyna spójna interpretacja spec (unikalny email + złożoność hasła na kontakcie) | Frame |
| Granica dostępu | Lista + szczegóły publiczne (odczyt) | Pkt 2 spec (publiczny) obejmuje zdanie o szczegółach | Frame |
| Pochodzenie kont | Seed, bez rejestracji | Spec milczy o rejestracji; „prosta aplikacja" | Frame |
| Mechanizm auth | Własna sesja (jose JWT cookie) + bcrypt na tabeli kontaktów | Jedno źródło prawdy — CRUD kontaktów automatycznie zarządza kontami | Plan |
| Hasło przy edycji | Opcjonalne (puste = bez zmiany), nigdy nie wyświetlane | Standard branżowy; edycja telefonu nie resetuje czyichś poświadczeń | Plan |
| Podkategoria „inny" | Osobna kolumna tekstowa; FK tylko dla „służbowy" | Słownik pozostaje kuratorowany zgodnie ze spec | Plan |
| Baza | Hostowany Supabase (pooler runtime, direct dla migracji) | Zero lokalnej infrastruktury dla recenzenta | Plan |
| Testy | Unit (Vitest) dla walidacji i auth | Pokrywa sedno zadania (bezpieczeństwo) przy małym koszcie | Plan |
| Język | UI + dokumenty PL; kod i komentarze EN | Spójność z zadaniem i odbiorcą, kod w standardzie branżowym | Plan |

## Scope

**In scope:** scaffold Next.js (App Router, TS, Tailwind), schemat Drizzle
(contacts, categories, subcategories) z constraintami, migracje + idempotentny
seed, logowanie/wylogowanie + guard mutacji, publiczna lista/szczegóły,
chroniony CRUD z walidacją Zod (PL komunikaty), unit testy, specyfikacja
techniczna PL + README.

**Out of scope:** rejestracja/reset hasła, Supabase Auth/RLS/SDK, testy e2e,
stylowanie ponad minimum, paginacja/wyszukiwarka, zasilanie słownika wpisami
użytkownika.

## Architecture / Approach

App Router + Server Components dla odczytu (moduł `src/db/queries.ts` jako
jedyny punkt dostępu do danych, ścieżki publiczne nigdy nie selektują
`password_hash`); Server Actions dla logowania i mutacji, każda mutacja
zaczyna się od `requireAuth()` (sesja: JWT HS256 w cookie httpOnly).
Spójność kategoria↔podkategoria egzekwowana podwójnie: Zod (reguły per kod
kategorii) i złożony FK w Postgresie.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| --- | --- | --- |
| 1. Fundament | Scaffold + schemat + migracje + seed na Supabase | Pooler vs direct connection przy migracjach |
| 2. Uwierzytelnianie | Login/logout, sesja, guardy | Enumeracja użytkowników, konfiguracja cookie |
| 3. CRUD kontaktów | Publiczny odczyt + chronione mutacje z walidacją | Warunkowa podkategoria (UI + walidacja + DB) |
| 4. Testy + hardening | Unit testy, checklist bezpieczeństwa, komentarze | Pominięcie któregoś niezmiennika security |
| 5. Dokumentacja | Specyfikacja techniczna PL + README | Rozjazd dokumentu z finalnym kodem |

**Prerequisites:** darmowy projekt Supabase (connection stringi do `.env`).
**Estimated effort:** ~2–3 sesje robocze przez 5 faz.

## Open Risks & Assumptions

- Założenie: wszystkie pola kontaktu (w tym telefon i data urodzenia) wymagane — spec listuje je jako minimum atrybutów; łatwe do poluzowania.
- Publiczne szczegóły ujawniają dane osobowe (telefon, data urodzenia) — świadoma konsekwencja rozstrzygnięcia z frame'a, akceptowalna w zadaniu rekrutacyjnym.

## Success Criteria (Summary)

- Wszystkie punkty funkcjonalne zadania działają z publicznym odczytem i CRUD za logowaniem (kontakt = konto, potwierdzone logowaniem nowo dodanego kontaktu).
- `npm run build`, `npm run lint`, `npm test` zielone; seed i migracje odtwarzalne.
- Specyfikacja techniczna pokrywa 3 wymagane punkty i README wystarcza do uruchomienia.
