# Delta AI

Plataforma inteligente para gestão e análise de documentos regulatórios com assistente de IA integrado. O Delta AI ajuda equipes a gerenciar documentos de validação, rastrear mudanças, analisar impactos e manter conformidade regulatória de forma colaborativa.

## Funcionalidades

- **Upload e gestão de documentos** — Upload de documentos (PDF, DOCX, XLSX) com versionamento e timeline de alterações
- **Assistente de IA (Chat)** — Interface conversacional para análise de documentos, busca semântica e sugestões inteligentes
- **Análise de impacto** — Identificação automática de impactos quando mudanças são propostas em documentos regulatórios
- **Controle de mudanças** — Fluxo de aceitação/rejeição de alterações com diff visual e registro de histórico
- **Organizações e colaboração** — Suporte multi-organização com convites, membros e controle de acesso (RLS)
- **Exportação** — Geração de relatórios de mudança e exportação de documentos
- **Onboarding guiado** — Fluxo de boas-vindas para novos usuários e configuração de organização
- **Busca semântica** — Pesquisa inteligente em documentos usando embeddings vetoriais

## Tech Stack

| Camada        | Tecnologia                                                         |
| ------------- | ------------------------------------------------------------------ |
| Framework     | [Next.js 16](https://nextjs.org/) (App Router)                     |
| Linguagem     | TypeScript                                                         |
| UI            | React 19, Tailwind CSS 4, Radix UI, Lucide Icons, Framer Motion    |
| Backend/DB    | [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage, RLS) |
| Automação     | [n8n](https://n8n.io/) (webhooks e workflows)                      |
| Processamento | pdf-parse, mammoth, officeparser, xlsx                             |
| Exportação    | docx, puppeteer                                                    |
| Testes        | Vitest, Testing Library, fast-check (property-based)               |

## Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no [Supabase](https://supabase.com/) com projeto configurado
- (Opcional) Instância do [n8n](https://n8n.io/) para automações

## Instalação

```bash
# Clone o repositório
git clone https://github.com/RafaelCelso/Delta-AI.git
cd Delta-AI

# Instale as dependências
npm install
```

## Configuração

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-publishable-key

# Embeddings (busca semântica)
EMBEDDING_API_KEY=sua-api-key
EMBEDDING_API_URL=https://api.openai.com/v1/embeddings
EMBEDDING_MODEL=text-embedding-ada-002

# n8n (automações)
N8N_BASE_URL=sua-url-n8n
N8N_WEBHOOK_SECRET=seu-webhook-secret
```

### Banco de dados

As migrations do Supabase estão em `supabase/migrations/`. Aplique-as no seu projeto Supabase:

1. `20250101000000_initial_schema.sql` — Schema inicial (tabelas, tipos, funções)
2. `20250101000001_rls_policies.sql` — Políticas de Row Level Security
3. `20250101000002_semantic_search.sql` — Suporte a busca semântica com pgvector
4. `20250101000003_onboarding_function.sql` — Função de onboarding
5. `20250101000004_storage_policies.sql` — Políticas de storage

## Uso

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Iniciar em produção
npm start

# Rodar testes
npm test
```

Acesse [http://localhost:3000](http://localhost:3000) após iniciar o servidor de desenvolvimento.

## Estrutura do Projeto

```
src/
├── app/                    # Rotas e páginas (App Router)
│   ├── api/                # API Routes
│   │   ├── analyses/       # Análise de impacto
│   │   ├── change-records/ # Registros de mudança
│   │   ├── changes/        # Aceitação/rejeição de mudanças
│   │   ├── documents/      # CRUD de documentos
│   │   ├── export/         # Exportação de relatórios
│   │   ├── organizations/  # Gestão de organizações
│   │   └── sessions/       # Sessões de chat
│   ├── chat/               # Página do assistente IA
│   ├── dashboard/          # Dashboard principal
│   ├── documents/          # Gestão de documentos
│   ├── login/              # Autenticação
│   ├── onboarding/         # Fluxo de onboarding
│   └── organizations/      # Configurações de organização
├── components/             # Componentes React reutilizáveis
├── contexts/               # Context providers (Auth, Org, Session, Toast)
└── lib/                    # Lógica de negócio e utilitários
    ├── change-records/     # Lógica de registros de mudança
    ├── changes/            # Lógica de controle de mudanças
    ├── documents/          # Lógica de documentos
    ├── export/             # Lógica de exportação
    ├── impact-analysis/    # Lógica de análise de impacto
    ├── n8n/                # Integração com n8n
    ├── sessions/           # Lógica de sessões
    └── supabase/           # Cliente e helpers Supabase

supabase/
└── migrations/             # Migrations SQL do banco de dados

tests/
├── integration/            # Testes de integração
├── properties/             # Testes property-based
└── unit/                   # Testes unitários
```

## Licença

Projeto privado. Todos os direitos reservados.
