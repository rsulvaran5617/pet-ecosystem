export async function readManagementResponse(response, { allowEmpty = false } = {}) {
  const text = await response.text();
  if (!text.trim()) {
    if (allowEmpty) return null;
    throw new Error('Supabase devolvio una respuesta vacia donde se esperaba JSON. Revisa el estado antes de reintentar.');
  }
  try {
    return JSON.parse(text);
  } catch {
    // Never include a response body: it may contain private configuration.
    throw new Error('Supabase devolvio una respuesta JSON invalida. Revisa el estado antes de reintentar.');
  }
}
