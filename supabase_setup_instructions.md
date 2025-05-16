# Supabase Database Setup Instructions

## Overview
This document provides instructions for setting up the database tables in your Supabase project for the dental health application. The schema includes tables for procedures (conditions), phases, dentist types, patient types, products, and their relationships.

## Setup Steps

### 1. Access Supabase SQL Editor
1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project
3. Click on "SQL Editor" in the left sidebar

### 2. Create Database Tables
1. Copy the contents of the `supabase_schema.sql` file
2. Create a new query in the SQL Editor
3. Paste the SQL contents
4. Click "Run" to execute the SQL and create all tables with their relationships

### 3. Verify Table Creation
After running the SQL, verify that all tables were created successfully by:
1. Going to the "Table Editor" in the Supabase dashboard
2. You should see the following tables:
   - procedures
   - phases
   - dentists
   - patient_types
   - products
   - product_details
   - procedure_phases
   - procedure_dentists
   - procedure_patient_types
   - procedure_phase_products

### 4. Initial Data Setup
The application will populate these tables when you use the "Save Changes" button in the Admin Panel. No manual data entry is required.

## Schema Overview

### Main Tables
- **procedures**: Dental conditions (e.g., Dry Mouth, Gingival Recession)
- **phases**: Treatment phases (e.g., Mild, Moderate, Severe or Prep, Acute, Maintenance)
- **dentists**: Dentist specialist types
- **patient_types**: Patient type classifications (Types 1-4)
- **products**: Dental products for recommendations
- **product_details**: Detailed information about products, including usage instructions, rationale, etc.

### Junction Tables
- **procedure_phases**: Links procedures to applicable phases
- **procedure_dentists**: Links procedures to relevant dentist types
- **procedure_patient_types**: Links procedures to applicable patient types
- **procedure_phase_products**: Links which products are recommended for which procedures in which phases

## Row Level Security (RLS)
The SQL setup enables Row Level Security with policies that allow:
- Authenticated users to read all data
- Authenticated users to insert, update, and delete data

## Performance Considerations
The schema includes indexes on frequently queried columns to improve performance. 