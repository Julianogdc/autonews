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
