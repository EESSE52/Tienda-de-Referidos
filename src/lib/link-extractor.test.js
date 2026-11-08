import { describe, expect, it } from 'vitest';
import { extractAffiliateProductData } from './link-extractor.js';

describe('extractAffiliateProductData', () => {
  it('extracts title, price, brand, seller and image from product metadata', () => {
    const html = `
      <html>
        <head>
          <meta property="og:title" content="Proteína Whey Isolate 900 g" />
          <meta property="og:brand" content="Nutribox" />
          <meta property="og:image" content="https://example.com/product.jpg" />
          <meta property="product:price:amount" content="32990" />
          <meta name="author" content="Nutribox Shop" />
          <title>Proteína Whey Isolate 900 g</title>
        </head>
      </html>
    `;

    const result = extractAffiliateProductData(html, 'https://example.com/producto');

    expect(result.name).toBe('Proteína Whey Isolate 900 g');
    expect(result.brand).toBe('Nutribox');
    expect(result.seller).toBe('Nutribox Shop');
    expect(result.price).toBe(32990);
    expect(result.image).toBe('https://example.com/product.jpg');
  });

  it('extracts metadata when content appears before name or property', () => {
    const html = `
      <html>
        <head>
          <meta content="Proteína Whey" property="og:title" />
          <meta content="Nutribox" property="og:brand" />
          <meta content="https://example.com/product.jpg" property="og:image" />
          <meta content="32990" property="product:price:amount" />
          <meta content="Nutribox Shop" name="author" />
        </head>
      </html>
    `;

    const result = extractAffiliateProductData(html, 'https://example.com/producto');

    expect(result.name).toBe('Proteína Whey');
    expect(result.brand).toBe('Nutribox');
    expect(result.seller).toBe('Nutribox Shop');
    expect(result.price).toBe(32990);
    expect(result.image).toBe('https://example.com/product.jpg');
  });
});
