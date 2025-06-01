# 🔌 API Reference Documentation
*Last Updated: December 19, 2024*

## 🔐 Authentication

### **Base Configuration**
- **Base URL:** `https://your-domain.com/api`
- **Content-Type:** `application/json`
- **Authentication:** Currently public APIs (authentication to be implemented)
- **Rate Limiting:** 100 requests per minute per IP

### **Headers**
```http
Content-Type: application/json
Accept: application/json
User-Agent: YourApp/1.0
```

---

## 📊 Analytics APIs

### **GET /api/ab-testing-enhanced**
**Purpose:** Retrieve comprehensive A/B testing analytics with statistical significance

#### **Request**
```http
GET /api/ab-testing-enhanced
```

#### **Response Schema**
```typescript
interface EnhancedABTestingData {
  experiments: Array<{
    id: string;
    name: string;
    description?: string;
    is_active: boolean;
    created_at: string;
    status: 'running' | 'completed' | 'paused' | 'draft';
    confidenceLevel: number;
    isStatisticallySignificant: boolean;
    pValue: number;
    sampleSize: number;
    recommendedAction: string;
    variants: Array<{
      id: string;
      name: string;
      impressions: number;
      conversions: number;
      conversionRate: number;
      confidenceInterval: { lower: number; upper: number; };
      zScore: number;
      isWinner: boolean;
      uplift: number;
      geographicPerformance: Array<{
        country: string;
        impressions: number;
        conversions: number;
        conversionRate: number;
      }>;
      devicePerformance: Array<{
        deviceType: string;
        impressions: number;
        conversions: number;
        conversionRate: number;
      }>;
      timeSeriesData: Array<{
        date: string;
        impressions: number;
        conversions: number;
        conversionRate: number;
      }>;
    }>;
  }>;
  overallStatistics: {
    totalActiveExperiments: number;
    totalCompletedExperiments: number;
    averageTestDuration: number;
    successRate: number;
    totalImpressionsToday: number;
    totalConversionsToday: number;
  };
}
```

#### **Example Response**
```json
{
  "experiments": [
    {
      "id": "exp_123",
      "name": "Homepage CTA Test",
      "description": "Testing different call-to-action buttons",
      "is_active": true,
      "created_at": "2024-12-15T10:00:00Z",
      "status": "running",
      "confidenceLevel": 95,
      "isStatisticallySignificant": false,
      "pValue": 0.12,
      "sampleSize": 847,
      "recommendedAction": "Continue testing",
      "variants": [
        {
          "id": "var_ctrl",
          "name": "Control",
          "impressions": 412,
          "conversions": 23,
          "conversionRate": 5.58,
          "confidenceInterval": { "lower": 3.2, "upper": 8.1 },
          "zScore": 0,
          "isWinner": false,
          "uplift": 0,
          "geographicPerformance": [
            {
              "country": "US",
              "impressions": 245,
              "conversions": 14,
              "conversionRate": 5.71
            }
          ],
          "devicePerformance": [
            {
              "deviceType": "desktop",
              "impressions": 287,
              "conversions": 18,
              "conversionRate": 6.27
            }
          ],
          "timeSeriesData": [
            {
              "date": "2024-12-19",
              "impressions": 67,
              "conversions": 4,
              "conversionRate": 5.97
            }
          ]
        }
      ]
    }
  ],
  "overallStatistics": {
    "totalActiveExperiments": 3,
    "totalCompletedExperiments": 12,
    "averageTestDuration": 14.5,
    "successRate": 75.2,
    "totalImpressionsToday": 1247,
    "totalConversionsToday": 73
  }
}
```

#### **Error Responses**
```json
{
  "error": "Failed to calculate enhanced A/B testing data",
  "message": "Database connection timeout"
}
```

#### **Usage Example**
```javascript
async function getABTestingData() {
  try {
    const response = await fetch('/api/ab-testing-enhanced');
    const data = await response.json();
    
    // Check for statistical significance
    data.experiments.forEach(experiment => {
      if (experiment.isStatisticallySignificant) {
        console.log(`${experiment.name} has significant results!`);
        const winner = experiment.variants.find(v => v.isWinner);
        console.log(`Winner: ${winner.name} with ${winner.uplift}% uplift`);
      }
    });
  } catch (error) {
    console.error('Failed to fetch A/B testing data:', error);
  }
}
```

---

### **GET /api/user-journey**
**Purpose:** Retrieve comprehensive user journey analytics and session flow analysis

#### **Request**
```http
GET /api/user-journey
```

