# 🤖 Atendente Virtual Inteligente para WhatsApp (com IA Google Gemini)

Um assistente virtual moderno, **100% gratuito**, ultrarrápido e projetado com **foco total em segurança, fidelidade nas respostas e prevenção contra banimentos**.

---

## 🛡️ Pilares de Segurança e Responsabilidade

Ao automatizar o WhatsApp, o maior perigo é ter o número bloqueado por comportamento robótico ou enviar respostas inventadas (alucinações). Este projeto resolve ambos os problemas:

1. **Prevenção Anti-Ban Inteligente:**
   - **Simulação de presença:** Aciona o status *"digitando..."* antes de cada envio.
   - **Atraso Humano (Human Delay):** Calcula um tempo natural de resposta proporcional ao tamanho da mensagem, evitando respostas instantâneas que ativam os filtros anti-spam da Meta.
   - **Agrupamento de Mensagens (Debounce):** Se o cliente enviar 3 mensagens seguidas (*"Oi"*, *"Tudo bem?"*, *"Qual o preço?"*), o bot aguarda 3 segundos e responde todas juntas de forma coerente em vez de disparar 3 respostas separadas.
   - **Transbordo Humano Automático:** Se você (dono do WhatsApp) responder ao cliente manualmente no seu celular, o bot detecta e pausa o atendimento automático para aquele contato por 1 hora, sem atrapalhar a sua conversa.

2. **Fidelidade Total nas Respostas (Sem Alucinações):**
   - Utiliza o **Google Gemini 1.5 Flash** com temperatura baixa (`0.25`), garantindo precisão cirúrgica.
   - Prompt com diretiva estrita: a IA só responde com base no arquivo `base_conhecimento.txt`. Se não souber algo, admite educadamente e transfere para um humano.

---

## 📋 Pré-requisitos

1. **Node.js (versão 18 ou superior):**
   - Se ainda não tiver o Node.js instalado no Windows, baixe e instale a versão LTS em:  
     👉 [https://nodejs.org/](https://nodejs.org/) (Clique em "Download Node.js LTS" e avance no instalador padrão).
2. **Chave de API Gratuita do Google Gemini:**
   - Acesse o **Google AI Studio**: [https://aistudio.google.com/](https://aistudio.google.com/)
   - Faça login com sua conta Google e clique no botão **"Get API key"** (Criar chave de API).
   - A cota gratuita oferece até 15 requisições por minuto e 1 milhão de tokens por minuto — mais que suficiente para um atendimento comercial diário.

---

## 🚀 Passo a Passo para Instalar e Rodar

### 1. Configurar sua Chave da IA
Abra o arquivo `.env` nesta pasta e cole a sua chave:
```env
GEMINI_API_KEY=sua_chave_aqui
GEMINI_MODEL=gemini-1.5-flash
```

### 2. Personalizar suas Informações
Abra o arquivo `base_conhecimento.txt` e preencha com os dados reais do seu negócio ou atividade:
- Seus horários de funcionamento;
- Lista de serviços ou produtos e preços;
- Formas de pagamento aceitas;
- Dúvidas mais frequentes (FAQ).

### 3. Instalar Dependências
Abra o terminal (PowerShell ou Prompt de Comando) nesta pasta e execute:
```bash
npm install
```

### 4. Iniciar o Atendente
Execute o comando:
```bash
npm start
```
1. Um **QR Code** será exibido no terminal.
2. Abra o WhatsApp no seu celular, toque em **Menu (três pontinhos ou Configurações) > Aparelhos Conectados > Conectar um aparelho**.
3. Aponte a câmera para o QR Code no terminal.
4. Pronto! O bot estará conectado e responderá a todas as novas mensagens recebidas.

---

## ⚙️ Arquivos do Projeto

- `bot.js`: Núcleo da conexão com o WhatsApp (Baileys), debounce, presença humana e regras de proteção.
- `gemini.js`: Comunicação direta com a API do Google Gemini, injeção de histórico e prompt do sistema.
- `config.js`: Configurações de tempo, atrasos anti-ban, temperatura e modelos.
- `system_prompt.txt`: Instruções de postura, tom de voz e regras de segurança da IA.
- `base_conhecimento.txt`: As informações do seu negócio (a única verdade que a IA pode consultar).
- `auth_info_baileys/`: Pasta criada automaticamente que guarda a sessão conectada (assim você não precisa escanear o QR Code toda vez).

---

## ☁️ Como Rodar 24 Horas por Dia sem Deixar o Computador Ligado

Se quiser que o atendente funcione continuamente mesmo com seu PC desligado:
1. Suba este projeto para um repositório privado no **GitHub**.
2. Crie uma conta gratuita no **Render** ([render.com](https://render.com)) ou no **Railway** ([railway.app](https://railway.app)).
3. Crie um novo *Background Worker* ou *Web Service*, conecte ao seu GitHub e configure a variável de ambiente `GEMINI_API_KEY`.
4. Nos logs do painel, visualize o QR Code inicial, escaneie uma única vez e seu atendente ficará online 24/7 na nuvem sem custos!
