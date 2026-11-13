import {describe,it,expect,vi} from 'vitest';
import {classifyMercadoLibrePrices,classifyPriceCheck,fetchOfficialPrice,runDailyPriceMonitor} from './price-monitor.js';

const standard=(amount=10000)=>({prices:[{type:'standard',amount,currency_id:'CLP',
  conditions:{context_restrictions:[],start_time:null,end_time:null}}]});
describe('monitor de precios seguro',()=>{
  it('acepta un único precio oficial CLP sin restricciones',()=>{
    expect(classifyMercadoLibrePrices(standard(12345))).toEqual({ok:true,price:12345});
  });
  it('rechaza precios ambiguos o condicionados',()=>{
    const mixed=standard(10000);
    mixed.prices.push({...mixed.prices[0],type:'promotion',amount:8000});
    expect(classifyMercadoLibrePrices(mixed).ok).toBe(false);
    expect(classifyMercadoLibrePrices({prices:[{...mixed.prices[0],conditions:{context_restrictions:['channel_marketplace']}}]}).ok).toBe(false);
  });
  it('alerta cambios desde 2 por ciento, sin confundir cambios pequeños',()=>{
    expect(classifyPriceCheck(10000,9800)).toMatchObject({status:'changed',alert:true,percentage:-2});
    expect(classifyPriceCheck(10000,9900)).toMatchObject({status:'changed',alert:false});
    expect(classifyPriceCheck(10000,10000)).toMatchObject({status:'equal',alert:false});
  });
  it('no trata 403 ni token ausente como precio actual',async()=>{
    expect((await fetchOfficialPrice('MLC123456789','','unused')).ok).toBe(false);
    const fetcher=vi.fn().mockResolvedValue({ok:false,status:403});
    const outcome=await fetchOfficialPrice('MLC123456789','token',fetcher);
    expect(outcome).toMatchObject({ok:false});
    expect(fetcher).toHaveBeenCalledOnce();
  });
  it('registra la variación sin actualizar catalog_products',async()=>{
    const statements=[];
    const db={prepare(sql){
      statements.push(sql);
      return {
        bind(...args){this.args=args;return this;},
        async run(){return {meta:{last_row_id:1}};},
        async all(){
          if(sql.includes('FROM catalog_products'))return {results:[{data:JSON.stringify({
            id:'p1',activo:true,precio:10000,id_publicacion:'MLC123456789'
          })}]};
          return {results:[]};
        },
      };
    }};
    const result=await runDailyPriceMonitor(
      {CATALOG_DB:db,ML_ACCESS_TOKEN:'token'},
      {fetcher:vi.fn().mockResolvedValue({ok:true,json:async()=>standard(9700)}),now:new Date('2026-11-13T09:00:00Z')}
    );
    expect(result).toMatchObject({checked:1,alerted:1,changed:1});
    expect(statements.some(sql=>sql.includes('UPDATE catalog_products'))).toBe(false);
    expect(statements.some(sql=>sql.includes('INSERT INTO price_monitor_checks'))).toBe(true);
  });
});
