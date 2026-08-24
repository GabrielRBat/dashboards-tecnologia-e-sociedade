'use client';

import { useState } from 'react';

interface ErroImportacao {
  linha: number;
  coluna: string | null;
  mensagem: string;
}

interface Resultado {
  arquivo: string;
  linhasLidas: number;
  linhasImportadas: number;
  linhasIgnoradas: number;
  erros: ErroImportacao[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export default function PaginaImportar() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent): Promise<void> {
    evento.preventDefault();
    if (!arquivo) return;

    setEnviando(true);
    setErro(null);
    setResultado(null);

    try {
      const corpo = new FormData();
      corpo.append('arquivo', arquivo);

      const resposta = await fetch(`${API}/api/importacao/planilha`, {
        method: 'POST',
        body: corpo,
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados?.message ?? `A API respondeu ${resposta.status}.`);
        return;
      }

      setResultado(dados as Resultado);
    } catch {
      setErro(
        `Não foi possível falar com a API em ${API}. Confira se ela está rodando.`,
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <h1 className="titulo-pagina">Importar planilha</h1>
      <p className="subtitulo-pagina">
        Envie a <strong>Planilha de Registro e cálculo</strong> (.xlsx). A aba
        lida é a &quot;planilha de alimentação&quot;, a partir da linha 11.
      </p>

      <form onSubmit={enviar}>
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
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setArquivo(e.target.files?.[0] ?? null);
              setResultado(null);
              setErro(null);
            }}
          />
          <div style={{ marginTop: 18 }}>
            <button
              type="submit"
              className="botao botao-primario"
              disabled={!arquivo || enviando}
            >
              {enviando ? 'Importando…' : 'Importar'}
            </button>
          </div>
        </div>
      </form>

      {erro ? (
        <div className="aviso aviso-erro" style={{ marginTop: 16 }}>
          {erro}
        </div>
      ) : null}

      {resultado ? (
        <section className="cartao" style={{ marginTop: 16 }}>
          <h2 className="cartao-titulo">Resultado da importação</h2>
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
              Nenhum aviso — todas as linhas válidas foram importadas.
            </p>
          )}
        </section>
      ) : null}
    </>
  );
}
