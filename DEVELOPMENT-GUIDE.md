# 🛠️ Development Guide
*Last Updated: June 1, 2025*

## 📁 File Structure & Organization

### **Project Structure**
```
jason_personal_website/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── analytics/       # Analytics-specific components
│   │   ├── common/          # Shared components (Header, Footer)
│   │   └── forms/           # Form components
│   ├── layouts/             # Astro layouts
│   ├── pages/               # Astro pages and API routes
│   │   ├── api/             # API endpoints
│   │   ├── dashboard/       # Dashboard pages
│   │   └── index.astro      # Homepage
│   ├── lib/                 # Utility libraries
│   │   ├── supabaseClient.ts
│   │   ├── analytics.ts
│   │   └── utils.ts
│   ├── styles/              # Global styles and Tailwind config
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
├── docs/                    # Project documentation (MD files)
│   ├── PROJECT-OVERVIEW.md
│   ├── API-REFERENCE.md
│   ├── database-schema.md
│   └── DEVELOPMENT-GUIDE.md
├── database_migrations/     # SQL migration files
└── tests/                   # Test files
```

### **Naming Conventions**
- **Files:** `kebab-case.ts` for utilities, `PascalCase.astro` for components
- **Components:** `PascalCase` (e.g., `AnalyticsDashboard.astro`)
- **Variables:** `camelCase` for JavaScript, `snake_case` for database fields
- **Constants:** `UPPER_SNAKE_CASE` (e.g., `API_BASE_URL`)
- **Types/Interfaces:** `PascalCase` with descriptive names (e.g., `UserJourneyData`)

---

## 💻 Coding Standards

### **TypeScript Guidelines**
```typescript
// ✅ Good: Explicit typing with descriptive interfaces
interface ExperimentAnalytics {
  experimentId: string;
  conversionRate: number;
  isStatisticallySignificant: boolean;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

// ✅ Good: Use const assertions for better type inference
const EXPERIMENT_STATUS = {
  DRAFT: 'draft',
  RUNNING: 'running',
  COMPLETED: 'completed',
  PAUSED: 'paused'
} as const;

type ExperimentStatus = typeof EXPERIMENT_STATUS[keyof typeof EXPERIMENT_STATUS];

// ❌ Avoid: Any types or loose typing
// const data: any = await fetchData();

// ✅ Good: Proper error handling with typed responses
type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  message: string;
};
```

### **Database Query Patterns**
```typescript
// ✅ Good: Structured query with proper error handling
async function getExperimentAnalytics(experimentId: string): Promise<ExperimentAnalytics | null> {
  try {
    const { data, error } = await supabase
      .from('ab_test_analytics')
      .select(`
        experiment_id,
        experiment_name,
        conversion_rate_percent,
        eligible_participants,
        eligible_conversions
      `)
      .eq('experiment_id', experimentId)
      .single();

    if (error) {
      console.error('Database query error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error in getExperimentAnalytics:', error);
    return null;
  }
}

// ✅ Good: Batch operations for better performance
async function bulkInsertImpressions(impressions: ImpressionPayload[]): Promise<void> {
  const { error } = await supabase
    .from('impressions')
    .insert(impressions);

  if (error) {
    throw new Error(`Failed to insert impressions: ${error.message}`);
  }
}
```

### **API Response Formats**
```typescript
// ✅ Standard success response
const successResponse = {
  success: true,
  data: responseData,
  timestamp: new Date().toISOString()
};

// ✅ Standard error response
const errorResponse = {
  success: false,
  error: 'ValidationError',
  message: 'User identifier is required',
  code: 'MISSING_USER_ID',
  timestamp: new Date().toISOString()
};

// ✅ API endpoint pattern
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validate input
    if (!body.user_identifier) {
      return new Response(JSON.stringify({
        success: false,
        error: 'ValidationError',
        message: 'user_identifier is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Process request
    const result = await processRequest(body);

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'InternalServerError',
      message: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
```

### **Error Handling Standards**
```typescript
// ✅ Good: Specific error types
class DatabaseError extends Error {
  constructor(message: string, public readonly query?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

class ValidationError extends Error {
  constructor(message: string, public readonly field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ✅ Good: Centralized error logging
function logError(error: Error, context: Record<string, any> = {}) {
  console.error(`[${error.name}] ${error.message}`, {
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  });
}

// ✅ Good: Graceful degradation
async function getAnalyticsData(): Promise<AnalyticsData> {
  try {
    return await fetchAnalyticsFromDatabase();
  } catch (error) {
    logError(error, { function: 'getAnalyticsData' });
    return getDefaultAnalyticsData(); // Fallback data
  }
}
```

