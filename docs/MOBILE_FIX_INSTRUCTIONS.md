# 📱 Instruções para Corrigir Login Mobile

## O que foi corrigido?

✅ Autenticação adaptativa (popup desktop, redirect mobile)
✅ Tratamento de erros melhorado com mensagens em português
✅ Service Worker excluindo URLs de autenticação
✅ Logs de debug adicionados para diagnóstico

## 🚀 Passos para Testar

### 1. Fazer Deploy das Alterações

```bash
# Linux/Mac
./deploy.sh

# Windows
deploy.bat
```

### 2. Limpar Cache no Mobile

**No navegador mobile:**

1. Abra as **Configurações do navegador**
2. Vá em **Privacidade** → **Limpar dados de navegação**
3. Selecione:
   - ✅ Cookies e dados de sites
   - ✅ Imagens e arquivos em cache
4. Clique em **Limpar dados**

**OU acesse diretamente:**

Abra no mobile: `https://our-wallet-14998929-dc6cf.web.app/sw-clear.html`

### 3. Forçar Atualização do Service Worker

1. No mobile, abra **DevTools via USB debugging**:
   - Chrome: `chrome://inspect` no PC
   - Safari iOS: Conectar iPhone → Safari → Develop
2. Vá em **Application** → **Service Workers**
3. Clique em **Unregister** para remover o SW antigo
4. Recarregue a página

### 4. Testar Login

1. Acesse a aplicação no mobile
2. Abra o console (USB debugging)
3. Clique no botão "Começar 30 Dias Grátis"
4. **Verifique os logs no console:**

```
🔧 setupAuth chamado, loginBtn: encontrado
🔐 Botão login clicado! Dispositivo: MOBILE
🔐 User-Agent: ...
🔐 Window width: 390
🔐 Iniciando signInWithRedirect...
🔐 signInWithRedirect completou (usuário deve ser redirecionado)
```

5. Você deve ser **redirecionado** para a página do Google
6. Após fazer login no Google, deve voltar para a aplicação **autenticado**

## 🔍 Diagnóstico de Problemas

### Se o botão ainda não faz nada:

**Verificar se o código foi atualizado:**
```javascript
// No console do mobile, execute:
console.log(window.location.href);
// Deve mostrar: https://our-wallet-14998929-dc6cf.web.app

// Verificar versão do cache
caches.keys().then(keys => console.log('Caches:', keys));
// Deve incluir: ourwallet-v4
```

**Verificar logs:**
- Se NÃO aparecer `🔧 setupAuth chamado`: código antigo ainda em cache
- Se aparecer `setupAuth chamado, loginBtn: NÃO encontrado`: problema no HTML
- Se aparecer `Botão login clicado! Dispositivo: DESKTOP`: detecção mobile falhou

### Se o redirect não funcionar:

1. **Verificar domínios autorizados no Firebase Console:**
   - Acesse: https://console.firebase.google.com
   - Projeto: our-wallet-14998929-dc6cf
   - Authentication → Settings → Authorized domains
   - Deve incluir:
     - `our-wallet-14998929-dc6cf.web.app` ✅
     - `our-wallet-14998929-dc6cf.firebaseapp.com` ✅
     - `localhost` (para testes)

2. **Verificar erro específico no console:**
   - `auth/unauthorized-domain` → Adicionar domínio no Firebase Console
   - `auth/operation-not-allowed` → Habilitar Google Sign-in no Firebase Console
   - Outros erros → Copiar mensagem completa

### Se aparecer erro de CSP (Content Security Policy):

O erro de CSP que você mencionou é **esperado** e vem de uma extensão do navegador (`content.js`), não da aplicação. Pode ser ignorado.

## 📊 Logs Esperados (Sucesso)

### Ao carregar a página:
```
✅ App Check inicializado
✅ Error Logger initialized
🔧 setupAuth chamado, loginBtn: encontrado
🔐 onAuthStateChanged disparado, user: null
🔐 Verificando getRedirectResult para mobile...
🔐 getRedirectResult: SEM resultado
```

### Ao clicar em "Entrar":
```
🔐 Botão login clicado! Dispositivo: MOBILE
🔐 User-Agent: Mozilla/5.0 (iPhone; ...)
🔐 Window width: 390
🔐 Iniciando signInWithRedirect...
🔐 signInWithRedirect completou (usuário deve ser redirecionado)
[Página redireciona para Google OAuth]
```

### Ao voltar do Google (autenticado):
```
🔐 onAuthStateChanged disparado, user: usuario@gmail.com
🔐 Verificando getRedirectResult para mobile...
🔐 getRedirectResult: COM resultado
✅ Login via redirect concluído para: usuario@gmail.com
🔐 onAuthStateChanged disparado, user: usuario@gmail.com
[App carrega normalmente]
```

## 🧹 Remover Logs de Debug (Após Resolver)

Depois que confirmar que está funcionando, remova os logs de debug:

1. Edite `modules/auth.js`
2. Remova todas as linhas com `console.log` que começam com 🔧, 🔐, ✅, ❌
3. Mantenha apenas os `console.error` importantes
4. Faça novo deploy

## 💡 Dicas Adicionais

- **Teste em diferentes navegadores mobile:** Chrome Mobile, Safari iOS, Firefox Mobile
- **Teste em modo anônimo:** Evita cache de sessões antigas
- **Use USB debugging:** Única forma de ver console logs em mobile real
- **Verifique conexão:** Auth pode falhar com rede instável

## 🆘 Se Nada Funcionar

Envie os logs completos do console mobile, incluindo:
1. Logs ao carregar página
2. Logs ao clicar no botão
3. Qualquer mensagem de erro em vermelho
4. User-Agent completo: `navigator.userAgent`
5. Resultado de: `window.innerWidth`
