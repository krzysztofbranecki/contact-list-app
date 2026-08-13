# Frame Brief: Aplikacja lista kontaktów (zadanie rekrutacyjne Next.js)

> Etap framingu przed /10x-plan. Dokument oddziela to, co faktycznie jest do
> zbudowania, od tego, co było początkowo założone lub niedopowiedziane w specyfikacji.

## Reported Observation

Specyfikacja zadania rekrutacyjnego („Next.js Full Stack Developer – zadanie"):
prosta aplikacja webowa obsługująca listę kontaktów. Wymagania funkcjonalne:
(1) logowanie — pkt 2 dostępny bez logowania, reszta wymaga zalogowania;
(2) przeglądanie listy kontaktów z danymi podstawowymi + szczegóły po wybraniu;
(3) CRUD kontaktów dla zalogowanych. Model kontaktu: imię, nazwisko, email
(unikalny), hasło (standardy złożoności), kategoria (służbowy/prywatny/inny),
podkategoria (słownik dla „służbowy", dowolny tekst dla „inny"), telefon, data
urodzenia. Stack narzucony: Next.js + PostgreSQL (Supabase) + Drizzle ORM,
Server Actions / Server Components, słowniki w bazie (wymagane). Dodatkowo:
bezpieczeństwo, komentarze w kodzie, wygląd nieistotny, oraz obowiązkowy
artefakt — krótka specyfikacja techniczna (opis klas i metod, biblioteki,
sposób kompilacji).

## Initial Framing (preserved)

- **Stated cause / approach**: specyfikacja jest wykonalna wprost, w narzuconym stacku.
- **Proposed direction**: zaimplementować aplikację zgodnie ze specyfikacją + dostarczyć dokument specyfikacji technicznej.
- **Pre-dispatch narrowing** (odpowiedzi użytkownika, 2026-08-13):
  - Pole „hasło" na kontakcie → **kontakty SĄ kontami użytkowników** (logowanie emailem + hasłem kontaktu).
  - Granica dostępu anonimowego → **lista I szczegóły publiczne** (odczyt); tylko dodawanie/edycja/usuwanie za logowaniem. („Piszmy po polsku" — komunikacja w projekcie po polsku.)
  - Pochodzenie kont → **konta seedowane**; rejestracja poza zakresem.

## Dimension Map

Niejednoznaczności specyfikacji, z których mógł wyniknąć błędny plan:

1. **Semantyka pola „hasło"** — kontakt jako czysty rekord danych vs kontakt jako konto logowania. ← największe ryzyko błędnej interpretacji
2. **Granica dostępu anonimowego** — pkt 2 (publiczny) zawiera zdanie o szczegółach, ale pkt 3 nosi tytuł „Szczegóły kontaktu" i wymaga logowania.
3. **Pochodzenie użytkowników** — spec wymaga logowania, ale milczy o rejestracji.
4. **Model podkategorii** — słownik z DB dla „służbowy", wolny tekst dla „inny", brak podkategorii dla „prywatny"; otwarte, czy wolny tekst zasila słownik.
5. **Bezpieczeństwo vs publiczny odczyt** — publiczne szczegóły rekordów zawierających hasła i dane osobowe.

## Hypothesis Investigation

Repo jest puste (greenfield — tylko `context/`); dowody pochodzą z sekcji
specyfikacji i odpowiedzi użytkownika, nie z kodu.

| Hipoteza | Dowód | Werdykt |
| --- | --- | --- |
| 1. Kontakty są kontami logowania | Spec: unikalny email + hasło ze standardami złożoności na kontakcie; brak osobnej encji użytkownika w spec. Potwierdzone przez użytkownika. | STRONG |
| 2. Lista + szczegóły publiczne (odczyt) | Spec pkt 2: „Po wybraniu konkretnego kontaktu wyświetlane są jego szczegóły" — wewnątrz punktu dostępnego bez logowania. Potwierdzone przez użytkownika. | STRONG |
| 3. Konta seedowane, bez rejestracji | Spec milczy o rejestracji; „prosta aplikacja". Potwierdzone przez użytkownika. | STRONG |
| 4. Wolny tekst „inny" nie musi zasilać słownika | Spec: „możliwość wpisania dowolnej podkategorii" — wymóg dot. wprowadzania, nie słownika. Decyzja implementacyjna dla /10x-plan. | WEAK (niskie ryzyko) |
| 5. Hasła nigdy nie są wyświetlane mimo publicznych szczegółów | Spec: „należy zwrócić uwagę na bezpieczeństwo" + standard branżowy (hash, brak odczytu). | STRONG (konwencja) |

## Narrowing Signals

- Użytkownik jednoznacznie wybrał odczyt „kontakt = konto" → wymiar 1 zamknięty.
- Użytkownik potwierdził publiczny odczyt listy i szczegółów → wymiar 2 zamknięty.
- Użytkownik potwierdził seedowane konta → wymiar 3 zamknięty.

## Cross-System Convention

Odczyt „kontakt = konto" jest spójny wewnętrznie ze wszystkimi trzema
odpowiedziami: seedowane kontakty pełnią rolę kont startowych, a logowanie
odbywa się danymi kontaktu. Konsekwencje, które plan musi świadomie przyjąć:

- **Dodanie kontaktu = utworzenie konta logowania**; usunięcie kontaktu = usunięcie konta; edycja hasła kontaktu = zmiana czyichś poświadczeń. To wynika wprost z przyjętego odczytu — nie jest to bug, ale plan powinien to nazwać.
- **Publiczne szczegóły + hasło na rekordzie** → hasło przechowywane wyłącznie jako hash, nigdy nie zwracane do klienta ani nie prezentowane w UI; walidacja złożoności po stronie serwera.
- Wybór mechanizmu auth (własna weryfikacja poświadczeń względem tabeli kontaktów vs Supabase Auth zsynchronizowany z kontaktami) to decyzja /10x-plan — framing jedynie stwierdza, że encją uwierzytelnianą jest kontakt.

## Reframed (or Confirmed) Problem Statement

> **Faktyczny problem do zaplanowania**: zbudować w Next.js (Supabase +
> Drizzle) publicznie przeglądalną książkę kontaktów, w której rekord kontaktu
> jest jednocześnie kontem logowania (unikalny email + hashowane hasło ze
> złożonością), CRUD wymaga zalogowania na seedowane konto, słowniki
> kategorii/podkategorii żyją w bazie — plus obowiązkowy dokument
> specyfikacji technicznej jako drugi artefakt oddania.

Pierwotny framing („zaimplementować spec wprost") zasadniczo się obronił —
reframing polega na rozstrzygnięciu trzech niedopowiedzeń specyfikacji, które
bez tego etapu zostałyby rozstrzygnięte milcząco i potencjalnie odwrotnie
(np. kontakt jako zwykły rekord + osobna tabela użytkowników z rejestracją).

## Confidence

- **HIGH** — wszystkie trzy nośne niejasności rozstrzygnięte wprost przez
  użytkownika; pozostałe (podkategorie „inny", polityka zasilania słownika)
  są niskiego ryzyka i jawnie przekazane do /10x-plan.

## What Changes for /10x-plan

Plan powinien traktować kontakt jako encję uwierzytelnianą (decyzja: własna
weryfikacja vs Supabase Auth), wytyczyć publiczne trasy odczytu (lista +
szczegóły, bez pola hasła) i chronione mutacje (Server Actions), przewidzieć
seed (konta startowe + słowniki kategorii/podkategorii w DB) oraz ująć
dokument specyfikacji technicznej (klasy/metody, biblioteki, kompilacja)
jako pełnoprawny deliverable, nie dodatek.

## References

- Źródło: treść zadania rekrutacyjnego (wklejona w wywołaniu /10x-frame, 2026-08-13) — brak pliku w repo.
- Powiązany research: brak (`research.md` nie istnieje; repo greenfield).
- Zadania investigacyjne: brak — pusty repozytorium, dowody ze specyfikacji i odpowiedzi użytkownika.
