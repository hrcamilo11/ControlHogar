import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://wfrvapdizewdmclficfj.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmcnZhcGRpemV3ZG1jbGZpY2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MDIxNjMsImV4cCI6MjEwMTk3ODE2M30.jRDDo4E6PHQzfWb0B8mHJ9akDk-AG5qFQy-3NVD8ENQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
