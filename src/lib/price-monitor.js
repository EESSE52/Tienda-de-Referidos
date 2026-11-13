/**
 * Vigilancia del precio externo: no modifica catalog_products ni historial_precios.
 * No afirma un precio de oferta si la API devuelve varios importes o contextos.
 */
export function classifyMercadoLibrePrices(payload) {
  if (!payload || !Array.isArray(payload.prices)) return { ok:false, reason:'Respuesta sin lista prices.' };
  const prices = payload.prices.filter(p => {
    const restrictions = p?.conditions?.context_restrictions;
    return (p.type === 'standard' || p.type === 'promotion') &&
      Number.isSafeInteger(Number(p.amount)) && Number(p.amount) > 0 &&
      p.currency_id === 'CLP' &&
      Array.isArray(restrictions) && restrictions.length === 0 &&
      (!p.conditions.start_time || Date.parse(p.conditions.start_time) <= Date.now()) &&
      (!p.conditions.end_time || Date.parse(p.conditions.end_time) >= Date.now());
  });
  if (!prices.length) return { ok:false, reason:'Sin precio CLP general inequívoco.' };
  // Un único valor entre precios generales es aceptable; importes distintos no
  // permiten concluir qué precio ve el comprador en la publicación específica.
  const amounts = [...new Set(prices.map(p => Number(p.amount)))];
  if (amounts.length !== 1) return {ok:false, reason:'Precios estándar/promocionales diferentes; requiere revisión manual.'};
  return {ok:true, price:amounts[0]};
}

export function classifyPriceCheck(saved, observed, threshold=2) {
  if (!Number.isSafeInteger(saved) || saved <= 0 || !Number.isSafeInteger(observed) || observed <= 0) {
    return {status:'unverifiable', alert:false, percentage:null};
  }
  const percentage = Math.round((observed-saved)*10000/saved)/100;
  return {status: saved===observed ? 'equal':'changed', alert:Math.abs(percentage)>=threshold, percentage};
}

export async function fetchOfficialPrice(itemId, token, fetcher=fetch) {
  if (!/^MLC\d{6,}$/.test(itemId)) return {ok:false,reason:'ID de publicación MLC inválido.'};
  if (!token) return {ok:false,reason:'Falta ML_ACCESS_TOKEN; autorización oficial pendiente.'};
  let response;
  try {
    response=await fetcher('https://api.mercadolibre.com/items/'+itemId+'/prices',{
      headers:{Authorization:'Bearer '+token,Accept:'application/json'},
      signal:AbortSignal.timeout(12000),
    });
  } catch {return {ok:false,reason:'Error de red o tiempo agotado al consultar Mercado Libre.'};}
  if (!response.ok) {
    return {ok:false,reason: response.status===401 || response.status===403
      ? 'API '+response.status+': token sin acceso a esta publicación.'
      : 'API '+response.status+': no se pudo verificar el precio.'};
  }
  try {return classifyMercadoLibrePrices(await response.json());}
  catch {return {ok:false,reason:'Respuesta de Mercado Libre inválida.'};}
}

/** Procesa un lote acotado. Una fecha observada no autoriza cambiar el precio público. */
export async function runDailyPriceMonitor(env, {fetcher=fetch, now=new Date(), limit=40}={}) {
  const db=env?.CATALOG_DB;
  if (!db?.prepare) throw new Error('Falta binding CATALOG_DB');
  const stamp=now.toISOString();
  const started=await db.prepare(
    "INSERT INTO price_monitor_runs (started_at,status) VALUES (?, 'running')"
  ).bind(stamp).run();
  const runId=started.meta?.last_row_id;
  if (!runId) throw new Error('D1 no entregó ID de ejecución');
  let checked=0,changed=0,unverifiable=0,alerted=0;
  try {
    const records=await db.prepare('SELECT data FROM catalog_products').all();
    const catalog=(records.results||[]).flatMap(row=>{
      try{return [JSON.parse(row.data)]}catch{return []}
    });
    const candidates=catalog.filter(p=>
      p && p.activo===true && p.es_prueba!==true &&
      /^MLC\d{6,}$/.test(String(p.id_publicacion||'').replace(/[-_]/g,'').toUpperCase()) &&
      Number.isSafeInteger(Number(p.precio)) && Number(p.precio)>0
    );
    // La fecha de revisión permite rotar listas grandes en ejecuciones posteriores.
    const lastResults=await db.prepare(
      'SELECT product_id, MAX(checked_at) AS last_check FROM price_monitor_checks GROUP BY product_id'
    ).all();
    const last=new Map((lastResults.results||[]).map(r=>[r.product_id,r.last_check]));
    candidates.sort((a,b)=>String(last.get(a.id)||'').localeCompare(String(last.get(b.id)||'')));
    const due=candidates.filter(p=>!last.has(p.id) || Date.parse(last.get(p.id)) <= now.getTime()-23*3600000).slice(0,Math.max(1,Math.min(100,limit)));
    for(const product of due){
      const id=String(product.id_publicacion).replace(/[-_]/g,'').toUpperCase();
      const saved=Number(product.precio);
      const outcome=await fetchOfficialPrice(id,env.ML_ACCESS_TOKEN,fetcher);
      const verdict=outcome.ok?classifyPriceCheck(saved,outcome.price,2):{status:'unverifiable',alert:false,percentage:null};
      const reason=outcome.ok?(verdict.alert?'Variación de al menos 2 %.':'Revisión de precio sin alerta.'):outcome.reason;
      await db.prepare(`INSERT INTO price_monitor_checks
        (run_id,product_id,item_id,checked_at,saved_price,observed_price,difference_percent,status,alert,reason)
        VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
          runId,String(product.id),id,stamp,saved,outcome.ok?outcome.price:null,
          verdict.percentage,verdict.status,verdict.alert?1:0,reason
        ).run();
      checked++;
      if(verdict.status==='changed')changed++;
      if(verdict.status==='unverifiable')unverifiable++;
      if(verdict.alert)alerted++;
    }
    await db.prepare(`UPDATE price_monitor_runs SET completed_at=?,status='completed',checked=?,
      changed=?,unverifiable=?,alerted=?,message=? WHERE id=?`).bind(
        new Date().toISOString(),checked,changed,unverifiable,alerted,
        'Precio público sin modificar; revisar alertas en el administrador.',runId
      ).run();
    return {runId,checked,changed,unverifiable,alerted,totalEligible:candidates.length};
  }catch(error){
    await db.prepare(`UPDATE price_monitor_runs SET completed_at=?,status='failed',message=? WHERE id=?`)
      .bind(new Date().toISOString(),'Error del monitor: revisar logs de Cloudflare.',runId).run();
    throw error;
  }
}
