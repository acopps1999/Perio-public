-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admins (
  id integer NOT NULL DEFAULT nextval('admins_id_seq'::regclass),
  user_id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  Password text,
  CONSTRAINT admins_pkey PRIMARY KEY (id),
  CONSTRAINT admins_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.categories (
  id integer NOT NULL DEFAULT nextval('categories_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  CONSTRAINT categories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.competitive_advantage_active_ingredients (
  id integer NOT NULL DEFAULT nextval('competitive_advantage_active_ingredients_id_seq'::regclass),
  product_name character varying NOT NULL,
  ingredient_name character varying NOT NULL,
  advantages text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT competitive_advantage_active_ingredients_pkey PRIMARY KEY (id)
);
CREATE TABLE public.competitive_advantage_competitors (
  id integer NOT NULL DEFAULT nextval('competitive_advantage_competitors_id_seq'::regclass),
  product_name character varying NOT NULL,
  competitor_name character varying NOT NULL,
  advantages text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT competitive_advantage_competitors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.condition_product_research_articles (
  id integer NOT NULL DEFAULT nextval('condition_product_research_articles_id_seq'::regclass),
  procedure_id integer NOT NULL,
  product_id integer NOT NULL,
  title text NOT NULL,
  author text,
  abstract text,
  url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT condition_product_research_articles_pkey PRIMARY KEY (id),
  CONSTRAINT condition_product_research_articles_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT condition_product_research_articles_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures(id)
);
CREATE TABLE public.dentists (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dentists_pkey PRIMARY KEY (id)
);
CREATE TABLE public.patient_types (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT patient_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.phase_specific_usage (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  product_id bigint NOT NULL,
  procedure_id bigint NOT NULL,
  phase_id bigint NOT NULL,
  instructions text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT phase_specific_usage_pkey PRIMARY KEY (id),
  CONSTRAINT phase_specific_usage_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT phase_specific_usage_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures(id),
  CONSTRAINT phase_specific_usage_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.phases(id)
);
CREATE TABLE public.phases (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT phases_pkey PRIMARY KEY (id)
);
CREATE TABLE public.procedure_dentists (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  procedure_id bigint,
  dentist_id bigint,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT procedure_dentists_pkey PRIMARY KEY (id),
  CONSTRAINT procedure_dentists_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures(id),
  CONSTRAINT procedure_dentists_dentist_id_fkey FOREIGN KEY (dentist_id) REFERENCES public.dentists(id)
);
CREATE TABLE public.procedure_patient_types (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  procedure_id bigint,
  patient_type_id bigint,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT procedure_patient_types_pkey PRIMARY KEY (id),
  CONSTRAINT procedure_patient_types_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures(id),
  CONSTRAINT procedure_patient_types_patient_type_id_fkey FOREIGN KEY (patient_type_id) REFERENCES public.patient_types(id)
);
CREATE TABLE public.procedure_phase_products (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  procedure_id bigint,
  phase_id bigint,
  product_id bigint,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  patient_type_id bigint,
  CONSTRAINT procedure_phase_products_pkey PRIMARY KEY (id),
  CONSTRAINT procedure_phase_products_patient_type_id_fkey FOREIGN KEY (patient_type_id) REFERENCES public.patient_types(id),
  CONSTRAINT procedure_phase_products_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.phases(id),
  CONSTRAINT procedure_phase_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT procedure_phase_products_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures(id)
);
CREATE TABLE public.procedure_phases (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  procedure_id bigint,
  phase_id bigint,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  phase_name text,
  CONSTRAINT procedure_phases_pkey PRIMARY KEY (id),
  CONSTRAINT procedure_phases_procedure_id_fkey FOREIGN KEY (procedure_id) REFERENCES public.procedures(id),
  CONSTRAINT procedure_phases_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.phases(id)
);
CREATE TABLE public.procedures (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  category text,
  pitch_points text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  category_id integer,
  patient_type text,
  CONSTRAINT procedures_pkey PRIMARY KEY (id),
  CONSTRAINT procedures_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);
CREATE TABLE public.product_details (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  product_id bigint,
  objection_handling text,
  fact_sheet_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  clinical_evidence text,
  pitch_points text,
  scientific_rationale text,
  procedure_name text,
  product_name text,
  rationale text DEFAULT ''::text,
  procedure_id integer,
  CONSTRAINT product_details_pkey PRIMARY KEY (id),
  CONSTRAINT product_details_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);
CREATE TABLE public.products (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.research_articles (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL,
  procedure_name text,
  product_name text,
  title text,
  author text,
  abstract text,
  url text,
  is_condition_specific boolean,
  updated_at timestamp with time zone,
  CONSTRAINT research_articles_pkey PRIMARY KEY (id)
);