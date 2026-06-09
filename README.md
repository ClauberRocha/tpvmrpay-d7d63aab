MRPay TPV 💳
Sistema de Terminal de Pagamento Virtual (TPV) para processamento seguro e eficiente de transações.
📌 Descrição
O MRPay TPV é uma solução moderna para processamento de pagamentos, desenvolvida com React, TypeScript e Supabase. O projeto visa oferecer uma interface intuitiva e segura para transações financeiras, com suporte a autenticação, gerenciamento de usuários e integração com APIs de pagamento.
🛠 Tecnologias Utilizadas
Frontend: React + TypeScript + Vite

Estilização: Tailwind CSS + shadcn/ui

Backend: Supabase (Autenticação, Banco de Dados e Storage)

Ferramentas:
ESLint (Linter)

PostCSS (Processamento de CSS)

Vitest (Testes)

Bun (Gerenciador de Pacotes)


⚙ Pré-requisitos
Antes de começar, certifique-se de ter as seguintes ferramentas instaladas em seu ambiente:
Ferramenta
Versão Mínima
Link para Download
Node.js
18.x
nodejs.org
Bun
1.0.x
bun.sh
Git
2.x
git-scm.com
Conta Supabase
-
supabase.com
🚀 Instalação e Execução
1. Clonar o Repositório
Bash
git clone https://github.com/ClauberRocha/mrpay-tpv.git
cd mrpay-tpv


2. Instalar Dependências
Utilize o Bun (recomendado) ou npm:
Bash
bun install
# ou
npm install


3. Configurar Variáveis de Ambiente
Crie um arquivo .env na raiz do projeto e preencha com as credenciais do Supabase (exemplo em .env.example):
Env
VITE_SUPABASE_URL=SUA_URL_DO_SUPABASE
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY


4. Iniciar o Servidor de Desenvolvimento
Bash
bun run dev
# ou
npm run dev


O projeto estará disponível em: http://localhost:5173
📂 Estrutura do Projeto
Texto simples
mrpay-tpv/
├── public/               # Arquivos estáticos (imagens, favicon, etc.)
├── src/
│   ├── components/       # Componentes reutilizáveis (shadcn/ui)
│   ├── pages/            # Páginas da aplicação
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Funções utilitárias e configurações
│   ├── types/            # Tipos TypeScript
│   ├── App.tsx           # Componente principal
│   └── main.tsx          # Ponto de entrada da aplicação
├── supabase/             # Configurações do Supabase (migrations, seeds)
├── .env                  # Variáveis de ambiente
├── package.json          # Dependências e scripts
├── tailwind.config.ts    # Configuração do Tailwind CSS
└── README.md             # Este arquivo

📜 Licença
Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.
📞 Contato
Para dúvidas ou sugestões, entre em contato:
Autor: Clauber Rocha

GitHub: @ClauberRocha

Email: clauber.mota.rocha@gmail.com
