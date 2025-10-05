// Mock API services - Ready to be replaced with real backend calls
import type {
  Competitor,
  SeedInbox,
  Subscription,
  Email,
  Funnel,
  Alert,
  Report,
  DashboardKPIs,
  PaginatedResponse,
  FilterParams
} from '@/types';

import {
  mockCompetitors,
  mockSeeds,
  mockSubscriptions,
  mockEmails,
  mockFunnels,
  mockAlerts,
  mockReports,
  mockDashboardKPIs
} from './mockData';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Competitors
export const competitorService = {
  async list(params?: FilterParams): Promise<PaginatedResponse<Competitor>> {
    await delay(300);
    const filtered = params?.search
      ? mockCompetitors.filter(c => 
          c.name.toLowerCase().includes(params.search!.toLowerCase())
        )
      : mockCompetitors;
    
    return {
      data: filtered,
      total: filtered.length,
      page: params?.page || 1,
      pageSize: params?.pageSize || 10
    };
  },

  async getById(id: string): Promise<Competitor | null> {
    await delay(200);
    return mockCompetitors.find(c => c.id === id) || null;
  },

  async create(data: Partial<Competitor>): Promise<Competitor> {
    await delay(400);
    const newCompetitor: Competitor = {
      id: `comp-${Date.now()}`,
      name: data.name || '',
      website: data.website || '',
      mainDomain: data.mainDomain || '',
      status: 'active',
      emailsLast30d: 0,
      activeFunnels: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    mockCompetitors.push(newCompetitor);
    return newCompetitor;
  },

  async update(id: string, data: Partial<Competitor>): Promise<Competitor> {
    await delay(300);
    const index = mockCompetitors.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Competitor not found');
    mockCompetitors[index] = { ...mockCompetitors[index], ...data, updatedAt: new Date().toISOString() };
    return mockCompetitors[index];
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    const index = mockCompetitors.findIndex(c => c.id === id);
    if (index !== -1) mockCompetitors.splice(index, 1);
  }
};

// Seeds
export const seedService = {
  async list(): Promise<SeedInbox[]> {
    await delay(200);
    return mockSeeds;
  },

  async create(data: Partial<SeedInbox>): Promise<SeedInbox> {
    await delay(400);
    const newSeed: SeedInbox = {
      id: `seed-${Date.now()}`,
      email: data.email || '',
      provider: data.provider || 'gmail',
      status: 'active',
      createdAt: new Date().toISOString()
    };
    mockSeeds.push(newSeed);
    return newSeed;
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    const index = mockSeeds.findIndex(s => s.id === id);
    if (index !== -1) mockSeeds.splice(index, 1);
  }
};

// Subscriptions
export const subscriptionService = {
  async list(competitorId?: string): Promise<Subscription[]> {
    await delay(200);
    return competitorId
      ? mockSubscriptions.filter(s => s.competitorId === competitorId)
      : mockSubscriptions;
  },

  async create(data: Partial<Subscription>): Promise<Subscription> {
    await delay(400);
    const newSub: Subscription = {
      id: `sub-${Date.now()}`,
      competitorId: data.competitorId || '',
      seedId: data.seedId || '',
      captureUrl: data.captureUrl || '',
      labels: data.labels || [],
      status: 'active',
      createdAt: new Date().toISOString()
    };
    mockSubscriptions.push(newSub);
    return newSub;
  },

  async delete(id: string): Promise<void> {
    await delay(300);
    const index = mockSubscriptions.findIndex(s => s.id === id);
    if (index !== -1) mockSubscriptions.splice(index, 1);
  }
};

// Emails
export const emailService = {
  async search(params: FilterParams & {
    competitorId?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<PaginatedResponse<Email>> {
    await delay(300);
    
    let filtered = [...mockEmails];
    
    if (params.competitorId) {
      filtered = filtered.filter(e => e.competitorId === params.competitorId);
    }
    if (params.category) {
      filtered = filtered.filter(e => e.category === params.category);
    }
    if (params.search) {
      filtered = filtered.filter(e => 
        e.subject.toLowerCase().includes(params.search!.toLowerCase()) ||
        e.topics.some(t => t.toLowerCase().includes(params.search!.toLowerCase()))
      );
    }
    
    return {
      data: filtered,
      total: filtered.length,
      page: params.page || 1,
      pageSize: params.pageSize || 20
    };
  },

  async getById(id: string): Promise<Email | null> {
    await delay(200);
    return mockEmails.find(e => e.id === id) || null;
  }
};

// Funnels
export const funnelService = {
  async list(competitorId?: string): Promise<Funnel[]> {
    await delay(200);
    return competitorId
      ? mockFunnels.filter(f => f.competitorId === competitorId)
      : mockFunnels;
  },

  async getById(id: string): Promise<Funnel | null> {
    await delay(200);
    return mockFunnels.find(f => f.id === id) || null;
  }
};

// Alerts
export const alertService = {
  async list(params?: { unreadOnly?: boolean }): Promise<Alert[]> {
    await delay(200);
    return params?.unreadOnly
      ? mockAlerts.filter(a => !a.readAt)
      : mockAlerts;
  },

  async markAsRead(id: string): Promise<void> {
    await delay(200);
    const alert = mockAlerts.find(a => a.id === id);
    if (alert) alert.readAt = new Date().toISOString();
  },

  async markAllAsRead(): Promise<void> {
    await delay(300);
    mockAlerts.forEach(a => {
      if (!a.readAt) a.readAt = new Date().toISOString();
    });
  }
};

// Reports
export const reportService = {
  async list(): Promise<Report[]> {
    await delay(200);
    return mockReports;
  },

  async create(data: Partial<Report>): Promise<Report> {
    await delay(800); // Simulate AI processing
    const newReport: Report = {
      id: `report-${Date.now()}`,
      title: data.title || 'Novo Relatório',
      periodStart: data.periodStart || '',
      periodEnd: data.periodEnd || '',
      competitorIds: data.competitorIds || [],
      summaryMd: '## Relatório gerado\n\nProcessando insights...',
      fileUrl: '/reports/temp.pdf',
      createdAt: new Date().toISOString()
    };
    mockReports.push(newReport);
    return newReport;
  }
};

// Dashboard
export const dashboardService = {
  async getKPIs(): Promise<DashboardKPIs> {
    await delay(200);
    return mockDashboardKPIs;
  },

  async getEmailsChart(days: number = 7): Promise<{ date: string; count: number }[]> {
    await delay(300);
    // Mock chart data
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      result.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 10) + 1
      });
    }
    return result;
  }
};

// AI Insights (mock)
export const aiService = {
  async generateInsights(competitorId: string): Promise<string[]> {
    await delay(1000);
    return [
      'Este concorrente utiliza uma estratégia de onboarding com 5 emails espaçados em 48h',
      'A taxa de CTAs por email é em média 2.3, focando em ações primárias claras',
      'Emails promocionais são enviados principalmente às quartas-feiras',
      'O tom de voz é casual e amigável, com uso moderado de emojis'
    ];
  }
};
