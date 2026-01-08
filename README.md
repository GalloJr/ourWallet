# 💰 OurWallet - Gerenciador Financeiro Inteligente do Casal

Aplicação web profissional para controle de finanças pessoais (SaaS). O sistema permite gerenciar entradas e saídas, visualizar saldo em tempo real e analisar gastos através de gráficos dinâmicos.

## 🚀 Tecnologias Utilizadas

* **Frontend:** HTML5, JavaScript (ES6+), TailwindCSS (Design Moderno).
* **Backend (BaaS):** Google Firebase (Firestore Database).
* **Autenticação:** Firebase Auth (Login Google).
* **Visualização:** Chart.js (Gráficos interativos).

## ✨ Funcionalidades

* ✅ Login seguro com conta Google.
* ✅ Dashboard com indicadores de Receita, Despesa e Saldo.
* ✅ Gráfico de Rosca (Donut Chart) automático (Entradas vs Saídas).
* ✅ Histórico de transações com ícones inteligentes por categoria.
* ✅ Proteção de dados (cada usuário só vê suas próprias finanças).
* ✅ Design Responsivo (Funciona no PC e Celular).

## 🔗 Link do Projeto
https://our-wallet-14998929-dc6cf.web.app

## 🛠️ Como Rodar o Projeto

Como este projeto utiliza **ES Modules** (JavaScript moderno), não é possível abri-lo diretamente via protocolo `file://` (clicando duas vezes no `index.html`). Você precisará de um servidor local simples.

### Opção 1: VS Code (Mais fácil)
1. Abra a pasta do projeto no VS Code.
2. Instale a extensão **Live Server**.
3. Clique com o botão direito no arquivo `index.html` e selecione **"Open with Live Server"**.

### Opção 2: Python
Se você tem Python instalado, abra o terminal na pasta e digite:
```bash
python -m http.server 8000
```
Acesse: `http://localhost:8000`

### Opção 3: Node.js
Se você tem Node instalado, pode usar o pacote `serve`:
```bash
npx serve .
```
Acesse a URL exibida no terminal (geralmente `http://localhost:3000`).

---

## 🚀 Deploy

Este é um projeto estático, então você pode hospedá-lo gratuitamente em diversas plataformas.

### Opção 1: Vercel (Recomendado)
A Vercel é ideal para projetos front-end.
1. Instale a CLI: `npm install -g vercel`
2. No terminal da pasta, rode: `vercel`
3. Siga os passos e seu site estará online em segundos.

### Opção 2: GitHub Pages
Se o seu código está no GitHub:
1. Vá em **Settings** > **Pages** no seu repositório.
2. Selecione a branch `main` e a pasta `/(root)`.
3. Clique em **Save**.

### Opção 3: Firebase Hosting (Recomendado para este projeto)
Como você já usa o Firebase para o banco de dados:
1. Instale o CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Inicialize: `firebase init hosting` (selecione seu projeto e use `.` como diretório público)
4. Deploy: `firebase deploy --only hosting`

---


## ⚙️ Configuração do Firebase (Opcional)

O projeto já está configurado com um ambiente funcional. Caso queira usar seu próprio banco de dados:

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
2. Ative o **Firestore Database** e o **Authentication** (Google Login).
3. No Firestore, habilite as regras de leitura/escrita.
4. Substitua as credenciais no arquivo `firebase.js` dentro do objeto `firebaseConfig`.

