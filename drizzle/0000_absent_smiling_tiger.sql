CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"category_id" integer NOT NULL,
	"subcategory_id" integer,
	"subcategory_other" text,
	"phone" text NOT NULL,
	"birth_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contacts_email_unique" UNIQUE("email"),
	CONSTRAINT "contacts_subcategory_exclusive" CHECK (NOT ("contacts"."subcategory_id" IS NOT NULL AND "contacts"."subcategory_other" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "subcategories" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_id" integer NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "subcategories_category_id_name_unique" UNIQUE("category_id","name")
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- The unique index must exist BEFORE the composite FK below can reference (category_id, id).
CREATE UNIQUE INDEX "subcategories_category_id_id_idx" ON "subcategories" USING btree ("category_id","id");--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_subcategory_fk" FOREIGN KEY ("category_id","subcategory_id") REFERENCES "public"."subcategories"("category_id","id") ON DELETE no action ON UPDATE no action;