@echo off
REM Script de build e deploy com variáveis de ambiente para Windows
REM Execute: build-and-deploy.bat

echo 🔧 Gerando configuração do Firebase...

if not exist .env (
    echo ❌ Erro: arquivo .env não encontrado!
    echo Copie .env.example para .env e configure suas credenciais.
    exit /b 1
)

REM Ler variáveis do .env
for /f "usebackq tokens=1,2 delims==" %%a in (.env) do (
    if not "%%a"=="" if not "%%a:~0,1%"=="#" set %%a=%%b
)

REM Criar arquivo de configuração usando PowerShell
powershell -Command "& {$content = Get-Content firebase.config.template.js -Raw; $content = $content -replace '__VITE_FIREBASE_API_KEY__', $env:VITE_FIREBASE_API_KEY; $content = $content -replace '__VITE_FIREBASE_AUTH_DOMAIN__', $env:VITE_FIREBASE_AUTH_DOMAIN; $content = $content -replace '__VITE_FIREBASE_PROJECT_ID__', $env:VITE_FIREBASE_PROJECT_ID; $content = $content -replace '__VITE_FIREBASE_STORAGE_BUCKET__', $env:VITE_FIREBASE_STORAGE_BUCKET; $content = $content -replace '__VITE_FIREBASE_MESSAGING_SENDER_ID__', $env:VITE_FIREBASE_MESSAGING_SENDER_ID; $content = $content -replace '__VITE_FIREBASE_APP_ID__', $env:VITE_FIREBASE_APP_ID; $content = $content -replace '__VITE_FIREBASE_RECAPTCHA_SITE_KEY__', $env:VITE_FIREBASE_RECAPTCHA_SITE_KEY; $content | Set-Content firebase.config.js}"

echo ✅ Configuração gerada com sucesso!

echo 🎨 Gerando CSS...
call npm run build:css

echo 🚀 Fazendo deploy para Firebase...
call firebase deploy

echo ✅ Deploy concluído!
pause
