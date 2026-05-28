CREATE TABLE "location_counter" (
	"id" serial PRIMARY KEY NOT NULL,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"location" geometry(point) NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "location_counter_city_unique" UNIQUE("city")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"thumbnail_key" text,
	"filename" text NOT NULL,
	"friendly_name" text NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE INDEX "city_idx" ON "location_counter" USING btree ("city");--> statement-breakpoint
CREATE INDEX "spatial_index" ON "location_counter" USING gist ("location");