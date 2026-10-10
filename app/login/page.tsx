export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="login card">
      <h1>Entrar no Autonews</h1>
      <p className="muted">Radar de pautas e rascunhos da redação.</p>
      {params.erro && <div className="alert alert-danger">E-mail ou senha inválidos.</div>}
      <form method="post" action="/api/login" className="form">
        <label>
          E-mail
          <input name="email" type="email" required autoComplete="email" autoFocus />
        </label>
        <label>
          Senha
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button type="submit" className="primary">Entrar</button>
      </form>
    </main>
  );
}
