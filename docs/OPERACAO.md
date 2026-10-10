# Operação do Autonews

Guia para quem mantém o sistema. Não contém senhas: elas ficam nos lugares indicados abaixo.

## Onde está cada coisa

- **Código:** repositório `Julianogdc/autonews` no GitHub (branch `main`).
- **Servidor:** VPS 145.223.93.248 (Ubuntu 24.04), projeto em `/opt/autonews/app`.
- **Painel:** https://autonews.zafiramkt.com.br (login com usuário e senha da equipe).
- **Containers:** `autonews-web` (painel), `autonews-worker` (coletor, a cada 15 minutos), `autonews-postgres` (banco).
- **Configuração e segredos:** `/opt/autonews/app/.env` (permissão 600). Contém a senha do banco, o segredo de sessão e a chave da OpenAI. Nunca copiar para o repositório.
- **Rota do subdomínio:** `/etc/easypanel/traefik/config/autonews.yaml` (fora do Git, gerenciado no servidor).
- **Backups:** `/root/backups/autonews/`, gerados todo dia às 3h (UTC) pelo cron. Ficam os 14 mais recentes.
- **Relatórios diários:** `/root/relatorios-autonews/`, gerados às 9h (UTC) com o resumo do coletor.
- **Gestão visual dos containers:** Portainer, acessado por túnel SSH (`ssh -L 9443:127.0.0.1:9443 root@145.223.93.248`) e depois https://localhost:9443.
- **Acesso ao GitHub pelo servidor:** chave de deploy em `/root/.ssh/autonews_deploy`.

## Credenciais (onde estão, não os valores)

| O quê | Onde fica |
|---|---|
| Senha do banco | `.env` (POSTGRES_PASSWORD e DATABASE_URL) |
| Segredo de sessão | `.env` (SESSION_SECRET) |
| Chave da OpenAI | `.env` (AI_API_KEY) e conta da OpenAI |
| Usuários do painel | criados com `deploy/create-users.sh`; senhas só com a equipe |
| Login do Portainer | definido na primeira entrada; guardar com o responsável |
| Acesso à VPS | conta Hostinger do responsável |

## Como atualizar o sistema

1. Confirme que a mudança está no GitHub (`main`).
2. No servidor, rode: `sh /opt/autonews/app/deploy/deploy.sh`
3. O script baixa o código, aplica migrações do banco (sem apagar dados), reconstrói e reinicia os serviços, e faz o teste do painel.
4. Se o teste mostrar algo diferente de `200` ou de `"status":"ok"`, o problema está no log: `docker logs autonews-web --tail 50`.

## Como restaurar um backup

Use sempre primeiro um banco de teste, para não sobrescrever o banco em uso:

```
gunzip -c /root/backups/autonews/AAAAMMDD-HHMM.sql.gz | docker exec -i autonews-postgres psql -U autonews -d postgres -c 'CREATE DATABASE autonews_restore_test;'
```

Depois restaure dentro do banco de teste e confira os números. Só se a restauração for necessária de fato, apague o banco atual e restaure no banco `autonews` (o backup já inclui os comandos de limpeza). Esse procedimento foi testado em outubro de 2026.

## Rotina semanal (15 minutos)

1. **Disco:** `df -h /` deve ter folga. Acima de 80% de uso, investigar.
2. **Backups:** `ls -lh /root/backups/autonews | tail -3` deve mostrar o backup de hoje, com tamanho semelhante aos anteriores.
3. **Containers:** `docker ps --format 'table {{.Names}}\t{{.Status}}'` deve mostrar os três containers como `Up` (postgres como `healthy`).
4. **Relatórios:** conferir o último arquivo em `/root/relatorios-autonews/`.
5. **Limpeza de imagens antigas:** `docker image prune -f` (remove só imagens sem uso).

## Se algo parar

- **O coletor parou de trazer matérias:** `docker logs autonews-worker --tail 30`. Se aparecer "0 candidatos" repetidamente, o layout do portal mudou; avisar o responsável técnico para ajustar o coletor daquele portal.
- **Rascunhos não são gerados:** verificar se a chave da OpenAI ainda está válida e se há saldo na conta. Os logs mostram "AI_API_KEY não configurada" ou erro da OpenAI.
- **Painel fora do ar:** `curl -s https://autonews.zafiramkt.com.br/api/health`. Se não responder, `docker restart autonews-web`.
- **Reiniciar tudo:** `cd /opt/autonews/app && docker compose up -d` (não apaga dados).

## O que não é feito pelo sistema

- Publicação automática em qualquer site: a publicação é sempre manual.
- Imagens: as dos portais são só referência e não podem ser publicadas sem licença.
- Midiamax: fora da V1 até haver autorização por escrito do portal (ver `docs/DECISOES.md`).

## Riscos conhecidos

- O backup fica só na VPS (decisão registrada em `docs/DECISOES.md`).
- Divergências entre portais são detectadas só em casos sem ambiguidade. Um alerta que não aparece não quer dizer que não existe divergência.
- Os rascunhos da IA passam por conferência automática, que também erra. A revisão humana antes da publicação é obrigatória.
