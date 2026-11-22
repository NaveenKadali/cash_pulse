import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Mandatory LLD UI data-testid verification (LLD §12)', () => {
  const loginSrc = readFileSync(resolve(process.cwd(), 'src/app/login/page.tsx'), 'utf-8');
  const appSrc = readFileSync(resolve(process.cwd(), 'src/app/app/page.tsx'), 'utf-8');
  const clientSrc = readFileSync(resolve(process.cwd(), 'src/app/p/[token]/page.tsx'), 'utf-8');

  it('renders mandatory authentication testids', () => {
    expect(loginSrc).toContain('data-testid="login-phone-button"');
    expect(loginSrc).toContain('data-testid="login-email-button"');
    expect(loginSrc).toContain('data-testid="otp-input"');
  });

  it('renders mandatory studio workspace testids', () => {
    expect(appSrc).toContain('data-testid="liquidity-health-gauge"');
    expect(appSrc).toContain('data-testid="morning-brief-card"');
    expect(appSrc).toContain('data-testid="deficit-warning-badge"');
    expect(appSrc).toContain('data-testid="runway-chart"');
    expect(appSrc).toContain('data-testid="what-if-slider"');
    expect(appSrc).toContain('data-testid="project-row"');
    expect(appSrc).toContain('data-testid="stage-stepper"');
    expect(appSrc).toContain('data-testid="debtor-radar-table"');
    expect(appSrc).toContain('data-testid="record-payment-button"');
  });

  it('renders mandatory client portal testids', () => {
    expect(clientSrc).toContain('data-testid="client-progress-stepper"');
    expect(clientSrc).toContain('data-testid="upi-qr-image"');
    expect(clientSrc).toContain('data-testid="upi-pay-button"');
  });
});
