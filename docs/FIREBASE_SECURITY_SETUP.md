# 🔧 Configurações de Segurança do Firebase

## ⚠️ IMPORTANTE - Configurações Obrigatórias

Após implementar as correções de segurança, você DEVE configurar o Firebase Console para máxima proteção.

---

## 1. Restrições de API Key

### Acesse: Firebase Console → Project Settings → API Keys

**Para Web API Key (Browser key):**

1. Clique na API Key
2. Em "Application restrictions":
   - Selecione **"HTTP referrers (websites)"**
   - Adicione seus domínios:
     ```
     your-project.web.app/*
     your-project.firebaseapp.com/*
     localhost:* (apenas para desenvolvimento)
     ```

3. Em "API restrictions":
   - Selecione **"Restrict key"**
   - Ative apenas:
     - ✅ Cloud Firestore API
     - ✅ Firebase Authentication
     - ✅ Cloud Functions API
     - ✅ Cloud Storage

4. Salve as alterações

---

## 2. Firebase App Check

### Configure para prevenir abuso da API:

1. Acesse: Firebase Console → App Check
2. Clique em "Register" para seu app web
3. Escolha o provedor:
   - **reCAPTCHA v3** (recomendado para web)
   - **reCAPTCHA Enterprise** (para produção)

4. Adicione no código (início do app.js):
```javascript
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_SITE_KEY'),
  isTokenAutoRefreshEnabled: true
});
```

5. Ative enforcement para:
   - ✅ Firestore
   - ✅ Cloud Functions
   - ✅ Storage

---

## 3. Autenticação - Configurações Avançadas

### Acesse: Firebase Console → Authentication → Settings

**Domínios Autorizados:**
- Adicione apenas seus domínios de produção
- Remova domínios desnecessários

**Usuários:**
- Ative "Email enumeration protection"
- Configure "User account linking"

**Templates de Email:**
- Personalize templates de redefinição de senha
- Adicione logo da empresa
- Configure domínio customizado

---

## 4. Firestore - Monitoramento

### Acesse: Firebase Console → Firestore → Usage

**Configure Alertas:**
1. Vá para Cloud Console → Monitoring
2. Crie alertas para:
   - Leituras/escritas anormais (>10k/hora)
   - Aumento súbito de uso (>50%)
   - Falhas de regras de segurança (>100/dia)

**Índices:**
- Crie índices para queries comuns
- Monitore performance

---

## 5. Cloud Functions - Segurança

### Configure no firebase.json:
```json
{
  "functions": {
    "source": "functions",
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint",
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ],
    "runtime": "nodejs18"
  }
}
```

### Variáveis de Ambiente:
```bash
# Definir secrets para APIs externas
firebase functions:secrets:set STRIPE_SECRET_KEY
firebase functions:secrets:set SENDGRID_API_KEY
```

---

## 6. Storage - Regras de Segurança

### Crie: storage.rules
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /receipts/{userId}/{receiptId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && 
                      request.auth.uid == userId &&
                      request.resource.size < 5 * 1024 * 1024 && // Max 5MB
                      request.resource.contentType.matches('image/.*|application/pdf');
    }
  }
}
```

Deploy:
```bash
firebase deploy --only storage
```

---

## 7. Monitoramento e Logs

### Google Cloud Console:

1. **Cloud Logging:**
   - Acesse: Cloud Console → Logging → Logs Explorer
   - Crie filtros para erros críticos
   - Configure log sink para BigQuery (análise)

2. **Cloud Monitoring:**
   - Crie dashboard customizado
   - Monitore:
     - Latência das Functions
     - Taxa de erro
     - Custos

3. **Alertas:**
   ```
   - Error rate > 5% por 5 minutos
   - Latência > 2s por 10 minutos
   - Custos > $100/dia
   ```

---

## 8. Backup e Disaster Recovery

### Configure Backups Automáticos:

```bash
# Instalar gcloud CLI
gcloud auth login

# Agendar backup diário (Firestore)
gcloud firestore export gs://YOUR_BUCKET/backups/$(date +%Y%m%d) \
  --project=YOUR_PROJECT_ID

# Criar Cloud Scheduler job
gcloud scheduler jobs create http firestore-backup \
  --schedule="0 2 * * *" \
  --uri="https://firestore.googleapis.com/v1/projects/YOUR_PROJECT/databases/(default):exportDocuments" \
  --http-method=POST \
  --oauth-service-account-email=YOUR_SERVICE_ACCOUNT
```

---

## 9. Rate Limiting

### Implementar via Cloud Armor (para produção):

1. Acesse: Cloud Console → Network Security → Cloud Armor
2. Crie política:
   - Max 100 req/min por IP
   - Max 1000 req/hora por usuário
   - Bloqueio temporário após 10 tentativas falhas

---

## 10. Custos e Quotas

### Configure Budget Alerts:

1. Acesse: Cloud Console → Billing → Budgets & alerts
2. Crie budget:
   - Limite mensal: $100 (ajuste conforme necessário)
   - Alertas: 50%, 90%, 100%
   - Ação: Notificar por email

### Quotas Firestore:
```
- Reads: 50k/dia (Free tier)
- Writes: 20k/dia (Free tier)
- Deletes: 20k/dia (Free tier)
- Storage: 1GB (Free tier)
```

Configure alertas quando atingir 80% das quotas.

---

## 11. Compliance e LGPD

### Configurações Obrigatórias:

1. **Data Residency:**
   - Verifique localização dos dados
   - Para Brasil: use `southamerica-east1`

2. **Data Retention:**
   - Configure período de retenção
   - Implemente "Right to be forgotten"
   - Automatize exclusão de dados inativos

3. **Audit Logs:**
   - Ative todos os audit logs
   - Mantenha por no mínimo 1 ano
   - Implemente logs imutáveis

4. **Consentimento:**
   - Adicione termo de uso claro
   - Cookie consent banner
   - Opção de export de dados

---

## 12. Checklist Final

Antes de ir para produção:

- [ ] API Keys restritas por domínio
- [ ] App Check configurado e ativo
- [ ] Regras Firestore atualizadas
- [ ] Storage rules implementadas
- [ ] Cloud Functions deployed
- [ ] Backups automáticos configurados
- [ ] Monitoramento e alertas ativos
- [ ] Rate limiting implementado
- [ ] Budget alerts configurados
- [ ] Compliance LGPD revisado
- [ ] Testes de segurança realizados
- [ ] Documentação atualizada

---

## 🆘 Em Caso de Incidente de Segurança

1. **Resposta Imediata:**
   ```bash
   # Desabilitar aplicação temporariamente
   firebase hosting:disable
   
   # Revogar todas sessões
   # Via Firebase Console → Authentication → Users → Disable all
   ```

2. **Investigação:**
   - Revisar logs de auditoria
   - Identificar escopo do problema
   - Documentar timeline

3. **Mitigação:**
   - Corrigir vulnerabilidade
   - Atualizar regras de segurança
   - Notificar usuários afetados (se LGPD aplicável)

4. **Recuperação:**
   - Restaurar de backup se necessário
   - Reativar serviços
   - Implementar monitoramento adicional

5. **Post-Mortem:**
   - Documentar incidente
   - Implementar melhorias
   - Atualizar procedures

---

## 📚 Recursos Adicionais

- [Firebase Security Checklist](https://firebase.google.com/docs/rules/security-checklist)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)
- [LGPD - Lei Geral de Proteção de Dados](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)

---

**Última atualização:** Janeiro 2026  
**Mantenha este documento atualizado após cada mudança de segurança.**
