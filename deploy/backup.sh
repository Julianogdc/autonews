#!/bin/sh
# Backup diário do banco do Autonews.
# Gera um arquivo comprimido e mantém só os 14 mais recentes.
set -e

BACKUP_DIR=/root/backups/autonews
mkdir -p "$BACKUP_DIR"
STAMP=$(date +%Y%m%d-%H%M)
FILE="$BACKUP_DIR/autonews-$STAMP.sql.gz"

docker exec autonews-postgres pg_dump -U autonews -d autonews --clean --if-exists | gzip > "$FILE"

# Confere se o arquivo não está vazio (um backup vazio não serve).
if [ ! -s "$FILE" ]; then
  echo "ERRO: backup vazio, removendo $FILE" >&2
  rm -f "$FILE"
  exit 1
fi

# Mantém só os 14 mais recentes.
ls -1t "$BACKUP_DIR"/autonews-*.sql.gz | tail -n +15 | xargs -r rm -f
echo "Backup OK: $FILE ($(du -h "$FILE" | cut -f1))"
