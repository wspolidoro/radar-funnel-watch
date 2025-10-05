export type UserRole = 'owner' | 'admin' | 'analyst' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organizationId: string;
  avatar?: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: 'basic' | 'pro' | 'enterprise';
}

export type CompetitorStatus = 'active' | 'paused' | 'error';

export interface Competitor {
  id: string;
  name: string;
  website: string;
  mainDomain: string;
  status: CompetitorStatus;
  emailsLast30d: number;
  activeFunnels: number;
  createdAt: string;
  updatedAt: string;
}

export type SeedProvider = 'mailgun' | 'sendgrid' | 'gmail' | 'outlook';
export type SeedStatus = 'active' | 'inactive' | 'error';

export interface SeedInbox {
  id: string;
  email: string;
  provider: SeedProvider;
  status: SeedStatus;
  createdAt: string;
}

export interface Subscription {
  id: string;
  competitorId: string;
  seedId: string;
  captureUrl: string;
  labels: string[];
  status: 'active' | 'paused';
  createdAt: string;
}

export type EmailCategory = 'onboarding' | 'promo' | 'educacao' | 'reengajamento' | 'sazonal';

export interface CTA {
  text: string;
  url: string;
}

export interface Email {
  id: string;
  competitorId: string;
  subscriptionId: string;
  sentAt: string;
  from: string;
  subject: string;
  preheader: string;
  htmlUrl?: string;
  textBody: string;
  category: EmailCategory;
  topics: string[];
  ctas: CTA[];
  links: string[];
  isAbVariant: boolean;
  abKey?: string;
  dayOffset?: number; // D+0, D+1, etc
}

export interface Funnel {
  id: string;
  competitorId: string;
  name: string;
  emailIds: string[];
  cadenceSummary: {
    avgGap: number; // hours
    min: number;
    max: number;
  };
  startDate: string;
  endDate?: string;
}

export type AlertType = 'new_email' | 'new_funnel' | 'competitor_paused' | 'ab_test_detected';

export interface Alert {
  id: string;
  competitorId?: string;
  type: AlertType;
  payload: Record<string, any>;
  createdAt: string;
  readAt?: string;
}

export interface Report {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  competitorIds: string[];
  summaryMd: string;
  fileUrl?: string;
  createdAt: string;
}

export interface DashboardKPIs {
  competitorsMonitored: number;
  newEmailsLast7d: number;
  funnelsDetected: number;
  avgIntervalHours: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
