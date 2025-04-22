import json
import os

# Define input and output file paths
json_file_path = os.path.join('src', 'conditions_complete.json')
sql_file_path = 'seed.sql'

# --- Helper function to generate INSERT statements with subqueries for FKs ---
def generate_insert(table, columns, values_list, on_conflict_action=None):
    """Generates INSERT statements, handling subqueries for foreign keys and ON CONFLICT."""
    sql_lines = []
    for values in values_list:
        formatted_values = []
        for val in values:
            if isinstance(val, dict) and 'subquery' in val:
                # Handle subquery for foreign keys
                subquery_table = val['subquery']['table']
                subquery_column = val['subquery']['column']
                subquery_value = val['subquery']['value'].replace("'", "''") # Escape single quotes
                formatted_values.append(f"(SELECT id FROM public.{subquery_table} WHERE {subquery_column} = '{subquery_value}')")
            elif isinstance(val, str):
                formatted_values.append(f"'{val.replace("'", "''")}'") # Escape single quotes
            elif val is None:
                 formatted_values.append("NULL")
            else:
                formatted_values.append(str(val)) # Numbers or others
        base_insert = f"INSERT INTO public.{table} ({', '.join(columns)}) VALUES ({', '.join(formatted_values)})"
        if on_conflict_action:
            sql_lines.append(f"{base_insert} {on_conflict_action};")
        else:
            sql_lines.append(f"{base_insert};")
    return "\n".join(sql_lines)

# --- Main script logic ---
try:
    # 1. Read JSON data
    with open(json_file_path, 'r') as f:
        conditions_data = json.load(f)

    # 2. Extract unique lookup values
    phases = set()
    dentists = set()
    patient_types = set()
    products = set()
    all_product_details = {} # Store details keyed by product name to avoid duplicates

    for condition in conditions_data:
        # Phases from 'phases' array and 'products' keys
        if 'phases' in condition:
            for phase in condition['phases']:
                phases.add(phase)
        if 'products' in condition:
            for phase in condition['products']:
                phases.add(phase)
                for product in condition['products'][phase]:
                     # Handle potential combined names like "AO ProToothpaste + AO ProRinse (patient choice)"
                     # For simplicity, treat combined names as single products for now.
                     # A more robust solution might split them if needed.
                     products.add(product)

        # Dentists
        if 'dds' in condition:
            for dds in condition['dds']:
                dentists.add(dds)

        # Patient Types (Treating ranges like 'Types 1 to 4' as single entries)
        if 'patientType' in condition:
            patient_types.add(condition['patientType'])

        # Products from productDetails and collect details
        if 'productDetails' in condition:
            for product_name, details in condition['productDetails'].items():
                products.add(product_name)
                if product_name not in all_product_details:
                    all_product_details[product_name] = details


    # 3. Generate SQL for lookup tables
    sql_output = []
    sql_output.append("-- 1. Populate Lookup Tables --\n")

    if phases:
        phase_values = [(p,) for p in sorted(list(phases))]
        sql_output.append(generate_insert('phases', ['name'], phase_values, on_conflict_action="ON CONFLICT (name) DO NOTHING"))
        sql_output.append("\n")

    if dentists:
        dentist_values = [(d,) for d in sorted(list(dentists))]
        sql_output.append(generate_insert('dentists', ['name'], dentist_values, on_conflict_action="ON CONFLICT (name) DO NOTHING"))
        sql_output.append("\n")

    if patient_types:
        patient_type_values = [(pt,) for pt in sorted(list(patient_types))]
        sql_output.append(generate_insert('patient_types', ['name'], patient_type_values, on_conflict_action="ON CONFLICT (name) DO NOTHING"))
        sql_output.append("\n")

    if products:
        product_values = [(p,) for p in sorted(list(products))]
        sql_output.append(generate_insert('products', ['name'], product_values, on_conflict_action="ON CONFLICT (name) DO NOTHING"))
        sql_output.append("\n")


    # 4. Generate SQL for procedures table
    sql_output.append("-- 2. Populate Procedures Table --\n")
    procedure_values = []
    for condition in conditions_data:
        procedure_values.append((
            condition.get('name'),
            condition.get('category'),
            condition.get('pitchPoints')
        ))
    if procedure_values:
        sql_output.append(generate_insert('procedures', ['name', 'category', 'pitch_points'], procedure_values))
        sql_output.append("\n")

    # 5. Generate SQL for product_details table
    sql_output.append("-- 3. Populate Product Details Table --\n")
    product_detail_values = []
    for product_name, details in all_product_details.items():
         product_detail_values.append((
             {'subquery': {'table': 'products', 'column': 'name', 'value': product_name}},
             details.get('usage'),
             details.get('rationale'),
             details.get('competitive'),
             details.get('objection'),
             details.get('factSheet')
         ))
    if product_detail_values:
        sql_output.append(generate_insert(
            'product_details',
            ['product_id', 'usage', 'rationale', 'competitive', 'objection', 'fact_sheet'],
            product_detail_values,
            on_conflict_action="ON CONFLICT (product_id) DO NOTHING" # Use DO NOTHING to avoid overwriting if product details appear multiple times
        ))
        sql_output.append("\n")


    # 6. Generate SQL for join tables
    sql_output.append("-- 4. Populate Join Tables --\n")
    procedure_phases_values = []
    procedure_dentists_values = []
    procedure_patient_types_values = []
    procedure_phase_products_values = []

    for condition in conditions_data:
        proc_name = condition.get('name')
        if not proc_name: continue # Skip if procedure name is missing

        proc_subquery = {'subquery': {'table': 'procedures', 'column': 'name', 'value': proc_name}}

        # procedure_phases
        if 'phases' in condition:
            for phase_name in condition['phases']:
                phase_subquery = {'subquery': {'table': 'phases', 'column': 'name', 'value': phase_name}}
                procedure_phases_values.append((proc_subquery, phase_subquery))

        # procedure_dentists
        if 'dds' in condition:
            for dds_name in condition['dds']:
                dds_subquery = {'subquery': {'table': 'dentists', 'column': 'name', 'value': dds_name}}
                procedure_dentists_values.append((proc_subquery, dds_subquery))

        # procedure_patient_types
        if 'patientType' in condition:
             pt_name = condition['patientType']
             pt_subquery = {'subquery': {'table': 'patient_types', 'column': 'name', 'value': pt_name}}
             procedure_patient_types_values.append((proc_subquery, pt_subquery))

        # procedure_phase_products
        if 'products' in condition:
            for phase_name, product_list in condition['products'].items():
                phase_subquery = {'subquery': {'table': 'phases', 'column': 'name', 'value': phase_name}}
                for product_name in product_list:
                    prod_subquery = {'subquery': {'table': 'products', 'column': 'name', 'value': product_name}}
                    procedure_phase_products_values.append((proc_subquery, phase_subquery, prod_subquery))

    if procedure_phases_values:
        sql_output.append("-- procedure_phases --")
        sql_output.append(generate_insert('procedure_phases', ['procedure_id', 'phase_id'], procedure_phases_values))
        sql_output.append("\n")

    if procedure_dentists_values:
        sql_output.append("-- procedure_dentists --")
        sql_output.append(generate_insert('procedure_dentists', ['procedure_id', 'dentist_id'], procedure_dentists_values))
        sql_output.append("\n")

    if procedure_patient_types_values:
        sql_output.append("-- procedure_patient_types --")
        sql_output.append(generate_insert('procedure_patient_types', ['procedure_id', 'patient_type_id'], procedure_patient_types_values))
        sql_output.append("\n")

    if procedure_phase_products_values:
        sql_output.append("-- procedure_phase_products --")
        sql_output.append(generate_insert('procedure_phase_products', ['procedure_id', 'phase_id', 'product_id'], procedure_phase_products_values))
        sql_output.append("\n")


    # 7. Write the generated SQL to a file
    with open(sql_file_path, 'w') as f:
        f.write("\n".join(sql_output))

    print(f"Successfully generated SQL script: {sql_file_path}")

except FileNotFoundError:
    print(f"Error: Input file not found at {json_file_path}")
except json.JSONDecodeError:
    print(f"Error: Could not decode JSON from {json_file_path}")
except Exception as e:
    print(f"An unexpected error occurred: {e}") 