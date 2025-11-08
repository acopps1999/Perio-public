/**
 * Database Client
 *
 * Re-exports the Supabase client from the root supabaseClient.js file.
 * This provides a central point for database access within the database service layer.
 */

import { supabase } from '../../supabaseClient';

export { supabase };
export default supabase;
