// Cria ou atualiza uma conta da equipe.
// Uso no servidor (dentro do container web):
//   npx tsx scripts/create-user.ts "email@exemplo.com" "Nome" "senha-forte"
// A senha nunca é gravada em texto puro: só o hash entra no banco.
import { prisma } from '../lib/db';
import { hashPassword } from '../lib/auth';

async function main() {
  const [email, name, password] = process.argv.slice(2);
  if (!email || !name || !password || password.length < 12) {
    console.error('Uso: create-user.ts <email> <nome> <senha com 12+ caracteres>');
    process.exit(1);
  }
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { name, passwordHash },
    create: { email: email.toLowerCase(), name, passwordHash },
  });
  console.log(`Usuário pronto: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
