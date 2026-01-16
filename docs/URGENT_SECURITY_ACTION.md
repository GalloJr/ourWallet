# 🚨 AÇÃO URGENTE: API Key Exposta

## Status: **RESOLVIDO LOCALMENTE** - Aguardando ações no Google Cloud Console

---

## ✅ O que já foi feito:

1. ✅ Removidas credenciais hardcoded do arquivo `firebase.js`
2. ✅ Criado sistema de variáveis de ambiente (`.env`)
3. ✅ `.gitignore` já protege arquivos `.env`
4. ✅ Código atualizado para usar `import.meta.env`

---

## ⚠️ AÇÕES URGENTES QUE VOCÊ DEVE FAZER AGORA:

### 1. **Regenerar a API Key no Google Cloud Console** (PRIORIDADE MÁXIMA)

A chave exposta foi: `AIzaSyBhLGUK3w4iwWnze0FEvA46z4VCv86CFHg`

**Passos:**
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Selecione o projeto: **our-wallet-14998929-dc6cf**
3. No menu lateral, vá em: **APIs & Services** → **Credentials**
4. Localize a API key exposta
5. Clique nos 3 pontos (⋮) → **Regenerate key**
6. Copie a nova chave e substitua no arquivo `.env` local

### 2. **Adicionar Restrições à API Key**

**Restrições de Aplicativo:**
- Vá em **Edit API key**
- Em "Application restrictions":
  - Selecione **HTTP referrers (web sites)**
  - Adicione seus domínios permitidos:
    ```
    https://your-domain.com/*
    https://your-domain.firebaseapp.com/*
    http://localhost:*  (apenas para desenvolvimento)
    ```

**Restrições de API:**
- Em "API restrictions":
  - Selecione **Restrict key**
  - Marque apenas as APIs que você usa:
    - Firebase Authentication API
    - Cloud Firestore API
    - Firebase Storage API
    - Firebase App Check API
    - Identity Toolkit API

### 3. **Verificar Atividade Suspeita**

1. No Google Cloud Console, vá em **IAM & Admin** → **Quotas**
2. Verifique uso de APIs nos últimos dias
3. Em **Billing**, verifique se há cobranças inesperadas

### 4. **Remover a Chave Antiga do Histórico do GitHub**

⚠️ **IMPORTANTE:** Apenas fazer um novo commit não é suficiente! A chave ainda está no histórico do Git.

**Opção A - Se o repositório é privado ou pode ser recriado:**
```bash
# 1. Faça backup local de todo o código atual
# 2. Delete o repositório no GitHub
# 3. Recrie um novo repositório
# 4. Faça o primeiro commit com o código já limpo
```

**Opção B - Limpar histórico do Git (avançado):**
```bash
# Use git-filter-repo ou BFG Repo-Cleaner
# Isso reescreve o histórico do Git
# CUIDADO: Requer force push e afeta todos os colaboradores
```

**Opção C - Se já regenerou a chave:**
- A chave antiga no GitHub estará inválida após regeneração
- Mas ainda é visível publicamente (má prática de segurança)

### 5. **Configurar Firebase App Check (já está no código)**

Verifique se o App Check está ativo no Firebase Console:
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **App Check** no menu lateral
4. Registre sua aplicação web
5. Configure reCAPTCHA v3

### 6. **Habilitar Regras de Segurança do Firestore**

Verifique se suas regras em `firestore.rules` estão restritivas:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Nunca use: allow read, write: if true;
    // Sempre valide autenticação
  }
}
```

---

## 📋 Checklist de Segurança

- [ ] Regenerei a API key no Google Cloud Console
- [ ] Atualizei o arquivo `.env` local com a nova chave
- [ ] Configurei restrições de HTTP referrers
- [ ] Configurei restrições de API
- [ ] Verifiquei atividade suspeita no console
- [ ] Removi ou invalidei a chave do histórico do GitHub
- [ ] Testei a aplicação com a nova configuração
- [ ] Configurei Firebase App Check
- [ ] Revisei regras de segurança do Firestore
- [ ] Notifiquei a equipe sobre a mudança de chaves

---

## 🔄 Para Fazer Deploy Após Regenerar a Chave

1. **Atualize o `.env` com a nova chave**
2. **Teste localmente:**
   ```bash
   npm run dev
   ```

3. **Commit e push das mudanças** (sem o arquivo `.env`):
   ```bash
   git add firebase.js .env.example .gitignore
   git commit -m "security: remove hardcoded API keys, use environment variables"
   git push
   ```

4. **Configure variáveis de ambiente na hospedagem:**
   - Se usar Firebase Hosting: Configure no console ou via `firebase functions:config:set`
   - Se usar Netlify/Vercel: Configure no dashboard de ambiente

---

## 📚 Referências

- [Melhores práticas de segurança - Firebase](https://firebase.google.com/docs/projects/api-keys)
- [Handling compromised GCP credentials](https://cloud.google.com/iam/docs/best-practices-for-managing-service-account-keys)
- [Restrict API keys](https://cloud.google.com/docs/authentication/api-keys#api_key_restrictions)
- [Firebase App Check](https://firebase.google.com/docs/app-check)

---

## ❓ Dúvidas Frequentes

**P: Alguém já pode ter usado minha chave?**
R: Sim, é possível. Verifique imediatamente o uso no Google Cloud Console.

**P: Devo criar um novo projeto Firebase?**
R: Não necessariamente. Regenerar a chave e adicionar restrições deve ser suficiente.

**P: A chave do reCAPTCHA também foi exposta?**
R: A chave site key do reCAPTCHA é pública por natureza. Apenas a secret key deve ser privada (usada no backend).

**P: Por quanto tempo devo monitorar?**
R: Monitore o uso por pelo menos 30 dias após regenerar a chave.

---

## 📞 Suporte

Se encontrar atividade suspeita ou cobranças inesperadas:
1. Entre em contato com o [Google Cloud Support](https://cloud.google.com/support)
2. Considere habilitar alertas de billing
3. Configure limites de gasto no projeto

---

**Data da correção:** 16/01/2026
**Chave exposta (INVÁLIDA APÓS REGENERAÇÃO):** AIzaSyBhLGUK3w4iwWnze0FEvA46z4VCv86CFHg
**URL da exposição:** https://github.com/GalloJr/ourWallet/blob/72d684d228169e06520213a3c6046d16f09b5e81/firebase.js
