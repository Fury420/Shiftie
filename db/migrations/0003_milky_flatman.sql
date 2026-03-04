ALTER TABLE "attendance" ADD COLUMN "edited_at" timestamp;--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "edited_by" text;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_edited_by_user_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;