# Critical Security Fixes Required

**Status:** URGENT - Must be completed before production deployment

**Created:** January 2025

---

## Overview

This document outlines critical security vulnerabilities that must be fixed immediately. These issues were discovered during the codebase audit and pose significant risks to the application and user data.

**Current Security Score:** 25/100
**Target Security Score:** 85/100

---

## Critical Issues (Fix Immediately)

### 1. Exposed API Keys in Git History

**Severity:** CRITICAL
**Risk:** Unauthorized database access, data breach

**Problem:**
- `.env` and `.env.backup` files were committed to git
- Supabase URL, ANON_KEY, and SERVICE_ROLE_KEY are exposed
- Anyone with access to git history can see these keys
- Service role key provides admin-level database access

**Files Affected:**
- `.env`
- `.env.backup` (now deleted)
- Git commit history

**Fix Steps:**

#### Step 1: Rotate Supabase Keys
```bash
# 1. Go to Supabase Dashboard
# https://app.supabase.com/project/gouypyuysizoqfubxngq/settings/api

# 2. Navigate to Settings → API

# 3. Click "Reset" on:
#    - anon key (public)
#    - service_role key (private)

# 4. Copy new keys to .env file
```

#### Step 2: Remove .env from Git History
```bash
# Option A: Use BFG Repo-Cleaner (Recommended)
# Download from: https://rtyley.github.io/bfg-repo-cleaner/

# Remove .env from all history
java -jar bfg.jar --delete-files .env
java -jar bfg.jar --delete-files .env.backup

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (WARNING: Coordinate with team first)
git push --force

# Option B: Use git filter-branch
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env .env.backup" \
  --prune-empty --tag-name-filter cat -- --all

git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force
```

#### Step 3: Update .gitignore (Already Configured)
```
# .gitignore already contains:
.env
.env.backup
.env.local
.env.*.local
```

#### Step 4: Update Environment Variables Everywhere
```bash
# Local development
# Update .env with new keys

# Production deployment (if applicable)
# Update environment variables in:
# - Vercel/Netlify dashboard
# - Railway/Render settings
# - Docker secrets
# - CI/CD pipeline
```

**Verification:**
```bash
# Check git history
git log --all --full-history -- .env

# Should return nothing after cleanup
```

---

### 2. SQL Injection Vulnerability

**Severity:** CRITICAL
**Risk:** Database compromise, data theft, data manipulation

**Problem:**
String concatenation is used to build SQL queries in `supabaseQueryService.js`, allowing potential SQL injection attacks.

**Location:** `src/services/supabaseQueryService.js`

**Vulnerable Code:**
```javascript
// Line ~200+ (exact line may vary)
buildSearchConditions(searchTerms, fields) {
  searchTerms.forEach(term => {
    const fieldConditions = fields.map(field =>
      `${field} ILIKE '%${term}%'`  // DANGEROUS: Direct string interpolation
    );
  });
}
```

**Fix:**

The good news is that SupabaseQueryService uses the Supabase query builder API, which handles parameter escaping automatically. The vulnerable code exists but may not be actively used in the current query paths.

**Immediate Action:**
1. Audit all query building in `supabaseQueryService.js`
2. Ensure ALL queries use Supabase's query builder methods
3. Remove or fix any string concatenation patterns

**Safe Pattern:**
```javascript
// SAFE: Use Supabase query builder
await supabase
  .from('procedures')
  .select('*')
  .ilike('name', `%${userInput}%`);  // Supabase handles escaping

// UNSAFE: Direct string concatenation
const sql = `SELECT * FROM procedures WHERE name ILIKE '%${userInput}%'`;
```

