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

export type SenderStatus = 'active' | 'paused' | 'error';

// Remetente - representa uma fonte de emails/newsletters que está sendo rastreada
export interface Sender {
  id: string;
  name: string;
  website: string;
  mainDomain: string;
  status: SenderStatus;
  emailsLast30d: number;
  activeFunnels: number;
  createdAt: string;
  updatedAt: string;
  lastEmailAt?: string;
  avgIntervalHours?: number;
  hasNewActivity?: boolean;
  sparklineData?: number[];
  insights?: string[];
}

// Alias para retrocompatibilidade
export type CompetitorStatus = SenderStatus;
export type Competitor = Sender;

export type SeedProvider = 'mailgun' | 'sendgrid' | 'gmail' | 'outlook';
export type SeedStatus = 'active' | 'inactive' | 'error';

export interface SeedInbox {
  id: string;
  email: string;
  provider: SeedProvider;
  status: SeedStatus;
  createdAt: string;
}

// Rastreamento - representa uma assinatura/inscrição em uma lista de emails
export interface Tracking {
  id: string;
  senderId: string;
  seedId: string;
  captureUrl: string;
  labels: string[];
  status: 'active' | 'paused';
  createdAt: string;
  // Alias para retrocompatibilidade
  competitorId?: string;
}

// Alias para retrocompatibilidade
export type Subscription = Tracking;

export type EmailCategory = 'onboarding' | 'promo' | 'educacao' | 'reengajamento' | 'sazonal';

export interface CTA {
  text: string;
  url: string;
  type?: 'primary' | 'secondary' | 'link';
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
  abTestId?: string;
  abVariantName?: string;
  dayOffset?: number;
  htmlContent?: string;
  textContent?: string;
}

export interface ABTest {
  id: string;
  name: string;
  competitorId: string;
  variants: {
    id: string;
    name: string;
    emailId: string;
    subject: string;
    metrics?: {
      opens?: number;
      clicks?: number;
      conversions?: number;
    };
  }[];
  startDate: string;
  winner?: string;
  insights?: string[];
}

export interface FunnelEmail {
  id: string;
  subject: string;
  category: EmailCategory;
  cta?: string;
  sentAt: string;
  dayOffset: number; // D+0, D+1, etc
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
  lastEmailAt: string;
  emails: FunnelEmail[];
  insights: string[];
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

export type ClientStatus = 'ativo' | 'teste' | 'inativo';
export type ClientPlan = 'basic' | 'pro' | 'enterprise';

export interface Client {
  id: string;
  nome: string;
  dominio: string;
  responsavel: string;
  email: string;
  telefone?: string;
  plano: ClientPlan;
  status: ClientStatus;
  criadoEm: string;
  uso: {
    remetentes: number;
    emails: number;
    relatorios: number;
  };
  historicoPagamentos: {
    data: string;
    valor: string;
    status: string;
  }[];
}

export interface DashboardKPIs {
  sendersMonitored: number;
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

// Remetente detectado - agregação de emails recebidos por from_email
export interface DetectedSender {
  fromEmail: string;
  fromName: string | null;
  emailCount: number;
  lastEmailAt: string;
  firstEmailAt: string;
  categories: string[];
  aliasIds: string[];
  aliasNames: string[];
  isUnexpected?: boolean; // Possível vazamento de dados
}
