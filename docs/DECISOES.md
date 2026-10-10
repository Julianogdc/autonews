# Decisões do projeto Autonews

Registro das decisões tomadas durante a implantação. Cada item tem data e motivo.

## 2026-10-09

- **Midiamax fora da V1 por enquanto.** O site bloqueia robôs de IA no arquivo de regras. Não será coletado até haver autorização por escrito da redação. Se a autorização vier, a coleta segue as condições dela e as mesmas regras dos outros portais.
- **Backup diário também no Google Drive.** Pendente: criar a pasta no Drive e autorizar o envio pelo servidor.
- **Triagem por regras, sem IA.** Notas de 0 a 100 com motivos explícitos. Localidade comum (Campo Grande, MS) não diferencia fatos.
- **Agrupamento conservador.** Em caso de dúvida, duas pautas separadas em vez de juntar fatos diferentes.
- **Divergências só quando não há ambiguidade.** Um portal com um único valor do tipo, e outro portal com outro valor. Isso evita alarme falso, mas também deixa passar divergências reais. Ponto a acompanhar.
- **Redação por IA (OpenAI, modelo gpt-4o-mini).** Duas etapas: rascunho a partir dos fatos e conferência das afirmações contra as fontes.
- **Revisão humana obrigatória** para rascunhos marcados como "a conferir" ou "tema sensível", antes de qualquer publicação.
- **Imagens dos portais só como referência.** Sempre marcadas como "não liberada". Crédito ausente aparece como "não informado pelo portal".
- **Publicação continua manual.** O painel marca a pauta como publicada ou ignorada, mas não publica em nenhum site.

## 2026-10-09 (depois)

- **Backup só na VPS, sem cópia no Drive.** Decisão da equipe. Risco aceito: se a VPS tiver falha grave, o backup local vai junto. A pasta "Autonews Backups" no Drive ficou criada e vazia, e pode ser apagada. Rever esse ponto antes do go-live (Fase 10).

## 2026-10-10

- **Editor IA e Chat IA fora do menu.** A equipe usa o ChatGPT direto para revisões e pesquisas avulsas. O código continua no projeto.
- **Rascunho com IA só sob demanda.** O coletor não gera mais rascunhos sozinho; a matéria é gerada pelo botão "Gerar matéria" em qualquer pauta. Motivo: economia, já que muitas pautas não eram aproveitadas.
- **Redação com apuração na web.** Uma única chamada (API de Respostas da OpenAI com pesquisa na web) apura o fato em outros sites, escreve a matéria (6 a 10 parágrafos) e devolve a checagem de cada fato principal (confirmado, divergente ou não confirmado, com links). Modelo: `AI_DRAFT_MODEL` no `.env` ou, sem ele, o modelo médio mais novo da conta. Substitui o gpt-4o-mini em duas etapas, que gerava matérias curtas e alertas falsos.
- **Checagem como sugestão.** O painel mostra só o que não ficou confirmado como "Sugestões de checagem". A revisão humana antes de publicar continua obrigatória.