**Verification:**
```bash
# Search for dangerous patterns
grep -r "ILIKE '%\${" src/services/
grep -r '`.*WHERE.*\${' src/services/
```

---

### 3. Insecure Authentication Storage

**Severity:** CRITICAL
**Risk:** Session hijacking, XSS attacks, unauthorized access

**Problem:**
Admin credentials and session data are stored in `localStorage`, which is accessible to any JavaScript code (including malicious scripts).

**Location:** `src/contexts/AuthContext.js` (lines 133-138)

**Vulnerable Code:**
```javascript
localStorage.setItem('admin_authenticated', 'true');
localStorage.setItem('admin_user', JSON.stringify({
  ...adminData,
  auth_user: authData.user
}));
```

**Fix:**

**Option A: Use Supabase Session Management (Recommended)**
```javascript
// Supabase already handles sessions securely
// Just check session state, don't store manually

const { isAuthenticated, adminUser, login, logout } = useAuth();

const login = async (email, password) => {
  // 1. Supabase handles session (httpOnly cookies)
  const { data: authData, error: authError } =
    await supabase.auth.signInWithPassword({ email, password });

  if (authError) return { success: false, error: authError.message };

  // 2. Check if user is admin
  const { data: adminData } = await supabase
    .from('admins')
    .select('*')
    .eq('user_id', authData.user.id)
    .single();

  if (!adminData) {
    await supabase.auth.signOut();
    return { success: false, error: 'Not authorized as admin' };
  }

  // 3. NO LOCALSTORAGE - Supabase session is enough
  setIsAuthenticated(true);
  setAdminUser(adminData);

  return { success: true };
};

// Check session on app load
useEffect(() => {
  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      // Verify admin status
      const { data: adminData } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (adminData) {
        setIsAuthenticated(true);
        setAdminUser(adminData);
      }
    }
  };
  checkSession();
}, []);
```

**Option B: Use httpOnly Cookies (More Complex)**
Requires backend server to set cookies. Not recommended for Supabase-only architecture.

---

### 4. No Input Validation

**Severity:** HIGH
**Risk:** XSS attacks, data corruption, injection attacks

**Problem:**
User inputs are not validated or sanitized before being processed or stored in the database.

**Locations:**
- `src/components/DatabaseChatbot.js` - Chat input
- `src/components/AdminPanel/AdminPanelConditions.js` - Form inputs
- `src/components/FeedbackWidget.js` - Feedback form
- All admin panel forms

**Fix:**

**Step 1: Install Validation Library**
```bash
npm install yup
```

**Step 2: Create Validation Schemas**
```javascript
// src/utils/validationSchemas.js
import * as Yup from 'yup';

export const conditionSchema = Yup.object().shape({
  name: Yup.string()
    .required('Name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be less than 100 characters')
    .matches(/^[a-zA-Z0-9\s\-]+$/, 'Name can only contain letters, numbers, spaces, and hyphens'),

  category: Yup.string()
    .required('Category is required')
    .oneOf(['Surgical', 'Intra-Oral'], 'Invalid category'),

  pitch_points: Yup.string()
    .max(1000, 'Pitch points must be less than 1000 characters')
});

