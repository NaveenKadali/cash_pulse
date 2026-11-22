import { describe, expect, it } from 'vitest';

const BASE_URL = 'http://localhost:3000/api';

describe('New Enterprise Registration & Verification Flow', () => {
  const uniqueEmail = `studio.test.${Date.now()}@example.com`;
  let verificationToken = '';

  it('POST /auth/register rejects missing studio name or invalid phone', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Photographer',
        email: uniqueEmail,
        password: 'Password@123',
        phone: '12345', // Invalid
        studioName: '', // Missing
      }),
    });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.code).toBe('VALIDATION_FAILED');
  });

  it('POST /auth/register provisions user & studio with compulsory email verification token', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Aarav Photography',
        email: uniqueEmail,
        password: 'Password@123',
        phone: '+919876543210',
        studioName: 'Aarav Pixels Mumbai',
      }),
    });
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.user.emailVerified).toBe(false);
    expect(data.emailVerificationPreview).toBeDefined();

    // Extract token from preview link
    const link = data.emailVerificationPreview.verificationLink;
    verificationToken = new URL(link).searchParams.get('token')!;
    expect(verificationToken).toBeTruthy();
  });

  it('POST /auth/password/login authenticates via Email and Password', async () => {
    const res = await fetch(`${BASE_URL}/auth/password/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'Password@123',
      }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.user.email).toBe(uniqueEmail.toLowerCase());
  });

  it('GET /auth/email/verify activates compulsory email verification', async () => {
    const res = await fetch(`${BASE_URL}/auth/email/verify?token=${verificationToken}`);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.emailVerified).toBe(true);
  });
});
