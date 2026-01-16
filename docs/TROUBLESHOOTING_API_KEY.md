# 🔧 Solução para Erro "API key expired"

## ❌ Problema Identificado

Você está vendo este erro:
```
FirebaseError: Firebase: Error (auth/api-key-expired.-please-renew-the-api-key.)
API key expired. Please renew the API key.
```

E o console mostra que está tentando usar a chave antiga: `AIzaSyBhLGUK3w4iwWnze0FEvA46z4VCv86CFHg`

---

## ✅ Solução Rápida

### Passo 1: Limpar Cache do Navegador

A chave nova já foi deployada, mas o navegador pode estar com cache:

**Chrome/Edge:**
1. Pressione `Ctrl + Shift + Delete`
2. Selecione "Cache" e "Cookies"
3. Limpe apenas do último dia
4. OU abra em modo anônimo: `Ctrl + Shift + N`

**Firefox:**
1. Pressione `Ctrl + Shift + Delete`
2. Marque "Cache" 
3. Limpar

**Ou Force Refresh:**
- Pressione `Ctrl + F5` (Windows)
- Ou `Ctrl + Shift + R`

### Passo 2: Aguardar Propagação do CDN

O Firebase Hosting pode levar alguns minutos para propagar. Aguarde 5-10 minutos.

### Passo 3: Verificar URL

Certifique-se de estar acessando:
```
https://our-wallet-14998929-dc6cf.firebaseapp.com
```

Não abra o arquivo `index.html` diretamente do disco (`file://`)!

---

## 🧪 Teste Local (Desenvolvimento)

Se quiser testar localmente sem problemas de módulos ES6:

### Opção 1: Usar servidor HTTP local
```bash
npm run dev
```
Depois acesse: http://localhost:3000

### Opção 2: Usar Firebase Emulator
```bash
firebase serve
```
Depois acesse: http://localhost:5000

---

## 🔍 Verificar se Deploy Funcionou

### 1. Verificar arquivo deployado
Acesse no navegador:
```
https://our-wallet-14998929-dc6cf.firebaseapp.com/firebase.config.js
```

Você deve ver a **nova chave**: `AIzaSyBKcIQk5H3jRxXl36kqwFOr5vUpfqP9OYY`

### 2. Ver versão deployada
```bash
firebase hosting:channel:list
```

---

## ⚠️ Se o Erro Persistir

### A chave nova pode ter expirado também?

Verifique no Google Cloud Console se a chave está ativa:
1. https://console.cloud.google.com/apis/credentials
2. Procure por: `AIzaSyBKcIQk5H3jRxXl36kqwFOr5vUpfqP9OYY`
3. Verifique se está "Ativa" (não "Expirada")

Se estiver expirada, gere outra:
1. Clique nos 3 pontos → "Regenerate key"
2. Copie a nova chave
3. Atualize o arquivo `.env` local:
   ```
   VITE_FIREBASE_API_KEY=nova_chave_aqui
   ```
4. Faça novo deploy:
   ```bash
   ./deploy.bat
   ```

---

## 🐛 Outros Erros no Console

### Erro de CSP (Content Security Policy) - Fontes

```
Loading font violates Content Security Policy directive: "font-src"
```

Esse é apenas um warning e não afeta a funcionalidade. Para corrigir, adicione ao `firebase.json`:

```json
"font-src 'self' https://fonts.gstatic.com https://r2cdn.perplexity.ai"
```

---

## 📊 Como Verificar se Está Usando a Chave Correta

Abra o DevTools (F12) e execute no Console:

```javascript
// Ver configuração carregada
import('./firebase.config.js').then(m => console.log(m.firebaseConfig.apiKey))
```

Deve mostrar: `AIzaSyBKcIQk5H3jRxXl36kqwFOr5vUpfqP9OYY`

---

## ✅ Checklist de Solução

- [ ] Limpei o cache do navegador
- [ ] Aguardei 5-10 minutos para propagação
- [ ] Acessei via HTTPS (não file://)
- [ ] Verifiquei que firebase.config.js está acessível
- [ ] Confirmei que a chave nova está ativa no Google Cloud
- [ ] Fiz force refresh (Ctrl + F5)

---

## 🆘 Ainda com Problema?

Se após todos os passos o erro persistir:

1. **Verifique os logs do Firebase:**
   ```bash
   firebase functions:log
   ```

2. **Teste se a API key funciona diretamente:**
   ```bash
   curl "https://identitytoolkit.googleapis.com/v1/projects?key=AIzaSyBKcIQk5H3jRxXl36kqwFOr5vUpfqP9OYY"
   ```
   Se retornar erro 400, a chave está inválida.

3. **Gere uma nova chave e refaça o processo.**

---

**Última atualização:** 16/01/2026 após deploy
**Chave atual (nova):** `AIzaSyBKcIQk5H3jRxXl36kqwFOr5vUpfqP9OYY`
**Chave antiga (expirada):** `AIzaSyBhLGUK3w4iwWnze0FEvA46z4VCv86CFHg`
