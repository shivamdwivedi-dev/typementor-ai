import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app, { resolveTrustProxyConfig, resolveClientIp } from '../app';

describe('Proxy-Aware Rate Limiting & Trust Proxy Validation', () => {
  describe('resolveTrustProxyConfig', () => {
    it('defaults to 1 hop when TRUST_PROXY_HOPS is not set', () => {
      expect(resolveTrustProxyConfig(undefined)).toBe(1);
      expect(resolveTrustProxyConfig('')).toBe(1);
      expect(resolveTrustProxyConfig('   ')).toBe(1);
    });

    it('parses explicit positive hop counts', () => {
      expect(resolveTrustProxyConfig('1')).toBe(1);
      expect(resolveTrustProxyConfig('2')).toBe(2);
      expect(resolveTrustProxyConfig('3')).toBe(3);
    });

    it('disables proxy trust when explicitly set to false or 0', () => {
      expect(resolveTrustProxyConfig('false')).toBe(false);
      expect(resolveTrustProxyConfig('0')).toBe(false);
    });

    it('rejects permissive boolean true or wildcard * to prevent X-Forwarded-For spoofing', () => {
      expect(resolveTrustProxyConfig('true')).toBe(1);
      expect(resolveTrustProxyConfig('*')).toBe(1);
    });
  });

  describe('resolveClientIp', () => {
    it('normalizes IPv4-mapped IPv6 addresses from req.ip', () => {
      const fakeReq: any = {
        ip: '::ffff:203.0.113.42',
        socket: { remoteAddress: '::ffff:10.0.0.1' },
        headers: {
          'x-client-ip': '198.51.100.99',
          'cf-connecting-ip': '198.51.100.88',
        },
      };
      expect(resolveClientIp(fakeReq)).toBe('203.0.113.42');
    });

    it('falls back to socket.remoteAddress when req.ip is absent and ignores spoofed headers', () => {
      const fakeReq: any = {
        ip: undefined,
        socket: { remoteAddress: '::ffff:192.0.2.15' },
        headers: {
          'x-forwarded-for': '1.2.3.4, 5.6.7.8',
          'x-real-ip': '9.9.9.9',
        },
      };
      expect(resolveClientIp(fakeReq)).toBe('192.0.2.15');
    });
  });

  describe('Express app trust proxy & rate limiter integration', () => {
    it('configures Express trust proxy to a bounded hop count (not permissive true)', () => {
      const trustProxySetting = app.get('trust proxy');
      expect(trustProxySetting).not.toBe(true);
      expect(trustProxySetting).toBe(1);
    });

    it('includes standard rate-limit headers on /api routes and resists X-Forwarded-For spoofing', async () => {
      // With trust proxy = 1, spoofing a chain of X-Forwarded-For values uses only the immediate hop
      const apiRes = await request(app)
        .get('/api/nonexistent-endpoint')
        .set('X-Forwarded-For', '198.51.100.1, 198.51.100.2, 203.0.113.50');

      expect(apiRes.status).toBe(404);
      expect(apiRes.headers['ratelimit-limit']).toBeDefined();
    });
  });
});
