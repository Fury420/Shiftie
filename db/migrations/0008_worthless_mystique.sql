CREATE TYPE "public"."license_type" AS ENUM('free', 'basic', 'pro');--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "license_type" "license_type" DEFAULT 'free' NOT NULL;