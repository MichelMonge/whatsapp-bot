@echo off
chcp 65001 > nul
title Atendente Virtual WhatsApp com IA
cd /d "%~dp0"

echo ===================================================
echo     INICIALIZADOR DO ATENDENTE VIRTUAL IA
echo ===================================================
echo.

:: Adiciona o Node.js portatil do projeto ao PATH desta sessao
if exist "%~dp0runtime\node\node.exe" (
    set "PATH=%~dp0runtime\node;%PATH%"
)

:: Verifica se o Node.js esta disponivel (portatil ou global)
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] O Node.js nao foi encontrado!
    echo Baixe e instale o Node.js (gratuito) em: https://nodejs.org/
    pause
    exit /b 1
)

:: Garante que o arquivo .env exista
if not exist ".env" (
    if exist ".env.example" copy ".env.example" ".env" > nul
)

:: Instala dependencias caso ainda nao existam
if not exist "node_modules" (
    echo [1/2] Instalando dependencias necessarias...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b 1
    )
)

echo [2/2] Iniciando servidor e abrindo o Painel de Controle...
echo Painel Web: http://localhost:3000
echo.
echo IMPORTANTE: Mantenha esta janela aberta enquanto o atendente estiver funcionando.
echo.

:: Abre o painel no navegador apos 3 segundos
start "" /min cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3000"

call node bot.js
pause
