CREATE TYPE "public"."acao_importacao" AS ENUM('CRIADA', 'ATUALIZADA');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "importacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"arquivo_nome" text NOT NULL,
	"usuario_id" uuid NOT NULL,
	"linhas_lidas" integer NOT NULL,
	"linhas_importadas" integer NOT NULL,
	"linhas_ignoradas" integer NOT NULL,
	"avisos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "importacoes_formulacoes" (
	"importacao_id" uuid NOT NULL,
	"formulacao_id" uuid NOT NULL,
	"numeracao" integer NOT NULL,
	"acao" "acao_importacao" NOT NULL,
	CONSTRAINT "importacoes_formulacoes_importacao_id_formulacao_id_pk" PRIMARY KEY("importacao_id","formulacao_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "importacoes_formulacoes" ADD CONSTRAINT "importacoes_formulacoes_importacao_id_importacoes_id_fk" FOREIGN KEY ("importacao_id") REFERENCES "public"."importacoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "importacoes_formulacoes" ADD CONSTRAINT "importacoes_formulacoes_formulacao_id_formulacoes_id_fk" FOREIGN KEY ("formulacao_id") REFERENCES "public"."formulacoes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "importacoes_usuario_idx" ON "importacoes" USING btree ("usuario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "importacoes_criado_em_idx" ON "importacoes" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "importacoes_formulacoes_formulacao_idx" ON "importacoes_formulacoes" USING btree ("formulacao_id");