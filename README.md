# 💰 OurWallet - Gerenciador Financeiro Pessoal e Familiar

[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

Aplicação web profissional e moderna para gerenciamento completo de finanças pessoais e familiares. Sistema SaaS (Software as a Service) que permite controlar receitas, despesas, cartões de crédito, dívidas e metas financeiras em tempo real, com interface intuitiva e recursos avançados de análise.

🌐 **[Acessar Aplicação](https://our-wallet-14998929-dc6cf.web.app)**

---

## 📑 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Tecnologias](#-tecnologias-utilizadas)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação](#-instalação-e-configuração)
- [Deploy](#-deploy)
- [Segurança](#-segurança)
- [Contribuição](#-contribuição)
- [Licença](#-licença)

---

## 🎯 Visão Geral

OurWallet é uma solução completa de gestão financeira que combina simplicidade de uso com recursos poderosos de análise e controle. Desenvolvido com tecnologias modernas e arquitetura escalável, o sistema oferece:

- **Gestão Multi-dimensional**: Controle de contas bancárias, cartões de crédito, dívidas e metas
- **Organização Inteligente**: Sistema de navegação por seções especializadas
- **Análise Visual**: Dashboards interativos com gráficos dinâmicos
- **Automação**: Despesas fixas recorrentes e parcelamento automático
- **Segurança Enterprise**: Autenticação OAuth 2.0 e regras de segurança Firestore
- **Multiplataforma**: PWA instalável com suporte offline

---

## ✨ Funcionalidades

### 🏠 Dashboard Geral
- **Visão 360°** de todas as finanças em um único lugar
- Gráficos interativos (Pizza, Barras, Linhas) com Chart.js
- Indicadores em tempo real de receitas, despesas e saldo
- Histórico completo de transações com filtros avançados
- Sistema de categorias com ícones inteligentes
- Modo escuro/claro com persistência de preferências

### 🎯 Metas Financeiras
- Criação e acompanhamento de objetivos financeiros
- Visualização de progresso com indicadores percentuais
- Cards personalizáveis com cores e ícones
- Cálculo automático de valores faltantes

### 🏦 Gestão de Contas Bancárias
- Cadastro de múltiplas contas bancárias
- Acompanhamento de saldo em tempo real
- **Despesas Fixas Recorrentes** (IPVA, seguros, aluguel)
- Filtros por conta, mês, status e busca textual
- Consolidação de pagamentos pendentes
- Marcação individual ou em lote de despesas pagas

### 💳 Controle de Cartões de Crédito
- Gerenciamento de múltiplos cartões
- Controle de limite e fatura atual
- Parcelamento automático de compras
- Extração inteligente de informações de parcelas
- Filtros por cartão, mês e busca
- Pagamento de faturas com registro de histórico

### 📉 Gerenciamento de Dívidas
- Cadastro e monitoramento de dívidas
- Acompanhamento de saldo devedor
- Registro de pagamentos com desconto opcional
- Histórico completo de pagamentos
- Cards coloridos para fácil identificação
- Abatimento automático do saldo

### 🔄 Transações Inteligentes
- **Parcelamento Automático**: Divide compras em múltiplas parcelas
- **Transações Recorrentes**: Despesas mensais automáticas
- **Despesas Fixas**: Sistema especializado para gastos periódicos
- Anexo de comprovantes (upload de imagens)
- Categorização automática por tipo
- Edição e exclusão com ajuste automático de saldos

### 🔒 Segurança e Privacidade
- Autenticação OAuth 2.0 via Google
- Sistema de wallets compartilhadas (familiar)
- Regras de segurança Firestore granulares
- Cloud Functions para validação de operações
- Auditoria de mudanças financeiras
- Isolamento total de dados entre usuários

### 📊 Análise e Relatórios
- Exportação de dados em CSV
- Filtros por período, categoria e fonte
- Visualização de tendências temporais
- Análise comparativa de receitas vs despesas
- Indicadores de status (pago/pendente)

---

## 🏗️ Arquitetura

### Modelo de Dados

```
users/
  └── {userId}/
      ├── displayName
      ├── email
      ├── photoURL
      └── createdAt

wallets/
  └── {walletId}/
      ├── name
      ├── owners[]
      └── createdAt

transactions/
  └── {transactionId}/
      ├── uid (walletId)
      ├── owner
      ├── desc
      ├── amount
      ├── date
      ├── category
      ├── source
      ├── paid
      ├── installmentCurrent
      └── installmentTotal

cards/
  └── {cardId}/
      ├── uid (walletId)
      ├── name
      ├── bank
      ├── limit
      ├── bill
      └── dueDate

accounts/
  └── {accountId}/
      ├── uid (walletId)
      ├── name
      ├── bank
      └── balance

debts/
  └── {debtId}/
      ├── uid (walletId)
      ├── name
      ├── color
      └── totalBalance

goals/
  └── {goalId}/
      ├── uid (walletId)
      ├── name
      ├── target
      └── current
```

### Cloud Functions

- **validateTransaction**: Valida transações antes de criar/editar
- **updateAccountBalance**: Atualiza saldos automaticamente
- **validateFinancialOperation**: Valida operações financeiras complexas
- **auditFinancialChanges**: Registra auditoria de mudanças
- **batchConsolidatePayments**: Consolida pagamentos em lote
- **cleanupOldData**: Limpeza automática de dados antigos (agendada)

---

## 🚀 Tecnologias Utilizadas

### Frontend
- **HTML5**: Estrutura semântica moderna
- **CSS3**: Estilização avançada
- **TailwindCSS v3**: Framework CSS utility-first
- **JavaScript ES6+**: Módulos, Async/Await, Classes
- **Chart.js v4**: Gráficos interativos e responsivos
- **Lucide Icons**: Biblioteca de ícones moderna
- **Service Worker**: PWA com cache estratégico

### Backend & Infraestrutura
- **Firebase Firestore**: Banco de dados NoSQL em tempo real
- **Firebase Authentication**: OAuth 2.0 (Google Sign-In)
- **Firebase Hosting**: CDN global com HTTPS
- **Firebase Cloud Functions**: Serverless Node.js 20
- **Firebase Storage**: Armazenamento de comprovantes

### DevOps & Ferramentas
- **Firebase CLI**: Deploy e gerenciamento
- **Git**: Controle de versão
- **npm**: Gerenciamento de dependências
- **ESLint**: Linting de código (Functions)

---

## 📁 Estrutura do Projeto

```
ourWallet/
├── index.html              # Página principal
├── app.js                  # Controlador principal da aplicação
├── firebase.js             # Configuração Firebase
├── sw.js                   # Service Worker (PWA)
├── manifest.json           # Manifesto PWA
├── tailwind.config.js      # Configuração Tailwind
├── firestore.rules         # Regras de segurança Firestore
├── firebase.json           # Configuração Firebase Hosting
│
├── css/
│   └── output.css          # CSS compilado do Tailwind
│
├── src/
│   └── input.css           # CSS fonte do Tailwind
│
├── modules/                # Módulos JavaScript
│   ├── auth.js             # Autenticação e wallets
│   ├── cards.js            # Gerenciamento de cartões
│   ├── accounts.js         # Gerenciamento de contas
│   ├── debts.js            # Gerenciamento de dívidas
│   ├── goals.js            # Gerenciamento de metas
│   ├── transactions.js     # Gerenciamento de transações
│   ├── navigation.js       # Sistema de navegação
│   ├── ui.js               # Componentes de interface
│   ├── utils.js            # Funções utilitárias
│   ├── dialogs.js          # Sistema de notificações
│   ├── constants.js        # Constantes e configurações
│   ├── security.js         # Validações de segurança
│   └── errorLogger.js      # Sistema de logs
│
├── functions/              # Firebase Cloud Functions
│   ├── index.js            # Functions principais
│   ├── package.json        # Dependências Functions
│   └── node_modules/       # Pacotes Node.js
│
└── docs/                   # Documentação
    ├── CHECKLIST.md        # Checklist de desenvolvimento
    ├── DEPLOY_GUIDE.md     # Guia de deploy
    ├── SECURITY.md         # Documentação de segurança
    ├── SECURITY_SUMMARY.md # Resumo de segurança
    └── FIREBASE_SECURITY_SETUP.md
```

---

## 🛠️ Instalação e Configuração

### Pré-requisitos

- Node.js 20+ e npm
- Conta Google
- Projeto Firebase

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/ourWallet.git
cd ourWallet
```

### 2. Configure o Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto
3. Ative os serviços:
   - **Authentication** → Google Sign-In
   - **Firestore Database** → Modo produção
   - **Hosting**
   - **Cloud Functions**
   - **Storage** (opcional, para comprovantes)

4. Copie as credenciais do Firebase:
   - Vá em **Configurações do Projeto** → **Geral**
   - Role até "Seus aplicativos" → "SDK do Firebase"
   - Copie o objeto `firebaseConfig`

5. Cole as credenciais em `firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJECT_ID.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_PROJECT_ID.appspot.com",
  messagingSenderId: "SEU_MESSAGING_ID",
  appId: "SEU_APP_ID"
};
```

### 3. Configure as Regras de Segurança

Deploy das regras Firestore:

```bash
firebase deploy --only firestore:rules
```

### 4. Instale as Dependências das Functions

```bash
cd functions
npm install
cd ..
```

### 5. Execute Localmente

**Opção 1: Live Server (VS Code)**
- Instale a extensão **Live Server**
- Clique direito em `index.html` → **Open with Live Server**

**Opção 2: Firebase Emulators**

```bash
firebase emulators:start
```

**Opção 3: Python HTTP Server**

```bash
python -m http.server 8000
```

**Opção 4: Node.js HTTP Server**

```bash
npx serve .
```

Acesse: `http://localhost:8000` (ou porta indicada)

---

## 🚀 Deploy

### Deploy Completo (Recomendado)

```bash
# Login no Firebase
firebase login

# Deploy de tudo (Hosting + Functions + Firestore Rules)
firebase deploy

# Deploy seletivo
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

### Deploy Scripts Automatizados

**Linux/Mac:**
```bash
./deploy.sh
```

**Windows:**
```batch
deploy.bat
```

### Deploy em Outras Plataformas

**Vercel:**
```bash
npm install -g vercel
vercel
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

**GitHub Pages:**
1. Vá em **Settings** → **Pages**
2. Selecione branch `main` e pasta `/(root)`
3. Salve e aguarde o deploy automático

---

## 🔒 Segurança

### Regras de Firestore

O projeto implementa regras de segurança robustas:

- ✅ Usuários só acessam seus próprios wallets
- ✅ Validação de tipos e campos obrigatórios
- ✅ Proteção contra modificação de campos críticos
- ✅ Limite de tamanho de documentos
- ✅ Validação de datas e valores numéricos

### Cloud Functions

- ✅ Validação de transações antes de persistir
- ✅ Auditoria de operações financeiras
- ✅ Verificação de integridade de dados
- ✅ Prevenção de operações fraudulentas

### Boas Práticas

- 🔐 OAuth 2.0 para autenticação
- 🔐 HTTPS obrigatório (Firebase Hosting)
- 🔐 Isolamento de dados por wallet
- 🔐 Sanitização de inputs
- 🔐 Rate limiting nas Functions
- 🔐 Logs de auditoria

- 🔐 Rate limiting nas Functions
- 🔐 Logs de auditoria

Para mais detalhes, consulte [docs/SECURITY.md](docs/SECURITY.md)

---

## 🧪 Testes

### Testes Manuais

Acesse os diferentes módulos e valide:

1. **Autenticação**
   - Login com Google
   - Criação/Seleção de wallet
   - Logout

2. **Transações**
   - Criar receita/despesa
   - Parcelamento automático
   - Despesas recorrentes
   - Edição e exclusão

3. **Cartões**
   - Cadastro de cartão
   - Compras parceladas
   - Pagamento de fatura
   - Visualização de limite

4. **Contas**
   - Cadastro de conta
   - Despesas fixas
   - Consolidação de pagamentos
   - Filtros e busca

5. **Dívidas**
   - Cadastro de dívida
   - Registro de pagamento
   - Desconto em pagamento
   - Abatimento de saldo

6. **Metas**
   - Criação de meta
   - Atualização de progresso
   - Exclusão

---

## 📊 Performance

### Métricas

- ⚡ **First Contentful Paint**: < 1.5s
- ⚡ **Time to Interactive**: < 3.5s
- ⚡ **Lighthouse Score**: 90+
- ⚡ **Bundle Size**: ~150 KB (gzipped)
- ⚡ **PWA Ready**: Instalável offline

### Otimizações Implementadas

- Lazy loading de módulos
- Service Worker com cache estratégico
- Compressão de assets
- CDN global (Firebase)
- Imagens otimizadas
- Minificação de código

---

## 🤝 Contribuição

Contribuições são bem-vindas! Para contribuir:

1. **Fork** o projeto
2. Crie uma **branch** para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add: Amazing Feature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. Abra um **Pull Request**

### Padrões de Commit

- `Add:` Nova funcionalidade
- `Fix:` Correção de bug
- `Update:` Atualização de código
- `Refactor:` Refatoração
- `Docs:` Documentação
- `Style:` Formatação
- `Test:` Testes

---

## 🗺️ Roadmap

### Em Desenvolvimento

- [ ] Notificações push de vencimentos
- [ ] Dashboard de investimentos

### Planejado

- [ ] IA para sugestões financeiras
- [ ] App mobile nativo (React Native)
- [ ] Metas colaborativas familiares
- [ ] Comparação de gastos mensal
- [ ] Integração com Pix
- [ ] Sistema de orçamentos por categoria
- [ ] Alertas de gastos excessivos
- [ ] Multi-moeda e conversão
- [ ] Integração com Open Banking

---

## 📝 Changelog

### v2.0.0 (2026-01-15)

#### Added
- ✨ Sistema de navegação por seções (Dashboard, Metas, Contas, Cartões, Dívidas)
- ✨ Despesas fixas recorrentes
- ✨ Filtros avançados em todas as seções
- ✨ Extração automática de parcelas da descrição
- ✨ Identificação inteligente de pagamentos por descrição
- ✨ Cloud Functions para validação de operações

#### Improved
- 🎨 Interface completamente redesenhada
- 🚀 Performance otimizada
- 📱 Responsividade aprimorada
- 🔒 Segurança reforçada

#### Fixed
- 🐛 Correção em filtros de contas e cartões
- 🐛 Sincronização de dados entre seções
- 🐛 Cálculo de parcelas

### v1.0.0 (Versão Inicial)

- ✅ Sistema básico de transações
- ✅ Dashboard com gráficos
- ✅ Autenticação Google
- ✅ CRUD de cartões, contas e metas

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

```
MIT License

Copyright (c) 2026 OurWallet

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👥 Autores

- **Renato Borges Gallo Junior** - *Desenvolvedor Principal* 
- [Github @GalloJr](https://github.com/GalloJr/)
- [Linkedin @renatobgjunior](https://www.linkedin.com/in/renatobgjunior/)

---

## 🙏 Agradecimentos

- [Firebase](https://firebase.google.com/) - Plataforma BaaS
- [TailwindCSS](https://tailwindcss.com/) - Framework CSS
- [Chart.js](https://www.chartjs.org/) - Biblioteca de gráficos
- [Lucide](https://lucide.dev/) - Ícones modernos
- Comunidade open source

---

## 📞 Suporte

- 📧 Email: gallodevsys@gmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/GalloJr/ourWallet/issues)

---

## 🌟 Estrelas no GitHub

Se este projeto te ajudou, considere dar uma ⭐ no repositório!

[![Star on GitHub](https://img.shields.io/github/stars/GalloJr/ourWallet?style=social)](https://github.com/GalloJr/ourWallet/stargazers)

---

<div align="center">

**Feito com ❤️ e ☕ por desenvolvedores apaixonados por finanças pessoais**

[🌐 Website](https://our-wallet-14998929-dc6cf.web.app) • [🐛 Reportar Bug](https://github.com/GalloJr/ourWallet/issues) • [✨ Solicitar Feature](https://github.com/GalloJr/ourWallet/issues)

</div>