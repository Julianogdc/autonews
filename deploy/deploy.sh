#!/bin/sh
# Atualiza o Autonews na VPS: baixa o código, aplica migrations, sobe o painel
# e aponta o subdomínio para ele. Pode ser rodado sempre que houver novidade.
set -e

APP_DIR=/opt/autonews/app
ROUTE_FILE=/etc/easypanel/traefik/config/autonews.yaml

cd "$APP_DIR"
git pull --ff-only

# Banco e painel. Os dados do banco ficam no volume e não são apagados.
docker compose up -d --build postgres web
docker compose --profile tools build migrate

# Aplica as migrations pendentes (não apaga nada).
docker compose --profile tools run --rm migrate npx prisma migrate deploy

# Aponta o subdomínio para o painel novo (container web, porta 3000).
# Só altera o arquivo do Autonews; os outros sites não são tocados.
if [ -f "$ROUTE_FILE" ]; then
  sed -i 's#http://autonews-teste:80#http://autonews-web:3000#' "$ROUTE_FILE"
fi

# Remove o container de teste antigo, se ainda existir.
docker rm -f autonews-teste 2>/dev/null || true

sleep 10
echo "=== Teste interno ==="
docker exec autonews-web node -e "fetch('http://localhost:3000/api/health').then(r=>r.text()).then(console.log).catch(()=>{console.log('FALHA no health check');process.exit(1)})" || echo "FALHA no health check"
echo
echo "=== Teste pelo subdominio ==="
curl -s -o /dev/null -w 'autonews.zafiramkt.com.br -> %{http_code}\n' --max-time 20 https://autonews.zafiramkt.com.br/api/health
