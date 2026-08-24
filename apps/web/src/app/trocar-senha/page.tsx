import { FormularioTrocaSenha } from '@/components/formulario-troca-senha';

export const metadata = { title: 'Trocar senha · Dashboard de Argamassas' };

export default function PaginaTrocarSenha() {
  return (
    <>
      <h1 className="titulo-pagina">Trocar senha</h1>
      <p className="subtitulo-pagina">
        Quando a senha foi definida por outra pessoa, trocá-la é o que garante
        que só você conhece a sua.
      </p>
      <div className="coluna-configuracoes">
        <section className="cartao">
          <FormularioTrocaSenha />
        </section>
      </div>
    </>
  );
}
