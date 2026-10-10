// Rótulos e formatação usados nas telas do painel.

export const SOURCE_LABEL: Record<string, string> = {
  campograndenews: 'Campo Grande News',
  correiodoestado: 'Correio do Estado',
  topmidia: 'TopMídia News',
  agenciabrasil: 'Agência Brasil',
  band: 'Band',
};

export const PRIORITIES = ['URGENTE', 'ALTA', 'NORMAL', 'BAIXA'] as const;

export const PRIORITY_LABEL: Record<string, string> = {
  URGENTE: 'Urgente', ALTA: 'Alta', NORMAL: 'Normal', BAIXA: 'Baixa',
};

export const TZ = 'America/Campo_Grande';

export function formatDateTime(d: Date | number) {
  return new Date(d).toLocaleString('pt-BR', { timeZone: TZ, dateStyle: 'short', timeStyle: 'short' });
}

// "agora", "há 12 min", "há 3 h"; acima de 24 h mostra a data.
export function timeAgo(d: Date | number) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return formatDateTime(d);
}
