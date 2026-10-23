"use strict";
(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const clamp = n => Math.max(0, Math.min(1, n));
  const ease = n => n * n * (3 - 2 * n);
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const scene = $(".scene"), screen = $(".screen");
  const circle = $(".circle"), container = $(".frames");
  const nostalgia = $(".nostalgia");
  const steps = $$(".nostalgia-step"), pictures = $$(".nostalgia-picture");
  const therapy = $(".therapy"), footer = $(".site-footer");
  let pageHeight = 1, sceneTop = 0, sceneHeight = 1;
  let frameIndex = -2, pictureIndex = -1, scheduled = false;

  const frames = [11,22,33,44,55,66,77,88].map(n => {
    const image = new Image();
    image.src = `./img/${n}.png`;
    image.alt = "";
    container.append(image);
    return image;
  });

  // Один механизм для всех блоков двоичного текста.
  const binary = $$("[data-binary]").map(root => {
    const children = $$("h2,p", root);
    const nodes = children.length ? children : [root];
    return {
      root, done: motion.matches,
      items: nodes.map(element => {
        const original = element.textContent.replace(/\s+/g," ").trim();
        element.textContent = original;
        element.setAttribute("aria-label", original);
        return {element, original, letters: [...original]};
      })
    };
  });
  function render(items, progress) {
    items.forEach(({element, original, letters}) => {
      element.textContent = progress >= 1 ? original : letters.map((c,i) =>
        /\s/.test(c) || i < Math.floor(letters.length * progress)
          ? c : Math.random() < .5 ? "0" : "1"
      ).join("");
    });
  }
  function measure() {
    pageHeight = document.documentElement.scrollHeight;
    sceneTop = scene.getBoundingClientRect().top + scrollY;
    sceneHeight = scene.offsetHeight;
    schedule();
  }
  function update() {
    scheduled = false;
    const height = innerHeight, y = scrollY;
    const distance = Math.max(1, sceneHeight - screen.clientHeight);
    const end = sceneTop + distance;
    const progress = clamp((y - sceneTop) / distance);
    const maxSize = Math.min(innerWidth * .8, height * .8, 500);
    const minSize = Math.min(180, maxSize);
    let index = -1, size = maxSize, top = height / 2;
    if (progress >= .4 && progress < .8) {
      index = Math.min(7, Math.floor((progress - .4) / .4 * 8));
      size = minSize + (maxSize - minSize) * index / 7;
    } else if (progress >= .8) {
      const shrink = ease(clamp((progress - .8) / .2));
      index = 7;
      size = maxSize + (60 - maxSize) * shrink;
      top = height / 2 + (50 - height / 2) * shrink;
      if (y >= end) {
        const rest = clamp((y - end) / Math.max(1, pageHeight - height - end));
        index = 7 - Math.min(7, Math.floor(rest * 8));
      }
    }
    container.style.setProperty("--size", `${size}px`);
    container.style.setProperty("--top", `${top}px`);
    if (index !== frameIndex) {
      frames.forEach((img,i) => img.classList.toggle("active", i === index));
      frameIndex = index;
    }
    const width = Math.max(1, circle.clientWidth);
    const fullScale = Math.max(.2, Math.hypot(screen.clientWidth,height) / width);
    const scale = progress < .4
      ? .2 + (fullScale - .2) * ease(clamp(progress / .4))
      : fullScale + (size / width - fullScale) * ease(clamp((progress - .4) / .4));
    circle.style.top = `${top}px`;
    circle.style.transform = `translate(-50%,-50%) scale(${scale})`;
    circle.style.opacity = 1 - ease(clamp((progress - .85) / .15));

    let next = 0;
    steps.forEach((step,i) => {
      const rect = step.getBoundingClientRect();
      if (rect.top <= height * .5) next = i;
      if (rect.bottom > 0 && rect.top < height) {
        pictures[i].style.setProperty("--zoom", motion.matches ? 1 : 1 + clamp(-rect.top / height) * .06);
      }
    });
    if (next !== pictureIndex) {
      pictures.forEach((picture,i) => picture.classList.toggle("active", i === next));
      pictureIndex = next;
    }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }

  // Пересчёт высоты после загрузки изображений, видео и шрифтов.
  addEventListener("scroll", schedule, {passive:true});
  addEventListener("resize", measure);
  addEventListener("load", measure);
  if (document.fonts) document.fonts.ready.then(measure);
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(document.body);
  resizeObserver.observe(scene);

  const visibilityObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.target === therapy) therapy.classList.toggle("is-visible", entry.isIntersecting);
      if (entry.target === footer) {
        footerVisible = entry.isIntersecting;
        footerPhase = "binary";
        footerStarted = performance.now();
        if (!footerVisible) render(footerItems, 1);
      }
    });
  });
  let footerVisible = false, footerPhase = "binary", footerStarted = 0, hold = 2500;
  const footerItems = $$(".footer-code").map(element => {
    const original = element.textContent.trim();
    element.setAttribute("aria-label", original);
    return {element, original, letters:[...original]};
  });
  visibilityObserver.observe(therapy);
  visibilityObserver.observe(footer);

  // Один таймер вместо отдельного интервала для каждого экрана.
  setInterval(() => {
    if (document.hidden) return;
    const height = innerHeight;
    const atBottom = scrollY + height >= document.documentElement.scrollHeight - 3;
    let changed = false;
    binary.forEach(block => {
      if (block.done) return;
      if (motion.matches) {
        render(block.items, 1); block.done = true; changed = true; return;
      }
      const rect = block.root.getBoundingClientRect();
      if (rect.top >= height) return;
      const step = block.root.closest(".nostalgia-step");
      const fullScreen = block.root.closest(".question-screen,.effect-screen");
      let progress;
      if (step) progress = clamp(1 - step.getBoundingClientRect().top / (height * .9));
      else if (fullScreen) progress = clamp(1 - fullScreen.getBoundingClientRect().top / height);
      else progress = clamp((height - rect.top - rect.height / 2) / (height * .5));
      if (progress >= .99 || atBottom || rect.bottom <= 0) {
        render(block.items, 1); block.done = true; changed = true;
      } else if (rect.bottom > 0) {
        render(block.items, progress); changed = true;
      }
    });
    if (changed) schedule();
    if (!footerVisible || motion.matches) return;
    const now = performance.now();
    if (footerPhase === "binary") {
      render(footerItems, 0);
      if (now - footerStarted >= 1500) {
        render(footerItems, 1);
        footerPhase = "words"; footerStarted = now;
        hold = 2000 + Math.random() * 1000;
      }
    } else if (now - footerStarted >= hold) {
      footerPhase = "binary"; footerStarted = now;
    }
  }, 90);

  // Наведение: изображение растёт, соседи отодвигаются.
  const cloud = $(".memory-cloud"), memories = $$(".memory-item",cloud);
  let activeMemory = null;
  function arrange(selected) {
    activeMemory = selected;
    const width = cloud.clientWidth, height = cloud.clientHeight;
    const positions = memories.map(item => ({
      x: parseFloat(item.style.getPropertyValue("--x")) / 100 * width,
      y: parseFloat(item.style.getPropertyValue("--y")) / 100 * height
    }));
    const origin = positions[memories.indexOf(selected)];
    memories.forEach((item,i) => {
      item.classList.toggle("is-active", item === selected);
      let dx = 0, dy = 0;
      if (origin && item !== selected) {
        const x = positions[i].x - origin.x, y = positions[i].y - origin.y;
        const distance = Math.hypot(x,y);
        const force = Math.max(0,1 - distance / (width * .55)) * width * .11;
        dx = x / Math.max(1,distance) * force;
        dy = y / Math.max(1,distance) * force;
      }
      item.style.setProperty("--dx",`${dx}px`);
      item.style.setProperty("--dy",`${dy}px`);
      item.style.setProperty("--caption-shift",`${item.clientWidth * .08}px`);
    });
  }
  memories.forEach(item => {
    item.addEventListener("pointerenter",event => {
      if (event.pointerType !== "touch") arrange(item);
    });
    item.addEventListener("focus",() => arrange(item));
    item.addEventListener("click",() => arrange(item));
  });
  cloud.addEventListener("pointerleave",() => arrange(memories.includes(document.activeElement) ? document.activeElement : null));
  cloud.addEventListener("focusout",event => {
    if (!cloud.contains(event.relatedTarget)) arrange(null);
  });
  addEventListener("resize",() => arrange(activeMemory));
  measure();
})();