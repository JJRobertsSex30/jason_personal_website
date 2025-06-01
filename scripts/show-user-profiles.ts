#!/usr/bin/env node

import { getRecords, countRecords, getTableSchema } from '../src/lib/database-operations.js';

async function showUserProfiles() {
  console.log('🔍 Fetching User Profiles Data...\n');

  try {
    // First, let's get the count of user profiles
    const { count, error: countError } = await countRecords('user_profiles');
    
    if (countError) {
      console.error('❌ Error counting user profiles:', countError.message);
      return;
    }

    console.log(`📊 Total User Profiles: ${count}\n`);

    if (count === 0) {
      console.log('🚫 No user profiles found in the database.');
      return;
    }

    // Get all user profiles with all columns
    const { data: profiles, error } = await getRecords('user_profiles', {
      orderBy: 'created_at',
      ascending: false // Most recent first
    });

    if (error) {
      console.error('❌ Error fetching user profiles:', error.message);
      return;
    }

    if (!profiles || profiles.length === 0) {
      console.log('🚫 No user profiles data returned.');
      return;
    }

    console.log('👥 User Profiles:');
    console.log('═'.repeat(80));

    profiles.forEach((profile, index) => {
      console.log(`\n🔹 Profile #${index + 1}`);
      console.log(`   📧 Email: ${profile.email || 'N/A'}`);
      console.log(`   🪪 ID: ${profile.id}`);
      console.log(`   💎 Insight Gems: ${profile.insight_gems || 0}`);
      console.log(`   🔗 Referral Code: ${profile.referral_code || 'N/A'}`);
      console.log(`   👤 First Name: ${profile.first_name || 'N/A'}`);
      console.log(`   📅 Created: ${profile.created_at ? new Date(profile.created_at).toLocaleString() : 'N/A'}`);
      console.log(`   📝 Updated: ${profile.updated_at ? new Date(profile.updated_at).toLocaleString() : 'N/A'}`);
      
      // Show any additional fields that might exist
      const knownFields = ['id', 'email', 'insight_gems', 'referral_code', 'first_name', 'created_at', 'updated_at'];
      const additionalFields = Object.keys(profile).filter(key => !knownFields.includes(key));
      
      if (additionalFields.length > 0) {
        console.log(`   📋 Additional Data:`);
        additionalFields.forEach(field => {
          console.log(`      ${field}: ${profile[field]}`);
        });
      }
    });

    console.log('\n═'.repeat(80));
    console.log(`✅ Displayed ${profiles.length} user profile(s)`);

  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

// Also show table schema for reference
async function showTableSchema() {
  console.log('\n📋 User Profiles Table Schema:');
  console.log('═'.repeat(50));
  
  try {
    const { data: schema, error } = await getTableSchema('user_profiles');
    
    if (error) {
      console.log('⚠️ Could not fetch schema details');
      return;
    }

    if (schema && schema.length > 0) {
      schema.forEach(column => {
        console.log(`  📄 ${column.column_name}: ${column.data_type}${column.is_nullable === 'NO' ? ' (NOT NULL)' : ''}`);
      });
    } else {
      console.log('⚠️ No schema information available');
    }
  } catch (err) {
    console.log('⚠️ Schema fetch failed:', err.message);
  }
}

// Run the functions
async function main() {
  await showUserProfiles();
  await showTableSchema();
}

main().catch(console.error); 