---

## 🔄 Development Workflow

### **Branch Naming Convention**
```bash
# Feature branches
feature/P0-content-management-system
feature/P1-email-newsletter-integration
feature/P2-social-media-integration

# Bug fixes
bugfix/dashboard-mobile-responsive
bugfix/api-timeout-handling

# Hotfixes
hotfix/security-vulnerability-fix

# Maintenance
maintenance/dependency-updates
maintenance/database-optimization
```

### **Commit Message Format**
```bash
# Format: type(scope): description
feat(dashboard): add real-time A/B testing metrics
fix(api): resolve user journey data aggregation issue
docs(database): update schema documentation with new tables
refactor(analytics): improve query performance with indexes
test(api): add integration tests for conversion tracking

# Types: feat, fix, docs, style, refactor, test, chore
# Scope: dashboard, api, database, auth, analytics, etc.
```

### **Pull Request Process**
1. **Create Feature Branch:** From main branch
2. **Development:** Follow coding standards and write tests
3. **Self Review:** Check code quality and test coverage
4. **Create PR:** With descriptive title and detailed description
5. **Code Review:** Address feedback and make improvements
6. **Testing:** Ensure all tests pass and functionality works
7. **Merge:** Squash and merge with clean commit history

### **Code Review Checklist**
- [ ] Code follows established patterns and conventions
- [ ] TypeScript types are properly defined
- [ ] Error handling is comprehensive
- [ ] Database queries are optimized
- [ ] API responses follow standard format
- [ ] Tests cover new functionality
- [ ] Documentation is updated if needed
- [ ] Performance impact is considered

---

## 🧪 Testing Requirements

### **Test Structure**
```typescript
// Unit test example
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateStatisticalSignificance } from '../lib/analytics';

describe('Analytics Utils', () => {
  describe('calculateStatisticalSignificance', () => {
    it('should return significant result for large difference', () => {
      const result = calculateStatisticalSignificance(
        100, 1000, // control: 100 conversions, 1000 impressions
        150, 1000  // variant: 150 conversions, 1000 impressions
      );

      expect(result.isSignificant).toBe(true);
      expect(result.pValue).toBeLessThan(0.05);
    });

    it('should handle edge cases gracefully', () => {
      const result = calculateStatisticalSignificance(0, 0, 0, 0);
      expect(result.isSignificant).toBe(false);
    });
  });
});

// Integration test example
describe('API Endpoints', () => {
  it('should return A/B testing data', async () => {
    const response = await fetch('/api/ab-testing-enhanced');
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('experiments');
    expect(Array.isArray(data.experiments)).toBe(true);
  });
});
```

### **Test Coverage Requirements**
- **Unit Tests:** 80%+ coverage for utility functions
- **Integration Tests:** All API endpoints
- **E2E Tests:** Critical user flows (dashboard, A/B testing)
- **Performance Tests:** API response times <500ms

---

## 🎯 Common Patterns

### **Adding New API Endpoints**
```typescript
// 1. Define types in src/types/
interface NewFeatureRequest {
  userId: string;
  featureData: Record<string, any>;
}

interface NewFeatureResponse {
  featureId: string;
  status: string;
  createdAt: string;
}

// 2. Create API endpoint in src/pages/api/
export const POST: APIRoute = async ({ request }) => {
  try {
    const body: NewFeatureRequest = await request.json();
    
    // Validate input
    const validation = validateNewFeatureRequest(body);
    if (!validation.isValid) {
      return createErrorResponse('ValidationError', validation.message, 400);
    }

    // Process request
    const result = await createNewFeature(body);

    return createSuccessResponse(result);
  } catch (error) {
    return handleApiError(error);
  }
};

// 3. Add to API documentation
// 4. Write tests
// 5. Update TASK-BACKLOG.md
```

### **Database Migration Process**
```sql
-- 1. Create migration file: database_migrations/YYYY_MM_DD_description.sql
-- 2. Write forward migration
ALTER TABLE users ADD COLUMN new_feature_enabled BOOLEAN DEFAULT FALSE;

-- 3. Test migration on development database
-- 4. Update database-schema.md
-- 5. Run migration on production
```

### **Adding Analytics Metrics**
```typescript
// 1. Define metric interface
interface NewMetric {
  name: string;
  value: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

// 2. Add to analytics collection
function trackNewMetric(metricData: NewMetric): void {
  // Implementation
}

// 3. Add to dashboard visualization
// 4. Update API response types
// 5. Add to database schema if persistent
```

---

## 🐛 Troubleshooting Guide

### **Common Issues & Solutions**

