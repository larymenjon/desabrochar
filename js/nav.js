const header = document.getElementById("siteHeader");
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (header && menuToggle && mainNav){
  const setMenuState = (open) => {
    header.classList.toggle("nav-open", open);
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  };

  menuToggle.addEventListener("click", () => {
    setMenuState(!header.classList.contains("nav-open"));
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuState(false));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setMenuState(false);
  });

  document.addEventListener("click", (e) => {
    if (!header.classList.contains("nav-open")) return;
    if (header.contains(e.target)) return;
    setMenuState(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) setMenuState(false);
  });
}
