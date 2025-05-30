-- Create a function to get table columns
CREATE OR REPLACE FUNCTION get_table_columns(p_table_name TEXT)
RETURNS TABLE (column_name TEXT, data_type TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT c.column_name::TEXT, c.data_type::TEXT
    FROM information_schema.columns c
    WHERE c.table_name = p_table_name
    ORDER BY c.ordinal_position;
END;
$$ LANGUAGE plpgsql;

-- Grant RLS access to the function
GRANT EXECUTE ON FUNCTION get_table_columns(TEXT) TO anon; 