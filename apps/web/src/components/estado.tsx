import { ReactNode } from 'react';

/** Aviso padrão quando a API não responde. */
export function ApiForaDoAr({ mensagem }: { mensagem: string }) {
  return (
    <div className="aviso aviso-erro">
      <strong>API indisponível.</strong> {mensagem}
      <br />
      Suba a API com <code>npm run dev:api</code> na raiz do projeto e confira se
      o banco está no ar.
    </div>
  );
}

export function Cartao({
  titulo,
  legenda,
  largura = 1,
  children,
}: {
  titulo: string;
  legenda?: string;
  /** Quantas colunas da grade o cartão ocupa: 1, 2 ou toda a linha. */
  largura?: 1 | 2 | 'total';
  children: ReactNode;
}) {
  const classeLargura =
    largura === 'total'
      ? ' grafico-largo'
      : largura === 2
        ? ' grafico-duplo'
        : '';

  return (
    <section className={`cartao${classeLargura}`}>
      <h2 className="cartao-titulo">{titulo}</h2>
      {legenda ? <p className="cartao-legenda">{legenda}</p> : null}
      {children}
    </section>
  );
}

export function Kpi({
  rotulo,
  valor,
  unidade,
  nota,
}: {
  rotulo: string;
  valor: string;
  unidade?: string;
  nota?: string;
}) {
  return (
    <div className="cartao">
      <p className="kpi-rotulo">{rotulo}</p>
      <p className="kpi-valor">
        {valor}
        {unidade ? <span className="kpi-unidade">{unidade}</span> : null}
      </p>
      {nota ? <p className="kpi-nota">{nota}</p> : null}
    </div>
  );
}
