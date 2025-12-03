/**
 * Diagnose why Moisyn isn't being found
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

async function diagnose() {
  console.log('🔍 DIAGNOSING MOISYN QUERY ISSUE\n');

  // Check 1: Does Moisyn exist in products table?
  console.log('1️⃣ Checking products table...');
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, name')
    .ilike('name', '%moisyn%');

  if (prodError) {
    console.error('   ❌ Error:', prodError);
  } else {
    console.log(`   ✅ Found ${products.length} product(s):`, products);
  }

  if (products && products.length > 0) {
    const productId = products[0].id;
    console.log(`\n   Using product_id: ${productId}\n`);

    // Check 2: Are there product_details for Moisyn?
    console.log('2️⃣ Checking product_details table...');
    const { data: details, error: detailsError } = await supabase
      .from('product_details')
      .select('id, product_id, procedure_id')
      .eq('product_id', productId);

    if (detailsError) {
      console.error('   ❌ Error:', detailsError);
    } else {
      console.log(`   ✅ Found ${details.length} product_detail record(s):`, details);
    }

    // Check 3: Are there procedure_phase_products for Moisyn?
    console.log('\n3️⃣ Checking procedure_phase_products table...');
    const { data: ppp, error: pppError } = await supabase
      .from('procedure_phase_products')
      .select('id, product_id, procedure_id, phase_id, patient_type_id')
      .eq('product_id', productId);

    if (pppError) {
      console.error('   ❌ Error:', pppError);
    } else {
      console.log(`   ✅ Found ${ppp.length} procedure_phase_product record(s):`, ppp);
    }

    // Check 4: Does the view return Moisyn?
    console.log('\n4️⃣ Checking v_product_procedure_complete view...');
    const { data: viewData, error: viewError } = await supabase
      .from('v_product_procedure_complete')
      .select('*')
      .ilike('product_name', '%moisyn%');

    if (viewError) {
      console.error('   ❌ Error:', viewError);
    } else {
      console.log(`   ✅ Found ${viewData.length} row(s) in view`);
      if (viewData.length > 0) {
        console.log('   Sample row:', JSON.stringify(viewData[0], null, 2));
      }
    }

    // Check 5: Test the exact query that structured service uses
    console.log('\n5️⃣ Testing exact structured query (ILIKE %moisyn%)...');
    let query = supabase
      .from('v_product_procedure_complete')
      .select('*');

    query = query.or('product_name.ilike.%moisyn%');
    query = query.limit(50);

    const { data: structuredData, error: structuredError } = await query;

    if (structuredError) {
      console.error('   ❌ Error:', structuredError);
    } else {
      console.log(`   ✅ Found ${structuredData.length} row(s)`);
      if (structuredData.length > 0) {
        console.log('   Results:', structuredData.map(r => ({
          product: r.product_name,
          procedure: r.procedure_name,
          phase: r.phase_name
        })));
      }
    }
  }

  console.log('\n✅ Diagnosis complete\n');
}

diagnose();
