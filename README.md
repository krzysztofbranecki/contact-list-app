# Lista kontaktów

Aplikacja webowa (zadanie rekrutacyjne Next.js Full Stack Developer):
publicznie przeglądalna lista kontaktów, w której rekord kontaktu jest
jednocześnie kontem logowania. Dodawanie, edycja i usuwanie wymagają
zalogowania. Stack: **Next.js 16 (App Router, Server Actions) + PostgreSQL
(Supabase) + Drizzle ORM**.

📄 Pełna dokumentacja: [`docs/specyfikacja-techniczna.md`](docs/specyfikacja-techniczna.md)
(opis modułów i funkcji, biblioteki, szczegóły uruchomienia).

## Wymagania

- Node.js ≥ 20 (z Corepack — projekt używa Yarn 4)
- darmowy projekt PostgreSQL w [Supabase](https://supabase.com)

## Uruchomienie krok po kroku

```bash
corepack enable
yarn install
cp .env.example .env
```

Uzupełnij `.env` (opisy w `.env.example`):

- `DATABASE_URL` — Supabase → Project Settings → Database → Connection string → **Transaction mode** (port 6543)
- `DIRECT_URL` — jak wyżej, **Session mode** (port 5432)
- `SESSION_SECRET` — losowy ciąg ≥ 32 znaki (`openssl rand -base64 32`)

Następnie baza i start:

```bash
yarn db:migrate   # migracje schematu
yarn db:seed      # słowniki + konta startowe (idempotentny)
yarn dev          # http://localhost:3000
```

## Konta startowe (seed)

Hasło wspólne: **`Haslo123!`**

| E-mail | Kategoria |
| --- | --- |
| `jan.kowalski@example.com` | Służbowy / Szef |
| `anna.nowak@example.com` | Prywatny |
| `piotr.zielinski@example.com` | Inny / Sąsiad |

Uwaga: kontakt = konto logowania — nowo dodany kontakt może się zalogować
swoim e-mailem i hasłem; usunięcie kontaktu usuwa jego konto (i natychmiast
unieważnia jego sesję). Hasło może zmienić wyłącznie właściciel konta
(edytując własny rekord po zalogowaniu). Model autoryzacji jest celowo
płaski — to współdzielona książka adresowa: każdy zalogowany może edytować
i usuwać wszystkie kontakty; jedynym ograniczeniem per-rekord jest zmiana
hasła.

## Pozostałe komendy

```bash
yarn test    # testy jednostkowe (Vitest)
yarn lint    # ESLint
yarn build   # kompilacja produkcyjna
yarn start   # serwer produkcyjny (po build)
```
