# 🗄️ Database Schema Documentation
*Last Updated: December 19, 2024*

## 🏗️ **Database Overview**
This document contains the complete schema documentation for Jason's Personal Website Supabase database, including A/B testing infrastructure, user management, and gamification features.

**Recent Updates:** Enhanced A/B testing with user-level conversion tracking, proper conversion attribution, statistical significance features, and comprehensive analytics to eliminate already-converted user bias.

---

## 📊 **Tables Overview**

### **🧪 A/B Testing Tables**
- `experiments` - A/B test experiment definitions with statistical significance tracking
- `variants` - A/B test variant configurations
- `impressions` - A/B test impression tracking with geographic, device, and engagement data *(enhanced with user-level tracking)*
- `conversions` - A/B test conversion tracking with attribution and performance metrics *(enhanced with user-level attribution)*
- `user_experiment_participation` - **NEW:** User-level participation tracking to prevent double-counting
- `conversion_attribution` - **NEW:** Advanced conversion attribution and analytics

### **👥 User Management Tables**
- `user_profiles` - User account information and gem balances

### **💎 Gamification Tables**
- `gem_transactions` - User gem transaction history
- `engagement_rewards` - User engagement reward tracking
- `content_unlocks` - Premium content access tracking
- `referrals` - User referral system

---

## 🏛️ **Table Details**

### **👥 user_profiles**
Core user information and gamification data
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `email` | text | NO | - | User's email address (unique) |
| `insight_gems` | integer | NO | `100` | User's gem balance |
| `referral_code` | text | YES | - | User's unique referral code |
| `created_at` | timestamptz | NO | `now()` | Account creation timestamp |
| `updated_at` | timestamptz | NO | `now()` | Last update timestamp |
| `first_name` | text | YES | - | User's first name |

### **🧪 experiments**
A/B test experiment definitions with statistical tracking
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `name` | text | NO | - | Experiment name (unique) |
| `description` | text | YES | - | Experiment description |
| `is_active` | boolean | YES | `true` | Whether experiment is active |
| `created_at` | timestamptz | NO | `timezone('utc', now())` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |
| `target_sample_size` | integer | YES | - | Target number of participants |
| `confidence_level` | decimal(3,2) | YES | `0.95` | Statistical confidence level (0.80-0.99) ✅ |
| `minimum_detectable_effect` | decimal(5,4) | YES | `0.05` | Minimum effect size to detect |
| `started_at` | timestamptz | YES | - | When experiment actually started |
| `ended_at` | timestamptz | YES | - | When experiment ended |
| `status` | experiment_status_enum | YES | `'draft'` | Experiment status ✅ |

### **🎯 variants**
A/B test variant configurations
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `experiment_id` | uuid | NO | - | FK to experiments |
| `name` | text | NO | - | Variant name |
| `description` | text | YES | - | Variant description |
| `config_json` | jsonb | YES | - | Variant configuration |
| `created_at` | timestamptz | NO | `timezone('utc', now())` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

