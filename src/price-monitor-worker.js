import { runDailyPriceMonitor } from './lib/price-monitor.js';

// Worker independiente del sitio Astro. No expone un endpoint público de ejecución.
export default {
  async fetch() {
    return new Response('Not found', {status:404});
  },
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(runDailyPriceMonitor(env)
      .then(result=>console.log('DMonkeySport monitor:',JSON.stringify(result)))
      .catch(error=>console.error('DMonkeySport monitor falló:',error)));
  },
};
