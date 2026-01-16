#!/bin/bash

# Script de build e deploy com variáveis de ambiente
# Execute: ./build-and-deploy.sh

echo "🔧 Gerando configuração do Firebase..."

# Carregar variáveis do .env
if [ ! -f .env ]; then
    echo "❌ Erro: arquivo .env não encontrado!"
    echo "Copie .env.example para .env e configure suas credenciais."
    exit 1
fi

# Ler variáveis do .env
export $(cat .env | grep -v '^#' | xargs)

# Criar arquivo de configuração
cat firebase.config.template.js | \
    sed "s|__VITE_FIREBASE_API_KEY__|$VITE_FIREBASE_API_KEY|g" | \
    sed "s|__VITE_FIREBASE_AUTH_DOMAIN__|$VITE_FIREBASE_AUTH_DOMAIN|g" | \
    sed "s|__VITE_FIREBASE_PROJECT_ID__|$VITE_FIREBASE_PROJECT_ID|g" | \
    sed "s|__VITE_FIREBASE_STORAGE_BUCKET__|$VITE_FIREBASE_STORAGE_BUCKET|g" | \
    sed "s|__VITE_FIREBASE_MESSAGING_SENDER_ID__|$VITE_FIREBASE_MESSAGING_SENDER_ID|g" | \
    sed "s|__VITE_FIREBASE_APP_ID__|$VITE_FIREBASE_APP_ID|g" | \
    sed "s|__VITE_FIREBASE_RECAPTCHA_SITE_KEY__|$VITE_FIREBASE_RECAPTCHA_SITE_KEY|g" \
    > firebase.config.js

echo "✅ Configuração gerada com sucesso!"

echo "🎨 Gerando CSS..."
npm run build:css

echo "🚀 Fazendo deploy para Firebase..."
firebase deploy

echo "✅ Deploy concluído!"
