# RadarMail - Monitoramento de E-mails de Concorrentes

Plataforma SaaS para monitorar e analisar funis de email marketing de concorrentes.

## 🚀 Começando

### Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse: http://localhost:8080

### Credenciais de Teste (Mock)

- **E-mail:** qualquer@email.com
- **Senha:** qualquer senha

O sistema está usando autenticação mockada para facilitar o desenvolvimento.

## 📁 Estrutura do Projeto

```
src/
├── components/
│   ├── layout/           # Navbar, Sidebar, Layout principal
│   ├── ui/               # Componentes shadcn
│   ├── EmailCard.tsx     # Card de visualização de e-mail
│   ├── CTAChip.tsx       # Chip de CTA com URL
│   └── RoleGuard.tsx     # Guard de permissões
├── contexts/
│   └── AuthContext.tsx   # Contexto de autenticação
├── pages/
│   ├── Dashboard.tsx     # Home com KPIs
│   ├── Competitors.tsx   # Lista de concorrentes
│   ├── Library.tsx       # Biblioteca de e-mails
│   ├── Funnels.tsx       # Funis detectados
│   ├── Reports.tsx       # Relatórios gerados
│   ├── Settings.tsx      # Configurações
│   ├── Onboarding.tsx    # Wizard de onboarding
│   └── Login.tsx         # Página de login
├── services/
│   ├── api.ts            # Services com funções assíncronas
│   └── mockData.ts       # Dados mockados
└── types/
    └── index.ts          # Tipos TypeScript
```

## 🔌 Integrando com Backend Real

### 1. Substituir Services Mockados

Os services em `src/services/api.ts` estão prontos para serem substituídos. Exemplo:

```typescript
// ANTES (Mock)
export const competitorService = {
  async list(params?: FilterParams): Promise<PaginatedResponse<Competitor>> {
    await delay(300);
    return { data: mockCompetitors, total: mockCompetitors.length, ... };
  }
};

// DEPOIS (Real API)
export const competitorService = {
  async list(params?: FilterParams): Promise<PaginatedResponse<Competitor>> {
    const response = await fetch(`${API_BASE_URL}/competitors?${new URLSearchParams(params)}`);
    return response.json();
  }
};
```

### 2. Variáveis de Ambiente

Crie um arquivo `.env.local`:

```env
VITE_API_BASE_URL=https://api.seubackend.com
VITE_SMTP_WEBHOOK_URL=https://webhook.inbound.mailgun.org/...
VITE_S3_BUCKET=radarmail-emails
VITE_DATABASE_URL=postgres://...
```

