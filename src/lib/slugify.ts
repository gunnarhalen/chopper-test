export function slugify(texto: string): string {
  const normalizado = (texto as any).normalize('NFD');
  return normalizado
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) || 'sem-titulo';
}
