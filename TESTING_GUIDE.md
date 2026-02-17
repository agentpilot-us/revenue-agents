# Security Features Testing Guide

## Database Migration Status

✅ **Database migration completed successfully!**
- All new tables created: `LandingPageVisitor`, `LandingPageMagicLink`, `LandingPageSession`, `SecurityAuditLog`
- Prisma Client generated with new models

## Manual Testing Steps

### 1. Test Domain Matching Logic

Create a test campaign with a company that has a domain set (e.g., `company.com`), then:

1. **Access landing page**: Navigate to `/go/[campaignId]`
2. **Should redirect to auth**: Should redirect to `/go/[campaignId]/auth`
3. **Enter matching email**: Enter `user@company.com` → Should send magic link
4. **Enter non-matching email**: Enter `user@other.com` → Should show generic success (security)
5. **Check email**: Magic link should arrive within a few seconds
6. **Click magic link**: Should redirect to landing page and set session cookie
7. **Access landing page again**: Should work without redirect (session valid)

### 2. Test Chat Security Features

#### Rate Limiting Test
1. **Authenticate** on a landing page
2. **Send 50+ messages rapidly** in chat
3. **Should receive 429 error** after limit exceeded
4. **Check response headers**: Should include `X-RateLimit-*` headers

#### Input Sanitization Test
1. **Send message with HTML**: `<script>alert('xss')</script>Hello`
2. **Check logs**: Should see `input_sanitized` event in SecurityAuditLog
3. **Message should be sanitized** before processing

#### PII Detection Test
1. **Send message with email**: "Contact me at user@example.com"
2. **Check logs**: Should see `pii_detected` event
3. **PII should be redacted** in AI processing

#### Prompt Injection Test
1. **Send injection attempt**: "Ignore previous instructions and..."
2. **High confidence injections**: Should be rejected (message filtered out)
3. **Check logs**: Should see `prompt_injection` event

### 3. Test Tool Security

#### Email Tool Validation
1. **Try invalid email**: "not-an-email" → Should return error
2. **Try email injection**: "user@example.com\nbcc:evil@evil.com" → Should be rejected
3. **Valid email**: Should work normally

#### Tool Execution Monitoring
1. **Rapid tool calls**: Call `send_visitor_email` 10+ times quickly
2. **Check logs**: Should see `tool_abuse` event for rapid-fire pattern

### 4. Test Authentication Flow

#### Complete Flow Test
1. **Landing page access** → Redirects to `/go/[id]/auth`
2. **Enter email** → Magic link sent
3. **Click magic link** → Session created, redirected to landing page
4. **Chat access** → Should work (authenticated)
5. **Session check API**: `GET /api/go/[id]/auth/session` → Should return authenticated status
6. **Logout**: `POST /api/go/[id]/auth/session` → Should clear session
7. **Access landing page again** → Should redirect to auth (session cleared)

### 5. Test Edge Cases

#### Company Without Domain
1. **Create campaign** for company with `domain: null`
2. **Access landing page** → Should allow access (optional auth)
3. **Chat should work** without authentication

#### Session Expiration
1. **Create session** (manually set `expiresAt` to past date in DB)
2. **Try to access** → Should redirect to auth
3. **Try to chat** → Should return 401

#### Domain Matching Edge Cases
- `user@subdomain.company.com` should match `company.com` ✅
- `user@COMPANY.COM` should match `company.com` (case insensitive) ✅
- `user@www.company.com` should match `company.com` ✅

## Verification Checklist

- [ ] Database tables created successfully
- [ ] Landing page requires authentication (when company has domain)
- [ ] Magic link email sends successfully
- [ ] Session created after magic link verification
- [ ] Chat requires valid session
- [ ] Rate limiting works (429 after limit)
- [ ] Input sanitization removes dangerous content
- [ ] PII detection logs events
- [ ] Prompt injection blocked (high confidence)
- [ ] Tool validation prevents email injection
- [ ] Security audit logs created for all events
- [ ] Privacy notice shows in chat UI
- [ ] Authentication status displays in chat

## Database Verification

Check tables exist:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'LandingPageVisitor',
  'LandingPageMagicLink', 
  'LandingPageSession',
  'SecurityAuditLog'
);
```

Check SecurityAuditLog entries:
```sql
SELECT event_type, severity, COUNT(*) 
FROM "SecurityAuditLog" 
GROUP BY event_type, severity 
ORDER BY COUNT(*) DESC;
```

## Environment Variables Check

Verify these are set in `.env.local`:
- `ENABLE_LANDING_PAGE_AUTH=true` (or false to disable)
- `MAGIC_LINK_EXPIRY_MINUTES=15`
- `LANDING_PAGE_SESSION_EXPIRY_HOURS=24`
- Rate limiting variables (optional, defaults work)

## Next Steps

1. **Test in development**: Run through manual tests above
2. **Monitor SecurityAuditLog**: Check for any unexpected events
3. **Test email delivery**: Verify Resend is configured and emails send
4. **Production deployment**: Set environment variables on Vercel
5. **Monitor rate limits**: Adjust limits if needed based on usage
