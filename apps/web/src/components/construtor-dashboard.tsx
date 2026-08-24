'use client';

/**
 * Construtor de dashboards.
 *
 * A ideia central: **o construtor não deixa montar um gráfico que engana**. Ao
 * escolher o tipo e as métricas, a API é consultada e, quando o cruzamento não
 * faz sentido, aparece o motivo em vez de um gráfico bonito e falso. O botão de
 * adicionar fica desabilitado até o cruzamento ser válido.
 *
 * A prévia é calculada com os dados reais antes de salvar, para a pessoa ver o
 * que está criando.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  type CatalogoMetricas,
  type Dashboard,
  type PainelCalculado,
  type PainelConfig,
  type TipoPainel,
  type Validacao,
  criarDashboard,
  excluirDashboard,
  previaPainel,
  salvarDashboard,
  validarPainel,
} from '@/lib/api';
import { PainelCustomizado } from './painel-customizado';

interface Props {
  catalogo: CatalogoMetricas;
  /** Dashboard existente, ou `null` para criar um novo. */
  dashboard: Dashboard | null;
}

/** Agrupa as métricas por grupo, para o `<select>` sair organizado. */
function porGrupo(catalogo: CatalogoMetricas, apenas?: 'continua' | 'categorica') {
  const grupos = new Map<string, CatalogoMetricas['metricas']>();
  for (const m of catalogo.metricas) {
    if (apenas && m.natureza !== apenas) continue;
    const lista = grupos.get(m.grupo) ?? [];
    lista.push(m);
    grupos.set(m.grupo, lista);
  }
  return [...grupos.entries()];
}

