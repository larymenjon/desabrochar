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
      <div class="photo-carousel__slide-bg" style="background-image:url('${escapeHtml(slide.src)}')" aria-hidden="true"></div>
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
  let slideOffsets = [];
  let loopWidth = 0;
  let autoplayStoppedByUser = false;

  const updateDots = () => {
    dotEls.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === currentIndex);
    });
  };

  const stopAutoplayForever = () => {
    autoplayStoppedByUser = true;
    stopAutoplay();
  };

  const measureSlides = () => {
    let acc = 0;
    slideOffsets = [];
    slideEls.forEach((slide) => {
      slideOffsets.push(acc);
      acc += slide.offsetWidth;
    });
    slideOffsets.push(acc);
    loopWidth = slideOffsets[slides.length] || 0;
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
    if (!slideOffsets.length) return 0;
    const pos = viewport.scrollLeft;
    for (let i = 0; i < slideOffsets.length - 1; i++){
      if (pos < slideOffsets[i + 1] - 0.5) return i;
    }
    return slideOffsets.length - 2;
  };

  const scrollToIndex = (index, smooth = true) => {
    currentIndex = (index + slides.length) % slides.length;
    normalizeLoop();

    if (!slideOffsets.length) return;

    const current = viewport.scrollLeft;
    const candidateA = slideOffsets[currentIndex];
    const candidateB = slideOffsets[currentIndex + slides.length];
    const targetLeft = Math.abs(candidateA - current) <= Math.abs(candidateB - current) ? candidateA : candidateB;

    viewport.scrollTo({
      left: targetLeft,
      behavior: smooth ? "smooth" : "auto"
    });
    updateDots();
  };

  const syncFromScroll = () => {
    normalizeLoop();

    const physicalIndex = physicalIndexFromScroll();
    currentIndex = slides.length ? physicalIndex % slides.length : 0;
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
      measureSlides();
      scrollToIndex(currentIndex, false);
    });
    observer.observe(viewport);
  } else {
    window.addEventListener("resize", () => {
      measureSlides();
      scrollToIndex(currentIndex, false);
    });
  }

  const preloadSlideImages = () => Promise.all(slides.map((slide) => new Promise((resolve) => {
    const probe = new Image();
    probe.onload = resolve;
    probe.onerror = resolve;
    probe.src = slide.src;
  })));

  measureSlides();
  scrollToIndex(0, false);

  preloadSlideImages().then(() => {
    measureSlides();
    scrollToIndex(currentIndex, false);
    startAutoplay();
  });
}

if (carousel){
  readCarouselImages().then(initCarousel);
}
