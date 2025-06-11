# 🗄️ Database Schema Documentation
*Last Updated: {current_date}*

## 🏗️ Database Overview
This document provides a detailed overview of the PostgreSQL database schema for the application. It is generated from the DDL (`db4_ddl.sql`) to ensure it reflects the most current structure, including tables for A/B testing, user management, gamification, and analytics.

---

## 📋 Table of Contents
- [experiments](#experiments)
- [user_profiles](#user_profiles)
- [engagement_rewards](#engagement_rewards)
- [gem_transactions](#gem_transactions)
- [quiz_attempts](#quiz_attempts)
- [quiz_results](#quiz_results)
- [referrals](#referrals)
- [user_engagement_tracking](#user_engagement_tracking)
- [user_engagements](#user_engagements)
- [variants](#variants)
- [conversions](#conversions)
- [email_verification_tokens](#email_verification_tokens)
- [impressions](#impressions)
- [user_experiment_participation](#user_experiment_participation)
- [conversion_attribution](#conversion_attribution)

---

## 🏛️ Table Details

### **experiments**
Stores A/B test experiment definitions.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `name` | text | NO | | UNIQUE |
| `description` | text | YES | | |
| `created_at` | timestamptz | NO | `timezone('utc'::text, now())` | |
| `is_active` | bool | YES | `true` | |
| `updated_at` | timestamptz | YES | `now()` | |
| `target_sample_size` | int4 | YES | | |
| `confidence_level` | numeric(3, 2) | YES | `0.95` | CHECK ((confidence_level >= 0.80) AND (confidence_level <= 0.99)) |
| `minimum_detectable_effect` | numeric(5, 4) | YES | `0.05` | |
| `started_at` | timestamptz | YES | | |
| `ended_at` | timestamptz | YES | | |
| `status` | experiment_status_enum | YES | `'draft'::experiment_status_enum` | |

### **user_profiles**
Core user account information, including authentication and gamification details.
| Column | Type | Nullable | Default | Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `email` | text | NO | | UNIQUE |
| `insight_gems` | int4 | NO | `100` | |
| `referral_code` | text | YES | | UNIQUE |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |
| `first_name` | text | YES | | |
| `is_email_verified` | bool | NO | `false` | Tracks if the user's email has been verified. |
| `email_verified_at` | timestamptz | YES | | Timestamp of when the email was verified. |
| `kit_subscriber_id` | text | YES | | ConvertKit subscriber ID. |
| `last_verification_email_sent_at` | timestamptz | YES | | Timestamp of the last verification email sent. |
| `action_token` | uuid | YES | `uuid_generate_v4()` | A secure, single-use token for authorizing actions without a full login session. |
| `kit_state` | text | YES | `'unconfirmed'::text` | Caches the user's state from ConvertKit (e.g., active, cancelled, bounced) for fast filtering on the admin dashboard. |
| `deleted_at` | timestamptz | YES | | Timestamp for soft deletion. If NULL, the user is active. |

### **engagement_rewards**
Tracks gems awarded to users for specific, non-transactional engagements like daily logins.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `user_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `reward_type` | text | NO | | |
| `reward_amount` | int4 | NO | | |
| `created_at` | timestamptz | YES | `now()` | |

### **gem_transactions**
An immutable ledger of all gem credits and debits for a user, with cascade delete.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `user_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `source_engagement_id` | uuid | YES | | |
| `transaction_type` | text | NO | | CHECK ((transaction_type = ANY (ARRAY['CREDIT'::text, 'DEBIT'::text]))) |
| `amount` | int4 | NO | | CHECK ((amount > 0)) |
| `description` | text | YES | | |
| `created_at` | timestamptz | NO | `now()` | |

### **quiz_attempts**
Logs every quiz attempt by a user, including scores and any gems earned.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `user_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `quiz_name` | text | NO | | |
| `score` | int4 | YES | | |
| `result_type` | text | YES | | |
| `earned_gems` | int4 | YES | `0` | |
| `created_at` | timestamptz | YES | `now()` | |

### **quiz_results**
Stores detailed results from user-submitted quizzes.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `user_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `attempt_timestamp` | timestamp | YES | `now()` | |
| `quiz_type` | text | NO | | |
| `quiz_version` | text | YES | `'1.0'::text` | CHECK ((quiz_version ~ '^[0-9]+\.[0-9]+(\.[0-9]+)?$'::text)) |
| `scores` | jsonb | YES | | |
| `result_type` | text | NO | | |
| `result_details` | jsonb | YES | | |
| `questions_and_answers` | jsonb | NO | | |
| `quiz_metadata` | jsonb | YES | | |
| `first_name` | text | YES | | |
| `user_agent` | text | YES | | |
| `ip_address` | inet | YES | | |
| `referrer` | text | YES | | |
| `utm_source` | text | YES | | |
| `utm_medium` | text | YES | | |
| `utm_campaign` | text | YES | | |
| `country_code` | text | YES | | |
| `device_type` | text | YES | | |
| `is_email_verified` | bool | YES | `false` | |
| `verification_timestamp` | timestamp | YES | | |
| `session_identifier` | uuid | YES | | |
| `experiment_data` | jsonb | YES | | |
| `created_at` | timestamp | YES | `now()` | |

### **referrals**
Manages the user referral system.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `referrer_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `new_user_id` | uuid | NO | | UNIQUE, FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `new_user_email` | text | NO | | |
| `created_at` | timestamptz | NO | `now()` | |

### **user_engagement_tracking**
Tracks user engagement events for analytics.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `engagement_type` | text | NO | | |
| `experiment_context` | text | YES | | |
| `variant_context` | text | YES | | |
| `page_url` | text | YES | | |
| `metadata` | jsonb | YES | `'{}'::jsonb` | |
| `created_at` | timestamptz | YES | `timezone('utc'::text, now())` | |

### **user_engagements**
A central log for all significant user actions.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `user_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `event_type` | text | NO | | |
| `event_metadata` | jsonb | YES | | |
| `created_at` | timestamptz | NO | `now()` | |

### **variants**
Stores A/B test variant configurations.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `experiment_id` | uuid | NO | | FOREIGN KEY to experiments(id) ON DELETE CASCADE, UNIQUE with name |
| `name` | text | NO | | UNIQUE with experiment_id |
| `config_json` | jsonb | YES | | |
| `created_at` | timestamptz | NO | `timezone('utc'::text, now())` | |
| `description` | text | YES | | |
| `updated_at` | timestamptz | YES | `now()` | |

### **conversions**
Tracks user conversion events.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `user_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `variant_id` | uuid | NO | | FOREIGN KEY to variants(id) ON DELETE CASCADE |
| `experiment_id` | uuid | NO | | FOREIGN KEY to experiments(id) ON DELETE CASCADE |
| `session_identifier` | text | YES | | |
| `conversion_type` | text | NO | | |
| `details` | jsonb | YES | | |
| `created_at` | timestamptz | NO | `timezone('utc'::text, now())` | |
| `country_code` | varchar(2) | YES | | |
| `device_type` | device_type_enum | YES | | |
| `referrer_source` | varchar(200) | YES | | |
| `utm_source` | varchar(100) | YES | | |
| `utm_medium` | varchar(100) | YES | | |
| `utm_campaign` | varchar(100) | YES | | |
| `conversion_value` | numeric(10, 2) | YES | | CHECK ((conversion_value >= (0)::numeric)) |
| `time_to_convert` | int4 | YES | | |
| `metadata` | jsonb | YES | `'{}'::jsonb` | |
| `is_first_conversion_for_experiment` | bool | YES | `true` | |
| `conversion_attribution_source` | text | YES | `'direct'::text` | |
| `conversion_window_days` | int4 | YES | `30` | |
| `original_exposure_date` | timestamptz | YES | | |
| `conversion_eligibility_verified` | bool | YES | `false` | |
| `conversion_context` | jsonb | YES | `'{}'::jsonb` | |

### **email_verification_tokens**
Stores tokens for email verification links.
| Column | Type | Nullable | Default | Comment |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key. |
| `user_profile_id` | uuid | NO | | FK to user_profiles.id. |
| `token` | text | NO | | Secure, unique verification token. |
| `email` | text | NO | | Email address this token is for. |
| `expires_at` | timestamptz | NO | | When the token becomes invalid. |
| `is_used` | bool | NO | `false` | Whether the token has been successfully used. |
| `used_at` | timestamptz | YES | | Timestamp of when the token was used. |
| `created_at` | timestamptz | NO | `now()` | Token creation timestamp. |
| `experiment_id` | uuid | YES | | The A/B test experiment the user was part of when the token was generated. |
| `variant_id` | uuid | YES | | The specific A/B test variant the user was exposed to when the token was generated. |
| `impression_id` | uuid | YES | | |

### **impressions**
Tracks user impressions for A/B tests.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `user_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `variant_id` | uuid | NO | | FOREIGN KEY to variants(id) ON DELETE CASCADE |
| `session_identifier` | text | YES | | |
| `impression_at` | timestamptz | NO | `now()` | |
| `experiment_id` | uuid | NO | | FOREIGN KEY to experiments(id) ON DELETE CASCADE |
| `page_url` | text | YES | | |
| `user_agent` | text | YES | | |
| `country_code` | varchar(2) | YES | | |
| `region` | varchar(100) | YES | | |
| `city` | varchar(100) | YES | | |
| `device_type` | device_type_enum | YES | | |
| `screen_resolution` | varchar(20) | YES | | |
| `viewport_size` | varchar(20) | YES | | |
| `connection_type` | connection_type_enum | YES | | |
| `language_code` | varchar(10) | YES | | |
| `time_zone` | varchar(50) | YES | | |
| `utm_source` | varchar(100) | YES | | |
| `utm_medium` | varchar(100) | YES | | |
| `utm_campaign` | varchar(100) | YES | | |
| `time_on_page` | int4 | YES | | |
| `scroll_depth_percent` | int4 | YES | | CHECK ((scroll_depth_percent >= 0) AND (scroll_depth_percent <= 100)) |
| `page_load_time` | int4 | YES | | |
| `bounce` | bool | YES | `false` | |
| `is_first_exposure` | bool | YES | `false` | |
| `user_was_eligible` | bool | YES | `true` | |
| `metadata` | jsonb | YES | `'{}'::jsonb` | |
| `user_eligibility_status` | jsonb | YES | `'{}'::jsonb` | |
| `user_context` | jsonb | YES | `'{}'::jsonb` | |

### **user_experiment_participation**
Tracks user participation in experiments to prevent double-counting and for calculating conversion rates.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | uuid | NO | | UNIQUE with experiment_id, FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `experiment_id` | uuid | NO | | UNIQUE with user_id, FOREIGN KEY to experiments(id) ON DELETE CASCADE |
| `variant_id` | uuid | NO | | FOREIGN KEY to variants(id) ON DELETE CASCADE |
| `first_exposure_date` | timestamptz | NO | `now()` | |
| `was_eligible_at_exposure` | bool | NO | `true` | |
| `eligibility_criteria` | jsonb | YES | `'{}'::jsonb` | |
| `total_impressions` | int4 | YES | `1` | |
| `has_converted` | bool | YES | `false` | |
| `first_conversion_date` | timestamptz | YES | | CHECK ((first_conversion_date IS NULL) OR (first_conversion_date >= first_exposure_date)) |
| `conversion_within_window` | bool | YES | `false` | |
| `created_at` | timestamptz | YES | `timezone('utc'::text, now())` | |
| `updated_at` | timestamptz | YES | `now()` | |

### **conversion_attribution**
Detailed attribution for conversions to specific experiments.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PRIMARY KEY |
| `user_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `conversion_id` | uuid | NO | | UNIQUE, FOREIGN KEY to conversions(id) ON DELETE CASCADE |
| `experiment_id` | uuid | NO | | FOREIGN KEY to experiments(id) ON DELETE CASCADE |
| `variant_id` | uuid | NO | | FOREIGN KEY to variants(id) ON DELETE CASCADE |
| `attribution_method` | text | NO | `'first_exposure'::text` | |
| `attribution_confidence` | numeric(3, 2) | YES | `1.00` | CHECK (((attribution_confidence >= (0)::numeric) AND (attribution_confidence <= (1)::numeric))) |
| `time_to_conversion_hours` | int4 | YES | | CHECK ((time_to_conversion_hours >= 0)) |
| `conversion_value_attributed` | numeric(10, 2) | YES | | |
| `created_at` | timestamptz | YES | `timezone('utc'::text, now())` | |