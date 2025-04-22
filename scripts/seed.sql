-- 1. Populate Lookup Tables --

INSERT INTO public.phases (name) VALUES ('Acute') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.phases (name) VALUES ('Daily Use') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.phases (name) VALUES ('Maintenance') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.phases (name) VALUES ('Mild') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.phases (name) VALUES ('Moderate') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.phases (name) VALUES ('Prep') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.phases (name) VALUES ('Severe') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.phases (name) VALUES ('Slight') ON CONFLICT (name) DO NOTHING;


INSERT INTO public.dentists (name) VALUES ('General Dentist') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.dentists (name) VALUES ('Hygienist') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.dentists (name) VALUES ('Oncologist') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.dentists (name) VALUES ('Oral Medicine Specialist') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.dentists (name) VALUES ('Oral Pathologist') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.dentists (name) VALUES ('Oral Surgeon') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.dentists (name) VALUES ('Periodontist') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.dentists (name) VALUES ('Prosthodontist') ON CONFLICT (name) DO NOTHING;


INSERT INTO public.patient_types (name) VALUES ('Types 1 to 4') ON CONFLICT (name) DO NOTHING;


INSERT INTO public.products (name) VALUES ('AO ProRinse Hydrating') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.products (name) VALUES ('AO ProToothpaste + AO ProRinse (patient choice)') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.products (name) VALUES ('AO ProVantage Gel') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.products (name) VALUES ('Moisyn') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.products (name) VALUES ('PerioProtect Tray (H2O2)') ON CONFLICT (name) DO NOTHING;
INSERT INTO public.products (name) VALUES ('Synvaza') ON CONFLICT (name) DO NOTHING;


-- 2. Populate Procedures Table --

INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Gingival Recession Surgery', 'Surgical', 'Enhances tissue strength before surgery and supports optimal healing.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Scaling and Root Planing (SRP)', 'Surgical', 'Reduces inflammation and accelerates tissue healing post-procedure.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Oral Lichen Planus', 'Intra-Oral', 'Evidence-based management for a challenging condition with limited treatment options.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Dry Mouth (Radiation/Chemo/Extreme Sensitivity)', 'Intra-Oral', 'Comprehensive management to reduce oral complications of cancer therapy.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Laser Gingivectomy', 'Surgical', 'Minimizes post-laser tissue sensitivity and accelerates epithelialization.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Gingivitis', 'Intra-Oral', 'Stops progression to periodontitis and reduces inflammation.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Denture Stomatitis', 'Intra-Oral', 'Comprehensive approach addressing both tissue inflammation and denture biofilm.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Nicotine Stomatitis', 'Intra-Oral', 'Early management of a potentially precancerous condition.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Implant Placement', 'Surgical', 'Optimizes healing, especially for high-risk patients. Reduces complications.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Soft Tissue Grafting', 'Surgical', 'Promotes faster integration and reduces discomfort. Essential for donor site healing.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Extractions', 'Surgical', 'Reduces dry socket risk and accelerates healing in socket area.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Laser Perio Debridement', 'Surgical', 'Extends laser treatment efficacy by supporting tissue regeneration.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Periodontal Disease', 'Intra-Oral', 'Multi-level approach targeting bacterial imbalance and inflammation.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Xerostomia (Dry Mouth)', 'Intra-Oral', 'Comprehensive management approach that addresses both symptoms and underlying damage.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Tongue Disorders (Geographic, Black Hairy)', 'Intra-Oral', 'Addresses both symptoms and underlying causes of common tongue disorders.');
INSERT INTO public.procedures (name, category, pitch_points) VALUES ('Daily Oral Hygiene (Brushing, Flossing, Rinse)', 'Preventive', 'Comprehensive daily care for optimal oral health maintenance.');


-- 3. Populate Product Details Table --

