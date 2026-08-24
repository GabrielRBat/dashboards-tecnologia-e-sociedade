'use client';

/** Escolha do tema, em três opções com amostra visual. */

import { TEMAS, Tema, useTema } from './tema';

const OPCOES: { valor: Tema; rotulo: string; descricao: string }[] = [
  {
    valor: 'sistema',
    rotulo: 'Automático',
    descricao: 'Acompanha a configuração do seu computador',
  },
  { valor: 'claro', rotulo: 'Claro', descricao: 'Fundo claro o tempo todo' },
  { valor: 'escuro', rotulo: 'Escuro', descricao: 'Fundo escuro o tempo todo' },
];

/** Miniatura de um painel, para o usuário ver o tema antes de escolher. */
function Amostra({ valor }: { valor: Tema }) {
  const { temaEfetivo } = useTema();
  const escuro = valor === 'escuro' || (valor === 'sistema' && temaEfetivo === 'escuro');

  const fundo = escuro ? '#1a1a19' : '#fcfcfb';
  const plano = escuro ? '#0d0d0d' : '#f9f9f7';
  const linha = escuro ? '#2c2c2a' : '#e1e0d9';
  const tinta = escuro ? '#c3c2b7' : '#52514e';
  const serie = escuro ? '#3987e5' : '#2a78d6';

  return (
    <svg
      className="amostra-tema"
      viewBox="0 0 96 60"
      role="img"
      aria-label={`Prévia do tema ${valor}`}
    >
      <rect width="96" height="60" rx="5" fill={plano} />
      <rect x="5" y="5" width="86" height="10" rx="2.5" fill={fundo} />
      <rect x="9" y="8.5" width="20" height="3" rx="1.5" fill={tinta} />
      <rect x="5" y="19" width="40" height="16" rx="2.5" fill={fundo} />
      <rect x="9" y="23" width="14" height="3" rx="1.5" fill={tinta} />
      <rect x="9" y="28.5" width="22" height="4" rx="1.5" fill={serie} />
      <rect x="49" y="19" width="42" height="36" rx="2.5" fill={fundo} />
      <rect x="53" y="46" width="6" height="6" rx="1" fill={serie} />
      <rect x="62" y="40" width="6" height="12" rx="1" fill={serie} />
      <rect x="71" y="33" width="6" height="19" rx="1" fill={serie} />
      <rect x="80" y="37" width="6" height="15" rx="1" fill={serie} />
      <rect x="5" y="39" width="40" height="16" rx="2.5" fill={fundo} />
      <path
        d="M9 51 L17 46 L25 48 L33 42 L41 44"
        fill="none"
        stroke={serie}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="0.5" y="0.5" width="95" height="59" rx="4.5" fill="none" stroke={linha} />
    </svg>
  );
}

export function SeletorTema() {
  const { tema, definirTema } = useTema();

  return (
    <fieldset className="opcoes-tema">
      <legend className="sr-apenas">Tema do sistema</legend>
      {OPCOES.map((opcao) => (
        <label
          key={opcao.valor}
          className="opcao-tema"
          data-selecionado={tema === opcao.valor}
        >
          <input
            type="radio"
            name="tema"
            value={opcao.valor}
            checked={tema === opcao.valor}
            onChange={() => definirTema(opcao.valor)}
          />
          <Amostra valor={opcao.valor} />
          <span className="opcao-tema-texto">
            <span className="opcao-tema-rotulo">
              {opcao.rotulo}
              {tema === opcao.valor ? (
                <span className="opcao-tema-marca" aria-hidden="true">
                  ✓
                </span>
              ) : null}
            </span>
            <span className="opcao-tema-descricao">{opcao.descricao}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Confirma para o usuário qual tema está valendo agora. */
export function ResumoTema() {
  const { tema, temaEfetivo } = useTema();

  if (!TEMAS.includes(tema)) return null;

  return (
    <p className="kpi-nota" style={{ marginTop: 16 }}>
      {tema === 'sistema'
        ? `Seguindo o seu computador — no momento, tema ${temaEfetivo}.`
        : `Tema ${temaEfetivo} fixo, independente da configuração do computador.`}{' '}
      A escolha vale para este navegador e fica salva para as próximas visitas.
    </p>
  );
}
