import { db, auth, COLLECTION_NAME } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- Elements ---------- */
const loginScreen = document.getElementById("loginScreen");
const adminShell = document.getElementById("adminShell");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const ALLOWED_ADMIN_EMAIL = "laaryag@gmail.com";

const tableWrap = document.getElementById("tableWrap");
const searchInput = document.getElementById("searchInput");
const exportBtn = document.getElementById("exportBtn");

const statTotal = document.getElementById("statTotal");
const statToday = document.getElementById("statToday");
const statLast = document.getElementById("statLast");

let allRegistros = [];
let unsubscribe = null;

/* ---------- Auth state ---------- */
onAuthStateChanged(auth, (user) => {
  if (user){
    if (user.email !== ALLOWED_ADMIN_EMAIL){
      signOut(auth);
      loginError.textContent = "Acesso negado para esta conta.";
      loginScreen.style.display = "flex";
      adminShell.classList.remove("is-visible");
      return;
    }
    loginScreen.style.display = "none";
    adminShell.classList.add("is-visible");
    startListening();
  } else {
    loginScreen.style.display = "flex";
    adminShell.classList.remove("is-visible");
    if (unsubscribe) unsubscribe();
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  loginBtn.disabled = true;
  loginBtn.textContent = "Entrando...";

  const email = document.getElementById("emailInput").value.trim();
  const senha = document.getElementById("senhaInput").value;
  const normalizedEmail = email.toLowerCase();

  if (normalizedEmail !== ALLOWED_ADMIN_EMAIL){
    loginError.textContent = "Use o e-mail autorizado para acessar o painel.";
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar";
    return;
  }

  try{
    await signInWithEmailAndPassword(auth, normalizedEmail, senha);
  } catch (err){
    console.error(err);
    switch (err?.code) {
      case "auth/invalid-email":
        loginError.textContent = "O e-mail informado não parece válido.";
        break;
      case "auth/user-not-found":
        loginError.textContent = "Esse usuário não existe neste projeto Firebase.";
        break;
      case "auth/wrong-password":
      case "auth/invalid-credential":
        loginError.textContent = "Senha incorreta. Confira se o usuário foi criado no Firebase Authentication.";
        break;
      case "auth/too-many-requests":
        loginError.textContent = "Muitas tentativas. Aguarde um pouco e tente novamente.";
        break;
      default:
        loginError.textContent = "Não foi possível entrar. Verifique se o usuário foi criado no Firebase Authentication deste projeto.";
        break;
    }
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Entrar";
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));

/* ---------- Firestore listener ---------- */
function startListening(){
  tableWrap.innerHTML = `<div class="loading-row">Carregando inscrições...</div>`;
  const q = query(collection(db, COLLECTION_NAME), orderBy("criadoEm", "desc"));
  unsubscribe = onSnapshot(q, (snapshot) => {
    allRegistros = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStats(allRegistros);
    renderTable(allRegistros);
  }, (err) => {
    console.error(err);
    tableWrap.innerHTML = `<div class="loading-row">Erro ao carregar dados. Verifique as regras do Firestore.</div>`;
  });
}

/* ---------- Stats ---------- */
function renderStats(registros){
  statTotal.textContent = registros.length;

  const hoje = new Date();
  const isSameDay = (ts) => {
    if (!ts?.toDate) return false;
    const d = ts.toDate();
    return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  };
  statToday.textContent = registros.filter(r => isSameDay(r.criadoEm)).length;

  if (registros.length && registros[0].criadoEm?.toDate){
    const d = registros[0].criadoEm.toDate();
    statLast.textContent = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " às " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } else {
    statLast.textContent = "—";
  }
}

/* ---------- Table ---------- */
function renderTable(registros){
  if (!registros.length){
    tableWrap.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M12 3c2 3 2 6 0 9-2-3-2-6 0-9z"/><path d="M3 12c3-2 6-2 9 0-3 2-6 2-9 0z"/><path d="M21 12c-3-2-6-2-9 0 3 2 6 2 9 0z"/><path d="M12 21c-2-3-2-6 0-9 2 3 2 6 0 9z"/></svg>
        <p>Nenhuma inscrição ainda. Assim que alguém se inscrever, aparecerá aqui.</p>
      </div>`;
    return;
  }

  const rows = registros.map(r => {
    const data = r.criadoEm?.toDate
      ? r.criadoEm.toDate().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : "—";
    return `
      <tr data-id="${r.id}" data-nome="${(r.nome || "").toLowerCase()}" data-telefone="${(r.telefone || "").toLowerCase()}">
        <td class="col-nome" data-label="Nome">${escapeHtml(r.nome || "—")}</td>
        <td data-label="Telefone">${escapeHtml(r.telefone || "—")}</td>
        <td class="col-data" data-label="Inscrita em">${data}</td>
        <td data-label="Ações">
          <button class="row-delete" title="Remover inscrição" data-id="${r.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-8 0h10l-.8 12.2a2 2 0 01-2 1.8H8.8a2 2 0 01-2-1.8L6 7z"/></svg>
          </button>
        </td>
      </tr>`;
  }).join("");

  tableWrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Telefone</th>
          <th>Inscrita em</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="tableBody">${rows}</tbody>
    </table>`;

  document.querySelectorAll(".row-delete").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remover esta inscrição da lista?")) return;
      try{
        await deleteDoc(doc(db, COLLECTION_NAME, btn.dataset.id));
      } catch (err){
        console.error(err);
        alert("Não foi possível remover. Tente novamente.");
      }
    });
  });
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, (m) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));
}

/* ---------- Search ---------- */
searchInput.addEventListener("input", () => {
  const term = searchInput.value.trim().toLowerCase();
  document.querySelectorAll("#tableBody tr").forEach(tr => {
    const match = tr.dataset.nome.includes(term) || tr.dataset.telefone.includes(term);
    tr.style.display = match ? "" : "none";
  });
});

/* ---------- CSV export ---------- */
exportBtn.addEventListener("click", () => {
  if (!allRegistros.length){
    alert("Não há inscrições para exportar ainda.");
    return;
  }

  const header = ["Nome", "Telefone", "Inscrita em"];
  const lines = allRegistros.map(r => {
    const data = r.criadoEm?.toDate
      ? r.criadoEm.toDate().toLocaleString("pt-BR")
      : "";
    return [r.nome || "", r.telefone || "", data]
      .map(csvEscape)
      .join(";");
  });

  const csvContent = "\uFEFF" + [header.join(";"), ...lines].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dataArquivo = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `inscricoes-desabrochar-${dataArquivo}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

function csvEscape(value){
  const str = String(value ?? "");
  if (str.includes(";") || str.includes('"') || str.includes("\n")){
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