Use no código:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
```

### 3. Endpoints Necessários

#### Concorrentes
- `GET /competitors` - Listar
- `GET /competitors/:id` - Detalhes
- `POST /competitors` - Criar
- `PATCH /competitors/:id` - Atualizar
- `DELETE /competitors/:id` - Deletar

#### Seeds
- `GET /seeds` - Listar e-mails seed
- `POST /seeds` - Criar seed
- `DELETE /seeds/:id` - Remover

#### Inscrições
- `GET /subscriptions` - Listar
- `POST /subscriptions` - Criar
- `DELETE /subscriptions/:id` - Remover

#### E-mails
- `GET /emails` - Buscar (com filtros)
- `GET /emails/:id` - Detalhes
- Parâmetros: `competitorId`, `category`, `search`, `dateFrom`, `dateTo`

#### Funis
- `GET /funnels` - Listar
- `GET /funnels/:id` - Detalhes

#### Alertas
- `GET /alerts` - Listar
- `PATCH /alerts/:id/read` - Marcar como lido
- `PATCH /alerts/read-all` - Marcar todos como lido

#### Relatórios
- `GET /reports` - Listar
- `POST /reports` - Gerar novo (com IA)

#### Dashboard
- `GET /dashboard/kpis` - KPIs principais
- `GET /dashboard/chart` - Dados do gráfico

## 🧠 Integração com IA

### Gerar Insights

```typescript
// Em src/services/api.ts
export const aiService = {
  async generateInsights(competitorId: string): Promise<string[]> {
    const response = await fetch(`${API_BASE_URL}/ai/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitorId })
    });
    return response.json();
  }
};
```

### Criar Relatórios com IA

```typescript
const response = await fetch(`${API_BASE_URL}/reports/generate`, {
  method: 'POST',
  body: JSON.stringify({
    periodStart: '2024-01-01',
    periodEnd: '2024-01-31',
    competitorIds: ['comp-1', 'comp-2'],
    includeAiInsights: true
  })
});
```

## 📧 Webhook SMTP (Inbound)

Configure um webhook para receber e-mails automaticamente:

### Mailgun
```bash
POST https://api.mailgun.net/v3/routes
{
  "priority": 0,
  "description": "RadarMail Inbound",
  "expression": "match_recipient('.*@seeds.radarmail.app')",
  "action": ["forward('https://api.radarmail.app/webhooks/inbound')"]
}
```

### Handler de Webhook
```typescript
// No backend
app.post('/webhooks/inbound', async (req, res) => {
  const { sender, recipient, subject, body-html, body-plain } = req.body;
  
  // Processar e-mail
  await processInboundEmail({
    from: sender,
    to: recipient,
    subject,
    html: req.body['body-html'],
    text: req.body['body-plain']
  });
  
  res.status(200).send('OK');
});
```

## 💾 Armazenamento de HTMLs (S3)

```typescript
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

async function uploadEmailHtml(emailId: string, html: string) {
  await s3.putObject({
    Bucket: 'radarmail-emails',
    Key: `emails/${emailId}.html`,
    Body: html,
    ContentType: 'text/html',
    ACL: 'private'
  }).promise();
  
  return `https://radarmail-emails.s3.amazonaws.com/emails/${emailId}.html`;
}
```

## 🗄️ Banco de Dados (Sugestão Postgres)

### Tabelas Principais

```sql
-- Concorrentes
CREATE TABLE competitors (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  main_domain VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- E-mails Seed
CREATE TABLE seed_inboxes (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  provider VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inscrições
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  competitor_id UUID REFERENCES competitors(id),
  seed_id UUID REFERENCES seed_inboxes(id),
  capture_url TEXT,
  labels TEXT[],
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- E-mails coletados
CREATE TABLE emails (
  id UUID PRIMARY KEY,
  competitor_id UUID REFERENCES competitors(id),
  subscription_id UUID REFERENCES subscriptions(id),
  sent_at TIMESTAMP NOT NULL,
  from_email VARCHAR(255),
  subject TEXT,
  preheader TEXT,
  html_url TEXT,
  text_body TEXT,
  category VARCHAR(50),
  topics TEXT[],
  ctas JSONB,
  links TEXT[],
  is_ab_variant BOOLEAN DEFAULT FALSE,
  ab_key VARCHAR(100),
  day_offset INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Funis
CREATE TABLE funnels (
  id UUID PRIMARY KEY,
  competitor_id UUID REFERENCES competitors(id),
  name VARCHAR(255),
  email_ids UUID[],
  avg_gap_hours DECIMAL,
  min_gap_hours DECIMAL,
  max_gap_hours DECIMAL,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Alertas
CREATE TABLE alerts (
  id UUID PRIMARY KEY,
  competitor_id UUID REFERENCES competitors(id),
  type VARCHAR(50) NOT NULL,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP
);

-- Relatórios
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  period_start DATE,
  period_end DATE,
  competitor_ids UUID[],
  summary_md TEXT,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔐 Autenticação Real

### Substituir AuthContext

```typescript
// src/contexts/AuthContext.tsx
const login = async (email: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const { user, token } = await response.json();
  localStorage.setItem('radarmail_token', token);
  localStorage.setItem('radarmail_user', JSON.stringify(user));
  setUser(user);
};
```

## 🎨 Personalização

### Cores
Edite `src/index.css` para ajustar a paleta:

```css
:root {
  --primary: 228 100% 65%; /* Azul #4C6FFF */
}
```

### Logo
Substitua o logo em `AppSidebar.tsx`:

```tsx
<img src="/logo.png" alt="RadarMail" className="h-8" />
```

## 📊 Analytics e Monitoramento

Adicione tracking de eventos importantes:

```typescript
// src/lib/analytics.ts
export const trackEvent = (event: string, properties?: any) => {
  // Integrar com Mixpanel, PostHog, etc
  console.log('Event:', event, properties);
};

// Uso
trackEvent('competitor_added', { competitorId: 'comp-1' });
```

## 🧪 Testes

```bash
# Instalar dependências de teste
npm install -D vitest @testing-library/react

# Rodar testes
npm run test
```

## 🚀 Deploy

```bash
# Build de produção
npm run build

# Preview do build
npm run preview
```

## 📝 Próximos Passos

1. ✅ Substituir services mockados por chamadas reais de API
2. ✅ Configurar variáveis de ambiente
3. ✅ Integrar webhook SMTP para inbound
4. ✅ Configurar storage S3 para HTMLs
5. ✅ Implementar autenticação real com JWT
6. ✅ Adicionar detecção automática de funis
7. ✅ Integrar IA para insights e relatórios
8. ✅ Implementar busca full-text (Elasticsearch/Algolia)
9. ✅ Configurar rate limiting e segurança
10. ✅ Deploy em produção

## 🆘 Suporte

Para dúvidas ou problemas, consulte a documentação ou abra uma issue.

---

**Desenvolvido com ❤️ usando React + TypeScript + Tailwind CSS + shadcn/ui**
