export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;
  return (
    <main style={{ maxWidth: 360 }}>
      <h1>Entrar no Autonews</h1>
      {params.erro && <p style={{ color: 'crimson' }}>E-mail ou senha inválidos.</p>}
      <form method="post" action="/api/login">
        <label>
          E-mail
          <input name="email" type="email" required style={{ display: 'block', width: '100%', marginBottom: 12 }} />
        </label>
        <label>
          Senha
          <input name="password" type="password" required style={{ display: 'block', width: '100%', marginBottom: 12 }} />
        </label>
        <button type="submit">Entrar</button>
      </form>
    </main>
  );
}