#### **Response Schema**
```typescript
interface UserJourneyData {
  sessionFlowAnalysis: {
    averageSessionDuration: number;
    averagePagesPerSession: number;
    sessionCount: number;
    returningUserRate: number;
    topEntryPages: Array<{
      page: string;
      sessions: number;
      bounceRate: number;
      avgTimeOnPage: number;
    }>;
    topExitPages: Array<{
      page: string;
      exits: number;
      exitRate: number;
    }>;
  };
  engagementMetrics: {
    averageTimeOnPage: number;
    averageScrollDepth: number;
    engagementRate: number;
    interactionRate: number;
    contentConsumptionScore: number;
    engagementByPage: Array<{
      page: string;
      avgTimeOnPage: number;
      avgScrollDepth: number;
      engagementScore: number;
      interactions: number;
    }>;
  };
  bounceRateAnalysis: {
    overallBounceRate: number;
    bounceRateByPage: Array<{
      page: string;
      bounceRate: number;
      sessions: number;
    }>;
    bounceRateBySource: Array<{
      source: string;
      bounceRate: number;
      sessions: number;
    }>;
  };
  deviceConnectionImpact: {
    performanceByDevice: Array<{
      deviceType: string;
      sessions: number;
      avgLoadTime: number;
      avgSessionDuration: number;
      conversionRate: number;
      bounceRate: number;
    }>;
  };
}
```

#### **Example Response**
```json
{
  "sessionFlowAnalysis": {
    "averageSessionDuration": 342.5,
    "averagePagesPerSession": 2.8,
    "sessionCount": 1247,
    "returningUserRate": 23.4,
    "topEntryPages": [
      {
        "page": "/",
        "sessions": 567,
        "bounceRate": 34.2,
        "avgTimeOnPage": 45.7
      }
    ],
    "topExitPages": [
      {
        "page": "/contact",
        "exits": 234,
        "exitRate": 18.8
      }
    ]
  },
  "engagementMetrics": {
    "averageTimeOnPage": 78.3,
    "averageScrollDepth": 67.2,
    "engagementRate": 45.7,
    "interactionRate": 12.3,
    "contentConsumptionScore": 72.4
  }
}
```

#### **Usage Example**
```javascript
async function getUserJourneyData() {
  const response = await fetch('/api/user-journey');
  const data = await response.json();
  
  // Identify high-bounce pages for optimization
  const highBouncePpages = data.bounceRateAnalysis.bounceRateByPage
    .filter(page => page.bounceRate > 60)
    .sort((a, b) => b.bounceRate - a.bounceRate);
    
  console.log('Pages needing optimization:', highBouncePages);
}
```

---

## 🎯 Data Collection APIs

### **POST /api/impressions**
**Purpose:** Track A/B testing impressions with user-level attribution

#### **Request**
```http
POST /api/impressions
Content-Type: application/json
```

#### **Request Body**
```typescript
interface ImpressionPayload {
  user_identifier: string;
  experiment_id: string;
  variant_id: string;
  page_url?: string;
  user_agent?: string;
  country_code?: string;
  device_type?: 'mobile' | 'tablet' | 'desktop';
  user_eligibility_status?: Record<string, any>;
  user_context?: Record<string, any>;
  metadata?: Record<string, any>;
}
```

#### **Example Request**
```json
{
  "user_identifier": "user_abc123",
  "experiment_id": "exp_homepage_cta",
  "variant_id": "var_button_blue",
  "page_url": "https://example.com/",
  "user_agent": "Mozilla/5.0...",
  "country_code": "US",
  "device_type": "desktop",
  "user_eligibility_status": {
    "eligible": true,
    "reason": "new_user",
    "segment": "desktop_users"
  },
  "user_context": {
    "referrer": "google.com",
    "utm_source": "organic"
  },
  "metadata": {
    "page_load_time": 1234,
    "viewport_size": "1920x1080"
  }
}
```

#### **Response**
```json
{
  "success": true,
  "impression_id": "imp_xyz789",
  "is_first_exposure": true,
  "message": "Impression tracked successfully"
}
```

