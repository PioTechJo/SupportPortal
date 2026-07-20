import { supabase, supabaseAnon } from './supabase';
import { Ticket, Comment, Tenant, Profile, UserRole, AuditLog, Product, CustomerProduct, OrganizationProduct, PriorityOption, AIDiagnosticQuestion, AIQuestionOption, KnowledgeArticle, AIKnowledgeArticle } from '../types';

// Let's keep a reactive variable or flag to determine if Supabase is working/has the tables.
let isUsingLocalFallback = false;

// [Phase 0] Non-destructive Migration Flag
// When false, completely bypasses localStorage and DEFAULT_* arrays in production paths.
const ENABLE_FALLBACKS = false;

const DEFAULT_PRODUCTS: Product[] = [
  { id: 'prod-1', name: 'PIO-RECON Balance Suite', description: 'Automated end-of-day ledger reconciliation and transaction verification processor.' },
  { id: 'prod-2', name: 'PIO-INTEGRATOR API Gateway', description: 'High speed microservice middleware routing utility for XML/JSON messages.' },
  { id: 'prod-3', name: 'AML-Compliance Engine', description: 'Anti-money laundering sanction list scanner and compliance rules module.' },
  { id: 'prod-4', name: 'PIO-COLLATERAL Manager', description: 'Real-time credit line asset valuation and commercial banking processor.' }
];

const DEFAULT_CUSTOMER_PRODUCTS: CustomerProduct[] = [
  { id: 'cp-1', customer_id: 't-riyadh', product_id: 'prod-1' },
  { id: 'cp-2', customer_id: 't-riyadh', product_id: 'prod-2' },
  { id: 'cp-3', customer_id: 't-riyadh', product_id: 'prod-3' },
  { id: 'cp-4', customer_id: 't-global', product_id: 'prod-2' },
  { id: 'cp-5', customer_id: 't-global', product_id: 'prod-3' },
  { id: 'cp-6', customer_id: 't-jotelecom', product_id: 'prod-2' },
  { id: 'cp-7', customer_id: 't-jotelecom', product_id: 'prod-4' }
];

const DEFAULT_PRIORITIESList: PriorityOption[] = [
  { id: 'p-low', name: 'Low' },
  { id: 'p-medium', name: 'Medium' },
  { id: 'p-high', name: 'High' },
  { id: 'p-critical', name: 'Critical' }
];

const DEFAULT_DIAGNOSTIC_QUESTIONS: AIDiagnosticQuestion[] = [
  // prod-1
  {
    id: 'q-p1-1',
    product_id: 'prod-1',
    question_text: 'How severe is the ledger reconciliation discrepancy?',
    question_type: 'multiple_choice',
    order_index: 1,
    is_required: true,
    is_active: true
  },
  {
    id: 'q-p1-2',
    product_id: 'prod-1',
    question_text: 'Is this ledger imbalance actively blocking the end-of-day batch settlement job?',
    question_type: 'yes_no',
    order_index: 2,
    is_required: true,
    is_active: true
  },
  {
    id: 'q-p1-3',
    product_id: 'prod-1',
    question_text: 'Please copy/paste the specific error logs or out-of-balance summary metrics.',
    question_type: 'text',
    order_index: 3,
    is_required: false,
    is_active: true
  },
  {
    id: 'q-p1-4',
    product_id: 'prod-1',
    question_text: 'On a scale of 1 to 10, how severely is this delay impacting downstream regulatory reporting?',
    question_type: 'scale',
    order_index: 4,
    is_required: true,
    is_active: true
  },

  // prod-2
  {
    id: 'q-p2-1',
    product_id: 'prod-2',
    question_text: 'What is the primary error pattern detected on your integration gateway?',
    question_type: 'multiple_choice',
    order_index: 1,
    is_required: true,
    is_active: true
  },
  {
    id: 'q-p2-2',
    product_id: 'prod-2',
    question_text: 'Are outgoing API transaction retry attempts actively looping or queuing?',
    question_type: 'yes_no',
    order_index: 2,
    is_required: true,
    is_active: true
  },
  {
    id: 'q-p2-3',
    product_id: 'prod-2',
    question_text: 'Please paste a sample of the request payload header or failing status message.',
    question_type: 'text',
    order_index: 3,
    is_required: false,
    is_active: true
  },
  {
    id: 'q-p2-4',
    product_id: 'prod-2',
    question_text: 'On a scale of 1 to 10, estimate the peak transaction throughput (TPS) currently being blocked.',
    question_type: 'scale',
    order_index: 4,
    is_required: true,
    is_active: true
  },

  // prod-3
  {
    id: 'q-p3-1',
    product_id: 'prod-3',
    question_text: 'What type of AML block or false positive is being reported?',
    question_type: 'multiple_choice',
    order_index: 1,
    is_required: true,
    is_active: true
  },
  {
    id: 'q-p3-2',
    product_id: 'prod-3',
    question_text: 'Does this blockage require manual compliance officer override authorization?',
    question_type: 'yes_no',
    order_index: 2,
    is_required: true,
    is_active: true
  },
  {
    id: 'q-p3-3',
    product_id: 'prod-3',
    question_text: 'Input the Transaction Reference ID or affected customer account GUID.',
    question_type: 'text',
    order_index: 3,
    is_required: false,
    is_active: true
  },
  {
    id: 'q-p3-4',
    product_id: 'prod-3',
    question_text: 'On a scale of 1 to 10, rate the compliance audit risk if this transaction remains un-screened.',
    question_type: 'scale',
    order_index: 4,
    is_required: true,
    is_active: true
  },

  // prod-4
  {
    id: 'q-p4-1',
    product_id: 'prod-4',
    question_text: 'Which asset category collateral valuation is reporting errors?',
    question_type: 'multiple_choice',
    order_index: 1,
    is_required: true,
    is_active: true
  },
  {
    id: 'q-p4-2',
    product_id: 'prod-4',
    question_text: 'Is the loan-to-value (LTV) limit check incorrectly triggering margin calls?',
    question_type: 'yes_no',
    order_index: 2,
    is_required: true,
    is_active: true
  },
  {
    id: 'q-p4-3',
    product_id: 'prod-4',
    question_text: 'Briefly describe the assets or securities ledger values that failed automatic reappraisal.',
    question_type: 'text',
    order_index: 3,
    is_required: false,
    is_active: true
  },
  {
    id: 'q-p4-4',
    product_id: 'prod-4',
    question_text: 'On a scale of 1 to 10, rate the urgency of unlocking internal credit reserves for this portfolio.',
    question_type: 'scale',
    order_index: 4,
    is_required: true,
    is_active: true
  }
];

const DEFAULT_QUESTION_OPTIONS: AIQuestionOption[] = [
  // prod-1, q1
  { id: 'opt-1-1', question_id: 'q-p1-1', option_text: 'Minor rounding difference (< $100.00)', is_active: true },
  { id: 'opt-1-2', question_id: 'q-p1-1', option_text: 'Substantial batch mismatch ($100.00 to $10,000.00)', is_active: true },
  { id: 'opt-1-3', question_id: 'q-p1-1', option_text: 'Extreme out-of-balance condition (> $10,000.00 or complete file reject)', is_active: true },

  // prod-2, q1
  { id: 'opt-2-1', question_id: 'q-p2-1', option_text: 'HTTP 504 Gateway Timeout or Keep-Alive failure', is_active: true },
  { id: 'opt-2-2', question_id: 'q-p2-1', option_text: 'XML/JSON Schema Validation Reject or Parsing Anomaly', is_active: true },
  { id: 'opt-2-3', question_id: 'q-p2-1', option_text: 'SSL Handshake / Certificate Trust failure', is_active: true },

  // prod-3, q1
  { id: 'opt-3-1', question_id: 'q-p3-1', option_text: 'Immediate wire transfer freeze on high-wealth customer', is_active: true },
  { id: 'opt-3-2', question_id: 'q-p3-1', option_text: 'OFAC / PEP sanction list matching false positive', is_active: true },
  { id: 'opt-3-3', question_id: 'q-p3-1', option_text: 'Suspicious Activity Report (SAR) automatic export failure', is_active: true },

  // prod-4, q1
  { id: 'opt-4-1', question_id: 'q-p4-1', option_text: 'Residential/Commercial mortgages credit line threshold', is_active: true },
  { id: 'opt-4-2', question_id: 'q-p4-1', option_text: 'Equities, sovereign bonds, or treasury bills valuation', is_active: true },
  { id: 'opt-4-3', question_id: 'q-p4-1', option_text: 'Physical bank assets or custom ledger securities', is_active: true }
];

// Seed initial data for local fallback in localStorage
const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 't-riyadh',
    name: 'Al Riyadh Bank',
    domain: 'riyadhbank.com',
    logo_url: '🏢',
    primary_color: '#0f766e', // teal-700
    support_tier: 'enterprise',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 't-global',
    name: 'Global FinTech Corp',
    domain: 'globalfintech.com',
    logo_url: '🌐',
    primary_color: '#1d4ed8', // blue-700
    support_tier: 'premium',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 't-jotelecom',
    name: 'Jordan Telecom',
    domain: 'jotelecom.com',
    logo_url: '📱',
    primary_color: '#6d28d9', // purple-700
    support_tier: 'standard',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'art-1',
    title: 'Troubleshooting PIO-INTEGRATOR Gateway SSL Handshake failures',
    content: `When integrating with the PIO-INTEGRATOR API Gateway, clients might encounter SSL Handshake error logs. This is usually caused by outdated cipher suites or missing root certificates (Riyadh Bank Root CA) in the client's trusted keystore.
    
Recommended Actions:
1. Verify that your server supports TLS 1.3 or high-strength TLS 1.2 suites.
2. Ensure you have imported the intermediary CA certs from Riyadh Bank.
3. Check if your firewalls are blocking outbound traffic of the gateway IP range.`,
    product_id: 'prod-2',
    category: 'Network & Security',
    tags: ['ssl', 'handshake', 'gateway', 'network'],
    view_count: 42,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'art-2',
    title: 'Resolving Out-of-Sync Ledgers in PIO-RECON Suite',
    content: `A transaction synchronization failure in the PIO-RECON Balance Suite occurs when EOD file batches fail to arrive before the 18:00 AST cut-off time. This mismatch causes ledger discrepancies in SWIFT wiring.

Recommended Actions:
1. Check other batch formats or verify if the SFTP repository has received the CSV files.
2. Manually trigger standard ledger query tools via the Support portal.
3. Check the EOD database trigger queues if processing state is stuck on 'PENDING'.`,
    product_id: 'prod-1',
    category: 'Reconciliation',
    tags: ['reconcile', 'sync', 'ledger', 'eod'],
    view_count: 18,
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'art-3',
    title: 'Configuring AML Sanction Screening rules & false positives',
    content: `The AML-Compliance Engine blocks wire payments when user or account details trigger a fuzzy match penalty score higher than 85%. For legitimate transaction profiles, you can white-list specific entity records.

Recommended Actions:
1. Navigate to AML Screening Rules tab inside the portal.
2. Access the 'White-list Registry' using administrator credentials.
3. Submit formal justification notes with wire tracking numbers to dismiss alerts.`,
    product_id: 'prod-3',
    category: 'Compliance',
    tags: ['aml', 'screening', 'compliance', 'regs'],
    view_count: 27,
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'art-4',
    title: 'PIO-COLLATERAL Manager Credit Valuation discrepancies',
    content: `Discrepancies in active customer credit lines can arise when collateral ratios are fetched from delayed feeds. If real-time evaluation is stalled:

Recommended Actions:
1. Check the feeds status dashboard inside PIO-COLLATERAL.
2. Force-refresh current collateral ratings via the administrative action command.
3. Ensure currency cross-conversion codes (e.g. SAR to USD) have active daily coefficients loaded.`,
    product_id: 'prod-4',
    category: 'Collateral',
    tags: ['collateral', 'valuation', 'credit', 'currency'],
    view_count: 11,
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  }
];



