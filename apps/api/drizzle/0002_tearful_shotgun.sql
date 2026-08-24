CREATE TYPE "public"."papel" AS ENUM('ADMIN', 'MEMBRO');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"papel" "papel" DEFAULT 'MEMBRO' NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"precisa_trocar_senha" boolean DEFAULT false NOT NULL,
	"ultimo_acesso_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "usuarios_email_unico" ON "usuarios" USING btree ("email");