# 🗄️ Database Schema Documentation
*Last Updated: May 31 *

## 🏗️ **Database Overview**
This document contains the complete schema documentation for Jason's Personal Website Supabase database, including A/B testing infrastructure, user management, and gamification features.

**Recent Updates:** Enhanced A/B testing with geographic tracking, device analytics, statistical significance features, engagement metrics, and comprehensive data integrity constraints.

---

## 📊 **Tables Overview**

### **🧪 A/B Testing Tables**
- `experiments` - A/B test experiment definitions with statistical significance tracking
- `variants` - A/B test variant configurations
- `impressions` - A/B test impression tracking with geographic, device, and engagement data
- `conversions` - A/B test conversion tracking with attribution and performance metrics

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

### **👁️ impressions**
A/B test impression tracking with comprehensive analytics
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

### **🎯 conversions**
A/B test conversion tracking with attribution analytics
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

### **🎮 Gamification Relationships**
| Child Table | Child Column | Parent Table | Parent Column | Delete Rule |
|-------------|--------------|--------------|---------------|-------------|
| `gem_transactions` | `user_id` | `user_profiles` | `id` | **CASCADE** |
| `engagement_rewards` | `user_id` | `user_profiles` | `id` | **CASCADE** |
| `content_unlocks`