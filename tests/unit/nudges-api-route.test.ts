import { describe, expect, it } from 'vitest';
import { POST, GET } from '../../src/app/api/projects/[projectId]/nudges/route';

describe('Project Nudges API Route (POST / GET & WhatsApp Redirection)', () => {
  const dummyParams = Promise.resolve({ projectId: 'proj-verma' });

  it('composes firm tone nudge without error when invoiceRef is omitted (auto-defaults)', async () => {
    const req = new Request('http://localhost:3000/api/projects/proj-verma/nudges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tone: 'firm',
        clientPhone: '9494899378',
      }),
    });

    const res = await POST(req, { params: dummyParams });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.tone).toBe('firm');
    expect(body.draft).toBeDefined();
    expect(body.draft.clientPhone).toBe('919494899378');
    expect(body.draft.whatsappUrl).toContain('https://wa.me/919494899378?text=');
    expect(body.draft.whatsappIntentUrl).toContain('whatsapp://send?phone=919494899378&text=');
    expect(body.draft.messageText).toContain('INV-PROJ-VERMA');
  });

  it('composes formal tone nudge for standard day-7 follow-up', async () => {
    const req = new Request('http://localhost:3000/api/projects/proj-verma/nudges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tone: 'formal',
        clientPhone: '9494899378',
      }),
    });

    const res = await POST(req, { params: dummyParams });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.tone).toBe('formal');
    expect(body.draft.whatsappUrl).toContain('https://wa.me/919494899378?text=');
    expect(body.draft.messageText).toContain('Verma Family');
  });

  it('composes friendly sneak-peek tone nudge', async () => {
    const req = new Request('http://localhost:3000/api/projects/proj-verma/nudges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tone: 'friendly',
        clientPhone: '9494899378',
      }),
    });

    const res = await POST(req, { params: dummyParams });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.tone).toBe('friendly');
    expect(body.draft.whatsappUrl).toContain('https://wa.me/919494899378?text=');
    expect(body.draft.messageText).toContain('https://cashpulse.studio/p/demo-verma-link');
  });

  it('maps "final" tone to firm template gracefully', async () => {
    const req = new Request('http://localhost:3000/api/projects/proj-verma/nudges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tone: 'final',
        clientPhone: '9494899378',
      }),
    });

    const res = await POST(req, { params: dummyParams });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.tone).toBe('firm');
    expect(body.draft.whatsappUrl).toContain('https://wa.me/919494899378?text=');
  });

  it('redirects via GET with 307 to WhatsApp wa.me URL when redirect=true', async () => {
    const req = new Request('http://localhost:3000/api/projects/proj-verma/nudges?redirect=true&phone=9494899378&tone=formal', {
      method: 'GET',
    });

    const res = await GET(req, { params: dummyParams });
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('https://wa.me/919494899378?text=');
  });

  it('redirects via GET with 307 to whatsapp:// intent URL when redirect=true and intent=true', async () => {
    const req = new Request('http://localhost:3000/api/projects/proj-verma/nudges?redirect=true&intent=true&phone=9494899378&tone=formal', {
      method: 'GET',
    });

    const res = await GET(req, { params: dummyParams });
    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('whatsapp://send?phone=919494899378&text=');
  });
});
