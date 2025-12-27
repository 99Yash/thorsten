# Code Review: LinkedIn Profile Fetcher

## Executive Summary

This codebase implements a LinkedIn profile fetching application using Next.js, Drizzle ORM, and a RapidAPI integration. The core functionality works, but there are several areas where design patterns, error handling, and code organization can be significantly improved.

**Overall Assessment**: Functional but needs refactoring for maintainability, reliability, and scalability.

---

## Critical Issues (High Priority)

### 1. API Route: Missing Response Validation

**Location**: `src/app/api/linkedin/route.ts:107`

**Issue**: The external API response is stored directly without validation against `LinkedInRawProfileSchema`.

```typescript
const raw = await res.json();
// ❌ No validation - raw data could be malformed
await db.insert(linkedinProfile).values({ rawData: raw, ... });
```

**Risk**: Invalid data could be stored in the database, causing runtime errors in the UI.

**Fix**: Validate before storing:

```typescript
const raw = await res.json();
const validated = LinkedInRawProfileSchema.parse(raw);
// Then use validated data
```

---

### 2. API Route: Race Condition in Database Operations

**Location**: `src/app/api/linkedin/route.ts:120-151`

**Issue**: Two separate queries (findFirst + update/insert) create a race condition. If two requests come in simultaneously for the same username, both might try to insert.

**Risk**: Database constraint violations or duplicate data.

**Fix**: Use an upsert operation:

```typescript
await db
  .insert(linkedinProfile)
  .values({ ... })
  .onConflictDoUpdate({
    target: linkedinProfile.username,
    set: { ... }
  });
```

---

### 3. API Route: No Request Timeout

**Location**: `src/app/api/linkedin/route.ts:86`

**Issue**: External API call has no timeout, which can cause requests to hang indefinitely.

**Risk**: Server resources exhausted, poor user experience.

**Fix**: Add AbortController with timeout:

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
const res = await fetch(endpoint, {
  ...options,
  signal: controller.signal,
});
clearTimeout(timeoutId);
```

---

### 4. Profile Card: Component Too Large

**Location**: `src/components/linkedin/profile-card.tsx` (919 lines)

**Issue**: Single component handles too many responsibilities, making it hard to maintain and test.

**Risk**: Difficult to debug, test, and extend.

**Fix**: Split into smaller components:

- `ProfileHeader`
- `ExperienceSection`
- `EducationSection`
- `SkillsSection`
- `LanguagesSection`
- `ProfileMetadata`

---

## Design & Architecture Issues

### 5. Missing Service Layer

**Issue**: Business logic is scattered between API routes and components. No centralized service layer.

**Impact**: Hard to test, reuse, and maintain business logic.

**Recommendation**: Create `~/lib/linkedin/service.ts`:

```typescript
export class LinkedInService {
  async fetchProfile(username: string, options?: { forceRefresh?: boolean }) {
    // Centralized business logic
  }

  async getCachedProfile(username: string) {
    // Cache logic
  }
}
```

---

### 6. Inconsistent Error Handling

**Location**: Multiple files

**Issue**: Mix of generic error messages, `AppError` class (which exists but isn't used), and plain strings.

**Example**: `src/app/api/linkedin/route.ts:163-166` uses generic error message instead of `AppError`.

**Recommendation**: Use `AppError` consistently throughout:

```typescript
import { AppError, createExternalServiceError } from '~/lib/errors';

// Instead of:
return NextResponse.json({ error: '...' }, { status: 500 });

// Use:
throw new AppError({
  code: 'INTERNAL_SERVER_ERROR',
  message: 'Failed to fetch LinkedIn profile',
  cause: err,
});
```

---

### 7. Silent Error Swallowing

**Location**: `src/app/api/linkedin/route.ts:36`, `src/lib/linkedin/parse.ts:53`

**Issue**: Errors are caught and ignored, making debugging difficult.

**Example**:

```typescript
const json = await req.json().catch(() => ({})); // ❌ Silently fails
```

**Recommendation**: Log errors or rethrow with context:

```typescript
const json = await req.json().catch((err) => {
  console.error('[LinkedIn] Failed to parse request body:', err);
  throw new AppError({
    code: 'PARSE_ERROR',
    message: 'Invalid request body',
    cause: err,
  });
});
```

---

### 8. No Request Deduplication

**Issue**: Multiple simultaneous requests for the same profile will all hit the external API.

**Impact**: Wasted API quota, potential rate limiting.

**Recommendation**: Implement request deduplication using a Map or cache:

```typescript
const pendingRequests = new Map<string, Promise<LinkedInRawProfile>>();

