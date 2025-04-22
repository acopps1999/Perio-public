-- 1. Core procedure table
CREATE TABLE procedures (
  id          SERIAL    PRIMARY KEY,
  name        TEXT      NOT NULL UNIQUE,
  category    TEXT      NOT NULL,
  pitch_points TEXT
);

-- 2. Phases of care (Prep, Acute, Maintenance, Slight,…)
CREATE TABLE phases (
  id    SERIAL    PRIMARY KEY,
  name  TEXT      NOT NULL UNIQUE
);

-- 3. Link procedures ↔ phases (many-to-many)
CREATE TABLE procedure_phases (
  procedure_id  INTEGER NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  phase_id      INTEGER NOT NULL REFERENCES phases(id)      ON DELETE CASCADE,
  PRIMARY KEY (procedure_id, phase_id)
);

-- 4. Types of providers (Periodontist, Hygienist, etc.)
CREATE TABLE dentists (
  id    SERIAL    PRIMARY KEY,
  name  TEXT      NOT NULL UNIQUE
);

-- 5. Link procedures ↔ dentists (many-to-many)
CREATE TABLE procedure_dentists (
  procedure_id  INTEGER NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  dentist_id    INTEGER NOT NULL REFERENCES dentists(id)   ON DELETE CASCADE,
  PRIMARY KEY (procedure_id, dentist_id)
);

-- 6. Patient‐type lookup (e.g. Type 1, Type 2,…)
CREATE TABLE patient_types (
  id    SERIAL    PRIMARY KEY,
  name  TEXT      NOT NULL UNIQUE
);

-- 7. Link procedures ↔ patient types (many-to-many)
CREATE TABLE procedure_patient_types (
  procedure_id     INTEGER NOT NULL REFERENCES procedures(id)    ON DELETE CASCADE,
  patient_type_id  INTEGER NOT NULL REFERENCES patient_types(id) ON DELETE CASCADE,
  PRIMARY KEY (procedure_id, patient_type_id)
);

-- 8. Products (AO ProVantage Gel, Synvaza, Moisyn,…)
CREATE TABLE products (
  id    SERIAL    PRIMARY KEY,
  name  TEXT      NOT NULL UNIQUE
);

-- 9. Product details (usage, rationale, objection, etc.)
CREATE TABLE product_details (
  product_id   INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  usage        TEXT,
  rationale    TEXT,
  competitive  TEXT,
  objection    TEXT,
  fact_sheet   TEXT
);

-- 10. Which products apply in which phase of which procedure
CREATE TABLE procedure_phase_products (
  procedure_id  INTEGER NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  phase_id      INTEGER NOT NULL REFERENCES phases(id)      ON DELETE CASCADE,
  product_id    INTEGER NOT NULL REFERENCES products(id)    ON DELETE CASCADE,
  PRIMARY KEY (procedure_id, phase_id, product_id)
);