INSERT INTO public.product_details (product_id, usage, rationale, competitive, objection, fact_sheet) VALUES ((SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'), '2x/day', 'Antioxidant prep enhances tissue strength before surgery.', 'Precisely formulated; better tolerated vs homeopathic rinses.', 'Clinical evidence supports use in wound healing applications.', '#') ON CONFLICT (product_id) DO NOTHING;
INSERT INTO public.product_details (product_id, usage, rationale, competitive, objection, fact_sheet) VALUES ((SELECT id FROM public.products WHERE name = 'Synvaza'), 'Up to 3x/day', 'Forms protective barrier over wound bed to support healing.', 'FDA-cleared wound support with taste patients prefer.', '510k cleared; competitors lack FDA wound claim.', '#') ON CONFLICT (product_id) DO NOTHING;
INSERT INTO public.product_details (product_id, usage, rationale, competitive, objection, fact_sheet) VALUES ((SELECT id FROM public.products WHERE name = 'PerioProtect Tray (H2O2)'), 'Use as directed by dental professional with custom tray', 'Delivers hydrogen peroxide deep into periodontal pockets.', 'Patented seal technology reaches areas brushing and flossing cannot.', 'Clinical studies show significant pocket depth reduction.', '#') ON CONFLICT (product_id) DO NOTHING;
INSERT INTO public.product_details (product_id, usage, rationale, competitive, objection, fact_sheet) VALUES ((SELECT id FROM public.products WHERE name = 'AO ProRinse Hydrating'), 'Rinse as needed throughout day', 'Provides immediate relief for mild dry mouth symptoms.', 'Alcohol-free formula won''t worsen dryness.', 'More economical than competitors for daily use.', '#') ON CONFLICT (product_id) DO NOTHING;
INSERT INTO public.product_details (product_id, usage, rationale, competitive, objection, fact_sheet) VALUES ((SELECT id FROM public.products WHERE name = 'Moisyn'), 'Use as directed throughout day', 'Clinically proven to help with dry mouth where others fail.', '510k cleared vs OTC rinses with no clinical data.', 'Chitosan/arginine technology provides longer-lasting relief.', '#') ON CONFLICT (product_id) DO NOTHING;
INSERT INTO public.product_details (product_id, usage, rationale, competitive, objection, fact_sheet) VALUES ((SELECT id FROM public.products WHERE name = 'AO ProToothpaste + AO ProRinse (patient choice)'), 'Use toothpaste 2x/day and rinse 1-2x/day', 'Provides daily protection and therapeutic benefits.', 'Multiple formula options to address specific patient needs.', 'Personalized approach improves patient compliance.', '#') ON CONFLICT (product_id) DO NOTHING;


-- 4. Populate Join Tables --

-- procedure_phases --
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingival Recession Surgery'), (SELECT id FROM public.phases WHERE name = 'Prep'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingival Recession Surgery'), (SELECT id FROM public.phases WHERE name = 'Acute'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingival Recession Surgery'), (SELECT id FROM public.phases WHERE name = 'Maintenance'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Scaling and Root Planing (SRP)'), (SELECT id FROM public.phases WHERE name = 'Acute'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Scaling and Root Planing (SRP)'), (SELECT id FROM public.phases WHERE name = 'Maintenance'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Oral Lichen Planus'), (SELECT id FROM public.phases WHERE name = 'Slight'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Oral Lichen Planus'), (SELECT id FROM public.phases WHERE name = 'Moderate'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Oral Lichen Planus'), (SELECT id FROM public.phases WHERE name = 'Severe'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Dry Mouth (Radiation/Chemo/Extreme Sensitivity)'), (SELECT id FROM public.phases WHERE name = 'Acute'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Dry Mouth (Radiation/Chemo/Extreme Sensitivity)'), (SELECT id FROM public.phases WHERE name = 'Maintenance'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Gingivectomy'), (SELECT id FROM public.phases WHERE name = 'Acute'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Gingivectomy'), (SELECT id FROM public.phases WHERE name = 'Maintenance'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingivitis'), (SELECT id FROM public.phases WHERE name = 'Slight'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingivitis'), (SELECT id FROM public.phases WHERE name = 'Moderate'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingivitis'), (SELECT id FROM public.phases WHERE name = 'Severe'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Denture Stomatitis'), (SELECT id FROM public.phases WHERE name = 'Slight'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Denture Stomatitis'), (SELECT id FROM public.phases WHERE name = 'Moderate'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Denture Stomatitis'), (SELECT id FROM public.phases WHERE name = 'Severe'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Nicotine Stomatitis'), (SELECT id FROM public.phases WHERE name = 'Slight'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Nicotine Stomatitis'), (SELECT id FROM public.phases WHERE name = 'Moderate'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Nicotine Stomatitis'), (SELECT id FROM public.phases WHERE name = 'Severe'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Implant Placement'), (SELECT id FROM public.phases WHERE name = 'Prep'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Implant Placement'), (SELECT id FROM public.phases WHERE name = 'Acute'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Implant Placement'), (SELECT id FROM public.phases WHERE name = 'Maintenance'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Soft Tissue Grafting'), (SELECT id FROM public.phases WHERE name = 'Prep'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Soft Tissue Grafting'), (SELECT id FROM public.phases WHERE name = 'Acute'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Soft Tissue Grafting'), (SELECT id FROM public.phases WHERE name = 'Maintenance'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Extractions'), (SELECT id FROM public.phases WHERE name = 'Acute'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Extractions'), (SELECT id FROM public.phases WHERE name = 'Maintenance'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Perio Debridement'), (SELECT id FROM public.phases WHERE name = 'Acute'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Perio Debridement'), (SELECT id FROM public.phases WHERE name = 'Maintenance'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Periodontal Disease'), (SELECT id FROM public.phases WHERE name = 'Maintenance'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Xerostomia (Dry Mouth)'), (SELECT id FROM public.phases WHERE name = 'Slight'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Xerostomia (Dry Mouth)'), (SELECT id FROM public.phases WHERE name = 'Mild'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Xerostomia (Dry Mouth)'), (SELECT id FROM public.phases WHERE name = 'Moderate'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Xerostomia (Dry Mouth)'), (SELECT id FROM public.phases WHERE name = 'Severe'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Tongue Disorders (Geographic, Black Hairy)'), (SELECT id FROM public.phases WHERE name = 'Maintenance'));
INSERT INTO public.procedure_phases (procedure_id, phase_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Daily Oral Hygiene (Brushing, Flossing, Rinse)'), (SELECT id FROM public.phases WHERE name = 'Daily Use'));


-- procedure_dentists --
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingival Recession Surgery'), (SELECT id FROM public.dentists WHERE name = 'Periodontist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingival Recession Surgery'), (SELECT id FROM public.dentists WHERE name = 'Oral Surgeon'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Scaling and Root Planing (SRP)'), (SELECT id FROM public.dentists WHERE name = 'Periodontist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Scaling and Root Planing (SRP)'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Scaling and Root Planing (SRP)'), (SELECT id FROM public.dentists WHERE name = 'Hygienist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Oral Lichen Planus'), (SELECT id FROM public.dentists WHERE name = 'Oral Medicine Specialist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Oral Lichen Planus'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Oral Lichen Planus'), (SELECT id FROM public.dentists WHERE name = 'Oral Pathologist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Dry Mouth (Radiation/Chemo/Extreme Sensitivity)'), (SELECT id FROM public.dentists WHERE name = 'Oncologist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Dry Mouth (Radiation/Chemo/Extreme Sensitivity)'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Dry Mouth (Radiation/Chemo/Extreme Sensitivity)'), (SELECT id FROM public.dentists WHERE name = 'Oral Medicine Specialist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Gingivectomy'), (SELECT id FROM public.dentists WHERE name = 'Periodontist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Gingivectomy'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingivitis'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingivitis'), (SELECT id FROM public.dentists WHERE name = 'Periodontist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingivitis'), (SELECT id FROM public.dentists WHERE name = 'Hygienist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Denture Stomatitis'), (SELECT id FROM public.dentists WHERE name = 'Prosthodontist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Denture Stomatitis'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Nicotine Stomatitis'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Nicotine Stomatitis'), (SELECT id FROM public.dentists WHERE name = 'Oral Pathologist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Nicotine Stomatitis'), (SELECT id FROM public.dentists WHERE name = 'Oral Medicine Specialist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Implant Placement'), (SELECT id FROM public.dentists WHERE name = 'Oral Surgeon'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Implant Placement'), (SELECT id FROM public.dentists WHERE name = 'Periodontist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Implant Placement'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Soft Tissue Grafting'), (SELECT id FROM public.dentists WHERE name = 'Periodontist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Soft Tissue Grafting'), (SELECT id FROM public.dentists WHERE name = 'Oral Surgeon'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Extractions'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Extractions'), (SELECT id FROM public.dentists WHERE name = 'Oral Surgeon'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Perio Debridement'), (SELECT id FROM public.dentists WHERE name = 'Periodontist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Perio Debridement'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Periodontal Disease'), (SELECT id FROM public.dentists WHERE name = 'Periodontist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Periodontal Disease'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Xerostomia (Dry Mouth)'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Xerostomia (Dry Mouth)'), (SELECT id FROM public.dentists WHERE name = 'Prosthodontist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Xerostomia (Dry Mouth)'), (SELECT id FROM public.dentists WHERE name = 'Oral Medicine Specialist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Tongue Disorders (Geographic, Black Hairy)'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Tongue Disorders (Geographic, Black Hairy)'), (SELECT id FROM public.dentists WHERE name = 'Oral Medicine Specialist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Daily Oral Hygiene (Brushing, Flossing, Rinse)'), (SELECT id FROM public.dentists WHERE name = 'General Dentist'));
INSERT INTO public.procedure_dentists (procedure_id, dentist_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Daily Oral Hygiene (Brushing, Flossing, Rinse)'), (SELECT id FROM public.dentists WHERE name = 'Hygienist'));


-- procedure_patient_types --
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingival Recession Surgery'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Scaling and Root Planing (SRP)'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Oral Lichen Planus'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Dry Mouth (Radiation/Chemo/Extreme Sensitivity)'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Gingivectomy'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingivitis'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Denture Stomatitis'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Nicotine Stomatitis'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Implant Placement'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Soft Tissue Grafting'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Extractions'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Perio Debridement'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Periodontal Disease'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Xerostomia (Dry Mouth)'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Tongue Disorders (Geographic, Black Hairy)'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));
INSERT INTO public.procedure_patient_types (procedure_id, patient_type_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Daily Oral Hygiene (Brushing, Flossing, Rinse)'), (SELECT id FROM public.patient_types WHERE name = 'Types 1 to 4'));


-- procedure_phase_products --
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingival Recession Surgery'), (SELECT id FROM public.phases WHERE name = 'Prep'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingival Recession Surgery'), (SELECT id FROM public.phases WHERE name = 'Acute'), (SELECT id FROM public.products WHERE name = 'Synvaza'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingival Recession Surgery'), (SELECT id FROM public.phases WHERE name = 'Acute'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingival Recession Surgery'), (SELECT id FROM public.phases WHERE name = 'Maintenance'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Scaling and Root Planing (SRP)'), (SELECT id FROM public.phases WHERE name = 'Acute'), (SELECT id FROM public.products WHERE name = 'Synvaza'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Scaling and Root Planing (SRP)'), (SELECT id FROM public.phases WHERE name = 'Acute'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Scaling and Root Planing (SRP)'), (SELECT id FROM public.phases WHERE name = 'Maintenance'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Oral Lichen Planus'), (SELECT id FROM public.phases WHERE name = 'Slight'), (SELECT id FROM public.products WHERE name = 'Synvaza'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Oral Lichen Planus'), (SELECT id FROM public.phases WHERE name = 'Moderate'), (SELECT id FROM public.products WHERE name = 'Synvaza'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Oral Lichen Planus'), (SELECT id FROM public.phases WHERE name = 'Severe'), (SELECT id FROM public.products WHERE name = 'Synvaza'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Oral Lichen Planus'), (SELECT id FROM public.phases WHERE name = 'Severe'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Dry Mouth (Radiation/Chemo/Extreme Sensitivity)'), (SELECT id FROM public.phases WHERE name = 'Acute'), (SELECT id FROM public.products WHERE name = 'Synvaza'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Dry Mouth (Radiation/Chemo/Extreme Sensitivity)'), (SELECT id FROM public.phases WHERE name = 'Acute'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Dry Mouth (Radiation/Chemo/Extreme Sensitivity)'), (SELECT id FROM public.phases WHERE name = 'Maintenance'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Gingivectomy'), (SELECT id FROM public.phases WHERE name = 'Acute'), (SELECT id FROM public.products WHERE name = 'Synvaza'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Gingivectomy'), (SELECT id FROM public.phases WHERE name = 'Maintenance'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingivitis'), (SELECT id FROM public.phases WHERE name = 'Slight'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingivitis'), (SELECT id FROM public.phases WHERE name = 'Moderate'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Gingivitis'), (SELECT id FROM public.phases WHERE name = 'Severe'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Denture Stomatitis'), (SELECT id FROM public.phases WHERE name = 'Slight'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Denture Stomatitis'), (SELECT id FROM public.phases WHERE name = 'Moderate'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Denture Stomatitis'), (SELECT id FROM public.phases WHERE name = 'Severe'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Nicotine Stomatitis'), (SELECT id FROM public.phases WHERE name = 'Slight'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Nicotine Stomatitis'), (SELECT id FROM public.phases WHERE name = 'Moderate'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Nicotine Stomatitis'), (SELECT id FROM public.phases WHERE name = 'Severe'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Implant Placement'), (SELECT id FROM public.phases WHERE name = 'Prep'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Implant Placement'), (SELECT id FROM public.phases WHERE name = 'Acute'), (SELECT id FROM public.products WHERE name = 'Synvaza'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Implant Placement'), (SELECT id FROM public.phases WHERE name = 'Acute'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Implant Placement'), (SELECT id FROM public.phases WHERE name = 'Maintenance'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Soft Tissue Grafting'), (SELECT id FROM public.phases WHERE name = 'Prep'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Soft Tissue Grafting'), (SELECT id FROM public.phases WHERE name = 'Acute'), (SELECT id FROM public.products WHERE name = 'Synvaza'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Soft Tissue Grafting'), (SELECT id FROM public.phases WHERE name = 'Maintenance'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Extractions'), (SELECT id FROM public.phases WHERE name = 'Acute'), (SELECT id FROM public.products WHERE name = 'Synvaza'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Extractions'), (SELECT id FROM public.phases WHERE name = 'Maintenance'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Perio Debridement'), (SELECT id FROM public.phases WHERE name = 'Acute'), (SELECT id FROM public.products WHERE name = 'Synvaza'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Laser Perio Debridement'), (SELECT id FROM public.phases WHERE name = 'Maintenance'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Periodontal Disease'), (SELECT id FROM public.phases WHERE name = 'Maintenance'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Periodontal Disease'), (SELECT id FROM public.phases WHERE name = 'Maintenance'), (SELECT id FROM public.products WHERE name = 'PerioProtect Tray (H2O2)'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Xerostomia (Dry Mouth)'), (SELECT id FROM public.phases WHERE name = 'Slight'), (SELECT id FROM public.products WHERE name = 'AO ProRinse Hydrating'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Xerostomia (Dry Mouth)'), (SELECT id FROM public.phases WHERE name = 'Mild'), (SELECT id FROM public.products WHERE name = 'Moisyn'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Xerostomia (Dry Mouth)'), (SELECT id FROM public.phases WHERE name = 'Moderate'), (SELECT id FROM public.products WHERE name = 'Moisyn'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Xerostomia (Dry Mouth)'), (SELECT id FROM public.phases WHERE name = 'Severe'), (SELECT id FROM public.products WHERE name = 'Moisyn'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Xerostomia (Dry Mouth)'), (SELECT id FROM public.phases WHERE name = 'Severe'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Tongue Disorders (Geographic, Black Hairy)'), (SELECT id FROM public.phases WHERE name = 'Maintenance'), (SELECT id FROM public.products WHERE name = 'AO ProVantage Gel'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Tongue Disorders (Geographic, Black Hairy)'), (SELECT id FROM public.phases WHERE name = 'Maintenance'), (SELECT id FROM public.products WHERE name = 'Synvaza'));
INSERT INTO public.procedure_phase_products (procedure_id, phase_id, product_id) VALUES ((SELECT id FROM public.procedures WHERE name = 'Daily Oral Hygiene (Brushing, Flossing, Rinse)'), (SELECT id FROM public.phases WHERE name = 'Daily Use'), (SELECT id FROM public.products WHERE name = 'AO ProToothpaste + AO ProRinse (patient choice)'));

