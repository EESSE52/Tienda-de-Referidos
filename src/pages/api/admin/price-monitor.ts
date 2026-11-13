import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { jsonResponse, requireAdmin } from '../../../lib/cloudflare-catalog.js';

export const prerender = false;
export const GET: APIRoute = async ({request}) => {
  const denied=requireAdmin({env,request});
  if(denied)return denied;
  const db=env?.CATALOG_DB;
  if(!db?.prepare)return jsonResponse({error:'CATALOG_DB no disponible.'},503);
  try{
    const productId=new URL(request.url).searchParams.get('product_id');
    if (productId !== null) {
      if (!productId || productId.length > 180) return jsonResponse({error:'ID de producto inválido.'},400);
      const history=await db.prepare(`SELECT item_id,checked_at,saved_price,observed_price,
        difference_percent,status,alert,reason FROM price_monitor_checks
        WHERE product_id=? ORDER BY id DESC LIMIT 60`).bind(productId).all();
      return jsonResponse({ok:true,product_id:productId,checks:history.results||[],readonly:true});
    }
    const [runs,checks]=await Promise.all([
      db.prepare('SELECT * FROM price_monitor_runs ORDER BY id DESC LIMIT 12').all(),
      db.prepare(`SELECT p.product_id,p.item_id,p.checked_at,p.saved_price,p.observed_price,
        p.difference_percent,p.status,p.alert,p.reason
        FROM price_monitor_checks p
        WHERE p.id=(SELECT MAX(q.id) FROM price_monitor_checks q WHERE q.product_id=p.product_id)
        ORDER BY p.alert DESC, p.checked_at DESC LIMIT 300`).all(),
    ]);
    return jsonResponse({ok:true,runs:runs.results||[],checks:checks.results||[],
      threshold_percent:2,stale_days:14,readonly:true});
  }catch(error){
    console.error('Monitor D1:',error);
    return jsonResponse({error:'No se pudo leer el monitor. Aplica primero migrations/0002_price_monitor.sql en D1.'},503);
  }
};
