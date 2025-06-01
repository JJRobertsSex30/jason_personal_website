import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 VERIFYING MIGRATION: user_engagement_tracking table')
console.log('=====================================================')

async function verifyMigration() {
  try {
    console.log('\n=== Step 1: Check if table exists ===')
    
    // Try to select from the table - if it works, table exists
    const { error: checkError } = await supabase
      .from('user_engagement_tracking')
      .select('id')
      .limit(1)
    
    if (checkError) {
      console.error('❌ Table does not exist:', checkError.message)
      console.log('\n📋 The table was not created successfully.')
      console.log('💡 Please verify you ran the SQL in Supabase console correctly')
      return false
    }
    
    console.log('✅ Table user_engagement_tracking exists!')
    
    console.log('\n=== Step 2: Test table functionality ===')
    
    // Test insert
    const testRecord = {
      user_identifier: 'test-user-verification',
      engagement_type: 'migration_test',
      experiment_context: 'test_experiment',
      variant_context: 'test_variant',
      page_url: '/test-page',
      metadata: { 
        test: true, 
        purpose: 'migration_verification',
        timestamp: new Date().toISOString()
      }
    }
    
    console.log('🧪 Inserting test record...')
    
    const { data: insertResult, error: insertError } = await supabase
      .from('user_engagement_tracking')
      .insert(testRecord)
      .select()
      .single()
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError.message)
      return false
    }
    
    console.log('✅ Test record inserted successfully!')
    console.log('   ID:', insertResult.id)
    console.log('   Created:', insertResult.created_at)
    
    // Test query
    console.log('\n📊 Testing query functionality...')
    
    const { data: queryResult, error: queryError } = await supabase
      .from('user_engagement_tracking')
      .select('*')
      .eq('engagement_type', 'migration_test')
      .limit(5)
    
    if (queryError) {
      console.error('❌ Query test failed:', queryError.message)
      return false
    }
    
    console.log(`✅ Query successful! Found ${queryResult.length} test records`)
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...')
    
    const { error: deleteError } = await supabase
      .from('user_engagement_tracking')
      .delete()
      .eq('engagement_type', 'migration_test')
    
    if (deleteError) {
      console.log('⚠️  Warning: Could not clean up test records:', deleteError.message)
    } else {
      console.log('✅ Test data cleaned up successfully')
    }
    
    console.log('\n=== Step 3: Verify table schema ===')
    
    // Test all required columns
    const schemaTest = {
      user_identifier: 'schema-test',
      engagement_type: 'schema_verification',
      experiment_context: 'schema_test_experiment',
      variant_context: 'schema_test_variant',
      page_url: '/schema-test',
      metadata: {
        schema_test: true,
        columns_verified: ['id', 'user_identifier', 'engagement_type', 'experiment_context', 'variant_context', 'page_url', 'metadata', 'created_at']
      }
    }
    
    const { data: schemaResult, error: schemaError } = await supabase
      .from('user_engagement_tracking')
      .insert(schemaTest)
      .select()
      .single()
    
    if (schemaError) {
      console.error('❌ Schema test failed:', schemaError.message)
      return false
    }
    
    console.log('✅ All table columns working correctly!')
    
    // Verify required fields
    const requiredFields = ['id', 'user_identifier', 'engagement_type', 'created_at']
    const missingFields = requiredFields.filter(field => !schemaResult[field])
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields)
      return false
    }
    
    console.log('✅ All required fields present and populated')
    
    // Clean up schema test
    await supabase
      .from('user_engagement_tracking')
      .delete()
      .eq('id', schemaResult.id)
    
    console.log('\n🎉 MIGRATION VERIFICATION COMPLETE!')
    console.log('📊 user_engagement_tracking table is fully functional')
    
    return true
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    return false
  }
}

// Run verification
verifyMigration().then(success => {
  if (success) {
    console.log('\n✅ SUCCESS: Migration verified and table is ready!')
    console.log('\n🚀 NEXT STEPS:')
    console.log('1. 🧪 The user eligibility system can now be tested')
    console.log('2. 📊 Dashboard pie charts should display correctly')
    console.log('3. 📈 Return user behavior will be tracked separately')
    console.log('4. 🔧 Update task 1.2 status to Complete')
  } else {
    console.log('\n❌ VERIFICATION FAILED')
    console.log('📋 Please check the SQL migration and try again')
  }
}).catch(error => {
  console.error('Unexpected error:', error)
  process.exit(1)
}) 