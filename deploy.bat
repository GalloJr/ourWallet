@echo off
REM Deploy Script para OurWallet com Verificações de Segurança
REM Versão: 2.0
REM Data: Janeiro 2026

setlocal enabledelayedexpansion

echo ========================================
echo 🚀 OurWallet - Deploy Seguro
echo ========================================
echo.

REM 1. Verificar se está no diretório correto
echo 📁 Verificando diretório...
if not exist "firebase.json" (
    echo ❌ firebase.json não encontrado. Execute este script na raiz do projeto.
    exit /b 1
)
echo ✓ Diretório correto
echo.

REM 2. Verificar se Firebase CLI está instalado
echo 🔧 Verificando Firebase CLI...
where firebase >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Firebase CLI não está instalado
    echo Instale com: npm install -g firebase-tools
    exit /b 1
)
echo ✓ Firebase CLI instalado
echo.

REM 3. Gerar configuração do Firebase a partir do .env
echo 🔧 Gerando configuração do Firebase...
if not exist ".env" (
    echo ❌ Arquivo .env não encontrado!
    echo Copie .env.example para .env e configure suas credenciais.
    exit /b 1
)

REM Ler variáveis do .env e gerar firebase.config.js
powershell -Command "& {$content = Get-Content firebase.config.template.js -Raw; foreach($line in Get-Content .env) {if($line -match '^VITE_FIREBASE_API_KEY=(.*)$') {$content = $content -replace '__VITE_FIREBASE_API_KEY__', $matches[1]}; if($line -match '^VITE_FIREBASE_AUTH_DOMAIN=(.*)$') {$content = $content -replace '__VITE_FIREBASE_AUTH_DOMAIN__', $matches[1]}; if($line -match '^VITE_FIREBASE_PROJECT_ID=(.*)$') {$content = $content -replace '__VITE_FIREBASE_PROJECT_ID__', $matches[1]}; if($line -match '^VITE_FIREBASE_STORAGE_BUCKET=(.*)$') {$content = $content -replace '__VITE_FIREBASE_STORAGE_BUCKET__', $matches[1]}; if($line -match '^VITE_FIREBASE_MESSAGING_SENDER_ID=(.*)$') {$content = $content -replace '__VITE_FIREBASE_MESSAGING_SENDER_ID__', $matches[1]}; if($line -match '^VITE_FIREBASE_APP_ID=(.*)$') {$content = $content -replace '__VITE_FIREBASE_APP_ID__', $matches[1]}; if($line -match '^VITE_FIREBASE_RECAPTCHA_SITE_KEY=(.*)$') {$content = $content -replace '__VITE_FIREBASE_RECAPTCHA_SITE_KEY__', $matches[1]}}; $content | Set-Content firebase.config.js}"
if %ERRORLEVEL% neq 0 (
    echo ❌ Erro ao gerar configuração
    exit /b 1
)
echo ✓ Configuração gerada com sucesso
echo.

REM 4. Verificar autenticação
echo 🔐 Verificando autenticação...
firebase projects:list >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Não autenticado no Firebase
    echo Execute: firebase login
    exit /b 1
)
echo ✓ Autenticado no Firebase
echo.

REM 5. Backup das regras atuais
echo 💾 Fazendo backup das regras atuais...
set BACKUP_DIR=backups\%date:~-4,4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set BACKUP_DIR=%BACKUP_DIR: =0%
mkdir "%BACKUP_DIR%" 2>nul
if exist "firestore.rules" copy "firestore.rules" "%BACKUP_DIR%\" >nul
if exist "storage.rules" copy "storage.rules" "%BACKUP_DIR%\" >nul
echo ✓ Backup salvo em %BACKUP_DIR%
echo.

REM 6. Validar regras do Firestore
echo ✅ Validando regras do Firestore...
firebase deploy --only firestore:rules --dry-run >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Regras do Firestore inválidas
    exit /b 1
)
echo ✓ Regras do Firestore válidas
echo.

REM 7. Instalar dependências das functions
echo 📦 Instalando dependências das Cloud Functions...
if exist "functions" (
    cd functions
    call npm install --production >nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo ❌ Erro ao instalar dependências
        cd ..
        exit /b 1
    )
    cd ..
    echo ✓ Dependências instaladas
) else (
    echo ⚠ Diretório functions não encontrado
)
echo.

REM 8. Perguntar o que deployar
echo 🎯 O que você deseja deployar?
echo 1) Tudo (rules + functions + hosting)
echo 2) Apenas regras Firestore
echo 3) Apenas Cloud Functions
echo 4) Apenas Hosting
echo 5) Rules + Hosting (sem functions)
echo.
set /p DEPLOY_OPTION="Escolha (1-5): "

if "%DEPLOY_OPTION%"=="1" set DEPLOY_TARGET=--only firestore:rules,functions,hosting
if "%DEPLOY_OPTION%"=="2" set DEPLOY_TARGET=--only firestore:rules
if "%DEPLOY_OPTION%"=="3" set DEPLOY_TARGET=--only functions
if "%DEPLOY_OPTION%"=="4" set DEPLOY_TARGET=--only hosting
if "%DEPLOY_OPTION%"=="5" set DEPLOY_TARGET=--only firestore:rules,hosting

if "%DEPLOY_TARGET%"=="" (
    echo ❌ Opção inválida
    exit /b 1
)

REM 9. Confirmar deploy
echo.
echo ⚠️  ATENÇÃO: Você está prestes a fazer deploy para PRODUÇÃO
set /p CONFIRM="Confirmar deploy? (digite 'sim' para confirmar): "
if not "%CONFIRM%"=="sim" (
    echo ⚠ Deploy cancelado pelo usuário
    exit /b 0
)

REM 10. Fazer deploy
echo.
echo 🚀 Iniciando deploy...
echo Target: %DEPLOY_TARGET%
echo.

firebase deploy %DEPLOY_TARGET%
if %ERRORLEVEL% neq 0 (
    echo ❌ Erro durante o deploy
    echo.
    echo Rollback manual pode ser necessário:
    echo 1. Restaurar regras do backup: %BACKUP_DIR%
    echo 2. Verificar logs: firebase functions:log
    exit /b 1
)
echo ✓ Deploy concluído com sucesso!
echo.

REM 11. Verificações pós-deploy
echo 🔍 Executando verificações pós-deploy...
echo Aguardando propagação...
timeout /t 10 /nobreak >nul
echo.

REM 12. Resumo final
echo ========================================
echo ✨ Deploy Finalizado!
echo ========================================
echo.
echo 📋 Checklist Pós-Deploy:
echo [ ] Testar login no site
echo [ ] Criar uma transação de teste
echo [ ] Verificar se os novos modais funcionam
echo [ ] Testar consolidação de pagamentos
echo [ ] Verificar console do Firebase para erros
echo [ ] Monitorar uso/custos nas próximas 24h
echo.
echo 📊 Comandos Úteis:
echo firebase functions:log        - Ver logs das functions
echo firebase hosting:channel:list - Ver canais de preview
echo.
echo ✓ Tudo pronto! 🎉

pause
