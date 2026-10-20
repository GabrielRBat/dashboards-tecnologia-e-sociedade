ALTER TYPE "public"."categoria_material" ADD VALUE 'COMPENSADOR_RETRACAO' BEFORE 'SUPERPLASTIFICANTE';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ensaios_variacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formulacao_id" uuid NOT NULL,
	"idade_dias" integer NOT NULL,
	"barra_referencia" double precision,
	"comprimento_1" double precision,
	"comprimento_2" double precision,
	"comprimento_3" double precision,
	"massa_1" double precision,
	"massa_2" double precision,
	"massa_3" double precision
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ensaios_variacao" ADD CONSTRAINT "ensaios_variacao_formulacao_id_formulacoes_id_fk" FOREIGN KEY ("formulacao_id") REFERENCES "public"."formulacoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ensaios_variacao_unico" ON "ensaios_variacao" USING btree ("formulacao_id","idade_dias");