### **👁️ impressions** *(Enhanced with User-Level Tracking)*
A/B test impression tracking with comprehensive analytics and user-level conversion prevention
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `variant_id` | uuid | NO | - | FK to variants |
| `experiment_id` | uuid | NO | - | FK to experiments |
| `user_identifier` | text | NO | - | User session identifier |
| `session_identifier` | text | YES | - | Browser session ID |
| `impression_at` | timestamptz | NO | `now()` | When impression occurred |
| `page_url` | text | YES | - | Page URL where impression occurred |
| `user_agent` | text | YES | - | User's browser info |
| **NEW: User-Level Tracking** |
| `metadata` | jsonb | YES | `'{}'::jsonb` | **NEW:** Additional impression metadata |
| `is_first_exposure` | boolean | YES | `true` | **NEW:** Whether this is user's first exposure to experiment |
| `user_eligibility_status` | jsonb | YES | `'{}'::jsonb` | **NEW:** User eligibility criteria at impression time |
| `user_context` | jsonb | YES | `'{}'::jsonb` | **NEW:** User context and state information |
| **Geographic Data** |
| `country_code` | varchar(2) | YES | - | ISO country code (US, GB, etc.) |
| `region` | varchar(100) | YES | - | State/region name |
| `city` | varchar(100) | YES | - | City name |
| **Device & Tech Data** |
| `device_type` | device_type_enum | YES | - | mobile/tablet/desktop/unknown ✅ |
| `screen_resolution` | varchar(20) | YES | - | Screen resolution (1920x1080) |
| `viewport_size` | varchar(20) | YES | - | Browser viewport size |
| `connection_type` | connection_type_enum | YES | - | Connection speed ✅ |
| `language_code` | varchar(10) | YES | - | Browser language (en-US) |
| `time_zone` | varchar(50) | YES | - | User's timezone |
| **Campaign Tracking** |
| `utm_source` | varchar(100) | YES | - | UTM source parameter |
| `utm_medium` | varchar(100) | YES | - | UTM medium parameter |
| `utm_campaign` | varchar(100) | YES | - | UTM campaign parameter |
| **Engagement Metrics** |
| `time_on_page` | integer | YES | - | Time spent on page (seconds) |
| `scroll_depth_percent` | integer | YES | - | How far user scrolled (0-100%) ✅ |
| `page_load_time` | integer | YES | - | Page load time (milliseconds) |
| `bounce` | boolean | YES | `false` | Whether user bounced immediately |

### **🎯 conversions** *(Enhanced with User-Level Attribution)*
A/B test conversion tracking with advanced attribution analytics and double-counting prevention
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `variant_id` | uuid | NO | - | FK to variants |
| `experiment_id` | uuid | NO | - | FK to experiments |
| `user_identifier` | text | YES | - | User session identifier |
| `session_identifier` | text | YES | - | Browser session ID |
| `conversion_type` | text | NO | - | Type of conversion (e.g., 'quiz_submission') |
| `details` | jsonb | YES | - | Additional conversion data |
| `created_at` | timestamptz | NO | `timezone('utc', now())` | When conversion occurred |
| **NEW: User-Level Attribution** |
| `metadata` | jsonb | YES | `'{}'::jsonb` | **NEW:** Additional conversion metadata |
| `is_first_conversion_for_experiment` | boolean | YES | `true` | **NEW:** Whether this is user's first conversion for this experiment |
| `conversion_attribution_source` | text | YES | `'direct'` | **NEW:** How conversion was attributed (direct, first_exposure, etc.) |
| `conversion_window_days` | integer | YES | `30` | **NEW:** Days since first exposure when conversion occurred |
| `original_exposure_date` | timestamptz | YES | - | **NEW:** When user was first exposed to this experiment |
| `conversion_eligibility_verified` | boolean | YES | `false` | **NEW:** Whether user was eligible to convert at exposure time |
| `conversion_context` | jsonb | YES | `'{}'::jsonb` | **NEW:** Context and state at conversion time |
| **Geographic Data** |
| `country_code` | varchar(2) | YES | - | ISO country code for segmentation |
| `device_type` | device_type_enum | YES | - | Device type for conversion analysis ✅ |
| `referrer_source` | varchar(200) | YES | - | Where user came from |
| **Campaign Tracking** |
| `utm_source` | varchar(100) | YES | - | UTM source parameter |
| `utm_medium` | varchar(100) | YES | - | UTM medium parameter |
| `utm_campaign` | varchar(100) | YES | - | UTM campaign parameter |
| **Value Tracking** |
| `conversion_value` | decimal(10,2) | YES | - | Monetary value of conversion ✅ |
| `time_to_convert` | integer | YES | - | Seconds from first impression to conversion |

