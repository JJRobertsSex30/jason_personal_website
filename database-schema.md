# 🗄️ Database Schema Documentation
*Last Updated: 2024-07-29*

## 🏗️ Database Overview
This document contains the complete schema documentation for the Supabase database, generated from the live schema. It reflects the most current structure, including A/B testing, user management, analytics, and gamification features.

---

## 📊 Tables Overview
The following is a summary of all tables present in the live database.

### **🧪 A/B Testing & Analytics**
- `ab_test_analytics`: **NEW** - A summary view for aggregated A/B test results.
- `conversion_attribution`: **NEW** - Detailed attribution for conversions to specific experiments.
- `conversions`: Tracks user conversion events.
- `daily_aggregated_analytics`: **NEW** - Stores daily statistical rollups for performance monitoring.
- `experiments`: A/B test experiment definitions.
- `impressions`: Tracks user impressions for A/B tests.
- `page_view_metrics`: **NEW** - Detailed analytics for individual page views.
- `user_experiment_participation`: **NEW** - Tracks user participation in experiments to prevent double-counting.
- `variants`: A/B test variant configurations.

### **👥 User Management & Engagement**
- `user_profiles`: Core user account information.
- `user_engagements`: **NEW** - A central log for all significant user actions.
- `user_engagement_metrics`: **NEW** - Detailed engagement statistics.
- `email_verification_tokens`: **NEW** - Stores tokens for verifying user emails.
- `events`: **NEW** - A generic event-tracking table.
- `referrals`: **NEW** - Manages the user referral system.

### **💎 Gamification**
- `gem_transactions`: **NEW** - An immutable ledger of all "Insight Gem" transactions.

### **📋 Quiz**
- `quiz_results`: Stores results from user-submitted quizzes.

---

## 🏛️ Table Details

### **ab_test_analytics**
A summary view for aggregated A/B test results.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `experiment_id` | uuid | YES | `null` |
| `experiment_name` | text | YES | `null` |
| `variant_id` | uuid | YES | `null` |
| `variant_name` | text | YES | `null` |
| `eligible_participants` | bigint | YES | `null` |
| `eligible_conversions` | bigint | YES | `null` |
| `conversion_rate_percent` | numeric | YES | `null` |
| `avg_time_to_conversion_hours` | numeric | YES | `null` |
| `total_attributed_value` | numeric | YES | `null` |

### **conversion_attribution**
Detailed attribution for conversions to specific experiments.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `conversion_id` | uuid | NO | `null` |
| `user_identifier` | text | NO | `null` |
| `experiment_id` | uuid | NO | `null` |
| `variant_id` | uuid | NO | `null` |
| `attribution_method` | text | NO | `'first_exposure'::text` |
| `attribution_confidence` | numeric | YES | `1.00` |
| `time_to_conversion_hours` | integer | YES | `null` |
| `conversion_value_attributed` | numeric | YES | `null` |
| `created_at` | timestamp with time zone | YES | `timezone('utc'::text, now())` |

### **conversions**
Tracks user conversion events.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `extensions.uuid_generate_v4()` |
| `variant_id` | uuid | NO | `null` |
| `experiment_id` | uuid | NO | `null` |
| `user_identifier` | text | YES | `null` |
| `session_identifier` | text | YES | `null` |
| `conversion_type` | text | NO | `null` |
| `details` | jsonb | YES | `null` |
| `created_at` | timestamp with time zone | NO | `timezone('utc'::text, now())` |
| `country_code` | character varying | YES | `null` |
| `device_type` | USER-DEFINED | YES | `null` |
| `referrer_source` | character varying | YES | `null` |
| `utm_source` | character varying | YES | `null` |
| `utm_medium` | character varying | YES | `null` |
| `utm_campaign` | character varying | YES | `null` |
| `conversion_value` | numeric | YES | `null` |
| `metadata` | jsonb | YES | `'{}'::jsonb` |
| `is_first_conversion_for_experiment` | boolean | YES | `true` |
| `conversion_attribution_source` | text | YES | `'direct'::text` |
| `conversion_window_days` | integer | YES | `30` |
| `original_exposure_date` | timestamp with time zone | YES | `null` |
| `conversion_eligibility_verified` | boolean | YES | `false` |
| `conversion_context` | jsonb | YES | `'{}'::jsonb` |
| `time_to_convert` | integer | YES | `null` |

