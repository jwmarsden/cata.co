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
CREATE INDEX "city_idx" ON "location_counter" USING btree ("city");--> statement-breakpoint
CREATE INDEX "spatial_index" ON "location_counter" USING gist ("location");