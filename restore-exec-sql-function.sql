-- Restore the 'exec_sql' function
-- This function allows the application to execute arbitrary SQL queries
-- with the permissions of the function owner, which is necessary for
-- schema introspection and other administrative tasks.

CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_json json;
BEGIN
  -- The core of the function: execute the provided SQL query and
  -- aggregate the results into a single JSON array.
  EXECUTE 'SELECT json_agg(t) FROM (' || sql_query || ') t'
  INTO result_json;

  -- Return the JSON result. If the query returns no rows, this will be null.
  RETURN result_json;
END;
$$;

-- Grant execution permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;

-- Also grant permission to the service_role for backend operations
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role; 