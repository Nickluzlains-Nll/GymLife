export function formatarDuracao(segundos) {
  if (segundos == null || !Number.isFinite(segundos)) return null;

  if (segundos < 60) return 'menos de 1 min';

  const minutos = Math.round(segundos / 60);

  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}