#### **Integration Pattern**
```javascript
// Track impression when user sees A/B test variant
function trackImpression(experimentId, variantId, userContext = {}) {
  const payload = {
    user_identifier: getUserIdentifier(),
    experiment_id: experimentId,
    variant_id: variantId,
    page_url: window.location.href,
    user_agent: navigator.userAgent,
    device_type: getDeviceType(),
    user_eligibility_status: {
      eligible: !hasUserConverted(experimentId),
      reason: getEligibilityReason(),
    },
    user_context: {
      referrer: document.referrer,
      ...userContext
    },
    metadata: {
      page_load_time: getPageLoadTime(),
      viewport_size: `${window.innerWidth}x${window.innerHeight}`
    }
  };
  
  fetch('/api/impressions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

---

### **POST /api/conversions**
**Purpose:** Track conversion events with proper attribution

#### **Request**
```http
POST /api/conversions
Content-Type: application/json
```

#### **Request Body**
```typescript
interface ConversionPayload {
  user_identifier: string;
  experiment_id: string;
  variant_id: string;
  conversion_type: string;
  conversion_value?: number;
  details?: Record<string, any>;
  metadata?: Record<string, any>;
}
```

#### **Example Request**
```json
{
  "user_identifier": "user_abc123",
  "experiment_id": "exp_homepage_cta",
  "variant_id": "var_button_blue",
  "conversion_type": "contact_form_submission",
  "conversion_value": 100.00,
  "details": {
    "form_name": "contact_us",
    "lead_quality": "high",
    "user_intent": "sales_inquiry"
  },
  "metadata": {
    "page_url": "https://example.com/contact",
    "time_on_page": 234
  }
}
```

#### **Response**
```json
{
  "success": true,
  "conversion_id": "conv_def456",
  "attribution": {
    "time_to_conversion_hours": 24.5,
    "is_first_conversion": true,
    "attribution_confidence": 1.0
  },
  "message": "Conversion tracked and attributed successfully"
}
```

#### **Integration Pattern**
```javascript
// Track conversion when user completes desired action
function trackConversion(experimentId, variantId, conversionData) {
  const payload = {
    user_identifier: getUserIdentifier(),
    experiment_id: experimentId,
    variant_id: variantId,
    conversion_type: conversionData.type,
    conversion_value: conversionData.value,
    details: conversionData.details,
    metadata: {
      page_url: window.location.href,
      time_on_page: getTimeOnPage(),
      user_agent: navigator.userAgent
    }
  };
  
  fetch('/api/conversions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

// Example usage
document.getElementById('contact-form').addEventListener('submit', (e) => {
  trackConversion('exp_homepage_cta', getCurrentVariant(), {
    type: 'contact_form_submission',
    value: 100,
    details: {
      form_name: 'contact_us',
      lead_source: 'website'
    }
  });
});
```

---

## 🎮 Gamification APIs

### **GET /api/user/{userId}/gems**
**Purpose:** Retrieve user's current gem balance and transaction history

#### **Request**
```http
GET /api/user/user_123/gems
```

#### **Response**
```json
{
  "user_id": "user_123",
  "current_balance": 150,
  "recent_transactions": [
    {
      "id": "txn_abc",
      "amount": 50,
      "type": "engagement_reward",
      "description": "Completed profile setup",
      "created_at": "2024-12-19T10:30:00Z"
    }
  ],
  "lifetime_earned": 500,
  "lifetime_spent": 350
}
```

---

## 🚨 Error Handling

### **Standard Error Format**
```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "code": "ERR_CODE",
  "timestamp": "2024-12-19T10:30:00Z",
  "request_id": "req_xyz789"
}
```

### **Common Error Codes**
- **400 Bad Request:** Invalid request parameters
- **401 Unauthorized:** Authentication required
- **403 Forbidden:** Insufficient permissions
- **404 Not Found:** Resource not found
- **429 Too Many Requests:** Rate limit exceeded
- **500 Internal Server Error:** Server-side error

---

## 📈 Rate Limiting

### **Limits**
- **Analytics APIs:** 60 requests per minute
- **Data Collection APIs:** 1000 requests per minute
- **Gamification APIs:** 100 requests per minute

### **Headers**
```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640095800
```

---

## 🔧 Development & Testing

### **Local Development**
```bash
# Start development server
npm run dev

# Test API endpoints
curl http://localhost:3000/api/ab-testing-enhanced

# Test with sample data
npm run test:api
```

### **Environment Variables**
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
```

### **Sample Data Generation**
```javascript
// Generate test impressions
async function generateTestData() {
  const experiments = await getExperiments();
  
  for (let i = 0; i < 100; i++) {
    await trackImpression(
      experiments[0].id,
      experiments[0].variants[Math.floor(Math.random() * 2)].id,
      { test: true }
    );
  }
}
```

---

## 📚 Integration Examples

### **React Hook for A/B Testing**
```typescript
import { useEffect, useState } from 'react';

interface ABTestHook {
  variant: string | null;
  isLoading: boolean;
  trackImpression: () => void;
  trackConversion: (data: any) => void;
}

export function useABTest(experimentId: string): ABTestHook {
  const [variant, setVariant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get user's assigned variant
    const assignedVariant = getVariantForUser(experimentId);
    setVariant(assignedVariant);
    setIsLoading(false);
    
    // Track impression
    trackImpression(experimentId, assignedVariant);
  }, [experimentId]);

  const trackConversion = (conversionData: any) => {
    if (variant) {
      trackConversion(experimentId, variant, conversionData);
    }
  };

  return {
    variant,
    isLoading,
    trackImpression: () => trackImpression(experimentId, variant),
    trackConversion
  };
}
```

### **Analytics Dashboard Integration**
```typescript
// Real-time analytics updates
function setupAnalyticsDashboard() {
  // Initial data load
  loadABTestingData();
  loadUserJourneyData();
  
  // Refresh every 30 seconds
  setInterval(() => {
    loadABTestingData();
  }, 30000);
  
  // WebSocket for real-time updates (future implementation)
  // const ws = new WebSocket('wss://your-domain.com/api/realtime');
}
``` 