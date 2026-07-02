# Desabrochar — Congresso de Mulheres

Site de inscrição + painel administrativo, pronto para publicar. Feito em HTML, CSS e JavaScript puro, usando o Firebase (Firestore + Authentication) como banco de dados.

## Estrutura de arquivos

```
desabrochar/
├── index.html          → página inicial (com o popup de inscrição)
├── admin.html           → painel administrativo (protegido por login)
├── css/
│   ├── style.css        → estilos da página inicial
│   └── admin.css        → estilos do painel admin
├── js/
│   ├── firebase-config.js  → suas chaves do Firebase (você precisa preencher)
│   ├── main.js              → lógica da página inicial e do popup
│   └── admin.js              → lógica do painel admin
└── assets/
    └── logo.png          → sua logo
```

## Passo 1 — Criar o projeto no Firebase

1. Acesse **https://console.firebase.google.com**
2. Clique em **"Adicionar projeto"**, dê um nome (ex: `desabrochar-congresso`) e siga os passos.
3. Dentro do projeto, clique no ícone **`</>`** (Web) para registrar um app web.
4. Dê um apelido ao app (ex: "Site Desabrochar") e clique em **Registrar app**.
5. O Firebase vai mostrar um objeto `firebaseConfig`. Copie ele.
6. Abra o arquivo **`js/firebase-config.js`** e cole seus dados no lugar dos valores de exemplo:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## Passo 2 — Ativar o Firestore (banco de dados)

1. No menu lateral, vá em **Build → Firestore Database**.
2. Clique em **"Criar banco de dados"**.
3. Escolha a localização mais próxima (ex: `southamerica-east1` para o Brasil).
4. Inicie em **modo produção**.
5. Depois de criado, vá na aba **Regras** e substitua pelo conteúdo abaixo:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /inscricoes/{docId} {
      // qualquer pessoa pode CRIAR uma inscrição (formulário público)
      allow create: if request.resource.data.keys().hasAll(['nome', 'telefone', 'criadoEm'])
                    && request.resource.data.nome is string
                    && request.resource.data.nome.size() > 0
                    && request.resource.data.telefone is string;

      // só quem estiver logado (admin) pode ler, editar ou apagar
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

6. Clique em **Publicar**.

Isso garante que qualquer visitante do site pode se inscrever, mas só quem tiver login de administrador consegue ver ou apagar a lista.

## Passo 3 — Ativar o login do painel admin

1. No menu lateral, vá em **Build → Authentication**.
2. Clique em **"Vamos começar"**.
3. Na aba **Sign-in method**, ative o provedor **E-mail/senha**.
4. Vá na aba **Users** e clique em **"Add user"**.
5. Cadastre o e-mail e a senha que você (ou a equipe) vai usar para entrar em `admin.html`.
   - Você pode cadastrar mais de um usuário, um para cada pessoa que precisar acessar o painel.

## Passo 4 — Publicar o site

Você pode publicar de várias formas. As mais simples:

**Opção A — Firebase Hosting (recomendado, é gratuito)**
1. Instale o Firebase CLI: `npm install -g firebase-tools`
2. Na pasta do projeto, rode: `firebase login`
3. Depois: `firebase init hosting` (escolha o projeto que você criou, e a pasta pública como sendo a raiz do projeto)
4. Por fim: `firebase deploy`

**Opção B — Netlify ou Vercel**
- Basta arrastar a pasta do projeto para o painel do Netlify (netlify.com/drop) e pronto — funciona porque é só HTML/CSS/JS estático.

## Como usar no dia a dia

- **Página inicial (`index.html`)**: qualquer pessoa pode entrar, clicar em "Quero me inscrever", preencher nome e telefone e confirmar. Os dados vão direto para o Firestore.
- **Painel admin (`admin.html`)**: acesse com o e-mail e senha cadastrados no Passo 3. Lá você vê:
  - Total de inscritas, inscritas no dia, e a última inscrição
  - Lista completa em tempo real (atualiza sozinha quando alguém se inscreve)
  - Busca por nome ou telefone
  - Botão **Exportar CSV** — baixa a lista completa em uma planilha, pronta para abrir no Excel ou Google Sheets
  - Ícone de lixeira em cada linha, para remover uma inscrição

## Personalização rápida

- **Datas, local e horário**: edite diretamente no `index.html`, nas seções `hero-meta` e `info-grid`.
- **Programação**: edite os blocos `.timeline-item` no `index.html`.
- **Cores**: estão centralizadas no topo do `css/style.css`, nas variáveis `--fuchsia`, `--gold` e `--blush`.
- **Logo**: basta substituir o arquivo `assets/logo.png` por uma nova versão (mantendo o mesmo nome de arquivo).

Qualquer dúvida na hora de configurar o Firebase, volte aqui e me chame.
