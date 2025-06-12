# 🗄️ Database Schema Documentation
*Last Updated: {current_date}*

## 🏗️ Database Overview
This document provides a detailed overview of the PostgreSQL database schema for the application. It is generated from the DDL (`db4_ddl.sql`) to ensure it reflects the most current structure, including tables for A/B testing, user management, gamification, and analytics.

## 📈 A/B Testing Data Flow
This section explains how the database tables work together to provide a robust A/B testing framework that accurately tracks both anonymous and authenticated users.

### Core Challenge: Tracking Anonymous Users
The primary goal is to track which variant of an experiment an anonymous user sees and to attribute their potential future conversion to that variant. This is challenging because an anonymous user does not have a `user_profile_id` until the moment they convert (e.g., sign up).

Our schema solves this with a "delayed attribution" or "stitching" model, using two parallel identifiers:
- `anonymous_user_id` (TEXT): A temporary, client-side ID stored in the user's browser `localStorage`. It identifies a unique browser session.
- `user_profile_id` (UUID): The permanent, canonical user ID created upon conversion.

### The Lifecycle of an A/B Test Participant

**Step 1: The First Impression (Anonymous User)**
1.  A new, anonymous user visits the site. The client-side `abTester.ts` script generates a unique `anonymous_user_id` and stores it in `localStorage`.
2.  The user is assigned a variant for an active experiment.
3.  An entry is created in the `impressions` table. This entry has:
    - A valid `anonymous_user_id`.
    - `NULL` for `user_profile_id`.
4.  A database trigger automatically creates a corresponding summary record in the `user_experiment_participation` table, also using the `anonymous_user_id`. This table holds the state of the user for that specific experiment (e.g., which variant they are assigned to).

**Step 2: The Conversion (User Becomes Known)**
1.  The user decides to convert (e.g., completes the quiz, submits a form).
2.  The client-side code sends the conversion payload (e.g., email address) **along with the `anonymous_user_id`** from `localStorage` to the server.
3.  The server-side API endpoint performs the "stitching":
    a. Creates a new user in `auth.users` and `user_profiles`, which generates a permanent `user_profile_id`.
    b. Creates an entry in the `conversions` table, linking it to the new `user_profile_id`.
    c. **Crucially, it runs an `UPDATE` query on `impressions` and `user_experiment_participation` to set the `user_profile_id` for all records matching the `anonymous_user_id` it received.**

**Step 3: Returning User (Authenticated)**
1.  When a known user returns to the site, the `abTester.ts` script can identify them via their active session.
2.  The `checkUserEligibilityForABTesting` logic checks if this user has already converted in the past.
3.  If they have, no new "impression" is logged for A/B testing purposes. This is critical for preventing data skew—a returning customer should not count as a new, non-converting impression. This ensures conversion rates remain accurate.

### How the Tables Work Together

- **`experiments`**: Defines the A/B test itself (e.g., "New Homepage Headline").
- **`variants`**: Defines the different versions within an experiment (e.g., Variant A, Variant B).
- **`impressions`**: An **event log** of every time a variant is shown to a user. It's the raw data.
- **`conversions`**: An **event log** of every time a user completes a goal.
- **`user_experiment_participation`**: A **stateful summary table**. It contains one row per user per experiment, acting as the single source of truth for which variant a user belongs to and whether they have converted. This table is the key to efficient and accurate analytics. Instead of expensive queries on the `impressions` table, we can query this summary table to determine conversion rates quickly.

This model ensures that every impression is captured, data remains accurate, and the system can scale efficiently.

---

