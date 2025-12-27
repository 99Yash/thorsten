CREATE TABLE "linkedin_profile" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"full_name" text,
	"headline" text,
	"profile_picture" text,
	"location" text,
	"summary" text,
	"raw_data" jsonb NOT NULL,
	"last_analysed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT current_timestamp
);
--> statement-breakpoint
CREATE UNIQUE INDEX "linkedin_profile_username_idx" ON "linkedin_profile" USING btree ("username");