import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://jlhcvjhmsgnuvbqvjnpc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsaGN2amhtc2dudXZicXZqbnBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1NjExMjUsImV4cCI6MjA2MzEzNzEyNX0._GZ5W_3TQWsd0aYo70NsAxdLwehSRAYA_NnGNW2v5zU";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase as s };
