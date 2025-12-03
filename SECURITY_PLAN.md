# Security Plan: PRISM Clinical Chart

**Assessment Date:** December 2, 2025
**Application:** PRISM Clinical Chart
**Deployment Target:** Render
**Overall Risk Level:** MODERATE-HIGH

---

## Executive Summary

This security plan documents vulnerabilities identified in the PRISM Clinical Chart application and provides a prioritized remediation roadmap. The application has several critical security gaps that must be addressed before production deployment.

---

## Table of Contents

1. [Critical Vulnerabilities](#1-critical-vulnerabilities)
2. [High Priority Vulnerabilities](#2-high-priority-vulnerabilities)
3. [Medium Priority Vulnerabilities](#3-medium-priority-vulnerabilities)
4. [Low Priority Vulnerabilities](#4-low-priority-vulnerabilities)
5. [Render Deployment Security](#5-render-deployment-security)
6. [Implementation Roadmap](#6-implementation-roadmap)
7. [Security Checklist](#7-security-checklist)

---

## 1. Critical Vulnerabilities

### 1.1 OpenAI API Key Exposed in Browser

**Location:** `src/services/ai/agenticSearchService.js:23-26`

**Current Code:**
```javascript
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});
```

**Risk Level:** CRITICAL
**Impact:** Financial loss, API abuse, service disruption

**Description:**
The OpenAI API key is embedded in the client-side JavaScript bundle. Anyone can extract this key using browser DevTools and run unlimited API charges against your account.

**Remediation:**
1. Create a backend API proxy (Render serverless function or Express server)
2. Move OpenAI calls to the backend
3. Frontend calls the backend proxy instead of OpenAI directly
4. Remove `REACT_APP_OPENAI_API_KEY` from frontend environment

**Example Backend Proxy (Node.js):**
```javascript
// api/chat.js (Render serverless function)
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Server-side only
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate auth token from request
  const authToken = req.headers.authorization;
  if (!validateSupabaseToken(authToken)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Rate limit check
  // ... implementation

  const { messages } = req.body;
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
  });

  return res.json(response);
}
```

---

### 1.2 Row Level Security (RLS) Disabled

**Location:** Supabase database configuration

**Risk Level:** CRITICAL
**Impact:** Unauthorized data access, data manipulation, data breach

**Description:**
RLS is disabled on the `procedures` table (and potentially others). Any user with the anon key can read/write all data.

**Remediation:**

1. **Enable RLS on all tables:**
```sql
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_phase_products ENABLE ROW LEVEL SECURITY;
```

2. **Create appropriate policies:**
```sql
-- Public read access for procedures (if intended)
CREATE POLICY "Public read access" ON procedures
  FOR SELECT USING (true);

-- Admin-only write access
CREATE POLICY "Admin write access" ON procedures
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Users can only read their own profile
CREATE POLICY "Users read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Admin can read all profiles
CREATE POLICY "Admin read all profiles" ON user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );
```

---

### 1.3 Session Storage in localStorage

**Location:** `src/supabaseClient.js:21-22`

**Risk Level:** CRITICAL
**Impact:** Session hijacking via XSS attacks

**Description:**
Auth tokens stored in localStorage are accessible to any JavaScript running on the page, making them vulnerable to XSS attacks.

**Remediation Options:**

**Option A: Server-Side Auth (Recommended)**
- Implement Supabase Auth with server-side session management
- Use httpOnly cookies for token storage
- Requires backend infrastructure

**Option B: Enhanced Client-Side Security (Interim)**
- Implement strict CSP to prevent XSS
- Add token rotation on suspicious activity
- Reduce token lifetime
- Monitor for unusual session patterns

---

### 1.4 Client-Side Only Admin Authorization

**Location:** `src/contexts/AuthContext.js:238-242`

**Risk Level:** CRITICAL
**Impact:** Privilege escalation, unauthorized admin actions

**Description:**
Admin role verification happens only in frontend code. Without server-side enforcement, attackers can bypass checks by calling Supabase APIs directly.

**Remediation:**
1. Implement RLS policies that check admin role (see 1.2)
2. Use Supabase Edge Functions for sensitive operations
3. Never trust client-side role checks alone

---

## 2. High Priority Vulnerabilities

### 2.1 Dependency Vulnerabilities

**Finding:** 12 vulnerabilities (4 moderate, 8 high)

| Package | Severity | CVE/Advisory |
|---------|----------|--------------|
| node-forge | HIGH | GHSA-554w-wpv2-vw27 |
| nth-check | HIGH | GHSA-rp65-9cf3-cjxr |
| webpack-dev-server | MODERATE | GHSA-9jgg-88mc-972h |
| postcss | MODERATE | GHSA-7fh5-64p2-3v2j |
| glob | HIGH | GHSA-5j98-mcp5-4vw2 |
| js-yaml | MODERATE | GHSA-mh29-5h37-fv8m |

**Remediation:**
```bash
# Apply non-breaking fixes
npm audit fix

# Review and apply breaking changes if safe
npm audit fix --force

# Or manually update specific packages
npm update node-forge glob js-yaml
```

---

### 2.2 SQL Injection Potential in Agentic Search

**Location:** `src/services/ai/agenticSearchService.js:147, 164`

**Risk Level:** HIGH
**Impact:** Data breach, data manipulation

**Description:**
Search terms from GPT-4o function arguments are passed to Supabase queries. Sophisticated prompt injection could craft malicious inputs.

**Current Code:**
```javascript
.ilike('name', `%${search_term}%`)
```

**Remediation:**
```javascript
// Add input sanitization
function sanitizeSearchTerm(term) {
  if (!term || typeof term !== 'string') return '';

  // Remove SQL special characters
  const sanitized = term
    .replace(/[%_\\'";\-\-]/g, '')
    .substring(0, 100); // Limit length

  return sanitized;
}

// Use in queries
.ilike('name', `%${sanitizeSearchTerm(search_term)}%`)
```

---

### 2.3 Weak Input Validation (Blocklist-Based)

**Location:** `src/utils/validationSchemas.js:22-37`

**Risk Level:** HIGH
**Impact:** Injection attacks, validation bypass

**Description:**
Blocklist validation is easily bypassed through encoding, case variations, or obfuscation.

**Remediation - Replace with Allowlist:**
```javascript
// Instead of blocking dangerous patterns, allow only safe characters
export const chatInputSchema = Yup.string()
  .required('Message cannot be empty')
  .trim()
  .min(1, 'Message cannot be empty')
  .max(500, 'Message must be less than 500 characters')
  .matches(
    /^[a-zA-Z0-9\s.,?!'"()-]+$/,
    'Message contains invalid characters'
  );
```

---

## 3. Medium Priority Vulnerabilities

### 3.1 Missing Security Headers

**Risk Level:** MEDIUM
**Impact:** Clickjacking, MIME sniffing attacks, XSS

**Remediation - Add to Render Configuration:**

Create `render.yaml` or configure in Render dashboard:
```yaml
services:
  - type: web
    name: prism-clinical-chart
    headers:
      - path: /*
        name: X-Frame-Options
        value: DENY
      - path: /*
        name: X-Content-Type-Options
        value: nosniff
      - path: /*
        name: Strict-Transport-Security
        value: max-age=31536000; includeSubDomains
      - path: /*
        name: Content-Security-Policy
        value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.openai.com"
      - path: /*
        name: Referrer-Policy
        value: strict-origin-when-cross-origin
      - path: /*
        name: Permissions-Policy
        value: camera=(), microphone=(), geolocation=()
```

---

### 3.2 Excessive Error Information Leakage

**Risk Level:** MEDIUM
**Impact:** Information disclosure aiding attackers

**Locations:** Multiple `console.error()` calls throughout codebase

**Remediation:**

1. **Remove console statements in production:**
```javascript
// babel.config.js or webpack config
plugins: [
  process.env.NODE_ENV === 'production' &&
    ['transform-remove-console', { exclude: ['error', 'warn'] }]
].filter(Boolean)
```

2. **Implement structured error logging:**
```javascript
// src/utils/errorHandler.js
export function handleError(error, context = {}) {
  // Log to monitoring service (e.g., Sentry)
  if (process.env.NODE_ENV === 'production') {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error(error);
  }

  // Return safe error message for users
  return {
    message: 'An unexpected error occurred. Please try again.',
    code: 'INTERNAL_ERROR'
  };
}
```

---

### 3.3 No Rate Limiting

**Risk Level:** MEDIUM
**Impact:** Brute force attacks, API abuse, DoS, cost overruns

**Remediation Options:**

**Option A: Supabase Rate Limiting**
- Configure in Supabase dashboard under API settings

**Option B: Application-Level Throttling**
```javascript
// Simple in-memory rate limiter
const rateLimiter = new Map();

export function checkRateLimit(userId, action, limit = 10, windowMs = 60000) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  const requests = rateLimiter.get(key) || [];
  const recentRequests = requests.filter(time => time > windowStart);

  if (recentRequests.length >= limit) {
    return false; // Rate limited
  }

  recentRequests.push(now);
  rateLimiter.set(key, recentRequests);
  return true;
}
```

---

### 3.4 Password Requirements Too Weak

**Location:** `src/components/SocialLoginModal.js:82-84`

**Risk Level:** MEDIUM
**Impact:** Weak account security

**Remediation:**
```javascript
// Update password validation
if (formData.password.length < 8) {
  throw new Error('Password must be at least 8 characters');
}

// Add complexity check
const hasUppercase = /[A-Z]/.test(formData.password);
const hasLowercase = /[a-z]/.test(formData.password);
const hasNumber = /[0-9]/.test(formData.password);

if (!hasUppercase || !hasLowercase || !hasNumber) {
  throw new Error('Password must contain uppercase, lowercase, and numbers');
}
```

---

## 4. Low Priority Vulnerabilities

### 4.1 Session Fixation Risk

**Description:** Session not regenerated after login

**Remediation:** Supabase handles this automatically, but verify tokens are refreshed on auth state changes.

### 4.2 CSRF Protection for OAuth

**Description:** OAuth state parameter may not be properly validated

**Remediation:** Verify Supabase OAuth implementation includes state parameter validation (default behavior).

### 4.3 .env Files in Project

**Description:** `.env` and `.env.local` present in project directory

**Remediation:**
- Verify `.gitignore` includes both files (confirmed)
- Add pre-commit hook to prevent accidental commits
- Rotate any keys that may have been exposed

---

## 5. Render Deployment Security

### 5.1 Environment Variables Configuration

**Required Variables (set in Render dashboard):**
```
REACT_APP_SUPABASE_URL=https://xxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
# REMOVE from frontend after backend proxy:
# REACT_APP_OPENAI_API_KEY=sk-...
```

**Backend Service Variables (if implemented):**
```
OPENAI_API_KEY=sk-...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 5.2 Build Configuration

**Current (Good):**
```json
"build:prod": "NODE_ENV=production GENERATE_SOURCEMAP=false NODE_OPTIONS='--max_old_space_size=4096' react-scripts build"
```

- `GENERATE_SOURCEMAP=false` prevents source code exposure

### 5.3 Recommended Render Settings

1. **Force HTTPS:** Enable in Render dashboard
2. **Health Checks:** Configure endpoint monitoring
3. **Auto-Deploy:** Disable for production, use manual deploys
4. **IP Allowlisting:** Consider for admin endpoints if available

---

## 6. Implementation Roadmap

### Phase 1: Critical (Week 1)
| Task | Effort | Owner |
|------|--------|-------|
| Create backend proxy for OpenAI | 4-8 hrs | Dev |
| Enable RLS on all tables | 2-4 hrs | Dev |
| Write RLS policies for procedures | 2-4 hrs | Dev |
| Write RLS policies for user_profiles | 2-4 hrs | Dev |

### Phase 2: High Priority (Week 2)
| Task | Effort | Owner |
|------|--------|-------|
| Run npm audit fix | 1 hr | Dev |
| Add input sanitization to search | 2 hrs | Dev |
| Replace blocklist validation with allowlist | 2 hrs | Dev |
| Configure security headers on Render | 1 hr | Dev |

### Phase 3: Medium Priority (Week 3)
| Task | Effort | Owner |
|------|--------|-------|
| Remove console.log in production | 2 hrs | Dev |
| Implement error logging (Sentry) | 4 hrs | Dev |
| Add rate limiting | 4 hrs | Dev |
| Strengthen password requirements | 1 hr | Dev |

### Phase 4: Hardening (Week 4)
| Task | Effort | Owner |
|------|--------|-------|
| Security testing / penetration test | 8 hrs | Security |
| Documentation update | 2 hrs | Dev |
| Incident response plan | 4 hrs | Team |

---

## 7. Security Checklist

### Pre-Production Checklist

| Item | Status | Priority | Notes |
|------|--------|----------|-------|
| API keys server-side only | ⬜ TODO | CRITICAL | Create backend proxy |
| RLS enabled on all tables | ⬜ TODO | CRITICAL | See SQL scripts above |
| RLS policies configured | ⬜ TODO | CRITICAL | Admin/user separation |
| httpOnly cookie auth | ⬜ TODO | HIGH | Requires backend |
| Dependencies updated | ⬜ TODO | HIGH | npm audit fix |
| Input validation (allowlist) | ⬜ TODO | HIGH | Replace blocklist |
| Security headers configured | ⬜ TODO | MEDIUM | Render config |
| Rate limiting implemented | ⬜ TODO | MEDIUM | Per-user limits |
| Error logging (no console) | ⬜ TODO | MEDIUM | Sentry integration |
| Password policy updated | ⬜ TODO | MEDIUM | 8+ chars, complexity |
| HTTPS forced | ⬜ VERIFY | MEDIUM | Render setting |
| Source maps disabled | ✅ DONE | LOW | Build config |
| .env files gitignored | ✅ DONE | LOW | .gitignore |

### Ongoing Security Tasks

- [ ] Weekly dependency vulnerability scans
- [ ] Monthly access log reviews
- [ ] Quarterly penetration testing
- [ ] Annual security audit

---

## Appendix A: SQL Scripts for RLS

```sql
-- Run these in Supabase SQL Editor

-- 1. Enable RLS on all tables
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE procedure_phase_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_advantage_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitive_advantage_active_ingredients ENABLE ROW LEVEL SECURITY;

-- 2. Public read access for clinical data
CREATE POLICY "Public read procedures" ON procedures FOR SELECT USING (true);
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read product_details" ON product_details FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read phases" ON phases FOR SELECT USING (true);

-- 3. Admin-only write access
CREATE POLICY "Admin insert procedures" ON procedures FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admin update procedures" ON procedures FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admin delete procedures" ON procedures FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Repeat for other admin-managed tables...

-- 4. User profile policies
CREATE POLICY "Users read own profile" ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin read all profiles" ON user_profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admin update profiles" ON user_profiles FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  ));
```

---

## Appendix B: Contact & Resources

**Security Contact:** Austin Copps (coppsaustin@gmail.com)

**Resources:**
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Render Security Headers](https://render.com/docs/headers)

---

*Document Version: 1.0*
*Last Updated: December 2, 2025*