## 📄 Table of Contents
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
| `id` | uuid | NO | `uuid_generate_v4()` | PRIMARY KEY. This is the `user_profile_id` used in other tables. |
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
| `user_profile_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `anonymous_user_id` | text | YES | | Temporary client-side ID for anonymous users |
| `reward_type` | text | NO | | |
| `reward_amount` | int4 | NO | | |
| `created_at` | timestamptz | YES | `now()` | |

### **gem_transactions**
An immutable ledger of all gem credits and debits for a user, with cascade delete.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PRIMARY KEY |
| `user_profile_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `anonymous_user_id` | text | YES | | Temporary client-side ID for anonymous users |
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
| `user_profile_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `anonymous_user_id` | text | YES | | Temporary client-side ID for anonymous users |
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
| `user_profile_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `anonymous_user_id` | text | YES | | Temporary client-side ID for anonymous users |
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
| `user_profile_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `anonymous_user_id` | text | YES | | Temporary client-side ID for anonymous users |
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
| `user_profile_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `anonymous_user_id` | text | YES | | Temporary client-side ID for anonymous users |
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
| `user_profile_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `anonymous_user_id` | text | YES | | Temporary client-side ID for anonymous users |
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
| `user_profile_id` | uuid | NO | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE |
| `anonymous_user_id` | text | YES | | Temporary client-side ID for anonymous users |
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
A stateful summary table tracking which variant a user is assigned to for a given experiment, whether they have converted, and when. It is the single source of truth for A/B testing analytics.
| Column | Type | Nullable | Default | Constraints | Comment |
|---|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PRIMARY KEY | |
| `user_profile_id` | uuid | YES | | FOREIGN KEY to user_profiles(id) ON DELETE CASCADE | Foreign key to user_profiles.id. |
| `experiment_id` | uuid | NO | | FOREIGN KEY to experiments(id) ON DELETE CASCADE | |
| `variant_id` | uuid | NO | | FOREIGN KEY to variants(id) ON DELETE CASCADE | |
| `first_exposure_date` | timestamptz | NO | `now()` | | |
| `was_eligible_at_exposure` | bool | NO | `true` | | |
| `eligibility_criteria` | jsonb | YES | `'{}'::jsonb` | | |
| `total_impressions` | int4 | YES | `1` | | |
| `has_converted` | bool | YES | `false` | | |
| `first_conversion_date` | timestamptz | YES | | | |
| `conversion_within_window` | bool | YES | `false` | | |
| `created_at` | timestamptz | YES | `timezone('utc'::text, now())` | | |
| `updated_at` | timestamptz | YES | `now()` | | |
| `anonymous_user_id` | text | YES | | | Temporary client-side ID for anonymous users. |

**Indexes:**
- `uidx_participation_anonymous_id` (UNIQUE, btree): ON (anonymous_user_id, experiment_id) WHERE ((user_profile_id IS NULL) AND (anonymous_user_id IS NOT NULL))
- `uidx_participation_profile_id` (UNIQUE, btree): ON (user_profile_id, experiment_id) WHERE (user_profile_id IS NOT NULL)
- `idx_user_experiment_participation_anonymous_user_id` (btree): ON (anonymous_user_id)
- `idx_user_exp_participation_user_id` (btree): ON (user_profile_id)

### **conversion_attribution**
Links a specific conversion event back to the experiment and variant that influenced it.
| Column | Type | Nullable | Default | Constraints |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | PRIMARY KEY |
| `user_profile_id` | uuid | YES | | The permanent user ID after conversion. |
| `anonymous_user_id` | text | YES | | The anonymous ID associated with the conversion. |
| `conversion_id` | uuid | NO | | UNIQUE, FOREIGN KEY to conversions(id) ON DELETE CASCADE |
| `experiment_id` | uuid | NO | | FOREIGN KEY to experiments(id) ON DELETE CASCADE |
| `variant_id` | uuid | NO | | FOREIGN KEY to variants(id) ON DELETE CASCADE |
| `attribution_method` | text | NO | `'first_exposure'::text` | |
| `attribution_confidence` | numeric(3, 2) | YES | `1.00` | CHECK (((attribution_confidence >= (0)::numeric) AND (attribution_confidence <= (1)::numeric))) |
| `time_to_conversion_hours` | int4 | YES | | CHECK ((time_to_conversion_hours >= 0)) |
| `conversion_value_attributed` | numeric(10, 2) | YES | | |
| `created_at` | timestamptz | YES | `timezone('utc'::text, now())` | |