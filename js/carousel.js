const carousel = document.querySelector("[data-photo-carousel]");

function escapeHtml(value){
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function readCarouselImages(){
  if (Array.isArray(window.DESABROCHAR_CAROUSEL_IMAGES)){
    return window.DESABROCHAR_CAROUSEL_IMAGES;
  }

  try{
    const response = await fetch("assets/Fotos Carrosel/carousel.json", { cache: "no-store" });
    if (!response.ok) return [];

    const data = await response.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.images)) return data.images;
  } catch (error){
    console.warn("Nao foi possivel carregar o carrossel:", error);
  }

  return [];
}

function normalizeImage(entry){
  if (typeof entry === "string"){
    return { src: entry, alt: "Foto da edicao de 2025" };
  }

  if (entry && typeof entry === "object"){
    return {
      src: entry.src || "",
      alt: entry.alt || "Foto da edicao de 2025",
      caption: entry.caption || ""
    };
  }

  return { src: "", alt: "Foto da edicao de 2025" };
}

function extractOrderValue(image){
  const match = image.src.match(/(\d+)(?=\.[^.]+$)/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

function initCarousel(images){
  if (!carousel) return;

  const viewport = carousel.querySelector("[data-carousel-viewport]");
  const track = carousel.querySelector("[data-carousel-track]");
  const dots = carousel.querySelector("[data-carousel-dots]");
  const prevBtn = carousel.querySelector("[data-carousel-prev]");
  const nextBtn = carousel.querySelector("[data-carousel-next]");

  if (!viewport || !track || !dots || !prevBtn || !nextBtn) return;

  const slides = images
    .map(normalizeImage)
    .filter((image) => image.src)
    .sort((a, b) => extractOrderValue(a) - extractOrderValue(b));

  if (!slides.length){
    track.innerHTML = `
      <div class="photo-carousel__empty">
        <strong>Adicione as fotos da edição de 2025</strong>
        <span>Coloque os arquivos em <code>assets/Fotos Carrosel</code> e liste-os em <code>carousel.json</code>.</span>
      </div>
    `;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    dots.innerHTML = "";
    return;
  }

  track.innerHTML = slides.map((slide, index) => `
    <figure class="photo-carousel__slide" data-slide-index="${index}">
      <img src="${escapeHtml(slide.src)}" alt="${escapeHtml(slide.alt)}" loading="${index < 3 ? "eager" : "lazy"}" decoding="async">
      ${slide.caption ? `<figcaption class="photo-carousel__caption">${escapeHtml(slide.caption)}</figcaption>` : ""}
    </figure>
  `).join("");

  dots.innerHTML = slides.map((_, index) => `
    <button type="button" class="photo-carousel__dot${index === 0 ? " is-active" : ""}" aria-label="Ir para a foto ${index + 1}"></button>
  `).join("");

  const slideEls = Array.from(track.querySelectorAll(".photo-carousel__slide"));
  const dotEls = Array.from(dots.querySelectorAll(".photo-carousel__dot"));
  let currentIndex = 0;
  let autoplayId = null;

  const perView = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--carousel-per-view").trim();
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 3;
  };

  const layoutSlides = () => {
    const visibleSlides = Math.max(1, perView());
    const width = viewport.clientWidth / visibleSlides;
    viewport.style.height = `${width}px`;
    track.style.width = `${width * slideEls.length}px`;
    slideEls.forEach((slide) => {
      slide.style.flex = `0 0 ${width}px`;
      slide.style.width = `${width}px`;
      slide.style.maxWidth = `${width}px`;
    });
  };

  const scrollToIndex = (index, smooth = true) => {
    currentIndex = (index + slides.length) % slides.length;
    const targetSlide = slideEls[currentIndex];
    if (!targetSlide) return;

    const targetLeft = targetSlide.offsetLeft;
    viewport.scrollTo({
      left: targetLeft,
      behavior: smooth ? "smooth" : "auto"
    });
    dotEls.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === currentIndex);
    });
  };

  const syncFromScroll = () => {
    const viewportLeft = viewport.scrollLeft;
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    slideEls.forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft - viewportLeft);
      if (distance < bestDistance){
        bestDistance = distance;
        bestIndex = index;
      }
    });

    currentIndex = bestIndex;
    dotEls.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === currentIndex);
    });
  };

  const goNext = () => {
    if (currentIndex >= slides.length - 1){
      scrollToIndex(0, true);
      return;
    }
    scrollToIndex(currentIndex + 1, true);
  };

  const goPrev = () => {
    if (currentIndex <= 0){
      scrollToIndex(slides.length - 1, true);
      return;
    }
    scrollToIndex(currentIndex - 1, true);
  };

  const stopAutoplay = () => {
    if (autoplayId){
      clearInterval(autoplayId);
      autoplayId = null;
    }
  };

  const startAutoplay = () => {
    if (slides.length < 2 || autoplayId) return;
    autoplayId = setInterval(() => {
      const maxScroll = viewport.scrollWidth - viewport.clientWidth;
      if (maxScroll <= 0) return;

      if (viewport.scrollLeft >= maxScroll - 1){
        viewport.scrollLeft = 0;
        currentIndex = 0;
        syncFromScroll();
        return;
      }

      viewport.scrollLeft += 0.7;
    }, 30);
  };

  const restartAutoplay = () => {
    stopAutoplay();
    startAutoplay();
  };

  prevBtn.addEventListener("click", () => {
    goPrev();
    restartAutoplay();
  });

  nextBtn.addEventListener("click", () => {
    goNext();
    restartAutoplay();
  });

  dotEls.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      scrollToIndex(index, true);
      restartAutoplay();
    });
  });

  viewport.addEventListener("scroll", () => {
    window.requestAnimationFrame(syncFromScroll);
  }, { passive: true });

  if ("ResizeObserver" in window){
    const observer = new ResizeObserver(() => {
      layoutSlides();
      scrollToIndex(currentIndex, false);
    });
    observer.observe(viewport);
  } else {
    window.addEventListener("resize", () => {
      layoutSlides();
      scrollToIndex(currentIndex, false);
    });
  }

  layoutSlides();
  scrollToIndex(0, false);
  startAutoplay();
}

if (carousel){
  readCarouselImages().then(initCarousel);
}
