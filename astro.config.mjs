import { defineConfig } from 'astro/config';

// Salida 100% estática (sin adaptadores de servidor), apta para Cloudflare Pages.
// SITE_URL se define como variable de entorno; si falta, se usa el valor por defecto.
export default defineConfig({
  output: 'static',
  site: process.env.SITE_URL || 'https://dmonkesport.pages.dev',
});
