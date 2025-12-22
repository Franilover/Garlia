(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin===`use-credentials`?t.credentials=`include`:e.crossOrigin===`anonymous`?t.credentials=`omit`:t.credentials=`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();function e(){let e=document.querySelector(`.nav`);if(!e)return;let t=window.location.pathname.split(`/`).pop()||`index.html`;e.innerHTML=`
        <div class="nav__logo">Franilover</div>

        <input type="checkbox" id="menu-toggle">
        <label for="menu-toggle" class="nav__toggle" aria-label="Abrir menú">
            <span></span>
            <span></span>
            <span></span>
        </label>

        <ul class="nav__menu">
            <li><a href="index.html" class="${t===`index.html`?`active`:``}">Inicio</a></li>
            
            <li class="dropdown">
                <span class="dropdown-btn">Personal ▾</span>
                <ul class="dropdown-content">
                    <li><a href="drawings.html" class="${t===`drawings.html`?`active`:``}">Dibujos</a></li>
                    <li><a href="diario.html" class="${t===`diario.html`?`active`:``}">Diario</a></li>
                    <li><a href="ensayos.html" class="${t===`ensayos.html`?`active`:``}">Ensayos</a></li>
                    <li><a href="resenas.html" class="${t===`resenas.html`?`active`:``}">Reseñas</a></li>
                    <li><a href="recomendaciones.html" class="${t===`recomendaciones.html`?`active`:``}">Recomendaciones</a></li>
                </ul>
            </li>

            <li class="dropdown">
                <span class="dropdown-btn">Garden of Sins ▾</span>
                <ul class="dropdown-content">
                    <li><a href="lore.html" class="${t===`lore.html`?`active`:``}">Personajes</a></li>
                    <li><a href="canciones.html" class="${t===`canciones.html`?`active`:``}">Canciones</a></li>
                </ul>
            </li>

            <li><a href="https://www.youtube.com/@franilover/featured" target="_blank">YouTube</a></li>
        </ul>
    `;let n=e.querySelectorAll(`.dropdown`);n.forEach(e=>{e.querySelector(`.dropdown-btn`).addEventListener(`click`,t=>{t.stopPropagation(),n.forEach(t=>{t!==e&&t.classList.remove(`open`)}),e.classList.toggle(`open`)})})}function t(){let e=document.querySelectorAll(`.animate-on-scroll`),t=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting&&(e.target.classList.add(`is-visible`),t.unobserve(e.target))})},{threshold:.1});e.forEach(e=>t.observe(e));let n=document.getElementById(`lightbox`),r=document.getElementById(`lightbox-img`);document.addEventListener(`click`,e=>{e.target.classList.contains(`imagen`)&&n&&r&&(r.src=e.target.src,n.classList.add(`active`),document.body.style.overflow=`hidden`,r.classList.remove(`efecto-abrir`),r.offsetWidth,r.classList.add(`efecto-abrir`)),e.target.id===`lightbox`&&(n.classList.remove(`active`),document.body.style.overflow=``)})}window.togglePlay=function(e,t){let n=document.getElementById(e);if(!n)return;let r=t.querySelector(`.icon`),i=t.parentElement.querySelector(`.progress-bar`);n.paused?(n.play(),r.textContent=`⏸`):(n.pause(),r.textContent=`▶`),n.ontimeupdate=()=>{let e=n.currentTime/n.duration*100;i&&(i.style.width=e+`%`)},n.onended=()=>{r.textContent=`▶`,i&&(i.style.width=`0%`)}},document.addEventListener(`DOMContentLoaded`,()=>{e(),setTimeout(()=>{t()},50)});