#### **Database Connection Issues**
```bash
# Check Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
  "https://YOUR_PROJECT.supabase.co/rest/v1/experiments?select=*"

# Verify environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

#### **TypeScript Compilation Errors**
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache/
npm run build

# Check for type mismatches
npx tsc --noEmit --skipLibCheck false
```

#### **API Response Issues**
```javascript
// Debug API responses
const response = await fetch('/api/ab-testing-enhanced');
console.log('Status:', response.status);
console.log('Headers:', response.headers);
const text = await response.text();
console.log('Raw response:', text);
```

#### **Performance Issues**
```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table performance
EXPLAIN ANALYZE SELECT * FROM impressions 
WHERE experiment_id = 'exp_123' 
AND created_at > NOW() - INTERVAL '7 days';
```

### **Debug Procedures**

#### **Analytics Dashboard Issues**
1. Check browser console for JavaScript errors
2. Verify API endpoints are responding
3. Check data freshness in database
4. Validate TypeScript types match API responses
5. Test with sample data

#### **A/B Testing Issues**
1. Verify user participation records exist
2. Check conversion attribution data
3. Validate statistical calculations
4. Test with known data sets
5. Review trigger function logs

#### **Database Performance**
1. Monitor query execution times
2. Check index usage with EXPLAIN
3. Review connection pool status
4. Monitor memory usage
5. Analyze query patterns

---

## 📈 Performance Optimization Guidelines

### **Database Optimization**
```sql
-- Use proper indexes
CREATE INDEX CONCURRENTLY idx_impressions_experiment_user 
ON impressions(experiment_id, user_identifier, impression_at);

-- Optimize queries with LIMIT and proper WHERE clauses
SELECT * FROM impressions 
WHERE experiment_id = $1 
AND impression_at > NOW() - INTERVAL '30 days'
ORDER BY impression_at DESC 
LIMIT 1000;

-- Use views for complex analytics
CREATE VIEW experiment_summary AS 
SELECT 
  e.id,
  e.name,
  COUNT(i.id) as total_impressions,
  COUNT(c.id) as total_conversions
FROM experiments e
LEFT JOIN impressions i ON i.experiment_id = e.id
LEFT JOIN conversions c ON c.experiment_id = e.id
GROUP BY e.id, e.name;
```

### **Frontend Performance**
```typescript
// Lazy load heavy components
const AnalyticsDashboard = lazy(() => import('./components/AnalyticsDashboard'));

// Debounce API calls
const debouncedSearch = useMemo(
  () => debounce(searchFunction, 300),
  [searchFunction]
);

// Use React.memo for expensive renders
const ExpensiveComponent = React.memo(({ data }) => {
  // Component implementation
});
```

### **API Performance**
```typescript
// Cache frequently accessed data
const cache = new Map<string, { data: any; timestamp: number }>();

async function getCachedData(key: string, fetcher: () => Promise<any>) {
  const cached = cache.get(key);
  const isExpired = !cached || Date.now() - cached.timestamp > 300000; // 5 min

  if (isExpired) {
    const data = await fetcher();
    cache.set(key, { data, timestamp: Date.now() });
    return data;
  }

  return cached.data;
}
```

---

## 🔧 Dependencies & Versions

### **Core Dependencies**
```json
{
  "astro": "^4.0.0",
  "typescript": "^5.0.0",
  "@supabase/supabase-js": "^2.38.0",
  "tailwindcss": "^3.3.0",
  "react": "^18.2.0"
}
```

### **Development Dependencies**
```json
{
  "vitest": "^1.0.0",
  "@types/node": "^20.0.0",
  "eslint": "^8.0.0",
  "prettier": "^3.0.0",
  "husky": "^8.0.0",
  "lint-staged": "^15.0.0"
}
```

### **Environment Variables**
```env
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key

# Development
NODE_ENV=development
PORT=3000

# Analytics (optional)
GOOGLE_ANALYTICS_ID=GA_TRACKING_ID
HOTJAR_ID=HOTJAR_SITE_ID
```

---

## 🚀 Local Development Setup

### **Initial Setup**
```bash
# Clone repository
git clone https://github.com/username/jason_personal_website.git
cd jason_personal_website

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### **Development Commands**
```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing
npm run test         # Run all tests
npm run test:unit    # Run unit tests only
npm run test:e2e     # Run end-to-end tests

# Database
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed with sample data
npm run db:reset     # Reset database schema

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run type-check   # TypeScript type checking
```

### **Pre-commit Hooks**
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx,astro}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{md,json}": [
      "prettier --write"
    ]
  }
}
``` 