import { supabase } from "@/integrations/supabase/client";

export type LogAction = 
  | 'login' 
  | 'logout' 
  | 'password_change' 
  | 'user_creation' 
  | 'user_deletion' 
  | 'permission_change'
  | 'status_change';

export const logActivity = async (action: LogAction, details: string, metadata: any = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await supabase.from('user_logs').insert([{
      user_id: user?.id,
      email: user?.email,
      action,
      details,
      metadata
    }]);
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