const DEFAULT_TICKETS: Ticket[] = [
  {
    id: 'tick-1001',
    title: 'PIO-INTEGRATOR API Timeout in Production',
    description: 'We are experiencing intermittent timeouts (HTTP 504) whenever we send batched transaction records through the PIO-INTEGRATOR channel. It seems to happen during peak hours when transactional volume exceeds 1,200 requests per minute.\n\nSteps to reproduce:\n1) Send batch transactions of size > 100\n2) Check latency on Riyadh core banking endpoint.\n\nThis is impacting our end-of-day wire settlement.',
    status: 'open',
    priority: 'urgent',
    category: 'bug',
    tenant_id: 't-riyadh',
    created_by: 'u-client1',
    assigned_to: 'u-agent',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'tick-1002',
    title: 'Requesting staging licenses for AML-Compliance Module v4',
    description: 'We are setting up our disaster recovery database and staging stack. We need double keys for the Anti-Money Laundering (AML) Compliance Engine module to run parallel testing. Please dispatch the activation manifest or provide instructions.',
    status: 'in_progress',
    priority: 'medium',
    category: 'feature_request',
    tenant_id: 't-global',
    created_by: 'u-client2',
    assigned_to: 'u-admin',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'tick-1003',
    title: 'Incorrect fee calculation during currency SWIFT routing',
    description: 'Our auditing team noticed that SWIFT routing charges are rounded down instead of up according to standard PIO-RECON schemas. This leads to minor mismatch values in global accounting reconciliations.',
    status: 'resolved',
    priority: 'high',
    category: 'billing',
    tenant_id: 't-riyadh',
    created_by: 'u-client1',
    assigned_to: 'u-admin',
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'tick-1004',
    title: 'General navigation delay inside PIO-Portal Client Console',
    description: 'The client console dashboard takes up to 4 seconds to load initial metrics. Is there a caching policy or CDN adjustment we can apply locally on Jordan Telecom firewalls?',
    status: 'closed',
    priority: 'low',
    category: 'question',
    tenant_id: 't-jotelecom',
    created_by: 'u-client1', // shared client email demo
    assigned_to: null,
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_COMMENTS: Comment[] = [
  {
    id: 'c-1',
    ticket_id: 'tick-1001',
    author_id: 'u-client1',
    author_name: 'Tariq Mansour',
    author_role: 'client',
    content: 'We ran another test with a batch size of 50 and it succeeded. The bottleneck is definitely triggered only above 100 batch records.',
    is_internal: false,
    created_at: new Date(Date.now() - 1.8 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'c-2',
    ticket_id: 'tick-1001',
    author_id: 'u-agent',
    author_name: 'Dana Naber',
    author_role: 'agent',
    content: 'Thanks Tariq. I have reproduced this in our simulator. It seems the XML transformation payload buffer is overflowing when high batch volume is dispatched. I am escalating this to our Core Integration engineering team.',
    is_internal: false,
    created_at: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'c-3',
    ticket_id: 'tick-1001',
    author_id: 'u-admin',
    author_name: 'Haitham Al-Demour',
    author_role: 'admin',
    content: 'Internal Note: Make sure Riyadh Bank team is on the latest hotfix patch v3.8.2 which specifically addresses bulk transformations on XML envelopes.',
    is_internal: true,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Local DB Helpers
function loadLocalData<T>(key: string, defaultData: T[]): T[] {
  const local = localStorage.getItem(`pio_tech_${key}`);
  if (!local) {
    localStorage.setItem(`pio_tech_${key}`, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(local);
}

function saveLocalData<T>(key: string, data: T[]) {
  localStorage.setItem(`pio_tech_${key}`, JSON.stringify(data));
}

// Check database mode
export function getDatabaseMode() {
  return isUsingLocalFallback ? 'local' : 'supabase';
}

export function forceLocalMode(force: boolean) {
  isUsingLocalFallback = force;
  localStorage.setItem('pio_tech_force_local', force ? 'true' : 'false');
  window.dispatchEvent(new Event('db_mode_changed'));
}

// Initialize mode from storage if forced
if (localStorage.getItem('pio_tech_force_local') === 'true') {
  isUsingLocalFallback = true;
}

// Safe execute utility
async function safeExecute<T>(supabaseCall: () => Promise<T>, fallbackCall: () => T): Promise<T> {
  if (isUsingLocalFallback) {
    if (ENABLE_FALLBACKS) {
      return Promise.resolve(fallbackCall());
    } else {
      console.warn("[Phase 0] Fallback requested, but ENABLE_FALLBACKS is false. Forcing Supabase.");
    }
  }

  // Under SUPABASE mode, any query failure must bubble up.
  // We MUST NOT fall back to local client simulation or default mock data.
  return await supabaseCall();
}

export const api = {
  // Profiles (Users)
  async getProfiles(): Promise<Profile[]> {
    return safeExecute<Profile[]>(
      async () => {
        // TEMPORARY DIAGNOSTIC QUERY
        const { data: fnResponse, error } = await supabase.functions.invoke('get-users-admin');
        const rawProfiles = fnResponse?.data || [];

        if (error) throw error;

        const mappedProfiles = (rawProfiles || []).map((p: any) => {
          let rName = p.role; // Fallback legacy
          let rCode = p.role;
          if (p.roles) {
            const rObj = Array.isArray(p.roles) && p.roles.length > 0 ? p.roles[0] : p.roles;
            rName = rObj.role_name || rObj.role_code;
            rCode = rObj.role_code;
          }
          if (rName && rName === rName.toUpperCase()) {
            rName = rName.split('_').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
          }
          
          return {
            id: p.id,
            email: p.email || '',
            full_name: p.name || p.full_name || '',
            name: p.name || p.full_name || '',
            role_name: rName || 'UNKNOWN',
            role_code: rCode || 'UNKNOWN',
            role_id: p.role_id,
            tenant_id: p.customer_id || p.tenant_id,
            customer_id: p.customer_id || p.tenant_id,
            customer_name: p.customers?.customer_name || null,
            status: p.status || 'active',
            avatar_url: p.avatar_url,
            department: p.department || null,
            last_login: p.last_login || null,
            last_activity: p.last_activity || null,
            created_at: p.created_at || new Date().toISOString()
          };
        }) as Profile[];

        return mappedProfiles;
      },
      () => {
        const list = loadLocalData<Profile>('profiles', []);
        return list.map(p => ({
          ...p,
          status: p.status || 'active',
          role: p.role,
          name: p.name || p.full_name,
          customer_id: p.customer_id || p.tenant_id,
          avatar_url: p.avatar_url
        })) as Profile[];
      }
    );
  },

  async getProfile(id: string): Promise<Profile | null> {
    const forceLocal = localStorage.getItem('pio_tech_force_local') === 'true';
    if (forceLocal) {
      const profiles = loadLocalData<Profile>('profiles', []);
      const p = profiles.find(p => p.id === id) || null;
      if (p) {
        const { role, ...rest } = p as any;
        return {
          ...rest,
          customer_id: p.tenant_id,
          name: p.full_name,
          role_name: p.role_name || p.role,
          status: p.status || 'active',
          avatar_url: p.avatar_url
        } as any;
      }
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select(`*, roles!users_role_id_fkey(role_code, role_name), customers!users_customer_id_fkey(customer_name)`)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error("Supabase query error in getProfile:", error);
        throw error;
      }

      if (data) {
        let rName = data.role; // Legacy fallback
        let rCode = data.role;
        if (data.roles) {
          const rObj = Array.isArray(data.roles) && data.roles.length > 0 ? data.roles[0] : data.roles;
          rName = rObj.role_name || rObj.role_code;
          rCode = rObj.role_code;
        }
        if (rName && rName === rName.toUpperCase()) {
          rName = rName.split('_').map((w: string) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
        }

        const result: Profile = {
          id: data.id,
          email: data.email || '',
          full_name: data.full_name || data.name || '',
          name: data.full_name || data.name || '',
          role_name: rName || 'UNKNOWN',
          role_code: rCode || 'UNKNOWN',
          role_id: data.role_id,
          tenant_id: data.customer_id || data.tenant_id,
          customer_id: data.customer_id || data.tenant_id,
          customer_name: data.customers?.customer_name || null,
          status: data.status || 'active',
          department: data.department || null,
          last_login: data.last_login || null,
          last_activity: data.last_activity || null,
          avatar_url: data.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name || data.email || 'User')}&background=0D8B95&color=fff&bold=true`,
          created_at: data.created_at || new Date().toISOString()
        };
        return result;
      }
    } catch (err) {
      console.error("Could not query 'users' table directly:", err);
      throw err;
    }
    
    return null;
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    return safeExecute(
      async () => {
        const payload: any = {};
        if (updates.full_name !== undefined || updates.name !== undefined) {
          payload.full_name = updates.full_name || updates.name;
        }
        if (updates.customer_id !== undefined || updates.tenant_id !== undefined) {
          payload.customer_id = updates.customer_id || updates.tenant_id;
        }
        
        if (Object.keys(payload).length === 0) {
          const profile = await this.getProfile(id);
          if (!profile) throw new Error("Profile not found");
          return profile;
        }

        const { data, error } = await supabase.from('users').update(payload).eq('id', id).select().single();
        
        if (error) throw error;
        return {
          ...data,
          full_name: data.full_name,
          name: data.full_name,
          tenant_id: data.customer_id,
          customer_id: data.customer_id,
          status: 'active'
        } as any;
      },
      () => {
        const profiles = loadLocalData<Profile>('profiles', []);
        const idx = profiles.findIndex(p => p.id === id);
        if (idx !== -1) {
          profiles[idx] = { ...profiles[idx], ...updates };
          saveLocalData('profiles', profiles);
          return {
            ...profiles[idx],
            name: profiles[idx].name || profiles[idx].full_name,
            customer_id: profiles[idx].customer_id || profiles[idx].tenant_id
          };
        }
        throw new Error('Profile not found');
      }
    );
  },

  // Invite User Flow
  async inviteUser(params: {
    email: string;
    name: string;
    role: UserRole;
    customer_id: string | null;
    createdBy: { id: string; name: string };
  }): Promise<{ profile: Profile; temporaryPassword?: string }> {
    const { email, name, role, customer_id, createdBy } = params;
    return safeExecute(
      async () => {
        const { data, error } = await supabase.functions.invoke('invite-user', {
          body: {
            email,
            name,
            role,
            customer_id,
            createdBy
          }
        });

        if (error) {
          throw new Error(`Edge Function Error: ${error.message}`);
        }

        if (data?.error) {
          throw new Error(`Failed to invite user: ${data.error}`);
        }

        const profileData = data?.profile;

        return {
          profile: {
            id: profileData.id,
            email: profileData.email,
            full_name: profileData.full_name || name,
            name: profileData.full_name || name,
            role_name: role,
            tenant_id: profileData.customer_id,
            customer_id: profileData.customer_id,
            status: 'active',
            created_at: profileData.created_at
          } as Profile,
          temporaryPassword: data?.temporaryPassword
        };
      },
      () => {
        // Local simulation fallback
        const profiles = loadLocalData<Profile>('profiles', []);
        const newProfile: Profile = {
          id: `u-${Math.random().toString(36).substr(2, 9)}`,
          email: email.toLowerCase(),
          full_name: name,
          name,
          role,
          tenant_id: customer_id,
          customer_id,
          status: 'active',
          avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8B95&color=fff&bold=true`,
          created_at: new Date().toISOString()
        };
        profiles.push(newProfile);
        saveLocalData('profiles', profiles);

        // Appending simulated audit logs
        const auditLogs = loadLocalData<any>('audit_log', []);
        auditLogs.unshift({
          id: `log-${Math.random().toString(36).substr(2, 9)}`,
          action: 'INVITE_USER',
          target_user_id: newProfile.id,
          target_user_email: email,
          details: `Invited new user '${name}' with role '${role}' to tenant ID '${customer_id || 'internal_staff'}'`,
          performed_by_id: createdBy.id,
          performed_by_name: createdBy.name,
          created_at: new Date().toISOString()
        });
        saveLocalData('audit_log', auditLogs);

        return { profile: newProfile };
      }
    );
  },

  // Audit Logs endpoints
  async getAuditLogs(): Promise<AuditLog[]> {
    return safeExecute(
      async () => {
        const { data, error } = await supabase.from('audit_log').select('*').order('id', { ascending: false });
        if (error) throw error;
        return data as AuditLog[];
      },
      () => loadLocalData<AuditLog>('audit_log', [
        {
          id: 'log-seed-1',
          action: 'SYSTEM_BOOT',
          details: 'PIO-TECH customer tenant registry successfully verified with RSA encryption handshake layers.',
          performed_by_id: 'u-admin',
          performed_by_name: 'Haitham Al-Demour',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
    );
  },

  async createAuditLog(params: {
    action: string;
    target_user_id?: string;
    target_user_email?: string;
    details: string;
    performed_by_id: string;
    performed_by_name: string;
  }): Promise<AuditLog> {
    return safeExecute(
      async () => {
        const { data, error } = await supabase.from('audit_log').insert({
          ...params
        }).select().single();
        if (error) throw error;
        return data as AuditLog;
      },
      () => {
        const auditLogs = loadLocalData<any>('audit_log', []);
        const newLog: AuditLog = {
          id: `log-${Math.random().toString(36).substr(2, 9)}`,
          ...params,
          created_at: new Date().toISOString()
        };
        auditLogs.unshift(newLog);
        saveLocalData('audit_log', auditLogs);
        return newLog;
      }
    );
  },

  // Tenants
  async getTenants(): Promise<Tenant[]> {
    return safeExecute<Tenant[]>(
      async () => {
        const { data, error } = await supabaseAnon.from('customers').select('*');
        if (error) throw error;
        if (!data || data.length === 0) {
          if (ENABLE_FALLBACKS) {
            console.warn("Lookup table 'customers' is empty in the database. Falling back to default mock tenants.");
            return DEFAULT_TENANTS;
          } else {
            console.warn("Customers table is empty.");
            return [];
          }
        }
        return (data || []).map((row: any) => ({
          id: row.id,
          name: row.customer_name,
          domain: (row.customer_code || 'customer').toLowerCase() + '.com',
          country: row.country,
          logo_url: '🏢',
          primary_color: '#0f766e',
          support_tier: 'enterprise',
          is_internal: row.is_internal === true,
          created_at: row.created_at
        }));
      },
      () => loadLocalData<Tenant>('tenants', DEFAULT_TENANTS)
    );
  },

  async getTenantsPaginated(page: number = 1, limit: number = 50, countryFilter?: string, search?: string): Promise<{ data: Tenant[], count: number }> {
    return safeExecute<{ data: Tenant[], count: number }>(
      async () => {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabaseAnon
          .from('customers')
          .select('*', { count: 'exact' });

        if (countryFilter && countryFilter.toLowerCase() !== 'all') {
          query = query.eq('country', countryFilter);
        }

        if (search && search.trim()) {
          const term = search.trim().replace(/[%,]/g, '');
          query = query.or(`customer_name.ilike.%${term}%,customer_code.ilike.%${term}%`);
        }

        const { data, error, count } = await query
          .range(from, to)
          .order('customer_name', { ascending: true });
          
        if (error) throw error;
        
        const mappedData = (data || []).map((row: any) => ({
          id: row.id,
          name: row.customer_name,
          domain: (row.customer_code || 'customer').toLowerCase() + '.com',
          country: row.country,
          logo_url: '🏢',
          primary_color: '#0f766e',
          support_tier: 'enterprise',
          is_internal: row.is_internal === true,
          created_at: row.created_at
        }));
        
        return { data: mappedData, count: count || 0 };
      },
      () => ({ data: [], count: 0 })
    );
  },

  async createTenant(tenant: Omit<Tenant, 'id' | 'created_at'>, createdBy?: { id: string, name: string }): Promise<Tenant> {
    return safeExecute<Tenant>(
      async () => {
        const { data: fnResponse, error: fnError } = await supabase.functions.invoke('create-organization', {
          body: {
            name: tenant.name,
            domain: tenant.domain,
            country: tenant.country,
            createdBy: createdBy || null
          }
        });

        if (fnError) {
          throw new Error(`Edge Function Error: ${fnError.message}`);
        }

        if (fnResponse?.error) {
          throw new Error(fnResponse.error);
        }

        const data = fnResponse?.customer;
        if (!data) throw new Error('Failed to retrieve created customer data');

        return {
          id: data.id,
          name: data.customer_name,
          domain: (data.customer_code || 'customer').toLowerCase() + '.com',
          logo_url: tenant.logo_url || '🏢',
          primary_color: tenant.primary_color || '#0f766e',
          support_tier: tenant.support_tier || 'enterprise',
          created_at: data.created_at
        };
      },
      () => {
        const tenants = loadLocalData<Tenant>('tenants', DEFAULT_TENANTS);
        const newTenant: Tenant = {
          ...tenant,
          id: `t-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString()
        };
        tenants.push(newTenant);
        saveLocalData('tenants', tenants);
        return newTenant;
      }
    );
  },

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    return safeExecute<Tenant>(
      async () => {
        const payload: any = {};
        if (updates.name) payload.customer_name = updates.name;
        if (updates.domain) payload.customer_code = updates.domain.replace('.com', '').toUpperCase();
        if (updates.country !== undefined) payload.country = updates.country;
        
        const { data, error } = await supabase.from('customers').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return {
          id: data.id,
          name: data.customer_name,
          domain: (data.customer_code || 'customer').toLowerCase() + '.com',
          country: data.country,
          logo_url: '🏢',
          primary_color: '#0f766e',
          support_tier: 'enterprise',
          created_at: data.created_at
        };
      },
      () => {
        const tenants = loadLocalData<Tenant>('tenants', DEFAULT_TENANTS);
        const idx = tenants.findIndex(t => t.id === id);
        if (idx !== -1) {
          tenants[idx] = { ...tenants[idx], ...updates };
          saveLocalData('tenants', tenants);
          return tenants[idx];
        }
        throw new Error('Tenant not found');
      }
    );
  },

  // Tickets
  async getActiveTicketsCount(tenantId?: string): Promise<number> {
    return safeExecute(
      async () => {
        let query = supabase
          .from('tickets')
          .select('*, ticket_statuses!inner(status_code)', { count: 'exact', head: true })
          .not('ticket_statuses.status_code', 'in', '("RESOLVED","CLOSED","APPROVED")');
        
        if (tenantId) {
          query = query.eq('customer_id', tenantId);
        }

        const { count, error } = await query;
        if (error) throw error;
        return count || 0;
      },
      () => {
        return 0;
      }
    );
  },

  async getTickets(): Promise<Ticket[]> {
    return safeExecute(
      async () => {
        const { data, error } = await supabase
          .from('tickets')
          .select(`
            *,
            ticket_statuses(status_code, status_name),
            customers(customer_name),
            products(product_name, product_code),
            priorities(priority_name),
            creator:users!created_by(full_name),
            diagnostic_category:ai_diagnostic_categories(category_name, category_name_ar)
          `);
        if (error) {
          console.log('[DEBUG api.getTickets] error:', error);
          throw error;
        }
        console.log('[DEBUG api.getTickets] data?.length:', data?.length);
        if (data && data.length > 0) {
          console.log('[DEBUG api.getTickets] data[0]:', JSON.stringify(data[0]));
        }

        const uniqueAssignedTo = Array.from(new Set((data || []).map((t: any) => t.assigned_to).filter(Boolean)));
        const assigneeMap = new Map<string, string>();
        
        if (uniqueAssignedTo.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', uniqueAssignedTo);
            
          if (!usersError && usersData) {
            usersData.forEach((u: any) => {
              assigneeMap.set(u.id, u.full_name);
            });
          }
        }

        const mappedData = (data || []).map((ticket: any) => {
          const sCode = ticket.ticket_statuses?.status_code || '';
          
          let frontendStatus = 'open';
          if (sCode === 'NEW') frontendStatus = 'open';
          else if (sCode === 'ASSIGNED' || sCode === 'INVESTIGATION' || sCode === 'PENDING_CUSTOMER') frontendStatus = 'in_progress';
          else if (sCode === 'RESOLVED') frontendStatus = 'resolved';
          else if (sCode === 'CLOSED') frontendStatus = 'closed';
          else if (sCode === 'PENDING_APPROVAL') frontendStatus = 'pending_approval';
          else frontendStatus = ticket.status || 'open';

          if (sCode === 'INVESTIGATION' && ticket.resolution_draft) {
            frontendStatus = 'pending_approval';
          }

          const priorityName = ticket.priorities?.priority_name || 'Medium';

          return {
            ...ticket,
            id: ticket.id,
            title: ticket.subject || 'SWIFT Delays',
            description: ticket.description,
            status: frontendStatus,
            status_code: sCode,
            status_name: ticket.ticket_statuses?.status_name || sCode || ticket.status,
            priority: priorityName.toLowerCase(),
            priority_name: priorityName,
            product_name: ticket.products?.product_name || 'AML-Compliance Engine',
            customer_name: ticket.customers?.customer_name || '',
            creator_name: ticket.creator?.full_name || 'Unknown User',
            assigned_to_name: ticket.assigned_to ? (assigneeMap.get(ticket.assigned_to) || 'Unassigned') : 'Unassigned',
            legacy_assigned_to: ticket.legacy_assigned_to || null,
            created_by: ticket.created_by,
            assigned_to: ticket.assigned_to || null,
            tenant_id: ticket.customer_id || null,
            category: ticket.products?.product_code?.toLowerCase() || 'other',
            diagnostic_category: ticket.diagnostic_category || null,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            justification_submitted_at: ticket.justification_submitted_at || null
          } as unknown as Ticket;
        });

        console.log('[DEBUG api.getTickets] mappedData length:', mappedData.length);
        if (mappedData.length > 0) {
          console.log('[DEBUG api.getTickets] mappedData[0]:', mappedData[0]);
        }
        return mappedData;
      },
      () => {
        const tickets = loadLocalData<Ticket>('tickets', DEFAULT_TICKETS);
        const profiles = loadLocalData<Profile>('profiles', []);
        const tenants = loadLocalData<Tenant>('tenants', DEFAULT_TENANTS);

        return tickets.map(ticket => {
          const creator = profiles.find(p => p.id === ticket.created_by);
          const assignee = profiles.find(p => p.id === ticket.assigned_to);
          const tenant = tenants.find(t => t.id === ticket.tenant_id);

          return {
            ...ticket,
            creator_name: creator ? creator.full_name : 'Unknown User',
            assigned_to_name: assignee ? assignee.full_name : 'Unassigned',
            tenant_name: tenant ? tenant.name : 'Unknown Tenant'
          };
        });
      }
    );
  },

  async getDashboardAnalytics(fromDate: string, toDate: string, customerIds: string[], engineerIds: string[]): Promise<any> {
    return safeExecute(
      async () => {
        const { data, error } = await supabase.rpc('get_dashboard_analytics', {
          p_from_date: fromDate,
          p_to_date: toDate,
          p_customer_ids: customerIds?.length > 0 ? customerIds : null,
          p_engineer_ids: engineerIds?.length > 0 ? engineerIds : null,
        });
        if (error) throw error;
        return data;
      },
      () => null
    );
  },

async getTicketsPaginated(page: number = 1, limit: number = 50, customerId?: string | null, search?: string, engineerId?: string | null): Promise<{ data: Ticket[], count: number }> {
    return safeExecute(
      async () => {
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        let query = supabase
          .from('tickets')
          .select(`
            *,
            ticket_statuses(status_code, status_name),
            customers(customer_name),
            products(product_name, product_code),
            priorities(priority_name),
            creator:users!created_by(full_name),
            diagnostic_category:ai_diagnostic_categories(category_name, category_name_ar)
          `, { count: 'exact' });

        if (customerId === 'none') {
          query = query.is('customer_id', null);
        } else if (customerId) {
          query = query.eq('customer_id', customerId);
        }

        if (engineerId === 'unassigned') {
          query = query.is('assigned_to', null).is('legacy_assigned_to', null);
        } else if (engineerId && engineerId.startsWith('legacy:')) {
          query = query.eq('legacy_assigned_to', engineerId.slice('legacy:'.length));
        } else if (engineerId) {
          query = query.eq('assigned_to', engineerId);
        }

        if (search && search.trim()) {
          const term = search.trim().replace(/[%,]/g, '');
          query = query.or(`subject.ilike.%${term}%,description.ilike.%${term}%,ticket_no.ilike.%${term}%`);
        }

        const { data, error, count } = await query
          .range(from, to)
          .order('created_at', { ascending: false });

        if (error) {
          console.log('[DEBUG api.getTicketsPaginated] error:', error);
          throw error;
        }

        const uniqueAssignedTo = Array.from(new Set((data || []).map((t: any) => t.assigned_to).filter(Boolean)));
        const assigneeMap = new Map<string, string>();
        
        if (uniqueAssignedTo.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', uniqueAssignedTo);
            
          if (!usersError && usersData) {
            usersData.forEach((u: any) => {
              assigneeMap.set(u.id, u.full_name);
            });
          }
        }

        const mappedData = (data || []).map((ticket: any) => {
          const sCode = ticket.ticket_statuses?.status_code || '';
          
          let frontendStatus = 'open';
          if (sCode === 'NEW') frontendStatus = 'open';
          else if (sCode === 'ASSIGNED' || sCode === 'INVESTIGATION' || sCode === 'PENDING_CUSTOMER') frontendStatus = 'in_progress';
          else if (sCode === 'RESOLVED') frontendStatus = 'resolved';
          else if (sCode === 'CLOSED') frontendStatus = 'closed';
          else if (sCode === 'PENDING_APPROVAL') frontendStatus = 'pending_approval';
          else frontendStatus = ticket.status || 'open';

          if (sCode === 'INVESTIGATION' && ticket.resolution_draft) {
            frontendStatus = 'pending_approval';
          }

          const priorityName = ticket.priorities?.priority_name || 'Medium';

          return {
            ...ticket,
            id: ticket.id,
            title: ticket.subject || 'SWIFT Delays',
            description: ticket.description,
            status: frontendStatus,
            status_code: sCode,
            status_name: ticket.ticket_statuses?.status_name || sCode || ticket.status,
            priority: priorityName.toLowerCase(),
            priority_name: priorityName,
            product_name: ticket.products?.product_name || 'AML-Compliance Engine',
            customer_name: ticket.customers?.customer_name || '',
            creator_name: ticket.creator?.full_name || 'Unknown User',
            assigned_to_name: ticket.assigned_to ? (assigneeMap.get(ticket.assigned_to) || 'Unassigned') : 'Unassigned',
            legacy_assigned_to: ticket.legacy_assigned_to || null,
            created_by: ticket.created_by,
            assigned_to: ticket.assigned_to || null,
            tenant_id: ticket.customer_id || null,
            category: ticket.products?.product_code?.toLowerCase() || 'other',
            diagnostic_category: ticket.diagnostic_category || null,
            created_at: ticket.created_at,
            updated_at: ticket.updated_at,
            justification_submitted_at: ticket.justification_submitted_at || null
          } as unknown as Ticket;
        });

        return { data: mappedData, count: count || 0 };
      },
      () => {
        return { data: [], count: 0 };
      }
    );
  },

  async getTicket(id: string): Promise<Ticket | null> {
    return safeExecute(
      async () => {
        const { data, error } = await supabase
          .from('tickets')
          .select(`
            *,
            ticket_statuses(status_code, status_name),
            customers(customer_name),
            products(product_name, product_code),
            priorities(priority_name),
            creator:users!created_by(full_name)
          `)
          .eq('id', id)
          .single();
        if (error) throw error;
        if (!data) return null;

        const ticket = data as any;
        
        let assignedToName = 'Unassigned';
        if (ticket.assigned_to) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', ticket.assigned_to)
            .maybeSingle();
          
          console.log('[DEBUG getTicket] assigned_to:', ticket.assigned_to, 'userData:', userData, 'userError:', userError);

          if (userData) {
            assignedToName = userData.full_name;
          }
        }
        
        const sCode = ticket.ticket_statuses?.status_code || '';
        
        let frontendStatus = 'open';
        if (sCode === 'NEW') frontendStatus = 'open';
        else if (sCode === 'ASSIGNED' || sCode === 'INVESTIGATION' || sCode === 'PENDING_CUSTOMER') frontendStatus = 'in_progress';
        else if (sCode === 'RESOLVED') frontendStatus = 'resolved';
        else if (sCode === 'CLOSED') frontendStatus = 'closed';
        else if (sCode === 'PENDING_APPROVAL') frontendStatus = 'pending_approval';
        else frontendStatus = ticket.status || 'open';

        if (sCode === 'INVESTIGATION' && ticket.resolution_draft) {
          frontendStatus = 'pending_approval';
        }

        const priorityName = ticket.priorities?.priority_name || 'Medium';

        return {
          ...ticket,
          id: ticket.id,
          title: ticket.subject || 'SWIFT Delays',
          description: ticket.description,
          status: frontendStatus,
          status_code: sCode,
          status_name: ticket.ticket_statuses?.status_name || sCode || ticket.status,
          priority: priorityName.toLowerCase(),
          priority_name: priorityName,
          product_name: ticket.products?.product_name || 'AML-Compliance Engine',
          customer_name: ticket.customers?.customer_name || '',
          creator_name: ticket.creator?.full_name || 'Unknown User',
          assigned_to_name: assignedToName,
          created_by: ticket.created_by,
          assigned_to: ticket.assigned_to || null,
          tenant_id: ticket.customer_id || null,
          category: ticket.products?.product_code?.toLowerCase() || 'other',
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          justification_submitted_at: ticket.justification_submitted_at || null
        } as unknown as Ticket;
      },
      () => {
        const tickets = loadLocalData<Ticket>('tickets', DEFAULT_TICKETS);
        const ticket = tickets.find(t => t.id === id);
        if (!ticket) return null;

        const profiles = loadLocalData<Profile>('profiles', []);
        const tenants = loadLocalData<Tenant>('tenants', DEFAULT_TENANTS);
        const creator = profiles.find(p => p.id === ticket.created_by);
        const assignee = profiles.find(p => p.id === ticket.assigned_to);
        const tenant = tenants.find(t => t.id === ticket.tenant_id);

        return {
          ...ticket,
          creator_name: creator ? creator.full_name : 'Unknown User',
          assigned_to_name: assignee ? assignee.full_name : 'Unassigned',
          tenant_name: tenant ? tenant.name : 'Unknown Tenant'
        };
      }
    );
  },

  async createTicket(ticket: Omit<Ticket, 'id' | 'created_at' | 'updated_at'>): Promise<Ticket> {
    const payload: any = {
      subject: ticket.title || '',
      description: ticket.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (ticket.created_by && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticket.created_by)) {
      payload.created_by = ticket.created_by;
    } else {
      payload.created_by = null;
    }

    if (ticket.assigned_to && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticket.assigned_to)) {
      payload.assigned_to = ticket.assigned_to;
    } else {
      payload.assigned_to = null;
    }
    
    // Map status to status_id
    if (ticket.status) {
      let sCode = 'NEW';
      if (ticket.status === 'in_progress') sCode = 'INVESTIGATION';
      if (ticket.status === 'resolved') sCode = 'RESOLVED';
      if (ticket.status === 'closed') sCode = 'CLOSED';
      if (ticket.status === 'pending_approval') sCode = 'INVESTIGATION';
      
      const { data: statusObj } = await supabaseAnon.from('ticket_statuses').select('id').eq('status_code', sCode).maybeSingle();
      if (statusObj) {
        payload.status_id = statusObj.id;
      }
    }

    // Map tenant_id to customer_id
    if (ticket.tenant_id) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticket.tenant_id)) {
        payload.customer_id = ticket.tenant_id;
      } else {
        const { data: cData } = await supabase.from('customers').select('id').eq('customer_code', ticket.tenant_id.toUpperCase()).maybeSingle();
        if (cData) payload.customer_id = cData.id;
      }
    }

    // Do NOT derive product_id from ticket.category. category is NOT product. Instead use the selected product coming from the UI.
    if (ticket.product_id) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticket.product_id)) {
        payload.product_id = ticket.product_id;
      } else {
        let searchProductCode = ticket.product_id.toUpperCase();
        if (searchProductCode.startsWith('PROD-')) searchProductCode = searchProductCode.replace('PROD-', '');
        const { data: pData } = await supabase.from('products').select('id').eq('product_code', searchProductCode).maybeSingle();
        if (pData) payload.product_id = pData.id;
      }
    } else {
      payload.product_id = null;
    }

    // Map priority to priority_id
    if (ticket.priority) {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ticket.priority)) {
        payload.priority_id = ticket.priority;
      } else {
        const { data: prData } = await supabase.from('priorities').select('id').eq('priority_code', ticket.priority.toUpperCase()).maybeSingle();
        if (prData) payload.priority_id = prData.id;
      }
    }

    const { data, error } = await supabase.from('tickets').insert([payload]).select().single();
    if (error) {
      console.log({
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        rawError: error
      });
      throw error;
    }

    try {
      const { data: users, error: usersErr } = await supabase
        .from('users')
        .select('id, roles!users_role_id_fkey(role_code)');
        
      console.log("DEBUG: users query result ->", JSON.stringify({ data: users, error: usersErr }));
        
      const adminUsers = (users || []).filter((u: any) => {
        const roleCode = u.roles?.role_code || u.role_code;
        return roleCode === 'ADMIN';
      });
      let adminIds = adminUsers.map(u => u.id);
      
      console.log("DEBUG: adminIds filtered ->", adminIds);

      if (adminIds.length > 0) {
        const notificationsPayload = adminIds.map(adminId => ({
          profile_id: adminId,
          content: `New ticket #${data.id.substring(0, 8).toUpperCase()} created.`,
          type: 'new_ticket',
          is_read: false,
          created_at: new Date().toISOString()
        }));
        
        console.log("DEBUG: notificationsPayload ->", JSON.stringify(notificationsPayload, null, 2));
        
        const { data: insertData, error: insertError } = await supabase.from('notifications').insert(notificationsPayload).select();
        
        console.log("DEBUG: notifications insert result ->", JSON.stringify({ data: insertData, error: insertError }));
        
        if (insertError) {
          console.error("Supabase notification insert error:", insertError);
        }
      }
    } catch (notifErr) {
      console.warn("Could not post system alerts / notifications", notifErr);
    }

    return data as Ticket;
  },

  async updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket> {
    return safeExecute(
      async () => {
        const payload: any = { updated_at: new Date().toISOString() };
        
        if (updates.title !== undefined) payload.subject = updates.title;
        if (updates.description !== undefined) payload.description = updates.description;
        
        if (updates.created_by !== undefined) {
          if (updates.created_by && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updates.created_by)) {
            payload.created_by = updates.created_by;
          } else {
            payload.created_by = null;
          }
        }

        if (updates.assigned_to !== undefined) {
          if (updates.assigned_to && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updates.assigned_to)) {
            payload.assigned_to = updates.assigned_to;
          } else {
            payload.assigned_to = null;
          }
        }

        // Translate status back to status_id if updated
        if (updates.status) {
          let sCode = 'NEW';
          if (updates.status === 'in_progress') sCode = 'INVESTIGATION';
          if (updates.status === 'resolved') sCode = 'RESOLVED';
          if (updates.status === 'closed') sCode = 'CLOSED';
          if (updates.status === 'pending_approval') sCode = 'INVESTIGATION';
          
          const { data: statusObj } = await supabase.from('ticket_statuses').select('id').eq('status_code', sCode).maybeSingle();
          if (statusObj) {
            payload.status_id = statusObj.id;
          }
        }

        // Map tenant_id to customer_id
        if (updates.tenant_id) {
          const { data: cData } = await supabase.from('customers').select('id').eq('customer_code', updates.tenant_id.toUpperCase()).maybeSingle();
          if (cData) payload.customer_id = cData.id;
        }

        if (updates.product_id) {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(updates.product_id)) {
            payload.product_id = updates.product_id;
          } else {
            const { data: pData } = await supabase.from('products').select('id').eq('product_code', updates.product_id.toUpperCase()).maybeSingle();
            if (pData) payload.product_id = pData.id;
          }
        }

        // Map priority to priority_id
        if (updates.priority) {
          const { data: prData } = await supabase.from('priorities').select('id').eq('priority_code', updates.priority.toUpperCase()).maybeSingle();
          if (prData) payload.priority_id = prData.id;
        }

        const { data, error } = await supabase.from('tickets').update(payload).eq('id', id).select().single();
        if (error) throw error;
        return data as Ticket;
      },
      () => {
        const tickets = loadLocalData<Ticket>('tickets', DEFAULT_TICKETS);
        const idx = tickets.findIndex(t => t.id === id);
        if (idx !== -1) {
          tickets[idx] = {
            ...tickets[idx],
            ...updates,
            updated_at: new Date().toISOString()
          };
          saveLocalData('tickets', tickets);

          const profiles = loadLocalData<Profile>('profiles', []);
          const tenants = loadLocalData<Tenant>('tenants', DEFAULT_TENANTS);
          const creator = profiles.find(p => p.id === tickets[idx].created_by);
          const assignee = profiles.find(p => p.id === tickets[idx].assigned_to);
          const tenant = tenants.find(t => t.id === tickets[idx].tenant_id);

          return {
            ...tickets[idx],
            creator_name: creator ? creator.full_name : 'Unknown User',
            assigned_to_name: assignee ? assignee.full_name : 'Unassigned',
            tenant_name: tenant ? tenant.name : 'Unknown Tenant'
          };
        }
        throw new Error('Ticket not found');
      }
    );
  },

  // Comments
  async getComments(ticketId: string): Promise<Comment[]> {
    return safeExecute(
      async () => {
        const { data, error } = await supabase
          .from('ticket_comments')
          .select(`
            id,
            ticket_id,
            comment_text,
            author_id,
            is_system_generated,
            is_internal,
            created_at,
            escalated_team_id,
            escalated_developer_name,
            escalation_returned_at,
            teams (
              team_name
            ),
            author:users!author_id (
              full_name,
              roles (
                role_code
              )
            )
          `)
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true });

        if (error) {
          const { data: altData, error: altErr } = await supabase
            .from('comments')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });
          if (altErr) throw altErr;
          return altData as Comment[];
        }

        return (data || []).map((row: any) => {
          const authorInfo = row.author;
          const roleCode = authorInfo?.roles?.role_code || 'agent';
          return {
            id: row.id,
            ticket_id: row.ticket_id,
            author_id: row.author_id || '',
            author_name: authorInfo?.full_name || 'System / Support Team',
            author_role: (roleCode === 'ADMIN' ? 'admin' : roleCode?.toLowerCase()) as UserRole,
            content: row.comment_text || '',
            is_internal: row.is_internal || row.is_system_generated === true,
            created_at: row.created_at,
            escalated_team_id: row.escalated_team_id,
            escalated_developer_name: row.escalated_developer_name,
            escalation_returned_at: row.escalation_returned_at,
            teams: row.teams
          };
        });
      },
      () => {
        const comments = loadLocalData<Comment>('comments', DEFAULT_COMMENTS);
        return comments
          .filter(c => c.ticket_id === ticketId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    );
  },

  async getDiagnosticAnswers(ticketId: string): Promise<any[]> {
    return safeExecute(
      async () => {
        const { data, error } = await supabase
          .from('ticket_diagnostic_answers')
          .select('*')
          .eq('ticket_id', ticketId);
        if (error) throw error;
        return data || [];
      },
      () => {
        const answers = loadLocalData<any>('ticket_diagnostic_answers', []);
        return answers.filter((a: any) => a.ticket_id === ticketId);
      }
    );
  },

  async createComment(comment: Omit<Comment, 'id' | 'created_at'>): Promise<Comment> {
    return safeExecute(
      async () => {
        const payload: any = {
          ticket_id: comment.ticket_id,
          comment_text: comment.content,
          is_system_generated: comment.is_internal,
          created_at: new Date().toISOString()
        };

        if (comment.author_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(comment.author_id)) {
          payload.author_id = comment.author_id;
        }

        const { data, error } = await supabase
          .from('ticket_comments')
          .insert([payload])
          .select(`
            id,
            ticket_id,
            comment_text,
            author_id,
            is_system_generated,
            created_at,
            author:users!author_id (
              full_name,
              roles (
                role_code
              )
            )
          `)
          .single();

        if (error) {
          const altPayload = {
            ticket_id: comment.ticket_id,
            author_id: comment.author_id,
            author_name: comment.author_name,
            author_role: comment.author_role,
            content: comment.content,
            is_internal: comment.is_internal,
            created_at: new Date().toISOString()
          };
          const { data: altData, error: altErr } = await supabase.from('comments').insert([altPayload]).select().single();
          if (altErr) throw altErr;
          return altData as Comment;
        }

        const authorSingle = Array.isArray(data.author) ? data.author[0] : data.author;
        const authorInfo = authorSingle as any;
        const roleSingle = authorInfo?.roles;
        const roleName = (Array.isArray(roleSingle) ? roleSingle[0]?.role_code : roleSingle?.role_code) || 'agent';

        return {
          id: data.id,
          ticket_id: data.ticket_id,
          author_id: data.author_id || '',
          author_name: authorInfo?.full_name || comment.author_name || 'System / Support Team',
          author_role: (roleName === 'ADMIN' ? 'admin' : roleName?.toLowerCase()) as UserRole,
          content: data.comment_text || '',
          is_internal: data.is_system_generated === true,
          created_at: data.created_at
        };
      },
      () => {
        const comments = loadLocalData<Comment>('comments', DEFAULT_COMMENTS);
        const newComment: Comment = {
          ...comment,
          id: `c-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString()
        };
        comments.push(newComment);
        saveLocalData('comments', comments);
        return newComment;
      }
    );
  },

  // Products, customer products & priorities
  async getProducts(): Promise<Product[]> {
    return safeExecute(
      async () => {
        const { data, error } = await supabaseAnon.from('products').select('*');
        if (error) throw error;
        if (!data || data.length === 0) {
          if (ENABLE_FALLBACKS) {
            console.warn("Lookup table 'products' is empty in the database. Falling back to default mock products.");
            return DEFAULT_PRODUCTS;
          } else {
            console.warn("Products table is empty.");
            return [];
          }
        }
        return (data || []).map((p: any) => ({
          ...p,
          name: p.product_name || p.name || p.product_code || ''
        })) as Product[];
      },
      () => loadLocalData<Product>('products', DEFAULT_PRODUCTS)
    );
  },

  async getPriorities(): Promise<PriorityOption[]> {
    return safeExecute(
      async () => {
        const { data, error } = await supabaseAnon.from('priorities').select('*');
        if (error) throw error;
        if (!data || data.length === 0) {
          if (ENABLE_FALLBACKS) {
            console.warn("Lookup table 'priorities' is empty in the database. Falling back to default priorities.");
            return DEFAULT_PRIORITIESList;
          } else {
            console.warn("Priorities table is empty.");
            return [];
          }
        }
        return (data || []).map((p: any) => ({
          ...p,
          name: p.priority_name || p.name || p.priority_code || ''
        })) as PriorityOption[];
      },
      () => loadLocalData<PriorityOption>('priorities', DEFAULT_PRIORITIESList)
    );
  },

  getOrganizationProducts: async (organizationId: string): Promise<OrganizationProduct[]> => {
    try {
      const selectStr = `*, product:products(id, product_code, product_name, description, icon, color, display_order, is_active)`;
      
      const { data, error } = await supabase
        .from('organization_products')
        .select(selectStr)
        .eq('organization_id', organizationId)
        .eq('is_active', true);
        
      if (error) {
        console.error("Failed to fetch organization_products. FULL ERROR:", JSON.stringify({
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        }, null, 2));
        return [];
      }
      
      return data || [];
    } catch (err: any) {
      console.error("Error in getOrganizationProducts catch block. Exception:", err);
      return [];
    }
  },
  updateOrganizationProducts: async (organizationId: string, productCodes: string[]) => {
    try {
      // Fetch the current user to pass to audit log
      const { data: userData } = await supabase.auth.getUser();
      const performedBy = userData?.user ? { id: userData.user.id, name: userData.user.email } : null;

      const { data, error } = await supabase.functions.invoke('update-organization-products', {
        body: {
          organization_id: organizationId,
          product_ids: productCodes, // Keep product_ids here because the edge function payload parser still expects product_ids
          performedBy
        }
      });

      if (error) {
        console.error('Edge Function update-organization-products failed:', error);
        throw error;
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      
      return true;
    } catch (err) {
      console.error('Error updating organization products:', err);
      throw err;
    }
  },

  async getCustomerProducts(customerId: string): Promise<CustomerProduct[]> {
    return safeExecute(
      async () => {
        const { data, error } = await supabase
          .from('customer_products')
          .select('*, products(*)')
          .eq('customer_id', customerId);
        if (error) throw error;
        return (data || []).map((cp: any) => {
          if (cp.products) {
            return {
              ...cp,
              products: {
                ...cp.products,
                name: cp.products.product_name || cp.products.name || cp.products.product_code || ''
              }
            };
          }
          return cp;
        }) as any[];
      },
      () => {
        const cps = loadLocalData<CustomerProduct>('customer_products', DEFAULT_CUSTOMER_PRODUCTS);
        const prods = loadLocalData<Product>('products', DEFAULT_PRODUCTS);
        return cps
          .filter(cp => cp.customer_id === customerId)
          .map(cp => {
            const product = prods.find(p => p.id === cp.product_id);
            return {
              ...cp,
              products: product
            };
          });
      }
    );
  },

  async getAIDiagnosticQuestions(productId: string): Promise<AIDiagnosticQuestion[]> {
    return safeExecute(
      async () => {
        const { data, error } = await supabase
          .from('ai_diagnostic_questions')
          .select('*')
          .eq('product_id', productId)
          .eq('is_active', true)
          .order('order_index', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("Lookup table 'ai_diagnostic_questions' is empty in the database.");
        }
        return data as AIDiagnosticQuestion[];
      },
      () => {
        return DEFAULT_DIAGNOSTIC_QUESTIONS
          .filter(q => q.product_id === productId && q.is_active)
          .sort((a, b) => a.order_index - b.order_index);
      }
    );
  },

  async getAIQuestionOptions(questionIds: string[]): Promise<AIQuestionOption[]> {
    return safeExecute(
      async () => {
        const { data, error } = await supabase
          .from('ai_question_options')
          .select('*')
          .in('question_id', questionIds)
          .eq('is_active', true);
        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error("Lookup table 'ai_question_options' is empty in the database.");
        }
        return data as AIQuestionOption[];
      },
      () => {
        return DEFAULT_QUESTION_OPTIONS.filter(o => questionIds.includes(o.question_id) && o.is_active);
      }
    );
  },

  async submitWizardTicket(params: {
    customerId: string | null;
    productId: string;
    priorityId: string;
    title: string;
    description: string;
    createdBy: string;
    aiRecommendation: any;
    diagnosticAnswers: any[];
    customerName: string;
    productName: string;
  }): Promise<Ticket> {
    let mappedPriority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
    const pStr = String(params.priorityId).toLowerCase();
    if (pStr.includes('low')) mappedPriority = 'low';
    if (pStr.includes('medium')) mappedPriority = 'medium';
    if (pStr.includes('high')) mappedPriority = 'high';
    if (pStr.includes('critical') || pStr.includes('urgent')) mappedPriority = 'urgent';

    return safeExecute<Ticket>(
      async () => {
        const { data: statusObj } = await supabase.from('ticket_statuses').select('id').eq('status_code', 'NEW').maybeSingle();

        const ticketPayload: any = {
          subject: params.title,
          description: params.description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        if (statusObj) ticketPayload.status_id = statusObj.id;

        if (params.createdBy && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.createdBy)) {
          ticketPayload.created_by = params.createdBy;
        } else {
          ticketPayload.created_by = null;
        }

        // Map customerId (tenant code) to customer uuid
        if (params.customerId) {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.customerId)) {
            ticketPayload.customer_id = params.customerId;
          } else {
            const { data: cData } = await supabase.from('customers').select('id').eq('customer_code', params.customerId.toUpperCase()).maybeSingle();
            if (cData) ticketPayload.customer_id = cData.id;
          }
        }

        // Map productId (product code) to product uuid
        if (params.productId) {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.productId)) {
            ticketPayload.product_id = params.productId;
          } else {
            let searchProductCode = params.productId.toUpperCase();
            if (searchProductCode.startsWith('PROD-')) searchProductCode = searchProductCode.replace('PROD-', '');
            const { data: pData } = await supabase.from('products').select('id').eq('product_code', searchProductCode).maybeSingle();
            if (pData) ticketPayload.product_id = pData.id;
          }
        }

        // Map priorityId (priority code) to priority uuid
        if (params.priorityId) {
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.priorityId)) {
            ticketPayload.priority_id = params.priorityId;
          } else {
            let searchCode = params.priorityId.toUpperCase();
            if (searchCode.startsWith('P-')) searchCode = searchCode.replace('P-', '');
            const { data: prData } = await supabase.from('priorities').select('id').eq('priority_code', searchCode).maybeSingle();
            if (prData) ticketPayload.priority_id = prData.id;
          }
        }

        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .insert([ticketPayload])
          .select()
          .single();
        if (ticketError) throw ticketError;
        const newTicketId = ticketData.id;

        // 2. Insert diagnostic answers
        if (params.diagnosticAnswers && params.diagnosticAnswers.length > 0) {
          const answersPayload = params.diagnosticAnswers.map(ans => ({
            ticket_id: newTicketId,
            question_id: ans.question_id,
            question_text: ans.question_text,
            answer_text: ans.answer_text,
            option_id: ans.option_id || null,
            created_at: new Date().toISOString()
          }));
          const { error: answersError } = await supabase
            .from('ticket_diagnostic_answers')
            .insert(answersPayload);
          if (answersError) {
            console.warn("Could not insert into ticket_diagnostic_answers", answersError);
          }
        }

        // 3. Insert notifications
        try {
          const { data: users, error: userErr } = await supabase
            .from('users')
            .select('id, roles!users_role_id_fkey(role_code)');
            
          const adminUsers = (users || []).filter((u: any) => {
            const roleCode = u.roles?.role_code || u.role_code;
            return roleCode === 'ADMIN';
          });
          let adminIds = adminUsers.map(u => u.id);

          if (adminIds.length > 0) {
            const notificationsPayload = adminIds.map(adminId => ({
              profile_id: adminId,
              content: `New ticket #${newTicketId} created by ${params.customerName} for ${params.productName}`,
              type: 'new_ticket',
              is_read: false,
              created_at: new Date().toISOString()
            }));
            await supabase.from('notifications').insert(notificationsPayload);
          }
        } catch (notifErr) {
          console.warn("Could not post system alerts / notifications", notifErr);
        }

        return ticketData as Ticket;
      },
      () => {
        const tickets = loadLocalData<any>('tickets', DEFAULT_TICKETS);
        const profiles = loadLocalData<Profile>('profiles', []);
        const tenants = loadLocalData<Tenant>('tenants', DEFAULT_TENANTS);

        const newId = `tick-${Math.floor(1000 + Math.random() * 9000)}`;
        const localTicket = {
          id: newId,
          priority: mappedPriority,
          title: params.title,
          description: params.description,
          status: 'new',
          created_by: params.createdBy,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          customer_id: params.customerId,
          product_id: params.productId,
          ai_recommendation: params.aiRecommendation,
          creator_name: params.customerName,
          assigned_to_name: 'Unassigned',
          tenant_name: tenants.find(t => t.id === params.customerId)?.name || 'Unknown Tenant',
        };

        tickets.unshift(localTicket);
        saveLocalData('tickets', tickets);

        // Save local diagnostic answers
        if (params.diagnosticAnswers && params.diagnosticAnswers.length > 0) {
          const localAnswers = loadLocalData<any>('ticket_diagnostic_answers', []);
          const answersPayload = params.diagnosticAnswers.map(ans => ({
            id: `da-${Math.random().toString(36).substr(2, 9)}`,
            ticket_id: newId,
            question_id: ans.question_id,
            question_text: ans.question_text,
            answer_text: ans.answer_text,
            option_id: ans.option_id || null,
            created_at: new Date().toISOString()
          }));
          saveLocalData('ticket_diagnostic_answers', [...answersPayload, ...localAnswers]);
        }

        // Save local notifications
        const adminProfiles = profiles.filter(p => p.role_code === 'ADMIN');
        if (adminProfiles.length > 0) {
          const localNotifs = loadLocalData<any>('notifications', []);
          const notifsPayload = adminProfiles.map(admin => ({
            id: `notif-${Math.random().toString(36).substr(2, 9)}`,
            profile_id: admin.id,
            content: `New ticket #${newId} created by ${params.customerName} for ${params.productName}`,
            type: 'new_ticket',
            is_read: false,
            created_at: new Date().toISOString()
          }));
          saveLocalData('notifications', [...notifsPayload, ...localNotifs]);
        }

        return localTicket as any;
      }
    );
  },

  async getArticlesForProduct(productId: string): Promise<KnowledgeArticle[]> {
    return safeExecute<KnowledgeArticle[]>(
      async () => {
        const { data, error } = await supabase
          .from('knowledge_articles')
          .select('*')
          .eq('product_id', productId);
        if (error) throw error;
        return data as KnowledgeArticle[];
      },
      () => {
        const list = loadLocalData<KnowledgeArticle>('knowledge_articles', DEFAULT_KNOWLEDGE_ARTICLES);
        return list.filter(art => art.product_id === productId);
      }
    );
  },

  async searchKnowledgeArticles(productId: string, query: string): Promise<KnowledgeArticle[]> {
    if (!query || query.trim() === '') {
      return this.getArticlesForProduct(productId);
    }
    
    // First retrieve candidate articles for the product
    const candidates = await this.getArticlesForProduct(productId);
    
    // Filter locally first to find keyword hits
    const matchedCandidates = candidates.filter(art => {
      const titleHit = (art.title || '').toLowerCase().includes((query || '').toLowerCase());
      const tagHit = Array.isArray(art.tags) && art.tags.some(t => (t || '').toLowerCase() === (query || '').trim().toLowerCase());
      return titleHit || tagHit;
    });

    if (matchedCandidates.length === 0) {
      return [];
    }

    // Call the server endpoint for Gemini AI relevance sorting
    try {
      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          productId,
          articles: matchedCandidates
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.articles)) {
          return data.articles;
        }
      }
    } catch (err) {
      console.warn("Gemini knowledge search ranking failed, falling back to simple match sorting", err);
    }

    return matchedCandidates;
  },

  async incrementArticleViewCount(articleId: string): Promise<number> {
    return safeExecute<number>(
      async () => {
        const { data: current } = await supabase
          .from('knowledge_articles')
          .select('view_count')
          .eq('id', articleId)
          .single();
        
        const count = (current?.view_count || 0) + 1;

        const { error } = await supabase
          .from('knowledge_articles')
          .update({ view_count: count })
          .eq('id', articleId);
        if (error) throw error;
        return count;
      },
      () => {
        const list = loadLocalData<KnowledgeArticle>('knowledge_articles', DEFAULT_KNOWLEDGE_ARTICLES);
        const art = list.find(a => a.id === articleId);
        if (art) {
          art.view_count = (art.view_count || 0) + 1;
          saveLocalData('knowledge_articles', list);
          return art.view_count;
        }
        return 0;
      }
    );
  },

  async analyzeHistoricalPatterns(productId: string, currentDescription: string): Promise<any> {
    return safeExecute<any>(
      async () => {
        const { data, error } = await supabase
          .from('tickets')
          .select('id, subject, description, created_at, ticket_statuses!inner(status_code)')
          .eq('product_id', productId)
          .in('ticket_statuses.status_code', ['CLOSED', 'APPROVED'])
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (error) throw error;
        
        const prods = await this.getProducts();
        const productName = prods.find(p => p.id === productId)?.name || 'Authorized Product';
        
        const response = await fetch('/api/tickets/analyze-patterns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName,
            currentDescription,
            pastTickets: (data || []).map((t: any) => ({
              id: t.id,
              title: t.subject || 'SWIFT Transaction Issue',
              description: t.description,
              resolution_notes: 'Issue resolved by standard configuration update.',
              root_cause: 'Configuration mismatch or out-of-date state.',
              created_at: t.created_at,
              resolved_at: t.created_at
            }))
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to analyze ticket patterns via Gemini API route');
        }
        
        return await response.json();
      },
      async () => {
        // Local Fallback logic
        const tickets = loadLocalData<any>('tickets', DEFAULT_TICKETS);
        const productClosedTickets = tickets.filter(
          (t: any) => t.product_id === productId && (t.status === 'closed' || t.status === 'resolved')
        );
        
        const pastTickets = productClosedTickets.slice(0, 50).map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          resolution_notes: t.resolution_notes || 'Resolved SWIFT transmission sequence delay.',
          root_cause: t.root_cause || 'Out-of-balance reconciliation state on EOD reporting.',
          created_at: t.created_at,
          resolved_at: t.updated_at || t.created_at
        }));
        
        const prods = await this.getProducts();
        const productName = prods.find(p => p.id === productId)?.name || 'Authorized Product';
        
        const response = await fetch('/api/tickets/analyze-patterns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productName,
            currentDescription,
            pastTickets
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to analyze ticket patterns in local mode');
        }
        
        return await response.json();
      }
    );
  },

  async assignTicket(params: {
    ticketId: string;
    agentId: string;
    agentName: string;
    ticketTitle: string;
    assignedById: string;
    assignedByName: string;
  }): Promise<{ success: boolean }> {
    return safeExecute(
      async () => {
        // 1. Update tickets table
        const { data: statusObj } = await supabase.from('ticket_statuses').select('id').eq('status_code', 'ASSIGNED').maybeSingle();
        const payload: any = {
          assigned_to: params.agentId,
          updated_at: new Date().toISOString()
        };
        if (statusObj) payload.status_id = statusObj.id;

        const { error: ticketErr } = await supabase
          .from('tickets')
          .update(payload)
          .eq('id', params.ticketId);
        
        if (ticketErr) throw ticketErr;

        // 2. Insert into ticket_assignments (wrapped in try-catch in case table schema behaves differently or doesn't exist)
        try {
          await supabase
            .from('ticket_assignments')
            .insert({
              ticket_id: params.ticketId,
              agent_id: params.agentId,
              assigned_by: params.assignedById,
              assigned_at: new Date().toISOString()
            });
        } catch (taError) {
          console.warn("Could not insert into ticket_assignments table:", taError);
        }

        // 3. Send notification for agent: "You have been assigned ticket #TKT-XXXX: [title]"
        const cleanTktId = params.ticketId.replace('tick-', '').toUpperCase();
        try {
          await supabase
            .from('notifications')
            .insert({
              profile_id: params.agentId,
              content: `You have been assigned ticket #TKT-${cleanTktId}: ${params.ticketTitle}`,
              type: 'assignment',
              is_read: false,
              created_at: new Date().toISOString()
            });
        } catch (notifErr1) {
          console.warn("Could not insert agent notification:", notifErr1);
        }

        // 4. Send notification for agent's manager: "Ticket #TKT-XXXX has been assigned to [agent_name]"
        try {
          // get admins
          const { data: users } = await supabase
            .from('users')
            .select('id, roles!users_role_id_fkey(role_code)');
          
          const admins = (users || []).filter((u: any) => {
            const roleCode = u.roles?.role_code || u.role_code;
            return roleCode === 'ADMIN';
          });
          
          if (admins && admins.length > 0) {
            const managerNotifs = admins.map(adm => ({
              profile_id: adm.id,
              content: `Ticket #TKT-${cleanTktId} has been assigned to ${params.agentName}`,
              type: 'assignment_manager',
              is_read: false,
              created_at: new Date().toISOString()
            }));
            await supabase.from('notifications').insert(managerNotifs);
          }
        } catch (notifErr2) {
          console.warn("Could not insert manager notifications:", notifErr2);
        }

        // 5. Log to audit_log
        try {
          await supabase.from('audit_log').insert({
            action: 'ASSIGN_TICKET',
            performed_by_id: params.assignedById,
            performed_by_name: params.assignedByName,
            details: `Ticket #TKT-${cleanTktId} ("${params.ticketTitle}") assigned to agent ${params.agentName}`
          });
        } catch (auditErr) {
          console.warn("Could not write to audit_log:", auditErr);
        }

        return { success: true };
      },
      () => {
        // Local fallback logic
        const tickets = loadLocalData<any>('tickets', DEFAULT_TICKETS);
        const idx = tickets.findIndex(t => t.id === params.ticketId);
        if (idx !== -1) {
          tickets[idx].assigned_to = params.agentId;
          tickets[idx].status = 'in_progress';
          tickets[idx].updated_at = new Date().toISOString();
          tickets[idx].assigned_to_name = params.agentName;
          saveLocalData('tickets', tickets);
        }

        // ticket assignments fallback
        const ass = loadLocalData<any>('ticket_assignments', []);
        ass.push({
          id: `ta-${Math.random().toString(36).substr(2, 9)}`,
          ticket_id: params.ticketId,
          agent_id: params.agentId,
          assigned_by: params.assignedById,
          assigned_at: new Date().toISOString()
        });
        saveLocalData('ticket_assignments', ass);

        // notifications fallback
        const cleanTktId = params.ticketId.replace('tick-', '').toUpperCase();
        const notifs = loadLocalData<any>('notifications', []);
        notifs.push({
          id: `n-${Math.random().toString(36).substr(2, 9)}`,
          profile_id: params.agentId,
          content: `You have been assigned ticket #TKT-${cleanTktId}: ${params.ticketTitle}`,
          type: 'assignment',
          is_read: false,
          created_at: new Date().toISOString()
        });

        // get all administrators from local profiles to notify "manager"
        const profiles = loadLocalData<Profile>('profiles', []);
        const admins = profiles.filter(p => p.role_code === 'ADMIN');
        admins.forEach(adm => {
          notifs.push({
            id: `n-${Math.random().toString(36).substr(2, 9)}`,
            profile_id: adm.id,
            content: `Ticket #TKT-${cleanTktId} has been assigned to ${params.agentName}`,
            type: 'assignment_manager',
            is_read: false,
            created_at: new Date().toISOString()
          });
        });
        saveLocalData('notifications', notifs);

        // audit log fallback
        const logs = loadLocalData<any>('audit_log', []);
        logs.unshift({
          id: `log-${Math.random().toString(36).substr(2, 9)}`,
          action: 'ASSIGN_TICKET',
          performed_by_id: params.assignedById,
          performed_by_name: params.assignedByName,
          details: `Ticket #TKT-${cleanTktId} ("${params.ticketTitle}") assigned to agent ${params.agentName}`,
          created_at: new Date().toISOString()
        });
        saveLocalData('audit_log', logs);

        return { success: true };
      }
    );
  },

  async submitTicketResolution(params: {
    ticketId: string;
    ticketTitle: string;
    agentId: string;
    agentName: string;
    formData: {
      rootCause: string;
      resolutionSteps: string;
      resolutionCategory: string;
      preventiveMeasures?: string;
      referenceArticleId?: string;
    }
  }): Promise<{ success: boolean }> {
    return safeExecute(
      async () => {
        const now = new Date().toISOString();
        const cleanTktId = params.ticketId.replace('tick-', '').toUpperCase();

        // 1. Update tickets
        const { data: statusObj } = await supabase.from('ticket_statuses').select('id').eq('status_code', 'RESOLVED_PENDING_APPROVAL').maybeSingle();
        const payload: any = {
          updated_at: now,
          resolution_justification: JSON.stringify(params.formData)
        };
        if (statusObj) payload.status_id = statusObj.id;

        const { error: ticketErr } = await supabase
          .from('tickets')
          .update(payload)
          .eq('id', params.ticketId);

        if (ticketErr) throw ticketErr;

        // 2. Send notification for agent's manager: "Ticket #TKT-XXXX resolution requires your approval. Submitted by [agent_name]."
        try {
          const { data: users } = await supabase
            .from('users')
            .select('id, roles!users_role_id_fkey(role_code)');

          const admins = (users || []).filter((u: any) => {
            const roleCode = u.roles?.role_code || u.role_code;
            return roleCode === 'ADMIN';
          });

          if (admins && admins.length > 0) {
            const managerNotifs = admins.map(adm => ({
              profile_id: adm.id,
              content: `Ticket #TKT-${cleanTktId} resolution requires your approval. Submitted by ${params.agentName}.`,
              type: 'resolution_approval_requested',
              is_read: false,
              created_at: now
            }));
            await supabase.from('notifications').insert(managerNotifs);
          }
        } catch (mNotifErr) {
          console.warn("Could not insert manager resolution notifications:", mNotifErr);
        }

        // 3. Send notification for agent: "Your resolution for #TKT-XXXX has been submitted for manager approval."
        try {
          await supabase
            .from('notifications')
            .insert({
              profile_id: params.agentId,
              content: `Your resolution for #TKT-${cleanTktId} has been submitted for manager approval.`,
              type: 'resolution_submitted',
              is_read: false,
              created_at: now
            });
        } catch (aNotifErr) {
          console.warn("Could not insert agent resolution submission notification:", aNotifErr);
        }

        // 4. Record to audit_log
        try {
          await supabase.from('audit_log').insert({
            action: 'SUBMIT_RESOLUTION',
            performed_by_id: params.agentId,
            performed_by_name: params.agentName,
            details: `Ticket #TKT-${cleanTktId} ("${params.ticketTitle}") resolution pending approval submitted by ${params.agentName}`
          });
        } catch (auditErr) {
          console.warn("Could not write resolution audit log:", auditErr);
        }

        return { success: true };
      },
      () => {
        const now = new Date().toISOString();
        const cleanTktId = params.ticketId.replace('tick-', '').toUpperCase();

        // Fallback for tickets local update
        const tickets = loadLocalData<any>('tickets', DEFAULT_TICKETS);
        const idx = tickets.findIndex(t => t.id === params.ticketId);
        if (idx !== -1) {
          tickets[idx].status = 'pending_approval';
          tickets[idx].resolution_draft = params.formData;
          tickets[idx].resolved_by = params.agentId;
          tickets[idx].resolution_submitted_at = now;
          tickets[idx].updated_at = now;
          saveLocalData('tickets', tickets);
        }

        // Fallback notifications
        const notifs = loadLocalData<any>('notifications', []);
        
        // Notification for Agent
        notifs.push({
          id: `n-${Math.random().toString(36).substr(2, 9)}`,
          profile_id: params.agentId,
          content: `Your resolution for #TKT-${cleanTktId} has been submitted for manager approval.`,
          type: 'resolution_submitted',
          is_read: false,
          created_at: now
        });

        // Notifications for Admins/Managers
        const profiles = loadLocalData<Profile>('profiles', []);
        const admins = profiles.filter(p => p.role_code === 'ADMIN');
        admins.forEach(adm => {
          notifs.push({
            id: `n-${Math.random().toString(36).substr(2, 9)}`,
            profile_id: adm.id,
            content: `Ticket #TKT-${cleanTktId} resolution requires your approval. Submitted by ${params.agentName}.`,
            type: 'resolution_approval_requested',
            is_read: false,
            created_at: now
          });
        });
        saveLocalData('notifications', notifs);

        // Fallback audit logs
        const logs = loadLocalData<any>('audit_log', []);
        logs.unshift({
          id: `log-${Math.random().toString(36).substr(2, 9)}`,
          action: 'SUBMIT_RESOLUTION',
          performed_by_id: params.agentId,
          performed_by_name: params.agentName,
          details: `Ticket #TKT-${cleanTktId} ("${params.ticketTitle}") resolution pending approval submitted by ${params.agentName}`,
          created_at: now
        });
        saveLocalData('audit_log', logs);

        return { success: true };
      }
    );
  },

  async approveTicketResolution(params: {
    ticketId: string;
    ticketTitle: string;
    managerId: string;
    managerName: string;
    agentId: string;
    customerId: string;
    draft: {
      rootCause: string;
      resolutionSteps: string;
      resolutionCategory: string;
      preventiveMeasures?: string;
      referenceArticleId?: string;
      referenceLink?: string;
    }
  }): Promise<{ success: boolean }> {
    return safeExecute(
      async () => {
        const now = new Date().toISOString();
        const cleanTktId = params.ticketId.replace('tick-', '').toUpperCase();

        // 1. Update tickets
        const { data: statusObj } = await supabase.from('ticket_statuses').select('id').eq('status_code', 'APPROVED').maybeSingle();
        const payload: any = {
          updated_at: now
        };
        if (statusObj) payload.status_id = statusObj.id;

        const { error: ticketErr } = await supabase
          .from('tickets')
          .update(payload)
          .eq('id', params.ticketId);

        if (ticketErr) throw ticketErr;

        // 2. Insert into ticket_comments / comments as a formal comment (type = 'resolution', visible to customer)
        const formatContent = `📢 **FORMAL RESOLUTION DEPLOYED**\n\n**Category:** ${params.draft.resolutionCategory}\n**Root Cause:** ${params.draft.rootCause}\n**Resolution Steps:** ${params.draft.resolutionSteps}${params.draft.preventiveMeasures ? `\n**Preventive Measures:** ${params.draft.preventiveMeasures}` : ''}${params.draft.referenceLink ? `\n**Reference:** [Knowledge Document](${params.draft.referenceLink})` : ''}`;

        try {
          const { error: commentErr } = await supabase
            .from('ticket_comments')
            .insert({
              ticket_id: params.ticketId,
              comment_text: formatContent,
              is_system_generated: true,
              author_id: params.managerId,
              created_at: now
            });

          if (commentErr) {
            // fallback to standard comments
            await supabase
              .from('comments')
              .insert({
                ticket_id: params.ticketId,
                author_id: params.managerId,
                author_name: params.managerName,
                author_role: 'admin',
                content: formatContent,
                is_internal: false,
                created_at: now
              });
          }
        } catch (comFail) {
          console.warn("Could not insert resolution comment:", comFail);
        }

        // 3. Insert notification for customer: "Your ticket #TKT-XXXX has been resolved. Please review the solution."
        if (params.customerId) {
          try {
            await supabase
              .from('notifications')
              .insert({
                profile_id: params.customerId,
                content: `Your ticket #TKT-${cleanTktId} has been resolved. Please review the solution.`,
                type: 'ticket_resolved',
                is_read: false,
                created_at: now
              });
          } catch (notifErr) {
            console.warn("Could not alert customer payload:", notifErr);
          }
        }

        // 4. Insert notification for agent: "Your resolution was approved and published."
        if (params.agentId) {
          try {
            await supabase
              .from('notifications')
              .insert({
                profile_id: params.agentId,
                content: `Your resolution for #TKT-${cleanTktId} was approved and published.`,
                type: 'resolution_approved',
                is_read: false,
                created_at: now
              });
          } catch (notifErr) {
            console.warn("Could not alert agent payload:", notifErr);
          }
        }

        // 5. Audit Log
        try {
          await supabase.from('audit_log').insert({
            action: 'APPROVE_RESOLUTION',
            performed_by_id: params.managerId,
            performed_by_name: params.managerName,
            details: `Manager ${params.managerName} approved and published resolution for #TKT-${cleanTktId} ("${params.ticketTitle}")`
          });
        } catch (auditErr) {
          console.warn("Could not write audit:", auditErr);
        }

        return { success: true };
      },
      () => {
        const now = new Date().toISOString();
        const cleanTktId = params.ticketId.replace('tick-', '').toUpperCase();

        // Fallback for tickets local update
        const tickets = loadLocalData<any>('tickets', DEFAULT_TICKETS);
        const idx = tickets.findIndex(t => t.id === params.ticketId);
        if (idx !== -1) {
          tickets[idx].status = 'resolved';
          tickets[idx].resolution_approved_by = params.managerId;
          tickets[idx].resolution_approved_at = now;
          tickets[idx].resolution_notes = params.draft;
          tickets[idx].updated_at = now;
          saveLocalData('tickets', tickets);
        }

        // Fallback comment
        const comments = loadLocalData<any>('comments', []);
        comments.push({
          id: `c-${Math.random().toString(36).substr(2, 9)}`,
          ticket_id: params.ticketId,
          author_id: params.managerId,
          author_name: params.managerName,
          author_role: 'admin',
          content: `📢 **FORMAL RESOLUTION DEPLOYED**\n\n**Category:** ${params.draft.resolutionCategory}\n**Root Cause:** ${params.draft.rootCause}\n**Resolution Steps:** ${params.draft.resolutionSteps}${params.draft.preventiveMeasures ? `\n**Preventive Measures:** ${params.draft.preventiveMeasures}` : ''}`,
          is_internal: false,
          created_at: now
        });
        saveLocalData('comments', comments);

        // Fallback notification setup
        const notifs = loadLocalData<any>('notifications', []);

        // Notification for Customer
        if (params.customerId) {
          notifs.push({
            id: `n-${Math.random().toString(36).substr(2, 9)}`,
            profile_id: params.customerId,
            content: `Your ticket #TKT-${cleanTktId} has been resolved. Please review the solution.`,
            type: 'ticket_resolved',
            is_read: false,
            created_at: now
          });
        }

        // Notification for Agent
        if (params.agentId) {
          notifs.push({
            id: `n-${Math.random().toString(36).substr(2, 9)}`,
            profile_id: params.agentId,
            content: `Your resolution for #TKT-${cleanTktId} was approved and published.`,
            type: 'resolution_approved',
            is_read: false,
            created_at: now
          });
        }
        saveLocalData('notifications', notifs);

        // Audit Log
        const logs = loadLocalData<any>('audit_log', []);
        logs.unshift({
          id: `log-${Math.random().toString(36).substr(2, 9)}`,
          action: 'APPROVE_RESOLUTION',
          performed_by_id: params.managerId,
          performed_by_name: params.managerName,
          details: `Manager ${params.managerName} approved and published resolution for #TKT-${cleanTktId} ("${params.ticketTitle}")`,
          created_at: now
        });
        saveLocalData('audit_log', logs);

        return { success: true };
      }
    );
  },

  async rejectTicketResolution(params: {
    ticketId: string;
    ticketTitle: string;
    managerId: string;
    managerName: string;
    agentId: string;
    feedback: string;
  }): Promise<{ success: boolean }> {
    return safeExecute(
      async () => {
        const now = new Date().toISOString();
        const cleanTktId = params.ticketId.replace('tick-', '').toUpperCase();

        // 1. Update tickets Set status = 'in_progress', revision_notes = feedback
        const { data: statusObj } = await supabase.from('ticket_statuses').select('id').eq('status_code', 'INVESTIGATION').maybeSingle();
        const payload: any = {
          updated_at: now
        };
        if (statusObj) payload.status_id = statusObj.id;

        const { error: ticketErr } = await supabase
          .from('tickets')
          .update(payload)
          .eq('id', params.ticketId);

        if (ticketErr) throw ticketErr;

        // 2. Insert comment regarding requested revision
        try {
          const { error: commentErr } = await supabase
            .from('ticket_comments')
            .insert({
              ticket_id: params.ticketId,
              comment_text: `❌ **RESOLUTION REVISION REQUESTED**\n\n**Manager Feedback:** ${params.feedback}`,
              is_system_generated: true,
              author_id: params.managerId,
              created_at: now
            });

          if (commentErr) {
            await supabase
              .from('comments')
              .insert({
                ticket_id: params.ticketId,
                author_id: params.managerId,
                author_name: params.managerName,
                author_role: 'admin',
                content: `❌ **RESOLUTION REVISION REQUESTED**\n\n**Manager Feedback:** ${params.feedback}`,
                is_internal: true,
                created_at: now
              });
          }
        } catch (cErr) {
          console.warn("Could not insert revision comment log:", cErr);
        }

        // 3. Insert notification for agent: "Manager requested revision on your resolution for #TKT-XXXX: [feedback]"
        if (params.agentId) {
          try {
            await supabase
              .from('notifications')
              .insert({
                profile_id: params.agentId,
                content: `Manager requested revision on your resolution for #TKT-${cleanTktId}: ${params.feedback}`,
                type: 'resolution_revision_requested',
                is_read: false,
                created_at: now
              });
          } catch (notifErr) {
            console.warn("Could not alert agent payload:", notifErr);
          }
        }

        // 4. Audit Log
        try {
          await supabase.from('audit_log').insert({
            action: 'REJECT_RESOLUTION',
            performed_by_id: params.managerId,
            performed_by_name: params.managerName,
            details: `Manager ${params.managerName} requested document revision on resolution draft for #TKT-${cleanTktId}`
          });
        } catch (auditErr) {
          console.warn("Could not write audit:", auditErr);
        }

        return { success: true };
      },
      () => {
        const now = new Date().toISOString();
        const cleanTktId = params.ticketId.replace('tick-', '').toUpperCase();

        // Local State
        const tickets = loadLocalData<any>('tickets', DEFAULT_TICKETS);
        const idx = tickets.findIndex(t => t.id === params.ticketId);
        if (idx !== -1) {
          tickets[idx].status = 'in_progress';
          tickets[idx].revision_notes = params.feedback;
          tickets[idx].updated_at = now;
          saveLocalData('tickets', tickets);
        }

        // Local comments
        const comments = loadLocalData<any>('comments', []);
        comments.push({
          id: `c-${Math.random().toString(36).substr(2, 9)}`,
          ticket_id: params.ticketId,
          author_id: params.managerId,
          author_name: params.managerName,
          author_role: 'admin',
          content: `❌ **RESOLUTION REVISION REQUESTED**\n\n**Manager Feedback:** ${params.feedback}`,
          is_internal: true,
          created_at: now
        });
        saveLocalData('comments', comments);

        // Local notification
        const notifs = loadLocalData<any>('notifications', []);
        if (params.agentId) {
          notifs.push({
            id: `n-${Math.random().toString(36).substr(2, 9)}`,
            profile_id: params.agentId,
            content: `Manager requested revision on your resolution for #TKT-${cleanTktId}: ${params.feedback}`,
            type: 'resolution_revision_requested',
            is_read: false,
            created_at: now
          });
        }
        saveLocalData('notifications', notifs);

        // Local audit logs
        const logs = loadLocalData<any>('audit_log', []);
        logs.unshift({
          id: `log-${Math.random().toString(36).substr(2, 9)}`,
          action: 'REJECT_RESOLUTION',
          performed_by_id: params.managerId,
          performed_by_name: params.managerName,
          details: `Manager ${params.managerName} requested document revision on resolution draft for #TKT-${cleanTktId}`,
          created_at: now
        });
        saveLocalData('audit_log', logs);

        return { success: true };
      }
    );
  },

  async getAllInternalEscalations(): Promise<any[]> {
    return safeExecute(
      async () => {
        const { data, error } = await supabase
          .from('ticket_comments')
          .select(`
            id,
            ticket_id,
            created_at,
            escalated_team_id,
            escalated_developer_name,
            escalation_returned_at,
            is_internal,
            is_system_generated,
            teams ( team_name ),
            tickets ( customer_id, assigned_to, ticket_no, subject )
          `)
          .eq('is_internal', true);

        if (error) throw error;
        
        const escalations = data || [];
        const assigneeIds = [...new Set(escalations.map((esc: any) => esc.tickets?.assigned_to).filter(Boolean))];
        const assigneeMap = new Map<string, string>();
        
        if (assigneeIds.length > 0) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, full_name')
            .in('id', assigneeIds);
          if (userData) {
            userData.forEach((u: any) => {
              assigneeMap.set(u.id, u.full_name);
            });
          }
        }

        return escalations.map((esc: any) => ({
          ...esc,
          tickets: {
            ...esc.tickets,
            assigned_to_name: esc.tickets?.assigned_to ? (assigneeMap.get(esc.tickets.assigned_to) || 'Unassigned') : 'Unassigned'
          }
        }));
      },
      () => [] // fallback to empty if local
    );
  }
};
