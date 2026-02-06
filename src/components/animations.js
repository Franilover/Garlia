export function initAnimations() {
    // ð¡ï¸ PROTECCIÃN INICIAL: Evita que el servidor explote
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // 1. ANIMACIÃN DE APARICIÃN (Scroll)
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

    // 2. REPRODUCTOR GLOBAL
    // Lo asignamos a window dentro de la funciÃ³n para que solo exista en el navegador
    window.togglePlay = function(id, btn) {
        const audio = document.getElementById(id);
        if (!audio) return;

        const icon = btn.querySelector('.icon');
        const progressBar = btn.parentElement.querySelector('.progress-bar');

        if (audio.paused) {
            audio.play();
            icon.textContent = 'â¸';
        } else {
            audio.pause();
            icon.textContent = 'â¶';
        }

        audio.ontimeupdate = () => {
            const percentage = (audio.currentTime / audio.duration) * 100;
            if (progressBar) progressBar.style.width = percentage + '%';
        };
        
        audio.onended = () => {
            icon.textContent = 'â¶';
            if (progressBar) progressBar.style.width = '0%';
        };
    };
}