export function ConstrutorDashboard({ catalogo, dashboard }: Props) {
  const router = useRouter();

  const [nome, setNome] = useState(dashboard?.nome ?? '');
  const [descricao, setDescricao] = useState(dashboard?.descricao ?? '');
  const [paineis, setPaineis] = useState<PainelConfig[]>(
    dashboard?.paineis ?? [],
  );

  // Painel em edição.
  const [tipo, setTipo] = useState<TipoPainel>('dispersao');
  const [metricaX, setMetricaX] = useState('relacaoAguaLigante');
  const [metricaY, setMetricaY] = useState('compressao28d');
  const [agregacao, setAgregacao] = useState<string>('media');
  const [faixas, setFaixas] = useState(6);
  const [titulo, setTitulo] = useState('');

  const [validacao, setValidacao] = useState<Validacao | null>(null);
  const [previa, setPrevia] = useState<PainelCalculado | null>(null);
  const [carregandoPrevia, setCarregandoPrevia] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const definicaoTipo = catalogo.tipos.find((t) => t.chave === tipo);
  const precisaY = definicaoTipo?.precisaY ?? true;

  /*
   * Ao trocar para barras, o eixo x precisa de uma categoria. Manter a métrica
   * contínua anterior deixaria o construtor num estado inválido logo de saída,
   * e a primeira coisa que a pessoa veria seria uma mensagem de erro.
   */
  useEffect(() => {
    if (tipo === 'barras') {
      const atual = catalogo.metricas.find((m) => m.chave === metricaX);
      if (atual?.natureza !== 'categorica') setMetricaX('tipoProjeto');
      const atualY = catalogo.metricas.find((m) => m.chave === metricaY);
      if (atualY?.natureza !== 'continua') setMetricaY('compressao28d');
    }
    if (tipo === 'dispersao') {
      const atual = catalogo.metricas.find((m) => m.chave === metricaX);
      if (atual?.natureza !== 'continua') setMetricaX('relacaoAguaLigante');
    }
  }, [tipo, catalogo.metricas, metricaX, metricaY]);

  // Valida a cada mudança e, se válido, busca a prévia com dados reais.
  useEffect(() => {
    let cancelado = false;
    setErro('');

    validarPainel(tipo, metricaX, precisaY ? metricaY : null)
      .then((v) => {
        if (cancelado) return;
        setValidacao(v);
        if (!v.valido) {
          setPrevia(null);
          return;
        }
        setCarregandoPrevia(true);
        return previaPainel(
          {
            id: 'previa',
            // O título não entra: ele não muda dado nenhum, e incluí-lo faria
            // cada tecla digitada recalcular a prévia no servidor.
            titulo: '',
            tipo,
            metricaX,
            metricaY: precisaY ? metricaY : null,
            agregacao: tipo === 'barras' ? (agregacao as never) : null,
            faixas: tipo === 'distribuicao' ? faixas : null,
          },
          '',
        )
          .then((p) => {
            if (!cancelado) setPrevia(p);
          })
          .catch((e: Error) => {
            if (!cancelado) setErro(e.message);
          })
          .finally(() => {
            if (!cancelado) setCarregandoPrevia(false);
          });
      })
      .catch((e: Error) => {
        if (!cancelado) setErro(e.message);
      });

    return () => {
      cancelado = true;
    };
  }, [tipo, metricaX, metricaY, agregacao, faixas, precisaY]);

  const adicionar = useCallback(() => {
    if (!validacao?.valido) return;
    setPaineis((atuais) => [
      ...atuais,
      {
        id: `painel-${Date.now().toString(36)}-${atuais.length}`,
        titulo: titulo.trim(),
        tipo,
        metricaX,
        metricaY: precisaY ? metricaY : null,
        agregacao: tipo === 'barras' ? (agregacao as never) : null,
        faixas: tipo === 'distribuicao' ? faixas : null,
      },
    ]);
    setTitulo('');
  }, [validacao, titulo, tipo, metricaX, metricaY, precisaY, agregacao, faixas]);

  const remover = useCallback((id: string) => {
    setPaineis((atuais) => atuais.filter((p) => p.id !== id));
  }, []);

  const salvar = useCallback(async () => {
    if (!nome.trim()) {
      setErro('Dê um nome ao dashboard.');
      return;
    }
    setSalvando(true);
    setErro('');
    try {
      if (dashboard) {
        await salvarDashboard(dashboard.id, {
          nome,
          descricao,
          paineis,
        });
        router.push(`/dashboards/${dashboard.id}`);
      } else {
        const criado = await criarDashboard({ nome, descricao, paineis });
        router.push(`/dashboards/${criado.id}`);
      }
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setSalvando(false);
    }
  }, [nome, descricao, paineis, dashboard, router]);

  const excluir = useCallback(async () => {
    if (!dashboard) return;
    const certeza = window.confirm(
      `Excluir "${dashboard.nome}"? Os dashboards são compartilhados com a equipe — ` +
        'isto some para todo mundo e não dá para desfazer.',
    );
    if (!certeza) return;

    setSalvando(true);
    try {
      await excluirDashboard(dashboard.id);
      router.push('/dashboards');
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setSalvando(false);
    }
  }, [dashboard, router]);

  const metricasX = useMemo(
    () =>
      porGrupo(
        catalogo,
        tipo === 'barras'
          ? 'categorica'
          : tipo === 'dispersao'
            ? 'continua'
            : undefined,
      ),
    [catalogo, tipo],
  );
  const metricasY = useMemo(() => porGrupo(catalogo, 'continua'), [catalogo]);

  return (
    <div className="construtor">
      <section className="cartao">
        <h2 className="cartao-titulo">Identificação</h2>
        <p className="cartao-legenda">
          Os dashboards são compartilhados: toda a equipe vê e pode editar.
        </p>
        <div className="barra-filtros" style={{ marginBottom: 0 }}>
          <label className="campo">
            <span className="campo-rotulo">Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Reologia das argamassas de revestimento"
              className="campo-largo"
            />
          </label>
          <label className="campo">
            <span className="campo-rotulo">Descrição (opcional)</span>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="O que este painel responde"
              className="campo-largo"
            />
          </label>
        </div>
      </section>

      <section className="cartao">
        <h2 className="cartao-titulo">Novo gráfico</h2>
        <p className="cartao-legenda">
          Só aparecem as combinações que fazem sentido para o tipo escolhido.
        </p>

        <div className="barra-filtros" style={{ marginBottom: 12 }}>
          <label className="campo">
            <span className="campo-rotulo">Tipo</span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoPainel)}
            >
              {catalogo.tipos.map((t) => (
                <option key={t.chave} value={t.chave}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span className="campo-rotulo">
              {tipo === 'barras' ? 'Agrupar por' : 'Eixo horizontal'}
            </span>
            <select
              value={metricaX}
              onChange={(e) => setMetricaX(e.target.value)}
            >
              {metricasX.map(([grupo, ms]) => (
                <optgroup key={grupo} label={grupo}>
                  {ms.map((m) => (
                    <option key={m.chave} value={m.chave}>
                      {m.rotulo}
                      {m.unidade ? ` (${m.unidade})` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {precisaY ? (
            <label className="campo">
              <span className="campo-rotulo">
                {tipo === 'barras' ? 'Medida' : 'Eixo vertical'}
              </span>
              <select
                value={metricaY}
                onChange={(e) => setMetricaY(e.target.value)}
              >
                {metricasY.map(([grupo, ms]) => (
                  <optgroup key={grupo} label={grupo}>
                    {ms.map((m) => (
                      <option key={m.chave} value={m.chave}>
                        {m.rotulo}
                        {m.unidade ? ` (${m.unidade})` : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          ) : null}

          {tipo === 'barras' ? (
            <label className="campo">
              <span className="campo-rotulo">Resumir com</span>
              <select
                value={agregacao}
                onChange={(e) => setAgregacao(e.target.value)}
              >
                {catalogo.agregacoes.map((a) => (
                  <option key={a.chave} value={a.chave}>
                    {a.rotulo}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {tipo === 'distribuicao' ? (
            <label className="campo">
              <span className="campo-rotulo">Faixas</span>
              <input
                type="number"
                min={3}
                max={20}
                value={faixas}
                onChange={(e) => setFaixas(Number(e.target.value))}
                className="campo-mini"
              />
            </label>
          ) : null}

          <label className="campo">
            <span className="campo-rotulo">Título (opcional)</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Automático se vazio"
              className="campo-medio"
            />
          </label>
        </div>

        <p className="cartao-legenda" style={{ marginBottom: 12 }}>
          {definicaoTipo?.descricao}
        </p>

        {validacao && !validacao.valido ? (
          <div className="aviso aviso-erro" style={{ marginBottom: 12 }}>
            <strong>Este cruzamento não faz sentido.</strong> {validacao.motivo}
          </div>
        ) : null}

        {erro ? (
          <div className="aviso aviso-erro" style={{ marginBottom: 12 }}>
            {erro}
          </div>
        ) : null}

        {validacao?.valido ? (
          <>
            <div className="previa-painel">
              <p className="cartao-legenda">
                Prévia com os dados atuais
                {carregandoPrevia ? ' — calculando…' : ''}
              </p>
              {previa ? <PainelCustomizado painel={previa} /> : null}
            </div>
            <button
              type="button"
              className="botao botao-primario"
              onClick={adicionar}
              style={{ marginTop: 12 }}
            >
              Adicionar ao dashboard
            </button>
          </>
        ) : null}
      </section>

      <section className="cartao">
        <h2 className="cartao-titulo">
          Gráficos do dashboard ({paineis.length})
        </h2>
        {paineis.length === 0 ? (
          <p className="cartao-legenda">
            Nenhum ainda. Monte um acima e clique em “Adicionar ao dashboard”.
          </p>
        ) : (
          <ul className="lista-paineis">
            {paineis.map((p, i) => (
              <li key={p.id}>
                <span className="etiqueta">{i + 1}</span>
                <span className="lista-paineis-titulo">
                  {p.titulo || rotuloAutomatico(p, catalogo)}
                </span>
                <span className="lista-paineis-tipo">
                  {catalogo.tipos.find((t) => t.chave === p.tipo)?.rotulo}
                </span>
                <button
                  type="button"
                  className="botao botao-discreto"
                  onClick={() => remover(p.id)}
                >
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="acoes-construtor">
        <button
          type="button"
          className="botao botao-primario"
          onClick={() => void salvar()}
          disabled={salvando || !nome.trim()}
        >
          {salvando ? 'Salvando…' : dashboard ? 'Salvar alterações' : 'Criar dashboard'}
        </button>
        {dashboard ? (
          <button
            type="button"
            className="botao botao-perigo"
            onClick={() => void excluir()}
            disabled={salvando}
          >
            Excluir dashboard
          </button>
        ) : null}
      </div>
    </div>
  );
}

function rotuloAutomatico(p: PainelConfig, catalogo: CatalogoMetricas): string {
  const nome = (c?: string | null) =>
    catalogo.metricas.find((m) => m.chave === c)?.rotulo ?? c ?? '';
  if (p.tipo === 'distribuicao') return `Distribuição de ${nome(p.metricaX)}`;
  if (p.tipo === 'barras') return `${nome(p.metricaY)} por ${nome(p.metricaX)}`;
  return `${nome(p.metricaY)} e ${nome(p.metricaX)}`;
}
