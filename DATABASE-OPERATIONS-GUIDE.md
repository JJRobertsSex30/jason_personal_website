# Database Operations Guide for Cursor AI

This guide explains how to use the database operations module to perform CRUD operations on your Supabase database through Cursor's AI.

## Overview

Instead of using the problematic MCP servers, this project uses a direct TypeScript module (`src/lib/database-operations.ts`) that provides comprehensive CRUD operations for Cursor's AI to interact with your Supabase database.

## Available Functions

### Basic CRUD Operations

#### Reading Data
```typescript
import { getRecords, getRecordById } from './src/lib/database-operations';

// Get all records from a table
const users = await getRecords('users');

// Get records with filtering and pagination
const activeUsers = await getRecords('users', {
  filters: { is_active: true },
  orderBy: 'created_at',
  ascending: false,
  limit: 10
});

// Get a single record by ID
const user = await getRecordById('users', 123);
```

#### Creating Data
```typescript
import { insertRecord, insertRecords } from './src/lib/database-operations';

// Insert a single record
const newUser = await insertRecord('users', {
  name: 'John Doe',
  email: 'john@example.com',
  is_active: true
});

// Insert multiple records
const newUsers = await insertRecords('users', [
  { name: 'Jane Doe', email: 'jane@example.com' },
  { name: 'Bob Smith', email: 'bob@example.com' }
]);
```

#### Updating Data
```typescript
import { updateRecord, updateRecords } from './src/lib/database-operations';

// Update a single record by ID
const updatedUser = await updateRecord('users', 123, {
  name: 'John Updated',
  last_login: new Date().toISOString()
});

// Update multiple records with filters
const updatedUsers = await updateRecords('users', 
  { is_active: false }, 
  { last_login: null }
);
```

#### Deleting Data
```typescript
import { deleteRecord, deleteRecords } from './src/lib/database-operations';

// Delete a single record by ID
const deletedUser = await deleteRecord('users', 123);

// Delete multiple records with filters
const deletedUsers = await deleteRecords('users', {
  is_active: false,
  last_login: null
});
```

### Advanced Operations

#### Raw SQL Queries
```typescript
import { executeQuery } from './src/lib/database-operations';

// Execute complex SQL queries
const result = await executeQuery(`
  SELECT u.name, COUNT(o.id) as order_count
  FROM users u
  LEFT JOIN orders o ON u.id = o.user_id
  WHERE u.created_at > '2023-01-01'
  GROUP BY u.id, u.name
  ORDER BY order_count DESC
  LIMIT 10
`);
```

#### Utility Functions
```typescript
import { countRecords, recordExists, listTables } from './src/lib/database-operations';

// Count records
const userCount = await countRecords('users', { is_active: true });

// Check if record exists
const exists = await recordExists('users', { email: 'test@example.com' });

// List all tables
const tables = await listTables();
```

### Project-Specific Functions

#### A/B Testing Operations
```typescript
import { 
  getExperimentsWithVariants,
  getImpressionsWithExperiments,
  getConversionsWithExperiments 
} from './src/lib/database-operations';

// Get all experiments with their variants
const experiments = await getExperimentsWithVariants();

// Get recent impressions with experiment data
const impressions = await getImpressionsWithExperiments(50);

// Get recent conversions with experiment data
const conversions = await getConversionsWithExperiments(50);
```

## Database Tables in This Project

Based on your database schema, here are the main tables you can work with:

### A/B Testing Tables
- `ab_experiments` - A/B test experiments
- `ab_experiment_variants` - Variants for each experiment
- `ab_test_impressions` - Tracking user impressions
- `ab_test_conversions` - Tracking user conversions

### Content Tables
- `blog_posts` - Blog post content
- `blog_tags` - Tags for blog posts
- `blog_post_tags` - Many-to-many relationship

### Analytics Tables
- `page_views` - Page view tracking
- `quiz_submissions` - Quiz form submissions

### User Management
- `users` - User accounts (if you have authentication)

## Error Handling

All functions return objects with `data` and `error` properties:

```typescript
const result = await getRecords('users');

if (result.error) {
  console.error('Database error:', result.error.message);
  return;
}

// Use result.data safely
console.log('Users:', result.data);
```

## Examples for Common Tasks

### Dashboard Analytics
```typescript
// Get A/B test performance
const experiments = await getExperimentsWithVariants();
const impressions = await countRecords('ab_test_impressions', { 
  experiment_id: experimentId 
});
const conversions = await countRecords('ab_test_conversions', { 
  experiment_id: experimentId 
});

// Calculate conversion rate
const conversionRate = (conversions.count / impressions.count) * 100;
```

### Content Management
```typescript
// Get blog posts with tags
const posts = await getRecords('blog_posts', {
  columns: `
    *,
    blog_post_tags (
      blog_tags (
        name
      )
    )
  `,
  orderBy: 'created_at',
  ascending: false
});

// Create new blog post
const newPost = await insertRecord('blog_posts', {
  title: 'New Post',
  content: 'Post content...',
  status: 'published'
});
```

### User Analytics
```typescript
// Get page view statistics
const pageViews = await getRecords('page_views', {
  filters: { 
    created_at: new Date().toISOString().split('T')[0] // Today
  }
});

// Get quiz submission trends
const quizData = await getRecords('quiz_submissions', {
  orderBy: 'created_at',
  ascending: false,
  limit: 100
});
```

## Best Practices

1. **Always check for errors** before using the data
2. **Use specific columns** instead of `*` when possible for better performance
3. **Apply filters and pagination** for large datasets
4. **Use transactions** for multi-step operations (via raw SQL)
5. **Validate data** before inserting or updating

## Security Notes

- The module uses your existing Supabase client configuration
- All operations respect your Supabase Row Level Security (RLS) policies
- Make sure your Supabase environment variables are properly configured
- Use appropriate authentication for write operations

## Troubleshooting

If you encounter issues:

1. **Check your Supabase configuration** in `src/lib/supabaseClient.ts`
2. **Verify environment variables** are set (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY)
3. **Check database permissions** and RLS policies
4. **Review the browser console** for detailed error messages

## Usage with Cursor AI

Cursor's AI can now use these functions directly. You can ask Cursor to:

- "Show me all active A/B experiments"
- "Create a new blog post with title 'Test Post'"
- "Update user 123's email to 'new@example.com'"
- "Delete all inactive users"
- "Get conversion rate for experiment 'hero-test'"

The AI will automatically import and use the appropriate functions from this module. 