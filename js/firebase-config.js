// =========================================================
// CONFIGURAÇÃO DO FIREBASE
// =========================================================
// 1. Acesse https://console.firebase.google.com
// 2. Crie um projeto (ou use um existente)
// 3. Vá em "Configurações do projeto" > "Geral" > role até "Seus apps"
// 4. Clique em "Adicionar app" > Web (ícone </>)
// 5. Copie o objeto "firebaseConfig" gerado e cole abaixo, substituindo
//    os valores de exemplo.
// 6. Ative o "Cloud Firestore" (modo produção) em Build > Firestore Database
// 7. Ative "Authentication" > Sign-in method > E-mail/senha
//    (isso protege o painel admin) e crie um usuário para o(a) admin em
//    Authentication > Users > Add user
//
// Veja o README.md para o passo a passo completo e as regras de segurança
// do Firestore que devem ser coladas em Firestore > Regras.
// =========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBaU3wqe8UsXUnYfQU4mIpjXEKMhljVHNc",
  authDomain: "desabrochar-db227.firebaseapp.com",
  databaseURL: "https://desabrochar-db227-default-rtdb.firebaseio.com",
  projectId: "desabrochar-db227",
  storageBucket: "desabrochar-db227.firebasestorage.app",
  messagingSenderId: "232091046588",
  appId: "1:232091046588:web:93ba04f463218228b0b6b9"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Nome da coleção onde as inscrições serão salvas no Firestore
export const COLLECTION_NAME = "inscricoes";
