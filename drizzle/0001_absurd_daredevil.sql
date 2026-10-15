CREATE TABLE "material_consumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"factory_id" uuid NOT NULL,
	"production_entry_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"month" varchar(7) NOT NULL,
	"weight_kg" numeric(12, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "losses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"factory_id" uuid NOT NULL,
	"product_id" uuid,
	"material_id" uuid,
	"date" date NOT NULL,
	"month" varchar(7) NOT NULL,
	"weight_kg" numeric(12, 4) NOT NULL,
	"reason" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weighings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"factory_id" uuid NOT NULL,
	"material_id" uuid,
	"date" date NOT NULL,
	"month" varchar(7) NOT NULL,
	"weight_kg" numeric(12, 4) NOT NULL,
	"photo_url" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_production_entry_id_production_entries_id_fk" FOREIGN KEY ("production_entry_id") REFERENCES "public"."production_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_consumptions" ADD CONSTRAINT "material_consumptions_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "losses" ADD CONSTRAINT "losses_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "losses" ADD CONSTRAINT "losses_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "losses" ADD CONSTRAINT "losses_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "losses" ADD CONSTRAINT "losses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weighings" ADD CONSTRAINT "weighings_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weighings" ADD CONSTRAINT "weighings_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weighings" ADD CONSTRAINT "weighings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consumption_factory_month" ON "material_consumptions" USING btree ("factory_id","month");--> statement-breakpoint
CREATE INDEX "consumption_production" ON "material_consumptions" USING btree ("production_entry_id");--> statement-breakpoint
CREATE INDEX "loss_factory_month" ON "losses" USING btree ("factory_id","month");--> statement-breakpoint
CREATE INDEX "weighing_factory_month" ON "weighings" USING btree ("factory_id","month");