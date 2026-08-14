-- Case-insensitive uniqueness for the login identifier: the validation layer
-- lowercases emails, and this index enforces the same rule at the database
-- level regardless of how a row was inserted (seed, manual SQL, future code).
CREATE UNIQUE INDEX "contacts_email_lower_idx" ON "contacts" (lower("email"));
