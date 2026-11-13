import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');

describe('integración segura de monitor automático',()=>{
  it('usa Worker independiente y cron diario, no modifica despliegue de Astro',()=>{
    const config=JSON.parse(read('wrangler.monitor.jsonc'));
    expect(config.name).toBe('dmonkeysport-price-monitor');
    expect(config.triggers.crons).toEqual(['0 9 * * *']);
    expect(config.workers_dev).toBe(false);
    expect(config.d1_databases[0].binding).toBe('CATALOG_DB');
    expect(JSON.parse(read('package.json')).scripts['worker:deploy']).toContain('dist/server/wrangler.json');
  });
  it('la migración es no destructiva y el monitor no escribe precios públicos',()=>{
    const sql=read('migrations/0002_price_monitor.sql');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS price_monitor_checks');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS price_monitor_runs');
    expect(sql).not.toMatch(/DROP TABLE|DELETE FROM catalog_products/i);
    const monitor=read('src/lib/price-monitor.js');
    expect(monitor).not.toMatch(/UPDATE catalog_products|saveRecord/);
    expect(monitor).toContain('price_monitor_checks');
  });
  it('panel muestra alertas, pendientes e historial sin ejecutar cambios por su cuenta',()=>{
    const html=read('public/admin/index.html');
    expect(html).toContain('id="price-monitor-panel"');
    expect(html).toContain('id="price-monitor-filter"');
    expect(html).toContain("api('/api/admin/price-monitor'");
    expect(html).toContain('Historial monitor');
    expect(html).toContain('Revisión manual');
  });
});