export const chatInputSchema = Yup.string()
  .required('Message cannot be empty')
  .max(500, 'Message must be less than 500 characters')
  .test('no-sql-keywords', 'Invalid input detected', (value) => {
    const sqlKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER', '--', '/*'];
    return !sqlKeywords.some(keyword =>
      value.toUpperCase().includes(keyword)
    );
  });

export const loginSchema = Yup.object().shape({
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),

  password: Yup.string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
});
```

**Step 3: Apply Validation**
```javascript
// In DatabaseChatbot.js
import { chatInputSchema } from '../utils/validationSchemas';

const handleSendMessage = async () => {
  try {
    // Validate input
    await chatInputSchema.validate(currentMessage);

    // Process message
    const result = await queryServiceRef.current.processQuestion(currentMessage);
    // ...
  } catch (error) {
    if (error.name === 'ValidationError') {
      // Show validation error to user
      setError(error.message);
      return;
    }
    // Handle other errors
  }
};
```

**Step 4: Sanitize HTML Output**
```bash
npm install dompurify
```

```javascript
import DOMPurify from 'dompurify';

// When displaying user-generated content
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userContent)
}} />
```

---

### 5. Service Role Key in Frontend

**Severity:** CRITICAL
**Risk:** Complete database compromise

**Problem:**
`SUPABASE_SERVICE_ROLE_KEY` should NEVER be in frontend code or `.env` files that are bundled with the app.

**Location:** `.env` line 12

**Current State:**
The service role key is in `.env` but appears to only be used by the `create-any-admin.js` script, which is a Node.js backend script (not bundled with frontend).

**Fix:**

**Step 1: Verify Key is Not Used in Frontend**
```bash
# Search frontend code
grep -r "SERVICE_ROLE_KEY" src/

# Should return no matches
```

**Step 2: Move to Separate File**
```bash
# Create backend-only env file
touch .env.server

# Add to .env.server
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Update .gitignore
echo ".env.server" >> .gitignore
```

**Step 3: Update create-any-admin.js**
```javascript
// create-any-admin.js
require('dotenv').config({ path: '.env.server' });
// or
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  prompt('Enter service role key:');
```

**Step 4: Remove from .env**
```bash
# Edit .env and remove:
# SUPABASE_SERVICE_ROLE_KEY=...
```

**Verification:**
```bash
# Build app and check bundle
npm run build
grep -r "SERVICE_ROLE_KEY" build/

# Should return no matches
```

---

## High Priority Issues (Fix Within 1 Week)

### 6. No Rate Limiting

**Severity:** HIGH
**Risk:** DoS attacks, brute force attacks, resource exhaustion

**Problem:**
No rate limiting on:
- Login attempts
- Database queries
- API calls
- Feedback submissions

**Fix:**

**Step 1: Install Rate Limiting Library**
```bash
npm install rate-limiter-flexible
```

**Step 2: Implement Client-Side Rate Limiting**
```javascript
// src/utils/rateLimiter.js
class RateLimiter {
  constructor(maxAttempts, windowMs) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  tryRequest(key) {
    const now = Date.now();
    const userAttempts = this.attempts.get(key) || [];

    // Remove old attempts outside window
    const recentAttempts = userAttempts.filter(
      timestamp => now - timestamp < this.windowMs
    );

    if (recentAttempts.length >= this.maxAttempts) {
      const oldestAttempt = recentAttempts[0];
      const retryAfter = this.windowMs - (now - oldestAttempt);
      return {
        allowed: false,
        retryAfter: Math.ceil(retryAfter / 1000)
      };
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return { allowed: true };
  }
}

// Usage
export const loginRateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute
export const queryRateLimiter = new RateLimiter(20, 60000); // 20 queries per minute
```

**Step 3: Apply to Login**
```javascript
// AuthContext.js
import { loginRateLimiter } from '../utils/rateLimiter';

const login = async (email, password) => {
  const { allowed, retryAfter } = loginRateLimiter.tryRequest(email);

  if (!allowed) {
    return {
      success: false,
      error: `Too many login attempts. Try again in ${retryAfter} seconds.`
    };
  }

  // Continue with login...
};
```

**Step 4: Implement Supabase RLS Rate Limiting**
```sql
-- In Supabase, create a rate limiting function
CREATE OR REPLACE FUNCTION check_rate_limit(
  user_identifier TEXT,
  max_requests INTEGER,
  time_window INTERVAL
)
RETURNS BOOLEAN AS $$
DECLARE
  request_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO request_count
  FROM request_logs
  WHERE identifier = user_identifier
    AND created_at > NOW() - time_window;

  IF request_count >= max_requests THEN
    RETURN FALSE;
  END IF;

  INSERT INTO request_logs (identifier, created_at)
  VALUES (user_identifier, NOW());

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

### 7. Missing CSRF Protection

**Severity:** HIGH
**Risk:** Cross-site request forgery attacks

**Problem:**
No CSRF token validation on state-changing operations.

**Fix:**

Supabase Auth already includes CSRF protection via JWT tokens. Ensure all requests include the auth token:

```javascript
// Verify Supabase client is initialized correctly
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
```

---

## Medium Priority Issues (Fix Within 2 Weeks)

### 8. No Error Boundaries

See separate section below.

### 9. Console.log Statements

See separate section below.

### 10. Missing Security Headers

**Fix:** Add security headers in production

```javascript
// For static hosting (Netlify, Vercel)
// Create _headers file or vercel.json

// Netlify _headers
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

---

## Security Checklist

Use this checklist to track progress:

- [ ] Rotate Supabase keys
- [ ] Remove .env from git history
- [ ] Fix SQL injection in supabaseQueryService.js
- [ ] Migrate auth to Supabase session management (remove localStorage)
- [ ] Add input validation (Yup schemas)
- [ ] Add HTML sanitization (DOMPurify)
- [ ] Remove service role key from frontend .env
- [ ] Implement rate limiting
- [ ] Verify CSRF protection
- [ ] Add security headers
- [ ] Run security audit tools
- [ ] Penetration testing

---

## Verification Steps

After implementing fixes:

### 1. Security Audit Tools
```bash
# Install security audit tools
npm install -g snyk
npm audit

# Snyk security scan
snyk test
snyk monitor

# Check for exposed secrets
npm install -g truffleHog
truffleHog filesystem . --json
```

### 2. Manual Testing
- [ ] Attempt SQL injection in chatbot
- [ ] Test XSS in admin panel forms
- [ ] Verify rate limiting works
- [ ] Test session expiration
- [ ] Verify keys are not in bundle

### 3. Third-Party Security Scan
- Use OWASP ZAP or Burp Suite
- Run automated security tests
- Check SSL/TLS configuration
- Verify security headers

---

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [React Security Checklist](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

---

*Document Version: 1.0*
*Last Updated: January 2025*
*Priority: URGENT - Complete within 1 week*
