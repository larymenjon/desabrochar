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
  const lightbox = document.getElementById("carouselLightbox");
  const lightboxImage = document.getElementById("carouselLightboxImage");
  const lightboxClose = document.getElementById("carouselLightboxClose");

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

  const renderedSlides = slides.concat(slides);

  track.innerHTML = renderedSlides.map((slide, index) => `
    <figure class="photo-carousel__slide" data-slide-index="${index % slides.length}" data-physical-index="${index}">
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
  let lastAutoplayFrame = null;
  let slideWidth = 0;
  let loopWidth = 0;
  let autoplayStoppedByUser = false;

  const perView = () => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--carousel-per-view").trim();
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 3;
  };

  const updateDots = () => {
    dotEls.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === currentIndex);
    });
  };

  const stopAutoplayForever = () => {
    autoplayStoppedByUser = true;
    stopAutoplay();
  };

  const layoutSlides = () => {
    const visibleSlides = Math.max(1, perView());
    slideWidth = viewport.clientWidth / visibleSlides;
    loopWidth = slideWidth * slides.length;
    viewport.style.height = `${slideWidth}px`;
    track.style.width = `${slideWidth * slideEls.length}px`;
    slideEls.forEach((slide) => {
      slide.style.flex = `0 0 ${slideWidth}px`;
      slide.style.width = `${slideWidth}px`;
      slide.style.maxWidth = `${slideWidth}px`;
    });
  };

  const normalizeLoop = () => {
    if (!loopWidth) return;

    if (viewport.scrollLeft >= loopWidth){
      viewport.scrollLeft -= loopWidth;
    } else if (viewport.scrollLeft < 0){
      viewport.scrollLeft += loopWidth;
    }
  };

  const physicalIndexFromScroll = () => {
    if (!slideWidth) return 0;
    return Math.round(viewport.scrollLeft / slideWidth);
  };

  const scrollToIndex = (index, smooth = true) => {
    currentIndex = (index + slides.length) % slides.length;
    normalizeLoop();

    const currentPhysicalIndex = physicalIndexFromScroll();
    const currentCycle = Math.floor(currentPhysicalIndex / slides.length);
    const candidates = [
      (currentCycle - 1) * slides.length + currentIndex,
      currentCycle * slides.length + currentIndex,
      (currentCycle + 1) * slides.length + currentIndex
    ].filter((candidate) => candidate >= 0 && candidate < slideEls.length);

    const targetPhysicalIndex = candidates.reduce((best, candidate) => {
      if (best === null) return candidate;
      return Math.abs(candidate - currentPhysicalIndex) < Math.abs(best - currentPhysicalIndex) ? candidate : best;
    }, null);

    if (targetPhysicalIndex === null) return;

    const targetLeft = targetPhysicalIndex * slideWidth;
    viewport.scrollTo({
      left: targetLeft,
      behavior: smooth ? "smooth" : "auto"
    });
    updateDots();
  };

  const syncFromScroll = () => {
    normalizeLoop();

    const viewportLeft = viewport.scrollLeft;
    currentIndex = slideWidth ? Math.round(viewportLeft / slideWidth) % slides.length : 0;
    updateDots();
  };

  const openLightbox = (slideIndex) => {
    if (!lightbox || !lightboxImage) return;

    const slide = slides[slideIndex];
    if (!slide) return;

    stopAutoplayForever();
    lightboxImage.src = slide.src;
    lightboxImage.alt = slide.alt || "Foto da edicao de 2025";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    lightboxClose?.focus();
  };

  const closeLightbox = () => {
    if (!lightbox || !lightboxImage || !lightbox.classList.contains("is-open")) return;

    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImage.src = "";
    lightboxImage.alt = "";
    document.body.style.overflow = "";
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
      window.cancelAnimationFrame(autoplayId);
      autoplayId = null;
    }
    lastAutoplayFrame = null;
  };

  const startAutoplay = () => {
    if (slides.length < 2 || autoplayId || autoplayStoppedByUser) return;

    const speed = window.matchMedia("(max-width: 760px)").matches ? 0.18 : 0.28;

    const step = (timestamp) => {
      if (lastAutoplayFrame === null){
        lastAutoplayFrame = timestamp;
      }

      const elapsed = timestamp - lastAutoplayFrame;
      lastAutoplayFrame = timestamp;

      viewport.scrollLeft += elapsed * speed;
      normalizeLoop();
      syncFromScroll();

      autoplayId = window.requestAnimationFrame(step);
    };

    autoplayId = window.requestAnimationFrame(step);
  };

  prevBtn.addEventListener("click", () => {
    stopAutoplayForever();
    goPrev();
  });

  nextBtn.addEventListener("click", () => {
    stopAutoplayForever();
    goNext();
  });

  dotEls.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      stopAutoplayForever();
      scrollToIndex(index, true);
    });
  });

  slideEls.forEach((slide) => {
    slide.addEventListener("click", () => {
      const slideIndex = Number(slide.dataset.slideIndex || 0);
      openLightbox(slideIndex);
    });
  });

  viewport.addEventListener("scroll", () => {
    window.requestAnimationFrame(syncFromScroll);
  }, { passive: true });

  viewport.addEventListener("pointerdown", () => {
    stopAutoplayForever();
  }, { passive: true });

  lightboxClose?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.hasAttribute("data-lightbox-close")){
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape"){
      closeLightbox();
    }
  });

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
