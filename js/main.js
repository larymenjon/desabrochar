import { db, COLLECTION_NAME } from "./firebase-config.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- Header on scroll ---------- */
const header = document.getElementById("siteHeader");
if (header){
  const onScroll = () => {
    if (window.scrollY > 30) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  };
  document.addEventListener("scroll", onScroll);
  onScroll();
}

/* ---------- Modal open/close ---------- */
const overlay = document.getElementById("inscricao");
const modal = document.getElementById("modal");
const openTriggers = document.querySelectorAll("[data-open-modal]");
const closeBtn = document.getElementById("modalClose");
const successCloseBtn = document.getElementById("successCloseBtn");
const form = document.getElementById("signupForm");
const submitBtn = document.getElementById("submitBtn");
const nomeInput = document.getElementById("nomeInput");
const telefoneInput = document.getElementById("telefoneInput");
const nomeError = document.getElementById("nomeError");
const telefoneError = document.getElementById("telefoneError");

function clearErrors(){
  if (!nomeError || !telefoneError || !nomeInput || !telefoneInput) return;
  nomeError.textContent = "";
  telefoneError.textContent = "";
  nomeInput.style.borderColor = "";
  telefoneInput.style.borderColor = "";
}

function closeModal(){
  if (!overlay || !modal || !form || !submitBtn) return;
  overlay.classList.remove("is-open");
  document.body.style.overflow = "";
  setTimeout(() => {
    modal.classList.remove("is-success");
    form.reset();
    clearErrors();
    submitBtn.classList.remove("is-loading");
  }, 350);
}

function openModal(e){
  if (!overlay || !modal) return;
  if (e) e.preventDefault();
  overlay.classList.add("is-open");
  document.body.style.overflow = "hidden";
  setTimeout(() => document.getElementById("nomeInput")?.focus(), 300);
}

if (overlay && modal){
  openTriggers.forEach(el => el.addEventListener("click", openModal));
  closeBtn?.addEventListener("click", closeModal);
  successCloseBtn?.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) closeModal();
  });

  if (window.location.hash === "#inscricao"){
    window.requestAnimationFrame(() => openModal());
  }
}

/* ---------- Telephone mask ---------- */
if (telefoneInput){
  telefoneInput.addEventListener("input", () => {
    let v = telefoneInput.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 6){
      v = v.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
    } else if (v.length > 2){
      v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else if (v.length > 0){
      v = v.replace(/^(\d{0,2})/, "($1");
    }
    telefoneInput.value = v;
  });
}

/* ---------- Form submit ---------- */
function validate(){
  if (!form || !nomeInput || !telefoneInput || !nomeError || !telefoneError) return false;
  clearErrors();
  let valid = true;
  const nome = nomeInput.value.trim();
  const telefoneDigits = telefoneInput.value.replace(/\D/g, "");

  if (nome.length < 3){
    nomeError.textContent = "Digite seu nome completo.";
    nomeInput.style.borderColor = "#b5316b";
    valid = false;
  }
  if (telefoneDigits.length < 10){
    telefoneError.textContent = "Digite um telefone válido com DDD.";
    telefoneInput.style.borderColor = "#b5316b";
    valid = false;
  }
  return valid;
}

if (form && submitBtn && modal && nomeInput && telefoneInput && nomeError && telefoneError){
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;

    submitBtn.classList.add("is-loading");
    submitBtn.disabled = true;

    try{
      await addDoc(collection(db, COLLECTION_NAME), {
        nome: nomeInput.value.trim(),
        telefone: telefoneInput.value.trim(),
        criadoEm: serverTimestamp()
      });

      modal.classList.add("is-success");
    } catch (err){
      console.error("Erro ao salvar inscrição:", err);
      telefoneError.textContent = "Não foi possível enviar. Verifique sua conexão e tente novamente.";
    } finally {
      submitBtn.classList.remove("is-loading");
      submitBtn.disabled = false;
    }
  });
}
