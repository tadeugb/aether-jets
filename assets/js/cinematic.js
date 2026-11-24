/**
 * @file cinematic.js
 * @description Camada cinematográfica: rolagem suave (Lenis), parallax das faixas (GSAP ScrollTrigger),
 * campo de estrelas, preloader, cursor customizado e cards 3D.
 * Tudo degrada com elegância: sem GSAP/Lenis o site continua funcionando.
 * AINDA NÃO IMPLEMENTADO: storytelling com pin ("A jornada"), texto revelado linha a linha,
 * botões magnéticos, contadores animados e transição de cortina entre views.
 */
(function () {
    'use strict';

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hasGsap = !!window.gsap;
    const hasST = hasGsap && !!window.ScrollTrigger;
    let lenis = null;
    if (hasST) window.gsap.registerPlugin(window.ScrollTrigger); // registro único (idempotente)

    // --- 1. ROLAGEM SUAVE (um único loop de animação: o do GSAP, se existir) ---
    function initLenis() {
        if (reduce || !window.Lenis) return;
        lenis = new window.Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        if (hasST) {
            lenis.on('scroll', window.ScrollTrigger.update);
            window.gsap.ticker.add((time) => lenis.raf(time * 1000));
            window.gsap.ticker.lagSmoothing(0);
        } else {
            const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
            requestAnimationFrame(raf);
        }
        // O portal tem tabelas/modais com rolagem própria: pausa o Lenis nessa view
        const sync = () => {
            if (location.hash.startsWith('#/area-cliente')) lenis.stop(); else lenis.start();
            if (hasST) setTimeout(() => window.ScrollTrigger.refresh(), 150);
        };
        window.addEventListener('hashchange', sync);
        sync();
    }

    // --- 2. CAMPO DE ESTRELAS ---
    function initStars() {
        const canvas = document.getElementById('star-canvas');
        if (!canvas || reduce) return;
        const ctx = canvas.getContext('2d');
        let w = (canvas.width = window.innerWidth);
        let h = (canvas.height = window.innerHeight);
        window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; });
        const stars = Array.from({ length: 120 }, () => ({
            x: Math.random() * w, y: Math.random() * h,
            r: Math.random() * 1.5 + 0.5, a: Math.random() * 0.7 + 0.3, v: Math.random() * 0.05 + 0.01
        }));
        (function frame() {
            if (!document.hidden) {
                ctx.clearRect(0, 0, w, h);
                ctx.fillStyle = '#6B7078';   // poeira prateada (visível sobre bege)
                stars.forEach((s) => {
                    ctx.globalAlpha = s.a * 0.45;
                    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
                    s.y -= s.v; if (s.y < 0) s.y = h;
                });
            }
            requestAnimationFrame(frame);
        })();
    }

    // --- 3. PRELOADER (a animação de saída é feita por CSS; a trava de 6 s está no cinematic.css) ---
    function initPreloader() {
        const pre = document.getElementById('preloader');
        const done = () => {
            document.body.classList.add('loaded');
            if (pre) { pre.style.opacity = '0'; pre.style.pointerEvents = 'none'; setTimeout(() => pre.remove(), 700); }
        };
        if (!pre || reduce) { done(); return; }
        const label = document.getElementById('preloader-counter');
        let n = 0;
        const timer = setInterval(() => {
            n = Math.min(100, n + Math.floor(Math.random() * 8) + 3);
            if (label) label.textContent = n + '%';
            if (n >= 100) { clearInterval(timer); done(); }
        }, 30);
    }

    // --- 4. CURSOR CUSTOMIZADO (delegação: funciona em elementos criados depois, como os cards de Empty Legs) ---
    function initCursor() {
        if (reduce || window.innerWidth < 1024 || window.matchMedia('(hover: none)').matches) return;
        const cursor = document.createElement('div');
        cursor.className = 'custom-cursor';
        document.body.appendChild(cursor);
        let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
        window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; });
        document.addEventListener('mouseover', (e) => {
            const t = e.target.closest && e.target.closest('a, button, .tilt-card');
            cursor.classList.toggle('hovered', !!t);
            cursor.textContent = (t && t.getAttribute('data-cursor')) || '';
        });
        (function frame() {
            cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
            cursor.style.left = cx + 'px'; cursor.style.top = cy + 'px';
            requestAnimationFrame(frame);
        })();
    }

    // --- 5. CARDS 3D (delegação) ---
    function initTilt() {
        if (reduce) return;
        let active = null;
        const reset = (el) => {
            if (hasGsap) window.gsap.to(el, { rotationX: 0, rotationY: 0, duration: 0.5, ease: 'power2.out' });
            else el.style.transform = '';
        };
        document.addEventListener('mousemove', (e) => {
            const card = e.target.closest && e.target.closest('.tilt-card');
            if (active && active !== card) { reset(active); active = null; }
            if (!card) return;
            active = card;
            const r = card.getBoundingClientRect();
            const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
            const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
            if (hasGsap) {
                window.gsap.to(card, { rotationY: dx * 8, rotationX: -dy * 8, transformPerspective: 1000, duration: 0.3, ease: 'power1.out', overwrite: 'auto' });
            } else {
                card.style.transform = `perspective(1000px) rotateY(${dx * 8}deg) rotateX(${-dy * 8}deg)`;
            }
        });
    }

    // --- 6. PARALLAX DAS FAIXAS FOTOGRÁFICAS ---
    function initParallax() {
        if (!hasST || reduce) return;
        document.querySelectorAll('.parallax-band').forEach((band) => {
            const bg = band.querySelector('.parallax-band-bg');
            if (!bg) return;
            window.gsap.fromTo(bg, { yPercent: -15 }, {
                yPercent: 15, ease: 'none',
                scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: true }
            });
        });
        window.addEventListener('load', () => window.ScrollTrigger.refresh());
    }

    // --- 7. REVEAL AO ROLAR (sem IntersectionObserver o conteúdo já aparece pelo CSS) ---
    function initReveal() {
        const els = document.querySelectorAll('.reveal');
        if (!els.length) return;
        if (reduce || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
        const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { threshold: 0.12 });
        els.forEach((e) => io.observe(e));
        setTimeout(() => els.forEach((e) => e.classList.add('in')), 4000);   // trava de segurança
    }

    document.addEventListener('DOMContentLoaded', () => {
        initReveal();
        initPreloader();
        initLenis();
        initStars();
        initCursor();
        initTilt();
        initParallax();
    });
})();
