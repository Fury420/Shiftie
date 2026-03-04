ALTER TYPE "public"."role" ADD VALUE 'superadmin' BEFORE 'admin';--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Insert seed organization for existing data
INSERT INTO "organizations" ("id", "name") VALUES ('00000000-0000-0000-0000-000000000001', 'Hlavný bar');
--> statement-breakpoint

-- Add columns as nullable first so backfill can run
ALTER TABLE "attendance" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "leaves" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "shift_replacements" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "shifts" ADD COLUMN "organization_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "organization_id" uuid;--> statement-breakpoint

-- Backfill existing data to seed organization
UPDATE "attendance" SET "organization_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "leaves" SET "organization_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "shift_replacements" SET "organization_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "shifts" SET "organization_id" = '00000000-0000-0000-0000-000000000001';--> statement-breakpoint
UPDATE "user" SET "organization_id" = '00000000-0000-0000-0000-000000000001' WHERE "role" != 'superadmin';--> statement-breakpoint

-- Now apply NOT NULL to app tables (user stays nullable for superadmin)
ALTER TABLE "attendance" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "leaves" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shift_replacements" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shifts" ALTER COLUMN "organization_id" SET NOT NULL;--> statement-breakpoint

-- Add FK constraints
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift_replacements" ADD CONSTRAINT "shift_replacements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;
