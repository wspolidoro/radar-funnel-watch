import type {
  User,
  Organization,
  Competitor,
  SeedInbox,
  Subscription,
  Email,
  Funnel,
  Alert,
  Report,
  DashboardKPIs
} from '@/types';

export const mockUser: User = {
  id: 'user-1',
  name: 'João Silva',
  email: 'joao@empresa.com',
  role: 'owner',
  organizationId: 'org-1',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=joao'
};

export const mockOrganization: Organization = {
  id: 'org-1',
  name: 'Minha Empresa',
  plan: 'pro'
};

export const mockCompetitors: Competitor[] = [
  {
    id: 'comp-1',
    name: 'Concorrente A',
    website: 'https://concorrentea.com',
    mainDomain: 'concorrentea.com',
    status: 'active',
    emailsLast30d: 47,
    activeFunnels: 3,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-03-01T14:30:00Z'
  },
  {
    id: 'comp-2',
    name: 'Concorrente B',
    website: 'https://concorrenteb.com',
    mainDomain: 'concorrenteb.com',
    status: 'active',
    emailsLast30d: 32,
    activeFunnels: 2,
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-03-02T11:15:00Z'
  },
  {
    id: 'comp-3',
    name: 'Concorrente C',
    website: 'https://concorrentec.com',
    mainDomain: 'concorrentec.com',
    status: 'paused',
    emailsLast30d: 0,
    activeFunnels: 0,
    createdAt: '2024-01-20T15:00:00Z',
    updatedAt: '2024-02-28T16:45:00Z'
  }
];

export const mockSeeds: SeedInbox[] = [
  {
    id: 'seed-1',
    email: 'seed1@emailmonitor.com',
    provider: 'gmail',
    status: 'active',
    createdAt: '2024-01-10T08:00:00Z'
  },
  {
    id: 'seed-2',
    email: 'seed2@emailmonitor.com',
    provider: 'mailgun',
    status: 'active',
    createdAt: '2024-01-11T09:30:00Z'
  }
];

export const mockSubscriptions: Subscription[] = [
  {
    id: 'sub-1',
    competitorId: 'comp-1',
    seedId: 'seed-1',
    captureUrl: 'https://concorrentea.com/newsletter',
    labels: ['onboarding', 'promo'],
    status: 'active',
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: 'sub-2',
    competitorId: 'comp-2',
    seedId: 'seed-1',
    captureUrl: 'https://concorrenteb.com/signup',
    labels: ['educacao'],
    status: 'active',
    createdAt: '2024-02-01T09:15:00Z'
  }
];

export const mockEmails: Email[] = [
  {
    id: 'email-1',
    competitorId: 'comp-1',
    subscriptionId: 'sub-1',
    sentAt: '2024-03-01T10:00:00Z',
    from: 'contato@concorrentea.com',
    subject: 'Bem-vindo! Comece agora sua jornada',
    preheader: 'Seus primeiros passos com a gente',
    textBody: 'Olá! Bem-vindo...',
    category: 'onboarding',
    topics: ['boas-vindas', 'primeiros-passos'],
    ctas: [
      { text: 'Começar agora', url: 'https://concorrentea.com/start' },
      { text: 'Ver tutorial', url: 'https://concorrentea.com/tutorial' }
    ],
    links: ['https://concorrentea.com/start', 'https://concorrentea.com/tutorial'],
    isAbVariant: false,
    dayOffset: 0
  },
  {
    id: 'email-2',
    competitorId: 'comp-1',
    subscriptionId: 'sub-1',
    sentAt: '2024-03-02T14:00:00Z',
    from: 'contato@concorrentea.com',
    subject: 'Dica #1: Como maximizar seus resultados',
    preheader: 'Aprenda as melhores práticas',
    textBody: 'Confira nossa dica...',
    category: 'educacao',
    topics: ['dicas', 'educacao'],
    ctas: [
      { text: 'Ler mais', url: 'https://concorrentea.com/blog/dica-1' }
    ],
    links: ['https://concorrentea.com/blog/dica-1'],
    isAbVariant: false,
    dayOffset: 1
  },
  {
    id: 'email-3',
    competitorId: 'comp-1',
    subscriptionId: 'sub-1',
    sentAt: '2024-03-05T09:00:00Z',
    from: 'contato@concorrentea.com',
    subject: '🔥 Oferta especial: 30% OFF',
    preheader: 'Exclusivo para novos usuários',
    textBody: 'Aproveite nossa oferta...',
    category: 'promo',
    topics: ['desconto', 'oferta'],
    ctas: [
      { text: 'Aproveitar agora', url: 'https://concorrentea.com/promo?utm=email' }
    ],
    links: ['https://concorrentea.com/promo?utm=email'],
    isAbVariant: true,
    abKey: 'promo-test-a',
    dayOffset: 4
  }
];

export const mockFunnels: Funnel[] = [
  {
    id: 'funnel-1',
    competitorId: 'comp-1',
    name: 'Onboarding Principal',
    emailIds: ['email-1', 'email-2', 'email-3'],
    cadenceSummary: {
      avgGap: 36,
      min: 24,
      max: 72
    },
    startDate: '2024-03-01T10:00:00Z',
    endDate: '2024-03-05T09:00:00Z'
  },
  {
    id: 'funnel-2',
    competitorId: 'comp-2',
    name: 'Série Educacional',
    emailIds: ['email-4', 'email-5'],
    cadenceSummary: {
      avgGap: 48,
      min: 48,
      max: 48
    },
    startDate: '2024-02-15T08:00:00Z'
  }
];

export const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    competitorId: 'comp-1',
    type: 'new_email',
    payload: { emailId: 'email-3', subject: '🔥 Oferta especial: 30% OFF' },
    createdAt: '2024-03-05T09:05:00Z'
  },
  {
    id: 'alert-2',
    competitorId: 'comp-1',
    type: 'ab_test_detected',
    payload: { emailId: 'email-3', variant: 'A' },
    createdAt: '2024-03-05T09:10:00Z'
  },
  {
    id: 'alert-3',
    competitorId: 'comp-3',
    type: 'competitor_paused',
    payload: { reason: 'Manual pause by user' },
    createdAt: '2024-02-28T16:45:00Z',
    readAt: '2024-02-28T17:00:00Z'
  }
];

export const mockReports: Report[] = [
  {
    id: 'report-1',
    title: 'Análise Mensal - Fevereiro 2024',
    periodStart: '2024-02-01',
    periodEnd: '2024-02-29',
    competitorIds: ['comp-1', 'comp-2'],
    summaryMd: '## Principais Insights\n\n- Concorrente A enviou 15 emails\n- Categoria mais usada: Educação',
    fileUrl: '/reports/feb-2024.pdf',
    createdAt: '2024-03-01T10:00:00Z'
  }
];

export const mockDashboardKPIs: DashboardKPIs = {
  competitorsMonitored: 3,
  newEmailsLast7d: 12,
  funnelsDetected: 5,
  avgIntervalHours: 42
};
