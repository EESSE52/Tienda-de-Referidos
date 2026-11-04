/** Diagnóstico OAuth de solo lectura; no contiene credenciales en resultados. */
export async function diagnoseMercadoLibreAccess(accessToken, itemId, fetchImplementation = fetch) {
  if (!accessToken || typeof accessToken !== 'string') throw new Error('Falta token OAuth.');
  const result = { identity: { status: null, ok: false }, item: null, conclusion: '' };
  const headers = { Authorization: 'Bearer ' + accessToken, Accept: 'application/json' };
  async function probe(url) {
    try {
      const response = await fetchImplementation(url, { method: 'GET', headers, redirect: 'error' });
      return { status: response.status, ok: response.ok };
    } catch {
      return { status: null, ok: false, network_error: true };
    }
  }
  result.identity = await probe('https://api.mercadolibre.com/users/me');
  if (itemId) {
    if (!/^MLC[0-9]{6,}$/.test(itemId)) throw new Error('ID de publicación MLC inválido.');
    result.item = await probe('https://api.mercadolibre.com/items/' + itemId);
  }
  if (result.identity.ok && result.item?.status === 403) {
    result.conclusion = 'La API reconoce el token para /users/me, pero rechaza esta publicación. Verifica autorización del recurso y permisos; puede haber restricciones a publicaciones de terceros.';
  } else if (result.identity.status === 401 || result.identity.status === 403) {
    result.conclusion = 'La consulta /users/me no fue autorizada: revisa vigencia, identidad y permisos del token.';
  } else if (result.identity.ok && !result.item) {
    result.conclusion = 'La identidad OAuth responde correctamente. Prueba ahora una publicación MLC.';
  } else if (result.identity.ok && result.item?.ok) {
    result.conclusion = 'La identidad y esta publicación permiten lectura autenticada.';
  } else {
    result.conclusion = 'Consulta los códigos HTTP para determinar si hay un bloqueo de red, recurso o permisos.';
  }
  return result;
}
