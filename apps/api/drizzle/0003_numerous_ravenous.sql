CREATE TYPE "public"."visibilidade" AS ENUM('TODOS', 'GRUPOS', 'PRIVADO');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dashboards_grupos" (
	"dashboard_id" uuid NOT NULL,
	"grupo_id" uuid NOT NULL,
	CONSTRAINT "dashboards_grupos_dashboard_id_grupo_id_pk" PRIMARY KEY("dashboard_id","grupo_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "grupos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "membros_grupo" (
	"grupo_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	CONSTRAINT "membros_grupo_grupo_id_usuario_id_pk" PRIMARY KEY("grupo_id","usuario_id")
);
--> statement-breakpoint
ALTER TABLE "dashboards" ADD COLUMN "criado_por" uuid;--> statement-breakpoint
ALTER TABLE "dashboards" ADD COLUMN "visibilidade" "visibilidade" DEFAULT 'TODOS' NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dashboards_grupos" ADD CONSTRAINT "dashboards_grupos_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dashboards_grupos" ADD CONSTRAINT "dashboards_grupos_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membros_grupo" ADD CONSTRAINT "membros_grupo_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "membros_grupo" ADD CONSTRAINT "membros_grupo_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dashboards_grupos_grupo_idx" ON "dashboards_grupos" USING btree ("grupo_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "grupos_nome_unico" ON "grupos" USING btree ("nome");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "membros_grupo_usuario_idx" ON "membros_grupo" USING btree ("usuario_id");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_criado_por_usuarios_id_fk" FOREIGN KEY ("criado_por") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "dashboards_autor_idx" ON "dashboards" USING btree ("criado_por");