### **daily_aggregated_analytics**
Stores daily statistical rollups for performance monitoring.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `log_date` | date | NO | `null` |
| `total_users` | integer | YES | `null` |
| `new_users` | integer | YES | `null` |
| `active_users` | integer | YES | `null` |
| `total_sessions` | integer | YES | `null` |
| `avg_session_duration_seconds` | numeric | YES | `null` |
| `total_page_views` | integer | YES | `null` |
| `bounce_rate` | numeric | YES | `null` |
| `total_conversions` | integer | YES | `null` |
| `conversion_rate` | numeric | YES | `null` |
| `total_revenue` | numeric | YES | `null` |
| `arpu` | numeric | YES | `null` |
| `created_at` | timestamp with time zone | YES | `now()` |

### **email_verification_tokens**
Stores tokens for verifying user emails.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `extensions.uuid_generate_v4()` |
| `user_id` | uuid | NO | `null` |
| `token` | text | NO | `null` |
| `expires_at` | timestamp with time zone | NO | `(now() + '1 day'::interval)` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `is_used` | boolean | NO | `false` |
| `email` | text | YES | `null` |

### **events**
A generic event-tracking table.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `name` | text | NO | `null` |
| `payload` | jsonb | YES | `null` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `user_id` | uuid | YES | `null` |
| `session_id` | uuid | YES | `null` |

### **experiments**
A/B test experiment definitions.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `extensions.uuid_generate_v4()` |
| `name` | text | NO | `null` |
| `description` | text | YES | `null` |
| `is_active` | boolean | YES | `true` |
| `created_at` | timestamp with time zone | NO | `timezone('utc'::text, now())` |
| `updated_at` | timestamp with time zone | YES | `now()` |
| `confidence_level` | numeric | YES | `0.95` |
| `status` | USER-DEFINED | YES | `'draft'::experiment_status_enum` |
| `target_sample_size` | integer | YES | `null` |
| `minimum_detectable_effect` | numeric | YES | `0.0500` |
| `started_at` | timestamp with time zone | YES | `null` |
| `ended_at` | timestamp with time zone | YES | `null` |

### **gem_transactions**
An immutable ledger of all "Insight Gem" transactions.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | `null` |
| `transaction_type` | USER-DEFINED | NO | `null` |
| `amount` | integer | NO | `null` |
| `description` | text | YES | `null` |
| `related_entity_id` | uuid | YES | `null` |
| `related_entity_type` | text | YES | `null` |
| `created_at` | timestamp with time zone | YES | `timezone('utc'::text, now())` |
| `balance_after_transaction` | integer | YES | `null` |

### **impressions**
Tracks user impressions for A/B tests.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `extensions.uuid_generate_v4()` |
| `variant_id` | uuid | NO | `null` |
| `experiment_id` | uuid | NO | `null` |
| `user_identifier` | uuid | NO | `null` |
| `impression_at` | timestamp with time zone | NO | `now()` |
| `page_url` | text | YES | `null` |
| `user_agent` | text | YES | `null` |
| `country_code` | character varying | YES | `null` |
| `region` | character varying | YES | `null` |
| `city` | character varying | YES | `null` |
| `device_type` | USER-DEFINED | YES | `null` |
| `screen_resolution` | character varying | YES | `null` |
| `viewport_size` | character varying | YES | `null` |
| `connection_type` | USER-DEFINED | YES | `null` |
| `language_code` | character varying | YES | `null` |
| `time_zone` | character varying | YES | `null` |
| `utm_source` | character varying | YES | `null` |
| `utm_medium` | character varying | YES | `null` |
| `utm_campaign` | character varying | YES | `null` |
| `session_identifier` | uuid | YES | `null` |
| `metadata` | jsonb | YES | `'{}'::jsonb` |
| `is_first_exposure` | boolean | YES | `true` |
| `user_was_eligible` | boolean | YES | `true` |
| `user_eligibility_status` | jsonb | YES | `'{}'::jsonb` |
| `user_context` | jsonb | YES | `'{}'::jsonb` |
| `time_on_page` | integer | YES | `null` |
| `scroll_depth_percent` | integer | YES | `null` |
| `page_load_time` | integer | YES | `null` |
| `bounce` | boolean | YES | `false` |

### **page_view_metrics**
Detailed analytics for individual page views.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `page_url` | text | NO | `null` |
| `user_identifier` | text | YES | `null` |
| `session_id` | uuid | YES | `null` |
| `view_timestamp` | timestamp with time zone | YES | `timezone('utc'::text, now())` |
| `time_on_page_seconds` | integer | YES | `null` |
| `scroll_depth_percentage` | numeric | YES | `null` |
| `engagement_events` | jsonb | YES | `null` |
| `is_unique_view` | boolean | YES | `true` |
| `referrer` | text | YES | `null` |
| `device_type` | text | YES | `null` |
| `country` | text | YES | `null` |

