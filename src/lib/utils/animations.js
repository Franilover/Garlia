export function initAnimations() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const elementosAnimados = document.querySelectorAll(".animate-on-scroll");
  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(entrada => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("is-visible");
        observador.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.1 });
  elementosAnimados.forEach(el => observador.observe(el));

  window.togglePlay = function(id, btn) {
    const audio = document.getElementById(id);
    if (!audio) return;

    const icon = btn.querySelector('.icon');
    const progressBar = btn.parentElement.querySelector('.progress-bar');

    if (audio.paused) {
      audio.play();
      icon.textContent = '⏸';
    } else {
      audio.pause();
      icon.textContent = '▶';
    }

    audio.ontimeupdate = () => {
      const percentage = (audio.currentTime / audio.duration) * 100;
      if (progressBar) progressBar.style.width = percentage + '%';
    };

    audio.onended = () => {
      icon.textContent = '▶';
      if (progressBar) progressBar.style.width = '0%';
    };
  };
}