async function fetchProfile(username: string) {
  if (pendingRequests.has(username)) {
    return pendingRequests.get(username)!;
  }

  const promise = fetchFromAPI(username);
  pendingRequests.set(username, promise);

  try {
    return await promise;
  } finally {
    pendingRequests.delete(username);
  }
}
```

---

## Code Quality Issues

### 9. Array Index as Keys

**Location**: `src/components/linkedin/profile-card.tsx` (multiple locations)

**Issue**: Using array indices as React keys (lines 396, 524, etc.) can cause rendering bugs when lists change.

**Example**:

```typescript
{allExperience.map((role, idx) => (
  <div key={idx}> {/* ❌ Bad */}
```

**Fix**: Use stable identifiers:

```typescript
{allExperience.map((role) => (
  <div key={role.companyId || `${role.companyName}-${role.title}-${role.start?.year}`}>
```

---

### 10. Utility Functions in Component File

**Location**: `src/components/linkedin/profile-card.tsx:28-124`

**Issue**: 6 utility functions are defined in the component file, making it harder to test and reuse.

**Recommendation**: Extract to `~/lib/linkedin/formatters.ts`:

- `initialsOf()`
- `formatDatePart()`
- `formatProficiency()`
- `calculateDuration()`
- `formatRelativeTime()`
- `isOlderThanThreshold()`

---

### 11. Missing Memoization

**Location**: `src/components/linkedin/profile-card.tsx:155-177`

**Issue**: Expensive computations (sorting, filtering) run on every render.

**Example**:

```typescript
const positions = (profile.fullPositions ?? profile.position ?? []).slice();
positions.sort((a, b) => {
  /* complex sorting */
});
```

**Fix**: Memoize with `useMemo`:

```typescript
const positions = useMemo(() => {
  const pos = (profile.fullPositions ?? profile.position ?? []).slice();
  return pos.sort(/* ... */);
}, [profile.fullPositions, profile.position]);
```

---

### 12. Unsafe Type Assertions

**Location**: `src/components/linkedin/profile-card.tsx:679-684`

**Issue**: Type assertions without validation can cause runtime errors.

**Example**:

```typescript
const contributors: unknown[] = Array.isArray(
  (p as Record<string, unknown>).contributors
)
  ? ((p as Record<string, unknown>).contributors as unknown[])
  : [];
```

**Recommendation**: Validate with Zod or type guards:

```typescript
const contributorsSchema = z.array(z.unknown());
const contributors =
  contributorsSchema.safeParse((p as Record<string, unknown>).contributors)
    .data ?? [];
```

---

### 13. Duplicated Validation Logic

**Location**: `src/components/linkedin/profile-form.tsx:39-59` vs `src/lib/linkedin/parse.ts`

**Issue**: Client-side validation duplicates server-side logic, creating maintenance burden.

**Recommendation**: Share validation schema:

```typescript
// ~/lib/linkedin/validation.ts
export const linkedinInputSchema = z.string().min(3).refine(/* ... */);

// Use in both client and server
```

---

## Security & Performance

### 14. No Rate Limiting

**Issue**: API endpoint has no rate limiting, making it vulnerable to abuse.

**Recommendation**: Implement rate limiting middleware or use a service like Upstash Rate Limit.

---

### 15. No Input Sanitization

**Issue**: Username/URL input is validated but not sanitized before external API call.

**Risk**: Potential injection attacks or malformed API requests.

**Recommendation**: Sanitize input:

```typescript
const sanitizedUsername = username
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, '');
```

---

### 16. Debug Logging in Production

**Location**: `src/app/api/linkedin/route.ts:108-117`

**Issue**: `console.dir` with full depth logs sensitive data in production.

**Recommendation**: Use conditional logging:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.dir({ ... }, { depth: Infinity });
}
```

---

## Database Design

### 17. Missing Indexes

**Location**: `src/db/schemas/linkedin.ts`

**Issue**: Only `username` is indexed. `lastAnalysedAt` is frequently queried but not indexed.

**Recommendation**: Add index for common queries:

```typescript
index('linkedin_profile_last_analysed_at_idx').on(table.lastAnalysedAt);
```

---

### 18. No Database Transaction

**Location**: `src/app/api/linkedin/route.ts:124-151`

**Issue**: Update/insert operations aren't wrapped in a transaction.

**Risk**: Partial updates if operation fails mid-way.

**Recommendation**: Use transactions:

```typescript
await db.transaction(async (tx) => {
  // All operations here
});
```

---

## Testing & Maintainability

### 19. No Error Boundaries

**Issue**: No React error boundaries to catch component errors gracefully.

**Recommendation**: Add error boundaries around major sections.

---

### 20. No Request Cancellation

**Location**: `src/components/linkedin/profile-form.tsx:78-103`

**Issue**: No AbortController to cancel requests when component unmounts or new request starts.

**Risk**: Memory leaks, race conditions, wasted network requests.

**Fix**:

```typescript
useEffect(() => {
  const controller = new AbortController();
  fetchProfile(values, { signal: controller.signal });
  return () => controller.abort();
}, []);
```

---

## Positive Aspects

✅ Good use of Zod for schema validation  
✅ Clean database schema with proper types  
✅ Good separation of parse utilities  
✅ Proper use of Next.js App Router  
✅ TypeScript throughout  
✅ Good UI component structure (shadcn/ui)

---

## Recommended Refactoring Order

1. **Immediate (Critical)**:

   - Add response validation in API route
   - Fix race condition with upsert
   - Add request timeout
   - Extract utility functions from ProfileCard

2. **Short-term (High Priority)**:

   - Split ProfileCard into smaller components
   - Implement service layer
   - Use AppError consistently
   - Add request deduplication

3. **Medium-term (Nice to Have)**:

   - Add rate limiting
   - Implement request cancellation
   - Add error boundaries
   - Improve type safety

4. **Long-term (Optimization)**:
   - Add comprehensive tests
   - Add monitoring/logging
   - Optimize database queries
   - Add caching layer

---

## Summary

The codebase is functional but needs refactoring for production readiness. The main issues are:

- Missing validation and error handling
- Large components that need splitting
- No service layer abstraction
- Race conditions and missing timeouts
- Inconsistent error handling patterns

Focus on the critical issues first, then gradually improve architecture and code quality.
