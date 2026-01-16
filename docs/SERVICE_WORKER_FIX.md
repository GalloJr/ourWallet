# 🚨 CORREÇÃO URGENTE: Service Worker Cacheando Configuração Antiga

## ❌ Problema Identificado

O **Service Worker** (`sw.js`) estava fazendo cache de **TODOS** os arquivos, mas **NÃO incluía** o `firebase.config.js` na lista de assets. Isso fazia com que:

1. O `firebase.config.js` nunca fosse atualizado
2. O navegador continuasse usando a configuração antiga em cache
3. A chave expirada continuasse sendo usada mesmo após regeneração

---

## ✅ CORREÇÃO APLICADA

Atualizei o `sw.js` para incluir `firebase.config.js` e incrementei a versão do cache.

### Mudanças no sw.js:

```javascript
// ANTES:
const CACHE_NAME = 'ourwallet-v2';
const ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/firebase.js',  // ← firebase.config.js estava faltando!
    '/modules/auth.js',
    // ...
];

// DEPOIS:
const CACHE_NAME = 'ourwallet-v3'; // ← Versão atualizada
const ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/firebase.js',
    '/firebase.config.js',  // ← ADICIONADO!
    '/modules/auth.js',
    // ...
];
```

---

## 🚀 DEPLOY MANUAL

Execute esses comandos no terminal:

```bash
cd /d/Projects/mywallet-app-main

# 1. Commitar as mudanças
git add firebase.js sw.js
git commit -m "fix: add firebase.config.js to service worker cache"
git push

# 2. Fazer deploy
deploy.bat
# Escolha opção 5 (Rules + Hosting)
# Digite "sim" para confirmar
```

---

## 🧹 LIMPAR CACHE NO NAVEGADOR (OBRIGATÓRIO)

Após o deploy, TODOS os usuários devem limpar o cache:

### Método 1: Hard Refresh
1. Abra https://our-wallet-14998929-dc6cf.firebaseapp.com
2. Abra DevTools (F12)
3. Clique com botão direito no botão de "Refresh"
4. Selecione "Empty Cache and Hard Reload"

### Método 2: Desregistrar Service Worker
1. Abra DevTools (F12)
2. Vá na aba "Application"
3. No menu lateral, clique em "Service Workers"
4. Clique em "Unregister"
5. Recarregue a página (F5)

### Método 3: Limpar tudo
1. Pressione `Ctrl + Shift + Delete`
2. Selecione "Cached images and files"
3. Período: "All time"
4. Clique em "Clear data"

---

## 🔍 VERIFICAR SE FUNCIONOU

Após limpar o cache e recarregar:

### 1. Verificar no Console (F12):
Você deve ver:
```
🔑 Firebase Config Loaded: AIzaSyBKcIQk5H3jRxXl... 
```

**NÃO deve ver:**
```
FirebaseError: Firebase: Error (auth/api-key-expired.-please-renew-the-api-key.)
```

### 2. Verificar Service Worker:
1. DevTools → Application → Service Workers
2. Deve mostrar: `ourwallet-v3` (não v2)

### 3. Verificar Network:
1. DevTools → Network tab
2. Recarregue a página
3. Procure por `firebase.config.js` 
4. Status deve ser `200` (não `304` ou cache)
5. Preview deve mostrar a nova chave: `AIzaSyBKcIQk5H3jRxXl...`

---

## 🎯 SOLUÇÃO PERMANENTE

Para evitar esse problema no futuro, você tem duas opções:

### Opção 1: Sempre excluir firebase.config.js do cache do SW

No `sw.js`, adicione uma lista de exclusões:

```javascript
const SKIP_CACHE_URLS = [
    '/firebase.config.js', // Sempre buscar do servidor
];

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    
    // Não cachear arquivos na lista de exclusão
    if (SKIP_CACHE_URLS.some(skipUrl => url.pathname.includes(skipUrl))) {
        e.respondWith(fetch(e.request));
        return;
    }
    
    // ... resto do código
});
```

### Opção 2: Usar estratégia Network-First para config

```javascript
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    
    // Network-First para arquivos de configuração
    if (url.pathname.includes('firebase.config.js')) {
        e.respondWith(
            fetch(e.request)
                .catch(() => caches.match(e.request))
        );
        return;
    }
    
    // ... resto do código
});
```

---

## 📱 USUÁRIOS FINAIS

Se você distribuiu o app para outros usuários, notifique-os:

```
⚠️ Atualização de Segurança

Foi identificada uma atualização de segurança crítica. 
Por favor, limpe o cache do seu navegador:

1. Pressione Ctrl + Shift + Delete
2. Selecione "Cached images and files"
3. Clique em "Clear data"
4. Recarregue o site

Ou use modo anônimo temporariamente.
```

---

## 🐛 TROUBLESHOOTING

### Erro persiste após limpar cache?

1. **Verifique a versão do SW:**
   ```javascript
   // No console do navegador:
   navigator.serviceWorker.getRegistrations().then(regs => {
       regs.forEach(reg => console.log(reg));
   });
   ```

2. **Force unregister:**
   ```javascript
   navigator.serviceWorker.getRegistrations().then(regs => {
       regs.forEach(reg => reg.unregister());
   });
   ```

3. **Recarregue sem cache:**
   - `Ctrl + Shift + R` (Windows)
   - `Cmd + Shift + R` (Mac)

---

## ✅ CHECKLIST

- [ ] Arquivos atualizados (`sw.js` com `firebase.config.js`)
- [ ] Commit feito e push para GitHub
- [ ] Deploy executado com sucesso
- [ ] Cache limpo no navegador
- [ ] Service Worker atualizado para v3
- [ ] Teste de login funcionando
- [ ] Console mostra a nova chave
- [ ] Sem erros de API key expired

---

**IMPORTANTE:** O Service Worker é uma das principais causas de problemas com cache em PWAs. Sempre que mudar configurações críticas, incremente a versão do cache e notifique os usuários!

---

**Data:** 16/01/2026
**Versão SW:** v3
**Issue:** Service Worker cacheando configuração antiga do Firebase
