import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { DB, Database } from '../db/db.module';
import { grupos, membrosGrupo, usuarios } from '../db/schema';

export interface GrupoComMembros {
  id: string;
  nome: string;
  descricao: string | null;
  criadoEm: string;
  membros: { id: string; nome: string; email: string }[];
}

/**
 * Grupos — as equipes internas que decidem quem vê o quê.
 *
 * A ideia é não amarrar dashboards a pessoas: quando alguém entra ou sai, muda
 * o grupo e todos os dashboards acompanham sozinhos.
 */
@Injectable()
export class GruposService {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listar(): Promise<GrupoComMembros[]> {
    const [linhas, vinculos, pessoas] = await Promise.all([
      this.db.select().from(grupos),
      this.db.select().from(membrosGrupo),
      this.db.select().from(usuarios),
    ]);

    const porId = new Map(pessoas.map((p) => [p.id, p]));

    return linhas
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((g) => ({
        id: g.id,
        nome: g.nome,
        descricao: g.descricao,
        criadoEm: g.criadoEm.toISOString(),
        membros: vinculos
          .filter((v) => v.grupoId === g.id)
          .map((v) => porId.get(v.usuarioId))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
          .map((p) => ({ id: p.id, nome: p.nome, email: p.email }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
      }));
  }

  /** Ids dos grupos de uma pessoa — base de toda decisão de visibilidade. */
  async gruposDoUsuario(usuarioId: string): Promise<string[]> {
    const linhas = await this.db
      .select()
      .from(membrosGrupo)
      .where(eq(membrosGrupo.usuarioId, usuarioId));
    return linhas.map((l) => l.grupoId);
  }

  async criar(dados: {
    nome: string;
    descricao?: string;
    membros?: string[];
  }): Promise<GrupoComMembros> {
    const nome = dados.nome?.trim();
    if (!nome) throw new BadRequestException('Dê um nome ao grupo.');

    const [existente] = await this.db
      .select()
      .from(grupos)
      .where(eq(grupos.nome, nome));
    if (existente) {
      throw new ConflictException('Já existe um grupo com esse nome.');
    }

    const [criado] = await this.db
      .insert(grupos)
      .values({ nome, descricao: dados.descricao?.trim() || null })
      .returning();

    if (dados.membros?.length) {
      await this.definirMembros(criado!.id, dados.membros);
    }

    return this.obter(criado!.id);
  }

  async obter(id: string): Promise<GrupoComMembros> {
    const todos = await this.listar();
    const achado = todos.find((g) => g.id === id);
    if (!achado) throw new NotFoundException('Grupo não encontrado.');
    return achado;
  }

  async atualizar(
    id: string,
    dados: { nome?: string; descricao?: string; membros?: string[] },
  ): Promise<GrupoComMembros> {
    await this.obter(id);

    const campos: Record<string, unknown> = {};
    if (dados.nome !== undefined) {
      const nome = dados.nome.trim();
      if (!nome) throw new BadRequestException('O nome não pode ficar vazio.');
      campos.nome = nome;
    }
    if (dados.descricao !== undefined) {
      campos.descricao = dados.descricao.trim() || null;
    }

    if (Object.keys(campos).length > 0) {
      await this.db.update(grupos).set(campos).where(eq(grupos.id, id));
    }

    if (dados.membros !== undefined) {
      await this.definirMembros(id, dados.membros);
    }

    return this.obter(id);
  }

  async remover(id: string): Promise<{ removido: true }> {
    await this.obter(id);
    /*
     * Os vínculos somem junto, por `on delete cascade` — tanto os membros
     * quanto as ligações com dashboards. Um dashboard que enxergava só por este
     * grupo fica sem grupo nenhum, e aí só o autor e os administradores o veem.
     * É o comportamento seguro: perder acesso é recuperável, vazar não.
     */
    await this.db.delete(grupos).where(eq(grupos.id, id));
    return { removido: true };
  }

  /** Substitui a lista de membros de uma vez. */
  private async definirMembros(grupoId: string, ids: string[]): Promise<void> {
    const unicos = [...new Set(ids.filter(Boolean))];

    if (unicos.length > 0) {
      const existem = await this.db
        .select()
        .from(usuarios)
        .where(inArray(usuarios.id, unicos));

      if (existem.length !== unicos.length) {
        throw new BadRequestException(
          'A lista de membros tem alguém que não existe mais.',
        );
      }
    }

    await this.db.delete(membrosGrupo).where(eq(membrosGrupo.grupoId, grupoId));

    if (unicos.length > 0) {
      await this.db
        .insert(membrosGrupo)
        .values(unicos.map((usuarioId) => ({ grupoId, usuarioId })));
    }
  }
}
