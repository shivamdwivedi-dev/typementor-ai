# TypeMentor AI — Security Guidelines

This guide details security procedures, policies, and vulnerability reporting.

---

## 1. Core Security Features

- **STAT_LIMITS**: Auth endpoints restrict requests to 5 attempts per 15 minutes to prevent brute-forcing.
- **Sanitizers**: XSS character strippers and SQL Injection command blockers examine incoming JSON requests.
- **STATLESS_AUTH**: User verification uses signed JSON Web Tokens (JWT) verified cryptographically.
- **RESTRICTED_CORS**: Headers reject client domains not configured in the `ALLOWED_ORIGINS` environment setup.

---

## 2. Reporting Vulnerabilities

If you discover a security vulnerability, please do NOT create a public issue. Email details directly to our security team: `security@typementor.dev`. We aim to validate and resolve all reports within 48 hours.
