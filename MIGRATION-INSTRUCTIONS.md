# 🚀 SQL Migration Instructions: user_engagement_tracking Table

**Task:** Complete database migration for task 1.2 (Verify impression tracking accuracy)
**Goal:** Fix dashboard pie chart display by preventing conversions without impressions

---

## 📋 **Step 1: Get the SQL**

Run this command to display the SQL migration:

```bash
node create-table-simple.mjs
```

This will output the complete SQL that needs to be executed.

---

## 🌐 **Step 2: Execute in Supabase Console**

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **"SQL Editor"** in the sidebar

2. **Create New Query**
   - Click **"New Query"** or **"+"** button
   - Name it: `Create user_engagement_tracking table`

3. **Copy & Paste SQL**
   - Copy the entire SQL output from Step 1
   - Paste it into the SQL editor

4. **Execute**
   - Click **"Run"** button
   - Wait for execution to complete
   - Verify no errors appear

---

## ✅ **Step 3: Verify Migration**

After executing the SQL, run this verification script:

```bash
node verify-migration.mjs
```

**Expected output:**
- ✅ Table exists and is functional
- ✅ All columns working correctly
- ✅ Insert/query operations successful
- 🎉 Migration verification complete

---

## 🎯 **What This Fixes**

### **Problem:** 
Dashboard pie charts showing impossible data like:
```
(Imp: 0, Conv: 1, Rate: 0.0%)
```

### **Root Cause:**
Users who already converted returning and creating conversions without impressions.

### **Solution:**
- New `user_engagement_tracking` table for return users
- Enhanced impression tracking with eligibility checking
- Prevents already-converted users from contaminating A/B test data
- Maintains UX insights while ensuring clean experiment metrics

---

## 🚨 **If Migration Fails**

If you encounter errors:

1. **Check Supabase permissions** - ensure you have admin access
2. **Try executing statements individually** - split the SQL and run each CREATE statement separately
3. **Check for existing table** - the table might already exist from a previous attempt

---

## 📊 **Expected Results After Migration**

1. **Dashboard pie charts display correctly** (no more impossible 0% rates)
2. **Clean A/B test data** (only eligible users tracked)
3. **Return user behavior captured** (in separate engagement table)
4. **Statistical validity maintained** (proper experiment analysis)

---

## 🎉 **Success Criteria**

- [ ] SQL executes without errors in Supabase console
- [ ] `verify-migration.mjs` shows all tests passing
- [ ] Dashboard pie charts display valid data
- [ ] Task 1.2 can be marked as ✅ Complete

---

*This migration implements industry-standard A/B testing best practices by separating experiment data from engagement analytics.* 