# Instructions to Fix Supabase Database Issues

There are several issues with the Supabase database structure that need to be fixed to make the application function correctly.

## Execute These SQL Scripts in Order

Please run the following SQL scripts in the Supabase SQL Editor, in this order:

1. **Update Product Details Table**
   - Open `update_product_details_table.sql`
   - This script adds the missing columns to the product_details table
   - Execute it in the SQL Editor

2. **Add Research Articles Table**
   - Open `add_research_articles_table.sql`
   - This script creates the research_articles table for storing research papers
   - Execute it in the SQL Editor

3. **Add Phase-Specific Usage Table**
   - Open `add_phase_specific_usage_table.sql`
   - This script creates the phase_specific_usage table for storing phase-specific product usage instructions
   - Execute it in the SQL Editor

4. **Add Patient-Specific Config Table (if not already created)**
   - Open `add_patient_specific_configs_table.sql`
   - This script creates the patient_specific_configs table
   - Execute it in the SQL Editor

## After Running the Scripts

After running all the scripts, restart your application and try the following:

1. Add or edit a product with clinical evidence, pitch points, and research articles
2. Add phase-specific usage instructions for products
3. Create patient-specific product configurations
4. Save changes and verify they persist across page refreshes

## Troubleshooting

If you encounter the "Could not find the 'clinical_evidence' column of 'product_details'" error again:

1. Check that the `update_product_details_table.sql` script executed successfully
2. Run this direct command in the SQL Editor to verify: 
   ```sql
   ALTER TABLE product_details ADD COLUMN IF NOT EXISTS clinical_evidence TEXT;
   ALTER TABLE product_details ADD COLUMN IF NOT EXISTS pitch_points TEXT;
   ```
3. Reload your application after making these changes 