import { describe, expect, it } from 'vitest';

const BASE_URL = 'http://localhost:3000';

describe('Progressive Web App (PWA) Touchpoint Compliance', () => {
  it('GET /manifest.webmanifest serves valid PWA specification', async () => {
    const res = await fetch(`${BASE_URL}/manifest.webmanifest`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe('CashPulse Studio Co-Pilot');
    expect(data.short_name).toBe('CashPulse');
    expect(data.display).toBe('standalone');
    expect(data.start_url).toBe('/app');
    expect(data.icons.length).toBeGreaterThanOrEqual(2);
    expect(data.icons.some((i: any) => i.purpose === 'maskable')).toBe(true);
  });

  it('GET /manifest.json serves alias manifest successfully', async () => {
    const res = await fetch(`${BASE_URL}/manifest.json`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.display).toBe('standalone');
  });

  it('GET /sw.js serves Service Worker with cache & offline capabilities', async () => {
    const res = await fetch(`${BASE_URL}/sw.js`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('cashpulse-v1.0.0');
    expect(text).toContain('/offline.html');
  });

  it('GET /offline.html serves branded offline fallback page', async () => {
    const res = await fetch(`${BASE_URL}/offline.html`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('You are currently offline');
    expect(text).toContain('CashPulse');
  });

  it('GET /icon-192.png and /icon-512.png serve home screen touch icons', async () => {
    const [res192, res512] = await Promise.all([
      fetch(`${BASE_URL}/icon-192.png`),
      fetch(`${BASE_URL}/icon-512.png`),
    ]);
    expect(res192.status).toBe(200);
    expect(res192.headers.get('content-type')).toContain('image/png');
    expect(res512.status).toBe(200);
    expect(res512.headers.get('content-type')).toContain('image/png');
  });

  it('GET /app page includes viewport-fit=cover and PWA metadata', async () => {
    const res = await fetch(`${BASE_URL}/app`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('manifest');
    expect(html).toContain('theme-color');
  });
});
