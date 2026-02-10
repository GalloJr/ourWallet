#!/bin/bash

# Deploy Script para OurWallet com Verificações de Segurança
# Versão: 2.0
# Data: Janeiro 2026

set -e  # Parar em caso de erro

echo "🚀 OurWallet - Deploy Seguro"
echo "================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para print com cor
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Verificar se está no diretório correto
echo "📁 Verificando diretório..."
if [ ! -f "firebase.json" ]; then
    print_error "firebase.json não encontrado. Execute este script na raiz do projeto."
    exit 1
fi
print_success "Diretório correto"

# 2. Verificar se Firebase CLI está instalado
echo ""
echo "🔧 Verificando Firebase CLI..."
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI não está instalado"
    echo "Instale com: npm install -g firebase-tools"
    exit 1
fi
print_success "Firebase CLI instalado: $(firebase --version)"

# 3. Verificar autenticação
echo ""
echo "🔐 Verificando autenticação..."
if ! firebase projects:list &> /dev/null; then
    print_error "Não autenticado no Firebase"
    echo "Execute: firebase login"
    exit 1
fi
print_success "Autenticado no Firebase"

# 4. Backup das regras atuais
echo ""
echo "💾 Fazendo backup das regras atuais..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp firestore.rules "$BACKUP_DIR/" 2>/dev/null || print_warning "firestore.rules não encontrado"
cp storage.rules "$BACKUP_DIR/" 2>/dev/null || print_warning "storage.rules não encontrado"
print_success "Backup salvo em $BACKUP_DIR"

# 5. Validar regras do Firestore
echo ""
echo "✅ Validando regras do Firestore..."
if firebase deploy --only firestore:rules --dry-run; then
    print_success "Regras do Firestore válidas"
else
    print_error "Regras do Firestore inválidas"
    exit 1
fi

# 6. Verificar se há mudanças não commitadas
echo ""
echo "📝 Verificando Git status..."
if [ -d ".git" ]; then
    if ! git diff-index --quiet HEAD --; then
        print_warning "Existem mudanças não commitadas"
        read -p "Continuar mesmo assim? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Todos arquivos commitados"
    fi
else
    print_warning "Não é um repositório Git"
fi

# 7. Instalar dependências das functions
echo ""
echo "📦 Instalando dependências das Cloud Functions..."
if [ -d "functions" ]; then
    cd functions
    if npm install --production; then
        print_success "Dependências instaladas"
    else
        print_error "Erro ao instalar dependências"
        exit 1
    fi
    cd ..
else
    print_warning "Diretório functions não encontrado"
fi

# 8. Perguntar o que deployar
echo ""
echo "🎯 O que você deseja deployar?"
echo "1) Tudo (rules + functions + hosting)"
echo "2) Apenas regras Firestore"
echo "3) Apenas Cloud Functions"
echo "4) Apenas Hosting"
echo "5) Rules + Hosting (sem functions)"
read -p "Escolha (1-5): " DEPLOY_OPTION

case $DEPLOY_OPTION in
    1)
        DEPLOY_TARGET="--only firestore:rules,functions,hosting"
        ;;
    2)
        DEPLOY_TARGET="--only firestore:rules"
        ;;
    3)
        DEPLOY_TARGET="--only functions"
        ;;
    4)
        DEPLOY_TARGET="--only hosting"
        ;;
    5)
        DEPLOY_TARGET="--only firestore:rules,hosting"
        ;;
    *)
        print_error "Opção inválida"
        exit 1
        ;;
esac

# 9. Confirmar deploy
echo ""
echo "⚠️  ATENÇÃO: Você está prestes a fazer deploy para PRODUÇÃO"
read -p "Confirmar deploy? (digite 'sim' para confirmar): " CONFIRM
if [ "$CONFIRM" != "sim" ]; then
    print_warning "Deploy cancelado pelo usuário"
    exit 0
fi

# 10. Fazer deploy
echo ""
echo "🚀 Iniciando deploy..."
echo "Target: $DEPLOY_TARGET"
echo ""

if firebase deploy $DEPLOY_TARGET; then
    print_success "Deploy concluído com sucesso!"
else
    print_error "Erro durante o deploy"
    echo ""
    echo "Rollback manual pode ser necessário:"
    echo "1. Restaurar regras do backup: $BACKUP_DIR"
    echo "2. Verificar logs: firebase functions:log"
    exit 1
fi

# 11. Verificações pós-deploy
echo ""
echo "🔍 Executando verificações pós-deploy..."

# Esperar 10 segundos para propagação
echo "Aguardando propagação..."
sleep 10

# Verificar se o site está acessível (opcional)
echo ""
echo "🌐 Verificando acessibilidade..."
PROJECT_ID=$(firebase use 2>&1 | grep "Now using project" | awk '{print $4}')
if [ ! -z "$PROJECT_ID" ]; then
    URL="https://${PROJECT_ID}.web.app"
    if curl -f -s -o /dev/null "$URL"; then
        print_success "Site acessível em $URL"
    else
        print_warning "Site pode estar temporariamente indisponível"
    fi
fi

# 12. Monitorar logs por 30 segundos (se incluiu functions)
if [[ $DEPLOY_TARGET == *"functions"* ]]; then
    echo ""
    echo "📊 Monitorando logs das functions por 30 segundos..."
    echo "Pressione Ctrl+C para pular"
    timeout 30s firebase functions:log --only 10 2>/dev/null || true
fi

# 13. Resumo final
echo ""
echo "================================"
echo "✨ Deploy Finalizado!"
echo "================================"
echo ""
echo "📋 Checklist Pós-Deploy:"
echo "[ ] Testar login no site"
echo "[ ] Criar uma transação de teste"
echo "[ ] Verificar se os novos modais funcionam"
echo "[ ] Testar consolidação de pagamentos"
echo "[ ] Verificar console do Firebase para erros"
echo "[ ] Monitorar uso/custos nas próximas 24h"
echo ""
echo "📊 Links Úteis:"
echo "Console Firebase: https://console.firebase.google.com/project/${PROJECT_ID}"
echo "Site: https://${PROJECT_ID}.web.app"
echo "Logs Functions: firebase functions:log"
echo ""
print_success "Tudo pronto! 🎉"
