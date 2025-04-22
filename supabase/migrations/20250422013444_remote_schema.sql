

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."dentists" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."dentists" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."dentists_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."dentists_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dentists_id_seq" OWNED BY "public"."dentists"."id";



CREATE TABLE IF NOT EXISTS "public"."patient_types" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."patient_types" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."patient_types_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."patient_types_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."patient_types_id_seq" OWNED BY "public"."patient_types"."id";



CREATE TABLE IF NOT EXISTS "public"."phases" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."phases" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."phases_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."phases_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."phases_id_seq" OWNED BY "public"."phases"."id";



CREATE TABLE IF NOT EXISTS "public"."procedure_dentists" (
    "procedure_id" integer NOT NULL,
    "dentist_id" integer NOT NULL
);


ALTER TABLE "public"."procedure_dentists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."procedure_patient_types" (
    "procedure_id" integer NOT NULL,
    "patient_type_id" integer NOT NULL
);


ALTER TABLE "public"."procedure_patient_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."procedure_phase_products" (
    "procedure_id" integer NOT NULL,
    "phase_id" integer NOT NULL,
    "product_id" integer NOT NULL
);


ALTER TABLE "public"."procedure_phase_products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."procedure_phases" (
    "procedure_id" integer NOT NULL,
    "phase_id" integer NOT NULL
);


ALTER TABLE "public"."procedure_phases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."procedures" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "pitch_points" "text"
);


ALTER TABLE "public"."procedures" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."procedures_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."procedures_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."procedures_id_seq" OWNED BY "public"."procedures"."id";



CREATE TABLE IF NOT EXISTS "public"."product_details" (
    "product_id" integer NOT NULL,
    "usage" "text",
    "rationale" "text",
    "competitive" "text",
    "objection" "text",
    "fact_sheet" "text"
);


ALTER TABLE "public"."product_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."products_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."products_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."products_id_seq" OWNED BY "public"."products"."id";



ALTER TABLE ONLY "public"."dentists" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."dentists_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."patient_types" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."patient_types_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."phases" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."phases_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."procedures" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."procedures_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."products" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."products_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."dentists"
    ADD CONSTRAINT "dentists_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."dentists"
    ADD CONSTRAINT "dentists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_types"
    ADD CONSTRAINT "patient_types_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."patient_types"
    ADD CONSTRAINT "patient_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."phases"
    ADD CONSTRAINT "phases_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."phases"
    ADD CONSTRAINT "phases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."procedure_dentists"
    ADD CONSTRAINT "procedure_dentists_pkey" PRIMARY KEY ("procedure_id", "dentist_id");



ALTER TABLE ONLY "public"."procedure_patient_types"
    ADD CONSTRAINT "procedure_patient_types_pkey" PRIMARY KEY ("procedure_id", "patient_type_id");



ALTER TABLE ONLY "public"."procedure_phase_products"
    ADD CONSTRAINT "procedure_phase_products_pkey" PRIMARY KEY ("procedure_id", "phase_id", "product_id");



ALTER TABLE ONLY "public"."procedure_phases"
    ADD CONSTRAINT "procedure_phases_pkey" PRIMARY KEY ("procedure_id", "phase_id");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."procedures"
    ADD CONSTRAINT "procedures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_details"
    ADD CONSTRAINT "product_details_pkey" PRIMARY KEY ("product_id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."procedure_dentists"
    ADD CONSTRAINT "procedure_dentists_dentist_id_fkey" FOREIGN KEY ("dentist_id") REFERENCES "public"."dentists"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."procedure_dentists"
    ADD CONSTRAINT "procedure_dentists_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."procedure_patient_types"
    ADD CONSTRAINT "procedure_patient_types_patient_type_id_fkey" FOREIGN KEY ("patient_type_id") REFERENCES "public"."patient_types"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."procedure_patient_types"
    ADD CONSTRAINT "procedure_patient_types_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."procedure_phase_products"
    ADD CONSTRAINT "procedure_phase_products_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."procedure_phase_products"
    ADD CONSTRAINT "procedure_phase_products_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."procedure_phase_products"
    ADD CONSTRAINT "procedure_phase_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."procedure_phases"
    ADD CONSTRAINT "procedure_phases_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."procedure_phases"
    ADD CONSTRAINT "procedure_phases_procedure_id_fkey" FOREIGN KEY ("procedure_id") REFERENCES "public"."procedures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_details"
    ADD CONSTRAINT "product_details_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


























































































































































































GRANT ALL ON TABLE "public"."dentists" TO "anon";
GRANT ALL ON TABLE "public"."dentists" TO "authenticated";
GRANT ALL ON TABLE "public"."dentists" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dentists_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dentists_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dentists_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."patient_types" TO "anon";
GRANT ALL ON TABLE "public"."patient_types" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."patient_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."patient_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."patient_types_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."phases" TO "anon";
GRANT ALL ON TABLE "public"."phases" TO "authenticated";
GRANT ALL ON TABLE "public"."phases" TO "service_role";



GRANT ALL ON SEQUENCE "public"."phases_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."phases_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."phases_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."procedure_dentists" TO "anon";
GRANT ALL ON TABLE "public"."procedure_dentists" TO "authenticated";
GRANT ALL ON TABLE "public"."procedure_dentists" TO "service_role";



GRANT ALL ON TABLE "public"."procedure_patient_types" TO "anon";
GRANT ALL ON TABLE "public"."procedure_patient_types" TO "authenticated";
GRANT ALL ON TABLE "public"."procedure_patient_types" TO "service_role";



GRANT ALL ON TABLE "public"."procedure_phase_products" TO "anon";
GRANT ALL ON TABLE "public"."procedure_phase_products" TO "authenticated";
GRANT ALL ON TABLE "public"."procedure_phase_products" TO "service_role";



GRANT ALL ON TABLE "public"."procedure_phases" TO "anon";
GRANT ALL ON TABLE "public"."procedure_phases" TO "authenticated";
GRANT ALL ON TABLE "public"."procedure_phases" TO "service_role";



GRANT ALL ON TABLE "public"."procedures" TO "anon";
GRANT ALL ON TABLE "public"."procedures" TO "authenticated";
GRANT ALL ON TABLE "public"."procedures" TO "service_role";



GRANT ALL ON SEQUENCE "public"."procedures_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."procedures_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."procedures_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_details" TO "anon";
GRANT ALL ON TABLE "public"."product_details" TO "authenticated";
GRANT ALL ON TABLE "public"."product_details" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
