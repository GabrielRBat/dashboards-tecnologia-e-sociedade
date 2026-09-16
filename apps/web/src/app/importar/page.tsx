'use client';

import { useEffect, useState } from 'react';

interface ErroImportacao {
  linha: number;
  coluna: string | null;
  mensagem: string;
  bloqueante?: boolean;
}

interface Resultado {
  importacaoId?: string;
  arquivo: string;
  linhasLidas: number;
  linhasImportadas: number;
  linhasIgnoradas: number;
  erros: ErroImportacao[];
  bloqueios?: ErroImportacao[];
  prontoParaImportar?: boolean;
  formulacoesAfetadas?: {
    id: string;
    numeracao: number;
    acao: 'CRIADA' | 'ATUALIZADA';
  }[];
}

interface HistoricoImportacao {
  id: string;
  arquivo: string;
  usuario: { id: string; nome: string; email: string };
  linhasLidas: number;
  linhasImportadas: number;
  linhasIgnoradas: number;
  avisos: ErroImportacao[];
  formulacoes: { formulacaoId: string; numeracao: number; acao: string }[];
  criadoEm: string;
}

export default function PaginaImportar() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [validando, setValidando] = useState(false);
  const [preview, setPreview] = useState<Resultado | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [historico, setHistorico] = useState<HistoricoImportacao[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarHistorico(): Promise<void> {
    const resposta = await fetch('/api/importacao/planilha', {
      method: 'GET',
      cache: 'no-store',
    });
    if (resposta.ok) {
      setHistorico((await resposta.json()) as HistoricoImportacao[]);
    }
  }

  useEffect(() => {
    void carregarHistorico();
  }, []);

  async function enviar(acao: 'validar' | 'importar'): Promise<void> {
    if (!arquivo) return;

    if (acao === 'validar') setValidando(true);
    else setEnviando(true);
    setErro(null);
    if (acao === 'validar') {
      setPreview(null);
      setResultado(null);
    }

    try {
      const corpo = new FormData();
      corpo.append('arquivo', arquivo);

      const resposta = await fetch(
        `/api/importacao/planilha${acao === 'validar' ? '?acao=validar' : ''}`,
        {
        method: 'POST',
        body: corpo,
        },
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(
          dados?.mensagem ?? dados?.message ?? `A API respondeu ${resposta.status}.`,
        );
        return;
      }

      if (acao === 'validar') setPreview(dados as Resultado);
      else {
        setResultado(dados as Resultado);
        setPreview(null);
        await carregarHistorico();
      }
    } catch {
      setErro(
        'Não foi possível enviar a planilha. Confira se a API está rodando.',
      );
    } finally {
      if (acao === 'validar') setValidando(false);
      else setEnviando(false);
    }
  }

  return (
    <>
      <h1 className="titulo-pagina">Importar planilha</h1>
      <p className="subtitulo-pagina">
        Envie a <strong>Planilha de Registro e cálculo</strong> (.xlsx). A aba
        lida é a &quot;planilha de alimentação&quot;, a partir da linha 11.
      </p>

      <form
        onSubmit={(evento) => {
          evento.preventDefault();
          void enviar('validar');
        }}
      >
        <div className="area-upload">
          <p style={{ margin: 0, fontWeight: 550 }}>
            Selecione o arquivo .xlsx
          </p>
          <p
            style={{
              margin: '6px 0 0',
              fontSize: 12.5,
              color: 'var(--tinta-suave)',
            }}
          >
            Linhas sem numeração ou sem nomenclatura são ignoradas. Reimportar a
            mesma planilha atualiza as formulações já cadastradas, pela numeração.
          </p>
          <p style={{ margin: '10px 0 0', fontSize: 13 }}>
            <a
              href="/api/importacao/planilha?acao=template"
              style={{ color: 'var(--primaria)', fontWeight: 600 }}
            >
              Baixar template oficial
            </a>
          </p>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setArquivo(e.target.files?.[0] ?? null);
              setPreview(null);
              setResultado(null);
              setErro(null);
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
            <button
              type="submit"
              className="botao botao-primario"
              disabled={!arquivo || validando || enviando}
            >
              {validando ? 'Validando…' : 'Validar planilha'}
            </button>
            <button
              type="button"
              className="botao"
              disabled={
                !arquivo ||
                !preview?.prontoParaImportar ||
                validando ||
                enviando
              }
              onClick={() => void enviar('importar')}
            >
              {enviando ? 'Importando…' : 'Confirmar importação'}
            </button>
          </div>
        </div>
      </form>

      {erro ? (
        <div className="aviso aviso-erro" style={{ marginTop: 16 }}>
          {erro}
        </div>
      ) : null}

      {preview ? (
        <ResultadoImportacao
          titulo="Pré-validação"
          resultado={preview}
          sucesso={
            preview.prontoParaImportar
              ? 'Planilha pronta para importação. Confira os números e confirme.'
              : null
          }
        />
      ) : null}

      {resultado ? (
        <ResultadoImportacao
          titulo="Resultado da importação"
          resultado={resultado}
          sucesso="Importação gravada e registrada no histórico."
        />
      ) : null}

      <section className="cartao" style={{ marginTop: 16 }}>
        <h2 className="cartao-titulo">Histórico de importações</h2>
        {historico.length === 0 ? (
          <p className="vazio" style={{ fontSize: 13 }}>
            Nenhuma importação registrada ainda.
          </p>
        ) : (
          <div className="tabela-envolucro">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Arquivo</th>
                  <th>Usuário</th>
                  <th className="numerico">Lidas</th>
                  <th className="numerico">Importadas</th>
                  <th className="numerico">Ignoradas</th>
                  <th className="numerico">Avisos</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.criadoEm).toLocaleString('pt-BR')}</td>
                    <td>{h.arquivo}</td>
                    <td>{h.usuario.nome}</td>
                    <td className="numerico">{h.linhasLidas}</td>
                    <td className="numerico">{h.linhasImportadas}</td>
                    <td className="numerico">{h.linhasIgnoradas}</td>
                    <td className="numerico">{h.avisos.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function ResultadoImportacao({
  titulo,
  resultado,
  sucesso,
}: {
  titulo: string;
  resultado: Resultado;
  sucesso: string | null;
}) {
  const bloqueios = resultado.erros.filter((e) => e.bloqueante);

  return (
    <section className="cartao" style={{ marginTop: 16 }}>
      <h2 className="cartao-titulo">{titulo}</h2>
      <p className="cartao-legenda">{resultado.arquivo}</p>

          <div className="grade-kpis" style={{ marginBottom: 0 }}>
            <div className="cartao">
              <p className="kpi-rotulo">Linhas lidas</p>
              <p className="kpi-valor">{resultado.linhasLidas}</p>
            </div>
            <div className="cartao">
              <p className="kpi-rotulo">Importadas</p>
              <p className="kpi-valor" style={{ color: 'var(--sucesso-texto)' }}>
                {resultado.linhasImportadas}
              </p>
            </div>
            <div className="cartao">
              <p className="kpi-rotulo">Ignoradas</p>
              <p className="kpi-valor">{resultado.linhasIgnoradas}</p>
            </div>
          </div>

          {bloqueios.length > 0 ? (
            <div className="aviso aviso-erro" style={{ marginTop: 16 }}>
              A importação está bloqueada. Corrija o layout ou use o template
              atual antes de gravar.
            </div>
          ) : null}

          {resultado.erros.length > 0 ? (
            <>
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  margin: '20px 0 8px',
                }}
              >
                Avisos ({resultado.erros.length})
              </h3>
              <div className="tabela-envolucro">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Linha</th>
                      <th>Coluna</th>
                      <th>Mensagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resultado.erros.slice(0, 100).map((e, i) => (
                      <tr key={`${e.linha}-${i}`}>
                        <td className="numerico">{e.linha}</td>
                        <td>{e.coluna ?? '—'}</td>
                        <td style={{ whiteSpace: 'normal' }}>{e.mensagem}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {resultado.erros.length > 100 ? (
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--tinta-suave)',
                    marginTop: 8,
                  }}
                >
                  Mostrando os 100 primeiros de {resultado.erros.length} avisos.
                </p>
              ) : null}
            </>
          ) : (
            <p
              style={{
                marginTop: 16,
                fontSize: 13,
                color: 'var(--sucesso-texto)',
              }}
            >
              {sucesso ?? 'Nenhum aviso encontrado.'}
            </p>
          )}
    </section>
  );
}