### **quiz_results**
Stores results from user-submitted quizzes.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `extensions.uuid_generate_v4()` |
| `quiz_type` | text | NO | `null` |
| `scores` | jsonb | YES | `null` |
| `result_type` | text | NO | `null` |
| `result_details` | jsonb | YES | `null` |
| `questions_and_answers` | jsonb | NO | `null` |
| `email` | text | NO | `null` |
| `email_verified` | boolean | YES | `false` |
| `completed_at` | timestamp with time zone | YES | `now()` |
| `verification_requested_at` | timestamp with time zone | YES | `null` |
| `verification_completed_at` | timestamp with time zone | YES | `null` |
| `utm_source` | text | YES | `null` |
| `utm_medium` | text | YES | `null` |
| `utm_campaign` | text | YES | `null` |
| `user_identifier` | text | YES | `null` |
| `quiz_version` | text | YES | `'1.0'::text` |
| `quiz_metadata` | jsonb | YES | `null` |
| `email_validation_status` | jsonb | YES | `null` |
| `referrer_source` | text | YES | `null` |
| `ip_address` | inet | YES | `null` |
| `user_agent` | text | YES | `null` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `updated_at` | timestamp with time zone | YES | `now()` |

### **referrals**
Manages the user referral system.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `referrer_id` | uuid | NO | `null` |
| `referred_id` | uuid | NO | `null` |
| `status` | USER-DEFINED | YES | `'pending'::referral_status` |
| `created_at` | timestamp with time zone | YES | `timezone('utc'::text, now())` |
| `confirmed_at` | timestamp with time zone | YES | `null` |
| `reward_granted` | boolean | YES | `false` |

### **user_engagement_metrics**
Detailed engagement statistics.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `user_id` | uuid | NO | `null` |
| `total_sessions` | integer | YES | `0` |
| `average_session_duration` | interval | YES | `'00:00:00'::interval` |
| `total_time_spent` | interval | YES | `'00:00:00'::interval` |
| `last_seen` | timestamp with time zone | YES | `null` |
| `total_logins` | integer | YES | `0` |
| `total_engagements` | integer | YES | `0` |
| `engagement_score` | numeric | YES | `0` |
| `updated_at` | timestamp with time zone | YES | `now()` |

### **user_engagements**
A central log for all significant user actions.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_id` | uuid | NO | `null` |
| `event_type` | text | NO | `null` |
| `event_metadata` | jsonb | YES | `'{}'::jsonb` |
| `created_at` | timestamp with time zone | YES | `timezone('utc'::text, now())` |
| `value` | integer | YES | `0` |

### **user_experiment_participation**
Tracks user participation in experiments to prevent double-counting.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `gen_random_uuid()` |
| `user_identifier` | text | NO | `null` |
| `experiment_id` | uuid | NO | `null` |
| `variant_id` | uuid | NO | `null` |
| `first_exposure_date` | timestamp with time zone | NO | `now()` |
| `was_eligible_at_exposure` | boolean | NO | `true` |
| `created_at` | timestamp with time zone | YES | `now()` |
| `last_updated_at` | timestamp with time zone | YES | `now()` |

### **user_profiles**
Core user account information.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `extensions.uuid_generate_v4()` |
| `email` | text | NO | `null` |
| `first_name` | text | YES | `null` |
| `is_email_verified` | boolean | NO | `false` |
| `email_verified_at` | timestamp with time zone | YES | `null` |
| `insight_gems` | integer | NO | `100` |
| `referral_code` | text | YES | `null` |
| `created_at` | timestamp with time zone | NO | `now()` |
| `updated_at` | timestamp with time zone | NO | `now()` |
| `kit_state` | text | YES | `'unconfirmed'::text` |
| `kit_subscriber_id` | text | YES | `null` |
| `last_verification_email_sent_at` | timestamp with time zone | YES | `null` |

### **variants**
A/B test variant configurations.
| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | NO | `extensions.uuid_generate_v4()` |
| `experiment_id` | uuid | NO | `null` |
| `name` | text | NO | `null` |
| `description` | text | YES | `null` |
| `config_json` | jsonb | YES | `null` |
| `created_at` | timestamp with time zone | NO | `timezone('utc'::text, now())` |
| `updated_at` | timestamp with time zone | YES | `now()` |