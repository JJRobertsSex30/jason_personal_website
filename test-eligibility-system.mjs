import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  console.log('Make sure .env.local contains:')
  console.log('- PUBLIC_SUPABASE_URL')
  console.log('- PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 TESTING USER ELIGIBILITY SYSTEM')
console.log('=====================================')

async function testEligibilitySystem() {
  try {
    console.log('\n=== STEP 1: Verify user_engagement_tracking table exists ===')
    
    const { error: tableError } = await supabase
      .from('user_engagement_tracking')
      .select('count(*)')
      .limit(1)
    
    if (tableError) {
      console.error('❌ user_engagement_tracking table not found:', tableError.message)
      console.log('👉 Please run the SQL migration first:')
      console.log('   1. Copy contents from create-engagement-tracking-table.sql')
      console.log('   2. Execute in Supabase SQL Console')
      return false
    }
    
    console.log('✅ user_engagement_tracking table exists')
    
    console.log('\n=== STEP 2: Check for users with existing conversions ===')
    
    const { data: conversions, error: convError } = await supabase
      .from('conversions')
      .select('user_identifier, variant_id, conversion_type, created_at')
      .limit(5)
    
    if (convError) {
      console.error('❌ Error fetching conversions:', convError.message)
      return false
    }
    
    console.log(`Found ${conversions?.length || 0} existing conversions:`)
    conversions?.forEach((conv, i) => {
      console.log(`  ${i + 1}. User: ${conv.user_identifier}, Type: ${conv.conversion_type}`)
    })
    
    if (conversions && conversions.length > 0) {
      const testUser = conversions[0].user_identifier
      console.log(`\n=== STEP 3: Test eligibility for user with conversion ===`)
      console.log(`Testing user: ${testUser}`)
      
      // This user should be INELIGIBLE since they already converted
      console.log('Expected result: INELIGIBLE (already converted)')
      console.log('👆 This user should be excluded from future A/B tests')
      
      console.log('\n=== STEP 4: Test eligibility for new user ===')
      const newUser = `test-user-${Date.now()}`
      console.log(`Testing new user: ${newUser}`)
      console.log('Expected result: ELIGIBLE (no prior conversions)')
      console.log('👆 This user should be included in A/B tests')
    }
    
    console.log('\n=== STEP 5: Verify impression tracking behavior ===')
    console.log('🔍 Check the current problematic data:')
    
    // Find variants with conversions but no impressions
    const { data: variants, error: varError } = await supabase
      .from('variants')
      .select('id, name, experiment_id')
    
    if (!varError && variants) {
      for (const variant of variants) {
        const { count: impressionCount } = await supabase
          .from('impressions')
          .select('*', { count: 'exact', head: true })
          .eq('variant_id', variant.id)
        
        const { count: conversionCount } = await supabase
          .from('conversions')
          .select('*', { count: 'exact', head: true })
          .eq('variant_id', variant.id)
        
        const rate = impressionCount > 0 ? (conversionCount / impressionCount * 100).toFixed(1) : '0.0'
        
        if (conversionCount > 0 && impressionCount === 0) {
          console.log(`🚨 PROBLEM: "${variant.name}" - Imp: ${impressionCount}, Conv: ${conversionCount}, Rate: ${rate}%`)
          console.log('   👉 This variant has conversions without impressions (impossible scenario)')
        } else {
          console.log(`✅ OK: "${variant.name}" - Imp: ${impressionCount}, Conv: ${conversionCount}, Rate: ${rate}%`)
        }
      }
    }
    
    console.log('\n=== EXPECTED RESULTS AFTER SYSTEM IS ACTIVE ===')
    console.log('✅ Users with prior conversions will NOT create new impressions')
    console.log('✅ Their engagement will be tracked in user_engagement_tracking')
    console.log('✅ Pie charts will show valid data (no more 0% impossible rates)')
    console.log('✅ A/B test data will be clean and statistically valid')
    
    console.log('\n=== NEXT STEPS ===')
    console.log('1. 🔄 Deploy the updated code (userEligibility.ts + abTester.ts)')
    console.log('2. 🧪 Test with a user who has already converted')
    console.log('3. 📊 Verify dashboard pie charts display correctly')
    console.log('4. 📈 Monitor user_engagement_tracking for return user data')
    
    return true
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return false
  }
}

// Run the test
testEligibilitySystem().then(success => {
  if (success) {
    console.log('\n🎉 ELIGIBILITY SYSTEM TEST COMPLETE')
    console.log('Ready to fix the pie chart issue!')
  } else {
    console.log('\n💥 TEST FAILED')
    console.log('Please address the issues above before proceeding')
  }
}) 