### **👤 user_experiment_participation** *(NEW)*
User-level experiment participation tracking to prevent double-counting and ensure proper statistical analysis
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `user_identifier` | text | NO | - | User identifier (consistent across sessions) |
| `experiment_id` | uuid | NO | - | FK to experiments |
| `variant_id` | uuid | NO | - | FK to variants (user's assigned variant) |
| `first_exposure_date` | timestamptz | NO | `NOW()` | When user was first exposed to experiment |
| `was_eligible_at_exposure` | boolean | NO | `true` | Whether user was eligible to convert at first exposure |
| `eligibility_criteria` | jsonb | YES | `'{}'::jsonb` | User's eligibility status details |
| `total_impressions` | integer | YES | `1` | Total number of impressions for this user |
| `has_converted` | boolean | YES | `false` | Whether user has ever converted in this experiment |
| `first_conversion_date` | timestamptz | YES | - | When user first converted (if applicable) |
| `conversion_within_window` | boolean | YES | `false` | Whether conversion happened within attribution window |
| `created_at` | timestamptz | YES | `timezone('utc'::text, now())` | Record creation timestamp |
| `updated_at` | timestamptz | YES | `NOW()` | Last update timestamp |

**Constraints:**
- Unique constraint on (`user_identifier`, `experiment_id`) - One record per user per experiment
- Check constraint: `first_conversion_date >= first_exposure_date` when not null

### **📊 conversion_attribution** *(NEW)*
Advanced conversion attribution tracking and analytics for proper A/B test analysis
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `conversion_id` | uuid | NO | - | FK to conversions (unique) |
| `user_identifier` | text | NO | - | User identifier |
| `experiment_id` | uuid | NO | - | FK to experiments |
| `variant_id` | uuid | NO | - | FK to variants |
| `attribution_method` | text | NO | `'first_exposure'` | How conversion was attributed |
| `attribution_confidence` | decimal(3,2) | YES | `1.00` | Confidence in attribution (0.00-1.00) |
| `time_to_conversion_hours` | integer | YES | - | Hours between first exposure and conversion |
| `conversion_value_attributed` | decimal(10,2) | YES | - | Value attributed to this experiment |
| `created_at` | timestamptz | YES | `timezone('utc'::text, now())` | Record creation timestamp |

**Constraints:**
- Unique constraint on `conversion_id` - One attribution record per conversion
- Check constraint: `attribution_confidence >= 0 AND attribution_confidence <= 1`
- Check constraint: `time_to_conversion_hours >= 0`

### **💎 gem_transactions**
User gem transaction history
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `user_id` | uuid | NO | - | FK to user_profiles |
| `amount` | integer | NO | - | Gem amount (+/-) |
| `transaction_type` | USER-DEFINED | NO | - | Transaction type enum |
| `reference_id` | text | YES | - | Reference to related record |
| `description` | text | YES | - | Human-readable description |
| `metadata` | jsonb | YES | `'{}'::jsonb` | Additional transaction data |
| `created_at` | timestamptz | NO | `now()` | Transaction timestamp |

### **🎁 engagement_rewards**
User engagement reward tracking
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key ✅ |
| `user_id` | uuid | NO | - | FK to user_profiles |
| `reward_type` | text | NO | - | Type of reward |
| `reward_amount` | integer | NO | - | Reward amount |
| `reference_id` | text | YES | - | Reference to triggering action |
| `created_at` | timestamptz | NO | `now()` | Reward timestamp |
| `expires_at` | timestamptz | YES | - | Reward expiration |
| `metadata` | jsonb | YES | `'{}'::jsonb` | Additional reward data |

### **🔓 content_unlocks**
Premium content access tracking
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key ✅ |
| `user_id` | uuid | NO | - | FK to user_profiles |
| `content_id` | text | NO | - | Identifier for unlocked content |
| `content_type` | text | NO | - | Type of content |
| `gem_cost` | integer | NO | - | Gems spent to unlock |
| `unlocked_at` | timestamptz | NO | `now()` | When content was unlocked |
| `expires_at` | timestamptz | YES | - | Content access expiration |

### **🤝 referrals**
User referral system
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key ✅ |
| `referrer_id` | uuid | NO | - | FK to user_profiles (referrer) |
| `new_user_id` | uuid | NO | - | FK to user_profiles (new user) |
| `created_at` | timestamptz | NO | `now()` | Referral timestamp |

---

## 🔗 **Foreign Key Relationships**

### **✅ A/B Testing Cascade Relationships**
| Child Table | Child Column | Parent Table | Parent Column | Delete Rule |
|-------------|--------------|--------------|---------------|-------------|
| `variants` | `experiment_id` | `experiments` | `id` | **CASCADE** ✅ |
| `impressions` | `variant_id` | `variants` | `id` | **CASCADE** ✅ |
| `impressions` | `experiment_id` | `experiments` | `id` | **CASCADE** ✅ |
| `conversions` | `variant_id` | `variants` | `id` | **CASCADE** ✅ |
| `conversions` | `experiment_id` | `experiments` | `id` | **CASCADE** ✅ |
| **NEW: User-Level Tracking** |
| `user_experiment_participation` | `experiment_id` | `experiments` | `id` | **CASCADE** ✅ |
| `user_experiment_participation` | `variant_id` | `variants` | `id` | **CASCADE** ✅ |
| `conversion_attribution` | `conversion_id` | `conversions` | `id` | **CASCADE** ✅ |
| `conversion_attribution` | `experiment_id` | `experiments` | `id` | **CASCADE** ✅ |
| `conversion_attribution` | `variant_id` | `variants` | `id` | **CASCADE** ✅ |

### **🎮 Gamification Relationships**
| Child Table | Child Column | Parent Table | Parent Column | Delete Rule |
|-------------|--------------|--------------|---------------|-------------|
| `gem_transactions` | `user_id` | `user_profiles` | `id` | **CASCADE** |
| `engagement_rewards` | `user_id` | `user_profiles` | `id` | **CASCADE** |
| `content_unlocks` | `user_id` | `user_profiles` | `id` | **CASCADE** |
| `referrals` | `referrer_id` | `user_profiles` | `id` | **CASCADE** |
| `referrals` | `new_user_id` | `user_profiles` | `id` | **CASCADE** |

---

## 🚀 **Key Features & Improvements**

### **🎯 User-Level Conversion Tracking**
- **Problem Solved:** Prevents already-converted users from skewing A/B test results
- **Implementation:** `user_experiment_participation` table tracks each user's first exposure and conversion status
- **Benefits:** Accurate conversion rates, proper statistical analysis, industry-standard A/B testing practices

### **📊 Advanced Attribution Analytics**
- **Conversion Attribution:** `conversion_attribution` table provides detailed attribution analysis
- **Time-to-Conversion:** Track how long users take to convert after first exposure
- **Attribution Confidence:** Measure confidence in attribution methods
- **Value Attribution:** Properly attribute monetary value to experiments

### **🔒 Data Integrity**
- **Unique Constraints:** Prevent duplicate user participations and conversion attributions
- **Referential Integrity:** Comprehensive foreign key relationships with cascade deletes
- **Check Constraints:** Validate data ranges and logical consistency
- **Proper Indexing:** Optimized indexes for query performance

### **📈 Statistical Analysis Ready**
- **Eligibility Tracking:** Know which users were eligible to convert at exposure time  
- **Conversion Windows:** Track conversions within defined time periods
- **Intent-to-Treat Analysis:** Proper cohort analysis from first exposure
- **First Conversion Only:** Eliminate double-counting of conversions per experiment

---

## 🛠️ **Database Maintenance Notes**

### **Performance Indexes**
The following indexes have been created for optimal query performance:

**Impressions Table:**
- `idx_impressions_user_identifier` - User-based queries
- `idx_impressions_user_variant` - User-variant analysis  
- `idx_impressions_first_exposure` - First exposure tracking
- `idx_impressions_eligibility` - GIN index on eligibility status
- `idx_impressions_metadata` - GIN index on metadata
- `idx_impressions_date` - Time-based queries

**Conversions Table:**
- `idx_conversions_user_identifier` - User-based queries
- `idx_conversions_user_variant` - User-variant analysis
- `idx_conversions_first_conversion` - First conversion tracking  
- `idx_conversions_attribution` - Attribution analysis
- `idx_conversions_metadata` - GIN index on metadata
- `idx_conversions_date` - Time-based queries

**User Experiment Participation:**
- `idx_user_exp_participation_user` - User lookup
- `idx_user_exp_participation_exp` - Experiment analysis
- `idx_user_exp_participation_variant` - Variant performance
- `idx_user_exp_participation_eligible` - Eligibility analysis
- `idx_user_exp_participation_converted` - Conversion analysis
- `idx_user_exp_participation_dates` - Date range queries

**Conversion Attribution:**
- `idx_conversion_attribution_exp` - Experiment analysis
- `idx_conversion_attribution_user` - User analysis  
- `idx_conversion_attribution_method` - Attribution method analysis
- `idx_conversion_attribution_time` - Time-to-conversion analysis

### **Data Cleanup & Migration**
- All existing impression and conversion data remains intact
- New columns added with sensible defaults
- Migration is backward compatible
- No data loss during schema updates

---

## 🔧 **Database Functions, Triggers & Views**

### **🚀 Trigger Functions**
Advanced functions that automatically maintain user-level tracking and conversion attribution.

#### **`track_user_experiment_participation()`**
**Purpose:** Automatically tracks user participation in A/B test experiments  
**Trigger:** Fires on every `INSERT` into `impressions` table  
**Functionality:**
- Creates or updates user participation records in `user_experiment_participation`
- Tracks total impressions per user per experiment
- Marks first exposure for statistical analysis
- Handles eligibility verification at exposure time

#### **`track_conversion_attribution()`**
**Purpose:** Automatically attributes conversions to proper A/B test variants  
**Trigger:** Fires on every `INSERT` into `conversions` table  
**Functionality:**
- Links conversions to original experiment exposure
- Calculates time-to-conversion metrics
- Creates attribution records in `conversion_attribution` table
- Updates user participation status with conversion data
- Validates 30-day attribution window

#### **`calculate_ab_test_significance()`**
**Purpose:** Statistical significance calculation for A/B test analysis  
**Parameters:** 
- `experiment_id_param` (UUID) - Experiment to analyze
- `control_variant_id` (UUID) - Control variant for comparison
- `test_variant_id` (UUID) - Test variant to compare
- `confidence_level` (DECIMAL) - Confidence level (default 0.95)

**Returns:**
- `z_score` - Statistical z-score
- `p_value` - Statistical p-value  
- `is_significant` - Boolean significance result
- `confidence_interval_lower` - Lower confidence interval
- `confidence_interval_upper` - Upper confidence interval

### **⚡ Database Triggers**
Automatic data processing triggers that maintain data integrity and user-level tracking.

#### **`trigger_track_user_participation`**
- **Table:** `impressions`
- **Event:** `AFTER INSERT`
- **Function:** `track_user_experiment_participation()`
- **Purpose:** Maintains user-level experiment participation tracking

#### **`trigger_track_conversion_attribution`**
- **Table:** `conversions` 
- **Event:** `AFTER INSERT`
- **Function:** `track_conversion_attribution()`
- **Purpose:** Ensures proper conversion attribution and prevents double-counting

### **📊 Analytics Views**
Pre-built views for efficient A/B testing analytics and reporting.

#### **`ab_test_analytics`**
**Purpose:** Comprehensive A/B test performance view with proper user-level metrics  
**Key Metrics:**
- `eligible_participants` - Users eligible to convert at exposure time
- `eligible_conversions` - Conversions from eligible users only
- `conversion_rate_percent` - Accurate conversion rate (eligible users only)
- `avg_time_to_conversion_hours` - Average time from exposure to conversion
- `total_attributed_value` - Total monetary value attributed to experiments

**Usage Example:**
```sql
SELECT * FROM ab_test_analytics 
WHERE experiment_name = 'Homepage CTA Test'
ORDER BY conversion_rate_percent DESC;
```

**Key Benefits:**
- **Eliminates Bias:** Only counts conversions from eligible users
- **Prevents Double-Counting:** One conversion per user per experiment
- **Industry Standard:** Follows proper A/B testing statistical practices
- **Real-Time:** Updates automatically as data is inserted

---

## 🎯 **A/B Testing Best Practices Implementation**

### **✅ Solved: Already-Converted User Problem**
**Problem:** Users who already converted skewing A/B test results  
**Solution:** User-level tracking with eligibility verification
- ✅ **First Exposure Tracking:** `user_experiment_participation.first_exposure_date`
- ✅ **Eligibility Verification:** `was_eligible_at_exposure` flag  
- ✅ **Conversion Attribution:** Links conversions to original exposures
- ✅ **Window Management:** 30-day attribution window prevents late attribution

### **📈 Statistical Significance Features**
**Industry-Standard Calculations:**
- ✅ **Z-Score Calculation:** Proper two-sample proportion test
- ✅ **P-Value Determination:** Statistical significance testing
- ✅ **Confidence Intervals:** 95%, 99%, and 90% confidence levels
- ✅ **Effect Size Detection:** Minimum detectable effect tracking

### **🔒 Data Integrity Safeguards**
**Automatic Data Quality:**
- ✅ **Referential Integrity:** CASCADE delete relationships
- ✅ **Unique Constraints:** Prevent duplicate participations
- ✅ **Check Constraints:** Validate data ranges and logic
- ✅ **Trigger Validation:** Automatic data consistency checks

### **⚡ Performance Optimizations**
**Query Performance:**
- ✅ **Strategic Indexes:** Optimized for A/B testing queries
- ✅ **GIN Indexes:** Fast JSONB metadata searches
- ✅ **Composite Indexes:** Multi-column query optimization
- ✅ **Analytics Views:** Pre-computed common queries

---

## 🚨 **Important Usage Notes**

### **Data Insertion Requirements**
For the automatic user-level tracking to work properly:

1. **Impressions must include:**
   - `user_identifier` - Consistent user ID across sessions
   - `experiment_id` - Valid experiment reference
   - `variant_id` - Valid variant reference
   - `user_eligibility_status` - JSONB with eligibility criteria

2. **Conversions must include:**
   - `user_identifier` - Same ID used in impressions
   - `experiment_id` - Valid experiment reference  
   - `variant_id` - Valid variant reference

### **Automatic Processing**
When data is inserted:
- ✅ **Impressions** → Triggers create/update user participation records
- ✅ **Conversions** → Triggers create attribution records and update participation
- ✅ **Analytics** → Views automatically reflect new data
- ✅ **Statistics** → Functions available for real-time significance testing

### **Query Examples**
```sql
-- Get experiment performance with proper user-level metrics
SELECT * FROM ab_test_analytics WHERE experiment_name = 'Your Test';

-- Check statistical significance between variants  
SELECT * FROM calculate_ab_test_significance(
    'experiment-uuid'::UUID,
    'control-variant-uuid'::UUID, 
    'test-variant-uuid'::UUID,
    0.95
);

-- Find users with multiple experiment participations
SELECT user_identifier, COUNT(*) as experiment_count
FROM user_experiment_participation 
GROUP BY user_identifier 
HAVING COUNT(*) > 1;
```

---

## 🎉 **Migration Complete!**
Your database now supports enterprise-grade A/B testing with:
- ✅ **User-level conversion tracking** (solves bias problem)
- ✅ **Automatic data processing** (triggers and functions)  
- ✅ **Statistical significance testing** (proper calculations)
- ✅ **Real-time analytics** (optimized views and indexes)
- ✅ **Data integrity protection** (constraints and validations)