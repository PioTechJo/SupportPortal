export type UserRole = 'BANK_USER' | 'SUPPORT_OFFICER' | 'SUPPORT_MANAGER' | 'CEO';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  name?: string;
  role?: string; // Legacy
  role_id?: string;
  role_name?: UserRole | string;
  tenant_id: string | null; // Legacy
  customer_id?: string | null;
  customer_name?: string | null;
  avatar_url?: string;
  manager_id?: string | null;
  department?: string | null;
  last_login?: string | null;
  last_activity?: string | null;
  created_at?: string;
  status?: 'active' | 'inactive';
}

export interface AuditLog {
  id: string;
  action: string;
  target_user_id?: string;
  target_user_email?: string;
  details: string;
  performed_by_id: string;
  performed_by_name: string;
  created_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  logo_url?: string;
  primary_color?: string;
  support_tier: 'standard' | 'premium' | 'enterprise';
  created_at?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'pending_approval' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'bug' | 'feature_request' | 'billing' | 'question' | 'other';
  tenant_id: string;
  created_by: string; // profile_id
  assigned_to: string | null; // agent/admin profile_id
  created_at: string;
  updated_at: string;
  // Resolution details
  resolution_draft?: any;
  resolved_by?: string | null;
  resolution_submitted_at?: string | null;
  // Expressive joins:
  creator_name?: string;
  assignee_name?: string;
  customer_name?: string;
  tenant_name?: string;
  status_code?: string;
  customer_id?: string;
  product_id?: string;
  ticket_statuses?: any;
}

export interface Comment {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name: string;
  author_role: UserRole;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  product_code?: string;
  description?: string;
  created_at?: string;
}

export interface CustomerProduct {
  id: string;
  customer_id: string;
  product_id: string;
  created_at?: string;
  // Join product helper
  products?: Product;
}

export interface OrganizationProduct {
  id: string;
  organization_id: string;
  product_id?: string;
  product_code: string;
  is_active: boolean;
  created_at?: string;
  // Join product helper
  product?: Product;
}

export interface PriorityOption {
  id: string;
  name: string;
  created_at?: string;
}

export interface AIDiagnosticQuestion {
  id: string;
  product_id: string;
  category_id?: string;
  question_text: string;
  question_type: 'multiple_choice' | 'yes_no' | 'text' | 'scale';
  order_index: number;
  is_required: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface AIQuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_active: boolean;
  created_at?: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  product_id?: string;
  product_code: string;
  category: string;
  tags: string[];
  view_count: number;
  created_at?: string;
}

export interface AIKnowledgeArticle {
  id: string;
  article_id: string;
  embedding_summary: string;
  keywords: string;
  product_id: string;
}


