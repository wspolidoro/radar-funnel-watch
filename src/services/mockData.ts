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
  DashboardKPIs,
  Client
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
    updatedAt: '2024-03-01T14:30:00Z',
    lastEmailAt: '2024-03-05T09:00:00Z',
    avgIntervalHours: 36,
    hasNewActivity: true,
    sparklineData: [2, 3, 1, 4, 2, 5, 3, 2, 4, 3, 5, 4, 3, 2, 4, 5, 3, 2, 4, 3, 2, 5, 4, 3, 2, 4, 3, 5, 4, 2],
    insights: [
      'Este concorrente utiliza uma estratégia de onboarding com 5 emails espaçados em 48h',
      'Emails promocionais são enviados principalmente às quartas-feiras',
      'A taxa média de CTAs por email é 2.3, focando em ações primárias claras',
      'Aumentou cadência de envios em 30% nos últimos 7 dias'
    ]
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
    updatedAt: '2024-03-02T11:15:00Z',
    lastEmailAt: '2024-03-04T14:20:00Z',
    avgIntervalHours: 48,
    hasNewActivity: false,
    sparklineData: [1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2, 1, 2, 1, 1, 2],
    insights: [
      'Foco em conteúdo educacional com sequências longas',
      'Tom de voz profissional e técnico',
      'Baixa frequência de promoções (apenas 2 nos últimos 30 dias)'
    ]
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
    updatedAt: '2024-02-28T16:45:00Z',
    lastEmailAt: '2024-02-28T10:00:00Z',
    avgIntervalHours: 0,
    hasNewActivity: false,
    sparklineData: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    insights: [
      'Monitoramento pausado manualmente',
      'Última atividade registrada há mais de 7 dias'
    ]
  },
  {
    id: 'comp-4',
    name: 'Concorrente D',
    website: 'https://concorrented.com',
    mainDomain: 'concorrented.com',
    status: 'active',
    emailsLast30d: 68,
    activeFunnels: 5,
    createdAt: '2024-01-05T08:00:00Z',
    updatedAt: '2024-03-05T16:00:00Z',
    lastEmailAt: '2024-03-05T16:00:00Z',
    avgIntervalHours: 24,
    hasNewActivity: true,
    sparklineData: [3, 4, 2, 3, 5, 4, 3, 2, 4, 5, 3, 4, 2, 3, 5, 4, 3, 2, 4, 5, 3, 4, 2, 3, 5, 4, 3, 2, 4, 5],
    insights: [
      'Alto volume de disparos com cadência consistente de 24h',
      'Utiliza testes A/B em 40% dos emails',
      'Foco em promoções e ofertas limitadas',
      'Maior volume de envios entre 9h-11h'
    ]
  },
  {
    id: 'comp-5',
    name: 'Concorrente E',
    website: 'https://concorrentee.com',
    mainDomain: 'concorrentee.com',
    status: 'active',
    emailsLast30d: 15,
    activeFunnels: 1,
    createdAt: '2024-02-20T12:00:00Z',
    updatedAt: '2024-03-03T09:30:00Z',
    lastEmailAt: '2024-03-03T09:30:00Z',
    avgIntervalHours: 72,
    hasNewActivity: false,
    sparklineData: [0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1],
    insights: [
      'Estratégia conservadora com baixo volume',
      'Emails altamente segmentados e personalizados',
      'Foco em relacionamento de longo prazo'
    ]
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
    id: '1',
    competitorId: 'comp-1',
    name: 'Onboarding Premium',
    emailIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
    cadenceSummary: { avgGap: 48, min: 24, max: 72 },
    startDate: '2024-01-15',
    endDate: '2024-02-01',
    lastEmailAt: '2024-02-01T14:30:00',
    emails: [
      {
        id: 'e1',
        subject: 'Bem-vindo ao TechCorp! Comece aqui 🚀',
        category: 'onboarding',
        cta: 'Completar perfil',
        sentAt: '2024-01-15T09:00:00',
        dayOffset: 0
      },
      {
        id: 'e2',
        subject: 'Descubra os principais recursos',
        category: 'educacao',
        cta: 'Ver tutorial',
        sentAt: '2024-01-17T10:00:00',
        dayOffset: 2
      },
      {
        id: 'e3',
        subject: 'Dica: Como maximizar seus resultados',
        category: 'educacao',
        cta: 'Acessar guia',
        sentAt: '2024-01-20T15:00:00',
        dayOffset: 5
      },
      {
        id: 'e4',
        subject: 'Última chance: Upgrade com 50% OFF',
        category: 'promo',
        cta: 'Fazer upgrade',
        sentAt: '2024-01-25T11:00:00',
        dayOffset: 10
      },
      {
        id: 'e5',
        subject: 'Você está aproveitando tudo?',
        category: 'reengajamento',
        cta: 'Explorar recursos',
        sentAt: '2024-02-01T14:30:00',
        dayOffset: 17
      }
    ],
    insights: [
      'Funil focado em educação com conversão para upgrade',
      'Gap maior entre D+10 e D+17 pode indicar período de teste',
      'CTA mais agressivo no D+10 (desconto limitado)',
      'Tom de comunicação evolui de acolhedor para comercial'
    ]
  },
  {
    id: '2',
    competitorId: 'comp-2',
    name: 'Sequência Black Friday',
    emailIds: ['e6', 'e7', 'e8'],
    cadenceSummary: { avgGap: 24, min: 12, max: 36 },
    startDate: '2024-11-20',
    lastEmailAt: '2024-11-25T20:00:00',
    emails: [
      {
        id: 'e6',
        subject: '🔥 Black Friday chegou! Até 70% OFF',
        category: 'sazonal',
        cta: 'Ver ofertas',
        sentAt: '2024-11-20T08:00:00',
        dayOffset: 0
      },
      {
        id: 'e7',
        subject: 'Última chamada: Ofertas acabam em 24h ⏰',
        category: 'promo',
        cta: 'Aproveitar agora',
        sentAt: '2024-11-24T10:00:00',
        dayOffset: 4
      },
      {
        id: 'e8',
        subject: 'URGENTE: Últimas horas da Black Friday',
        category: 'promo',
        cta: 'Comprar antes que acabe',
        sentAt: '2024-11-25T20:00:00',
        dayOffset: 5
      }
    ],
    insights: [
      'Cadência agressiva típica de campanha sazonal',
      'Uso intenso de urgência e escassez',
      'Descontos progressivos para criar FOMO',
      'Foco total em conversão rápida'
    ]
  },
  {
    id: '3',
    competitorId: 'comp-1',
    name: 'Reativação de Inativos',
    emailIds: ['e9', 'e10', 'e11', 'e12'],
    cadenceSummary: { avgGap: 120, min: 72, max: 168 },
    startDate: '2024-03-01',
    lastEmailAt: '2024-03-25T16:00:00',
    emails: [
      {
        id: 'e9',
        subject: 'Sentimos sua falta! Aqui está um presente',
        category: 'reengajamento',
        cta: 'Voltar agora',
        sentAt: '2024-03-01T10:00:00',
        dayOffset: 0
      },
      {
        id: 'e10',
        subject: 'Novidades que você perdeu',
        category: 'educacao',
        cta: 'Ver novidades',
        sentAt: '2024-03-08T14:00:00',
        dayOffset: 7
      },
      {
        id: 'e11',
        subject: 'Oferta exclusiva para você voltar',
        category: 'promo',
        cta: 'Reativar conta',
        sentAt: '2024-03-18T11:00:00',
        dayOffset: 17
      },
      {
        id: 'e12',
        subject: 'Última tentativa: Queremos você de volta',
        category: 'reengajamento',
        cta: 'Dar uma chance',
        sentAt: '2024-03-25T16:00:00',
        dayOffset: 24
      }
    ],
    insights: [
      'Gaps longos respeitam tempo de decisão do usuário',
      'Estratégia de "dar espaço" antes de insistir',
      'Combinação de nostalgia, novidade e incentivo financeiro',
      'Tom empático e não invasivo'
    ]
  },
  {
    id: '4',
    competitorId: 'comp-1',
    name: 'Educação Contínua',
    emailIds: ['e13', 'e14', 'e15', 'e16', 'e17', 'e18'],
    cadenceSummary: { avgGap: 168, min: 168, max: 168 },
    startDate: '2024-01-01',
    lastEmailAt: '2024-02-19T09:00:00',
    emails: [
      {
        id: 'e13',
        subject: 'Dica da semana: Automação de tarefas',
        category: 'educacao',
        cta: 'Ler artigo',
        sentAt: '2024-01-01T09:00:00',
        dayOffset: 0
      },
      {
        id: 'e14',
        subject: 'Caso de sucesso: Como a Empresa X cresceu 200%',
        category: 'educacao',
        cta: 'Ver caso',
        sentAt: '2024-01-08T09:00:00',
        dayOffset: 7
      },
      {
        id: 'e15',
        subject: 'Webinar gratuito: Melhores práticas',
        category: 'educacao',
        cta: 'Inscrever-se',
        sentAt: '2024-01-15T09:00:00',
        dayOffset: 14
      },
      {
        id: 'e16',
        subject: 'Checklist: Otimize seu workflow',
        category: 'educacao',
        cta: 'Baixar checklist',
        sentAt: '2024-01-22T09:00:00',
        dayOffset: 21
      },
      {
        id: 'e17',
        subject: 'Novos recursos que você precisa conhecer',
        category: 'educacao',
        cta: 'Explorar',
        sentAt: '2024-01-29T09:00:00',
        dayOffset: 28
      },
      {
        id: 'e18',
        subject: 'Resumo do mês: Suas conquistas',
        category: 'educacao',
        cta: 'Ver relatório',
        sentAt: '2024-02-19T09:00:00',
        dayOffset: 49
      }
    ],
    insights: [
      'Cadência semanal consistente (todo segunda às 9h)',
      'Foco em agregar valor sem vender diretamente',
      'Construção de autoridade e engajamento de longo prazo',
      'Mix de formatos: artigos, casos, webinars, checklists'
    ]
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

export const mockClients: Client[] = [
  {
    id: 'client-1',
    nome: 'Tech Solutions Ltda',
    dominio: 'techsolutions.com.br',
    responsavel: 'Maria Santos',
    email: 'maria@techsolutions.com.br',
    telefone: '(11) 98765-4321',
    plano: 'pro',
    status: 'ativo',
    criadoEm: '2024-01-10T10:00:00Z',
    uso: {
      concorrentes: 5,
      emails: 230,
      relatorios: 8
    },
    historicoPagamentos: [
      { data: '2024-03-01', valor: 'R$ 299,00', status: 'Pago' },
      { data: '2024-02-01', valor: 'R$ 299,00', status: 'Pago' },
      { data: '2024-01-10', valor: 'R$ 299,00', status: 'Pago' }
    ]
  },
  {
    id: 'client-2',
    nome: 'Startup Innovare',
    dominio: 'innovare.io',
    responsavel: 'Carlos Mendes',
    email: 'carlos@innovare.io',
    telefone: '(21) 99876-5432',
    plano: 'basic',
    status: 'ativo',
    criadoEm: '2024-02-15T14:30:00Z',
    uso: {
      concorrentes: 2,
      emails: 85,
      relatorios: 3
    },
    historicoPagamentos: [
      { data: '2024-03-15', valor: 'R$ 99,00', status: 'Pago' },
      { data: '2024-02-15', valor: 'R$ 99,00', status: 'Pago' }
    ]
  },
  {
    id: 'client-3',
    nome: 'E-commerce Plus',
    dominio: 'ecommerceplus.com',
    responsavel: 'Ana Lima',
    email: 'ana@ecommerceplus.com',
    telefone: '(31) 97654-3210',
    plano: 'enterprise',
    status: 'ativo',
    criadoEm: '2023-11-20T09:00:00Z',
    uso: {
      concorrentes: 15,
      emails: 1250,
      relatorios: 24
    },
    historicoPagamentos: [
      { data: '2024-03-20', valor: 'R$ 999,00', status: 'Pago' },
      { data: '2024-02-20', valor: 'R$ 999,00', status: 'Pago' },
      { data: '2024-01-20', valor: 'R$ 999,00', status: 'Pago' }
    ]
  },
  {
    id: 'client-4',
    nome: 'Marketing Agency XYZ',
    dominio: 'agencyxyz.com.br',
    responsavel: 'Pedro Costa',
    email: 'pedro@agencyxyz.com.br',
    plano: 'pro',
    status: 'teste',
    criadoEm: '2024-03-01T11:00:00Z',
    uso: {
      concorrentes: 3,
      emails: 45,
      relatorios: 1
    },
    historicoPagamentos: []
  },
  {
    id: 'client-5',
    nome: 'Global Corp International',
    dominio: 'globalcorp.com',
    responsavel: 'Roberto Silva',
    email: 'roberto@globalcorp.com',
    telefone: '(47) 98123-4567',
    plano: 'enterprise',
    status: 'inativo',
    criadoEm: '2023-08-10T08:00:00Z',
    uso: {
      concorrentes: 8,
      emails: 650,
      relatorios: 15
    },
    historicoPagamentos: [
      { data: '2024-01-10', valor: 'R$ 999,00', status: 'Pago' },
      { data: '2023-12-10', valor: 'R$ 999,00', status: 'Pago' },
      { data: '2023-11-10', valor: 'R$ 999,00', status: 'Pago' }
    ]
  }
];
