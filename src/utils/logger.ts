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
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    // Fallback email if user is not in session but provided in metadata
    const userEmail = currentUser?.email || metadata.email || 'Sistema';
    const userId = currentUser?.id || metadata.userId;

    const { error } = await supabase.from('user_logs').insert([{
      user_id: userId,
      email: userEmail,
      action,
      details,
      metadata
    }]);

    if (error) throw error;
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};
