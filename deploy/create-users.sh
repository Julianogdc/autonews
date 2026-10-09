#!/bin/sh
# Cria as duas contas da equipe. Pede e-mail, nome e senha com digitação oculta.
# A senha nunca aparece na tela e nunca é gravada em texto puro.
set -e

cd /opt/autonews/app
for i in 1 2; do
  printf 'E-mail do usuario %s: ' "$i"; read -r EMAIL
  printf 'Nome do usuario %s: ' "$i"; read -r NOME
  printf 'Senha (minimo 12 caracteres, nao aparece na tela): '; stty -echo; read -r SENHA; stty echo; echo
  docker compose --profile tools run --rm migrate npx tsx scripts/create-user.ts "$EMAIL" "$NOME" "$SENHA"
done
echo "Contas criadas."
