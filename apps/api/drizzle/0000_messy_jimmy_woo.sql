CREATE TYPE "public"."categoria_material" AS ENUM('CIMENTO', 'CAL', 'FILER', 'AREIA_FINA', 'AREIA_MEDIA', 'ADITIVO_RETENTOR_AGUA', 'ADITIVO_INCORPORADOR_AR', 'FIBRA', 'SUPERPLASTIFICANTE');--> statement-breakpoint
CREATE TYPE "public"."origem" AS ENUM('PRODUCAO', 'LABORATORIO');--> statement-breakpoint
CREATE TYPE "public"."tipo_projeto" AS ENUM('NP', 'MT', 'AT', 'RC', 'PE');--> statement-breakpoint
CREATE TYPE "public"."tipo_resistencia" AS ENUM('FLEXAO', 'COMPRESSAO');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "componentes_formulacao" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formulacao_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"teor" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corpos_de_prova_endurecidos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formulacao_id" uuid NOT NULL,
	"idade_dias" integer NOT NULL,
	"indice" integer NOT NULL,
	"l1" double precision,
	"l2" double precision,
	"h1" double precision,
	"h2" double precision,
	"c1" double precision,
	"c2" double precision,
	"massa" double precision,
	"v1" double precision,
	"v2" double precision,
	"v3" double precision
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ensaios_resistencia" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formulacao_id" uuid NOT NULL,
	"tipo" "tipo_resistencia" NOT NULL,
	"idade_dias" integer NOT NULL,
	"valores" double precision[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "formulacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numeracao" integer NOT NULL,
	"nomenclatura" text NOT NULL,
	"tipo_projeto" "tipo_projeto",
	"desenvolvedor" text,
	"alimentador" text,
	"avaliador" text,
	"data" timestamp with time zone,
	"origem" "origem",
	"comentarios" text,
	"teor_agua" double precision,
	"massa_agua" double precision,
	"dens_aparente_massa" double precision,
	"dens_aparente_volume" double precision,
	"retencao_m0" double precision,
	"retencao_m1" double precision,
	"retencao_m2" double precision,
	"dens_fresco_massa" double precision,
	"dens_fresco_volume" double precision,
	"squeeze_deslocamento_1" double precision,
	"squeeze_deslocamento_2" double precision,
	"squeeze_deslocamento_3" double precision,
	"squeeze_carga_1" double precision,
	"squeeze_carga_2" double precision,
	"squeeze_carga_3" double precision,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "materiais" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"categoria" "categoria_material" NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"ordem" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pontos_granulometricos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formulacao_id" uuid NOT NULL,
	"peneira_mm" double precision NOT NULL,
	"frequencia" double precision NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "componentes_formulacao" ADD CONSTRAINT "componentes_formulacao_formulacao_id_formulacoes_id_fk" FOREIGN KEY ("formulacao_id") REFERENCES "public"."formulacoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "componentes_formulacao" ADD CONSTRAINT "componentes_formulacao_material_id_materiais_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materiais"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "corpos_de_prova_endurecidos" ADD CONSTRAINT "corpos_de_prova_endurecidos_formulacao_id_formulacoes_id_fk" FOREIGN KEY ("formulacao_id") REFERENCES "public"."formulacoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ensaios_resistencia" ADD CONSTRAINT "ensaios_resistencia_formulacao_id_formulacoes_id_fk" FOREIGN KEY ("formulacao_id") REFERENCES "public"."formulacoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pontos_granulometricos" ADD CONSTRAINT "pontos_granulometricos_formulacao_id_formulacoes_id_fk" FOREIGN KEY ("formulacao_id") REFERENCES "public"."formulacoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "componentes_formulacao_unico" ON "componentes_formulacao" USING btree ("formulacao_id","material_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "corpos_de_prova_endurecidos_unico" ON "corpos_de_prova_endurecidos" USING btree ("formulacao_id","idade_dias","indice");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ensaios_resistencia_unico" ON "ensaios_resistencia" USING btree ("formulacao_id","tipo","idade_dias");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "formulacoes_numeracao_unica" ON "formulacoes" USING btree ("numeracao");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "formulacoes_tipo_projeto_idx" ON "formulacoes" USING btree ("tipo_projeto");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "formulacoes_origem_idx" ON "formulacoes" USING btree ("origem");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "formulacoes_data_idx" ON "formulacoes" USING btree ("data");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "materiais_nome_unico" ON "materiais" USING btree ("nome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "materiais_categoria_idx" ON "materiais" USING btree ("categoria");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pontos_granulometricos_unico" ON "pontos_granulometricos" USING btree ("formulacao_id","peneira_mm");