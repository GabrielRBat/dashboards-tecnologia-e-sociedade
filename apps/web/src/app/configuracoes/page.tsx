import { Cartao } from '@/components/estado';
import { ResumoTema, SeletorTema } from '@/components/seletor-tema';

export const metadata = { title: 'Configurações · Dashboard de Argamassas' };

export default function PaginaConfiguracoes() {
  const urlApi = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

  return (
    <>
      <h1 className="titulo-pagina">Configurações</h1>
      <p className="subtitulo-pagina">
        Preferências de exibição do sistema.
      </p>

      <div className="coluna-configuracoes">
        <Cartao
          titulo="Aparência"
          legenda="Como o sistema aparece neste navegador"
        >
          <SeletorTema />
          <ResumoTema />
        </Cartao>

        <Cartao titulo="Sobre" legenda="Informações desta instalação">
          <dl className="lista-dados">
            <dt>API</dt>
            <dd style={{ fontVariantNumeric: 'normal' }}>{urlApi}</dd>
            <dt>Fórmulas de cálculo</dt>
            <dd style={{ fontVariantNumeric: 'normal' }}>docs/CALCULOS.md</dd>
          </dl>
          <p className="kpi-nota" style={{ marginTop: 16 }}>
            Três fórmulas da planilha original foram corrigidas no sistema, então
            alguns valores divergem dela de propósito. O documento acima explica
            cada divergência.
          </p>
        </Cartao>
      </div>
    </>
  );
}
