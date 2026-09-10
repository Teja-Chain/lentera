/* ============================================================
   LENTERA — Landing Page Script
   Vanilla JS: scroll choreography, parallax, reveal, particles
   ============================================================ */

(function () {
  'use strict';

  // ---- Feature detection ----
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // ---- DOM refs ----
  const root = document.documentElement;
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  const heroContent = document.getElementById('heroContent');
  const heroColosseum = document.getElementById('heroColosseum');
  const heroParticles = document.getElementById('heroParticles');
  const heroScrollIndicator = document.getElementById('heroScrollIndicator');

  // ---- Lerp utility ----
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  // ============================================================
  // PARTICLES
  // ============================================================
  function createParticles() {
    if (prefersReducedMotion) return;
    const count = 20;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.top = 30 + Math.random() * 60 + '%';
      p.style.animationDelay = Math.random() * 8 + 's';
      p.style.animationDuration = 6 + Math.random() * 6 + 's';
      p.style.width = 1 + Math.random() * 2 + 'px';
      p.style.height = p.style.width;
      heroParticles.appendChild(p);
    }
  }

  createParticles();

  // ============================================================
  // MOBILE NAV TOGGLE
  // ============================================================
  if (navToggle) {
    navToggle.addEventListener('click', function () {
      const isOpen = navLinks.classList.toggle('open');
      navToggle.classList.toggle('active', isOpen);
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navLinks.classList.remove('open');
        navToggle.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ============================================================
  // SCROLL-DRIVEN HERO CHOREOGRAPHY
  // ============================================================
  // Smoothed values
  let smoothScroll = 0;
  let targetScroll = 0;
  let smoothMouseX = 0;
  let smoothMouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  const HERO_SCROLL_END = 700; // px after which hero is fully transitioned

  function updateScrollValues() {
    targetScroll = window.scrollY || window.pageYOffset;
  }

  // Mouse parallax
  function updateMouseValues(e) {
    if (prefersReducedMotion) return;
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    targetMouseX = (e.clientX - cx) / cx; // -1 to 1
    targetMouseY = (e.clientY - cy) / cy;
  }

  window.addEventListener('scroll', updateScrollValues, { passive: true });
  window.addEventListener('mousemove', updateMouseValues, { passive: true });

  // ---- Animation loop ----
  function tick() {
    // Smooth interpolation
    const lerpFactor = prefersReducedMotion ? 1 : 0.08;
    smoothScroll = lerp(smoothScroll, targetScroll, lerpFactor);
    smoothMouseX = lerp(smoothMouseX, targetMouseX, 0.05);
    smoothMouseY = lerp(smoothMouseY, targetMouseY, 0.05);

    // Hero progress 0 → 1 over HERO_SCROLL_END px
    const heroProgress = clamp(smoothScroll / HERO_SCROLL_END, 0, 1);

    // --- Update CSS custom properties ---
    if (!prefersReducedMotion) {
      // Hero content: move up, fade, scale
      const heroOpacity = clamp(1 - heroProgress * 2, 0, 1);
      const heroY = heroProgress * -120;
      const heroScale = 1 - heroProgress * 0.08;

      root.style.setProperty('--hero-opacity', heroOpacity);
      root.style.setProperty('--hero-y', heroY + 'px');
      root.style.setProperty('--hero-scale', heroScale);

      // Colosseum: slow zoom & shift
      const colosseumScale = 1 + heroProgress * 0.15;
      const colosseumY = heroProgress * -30;
      root.style.setProperty('--colosseum-scale', colosseumScale);
      root.style.setProperty('--colosseum-y', colosseumY + 'px');

      // Scroll progress for warm light
      root.style.setProperty('--scroll-progress', heroProgress);

      // Mouse parallax on Colosseum
      const parallaxX = smoothMouseX * 12;
      const parallaxY = smoothMouseY * 8;
      if (heroColosseum) {
        heroColosseum.style.transform =
          'scale(' + colosseumScale + ') translate(' +
          parallaxX + 'px, ' + (colosseumY + parallaxY) + 'px)';
      }
    }

    // Nav background on scroll
    if (nav) {
      if (smoothScroll > 60) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);

  // ============================================================
  // INTERSECTION OBSERVER — Reveal on scroll
  // ============================================================
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Optionally unobserve after reveal for performance
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px',
    }
  );

  revealElements.forEach(function (el) {
    revealObserver.observe(el);
  });

  // ============================================================
  // SMOOTH SCROLL for anchor links
  // ============================================================
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const offsetTop = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      }
    });
  });

  // ============================================================
  // BUDGET BAR ANIMATION
  // ============================================================
  const budgetVisual = document.getElementById('budget-visual');
  if (budgetVisual) {
    const budgetObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            // Animate the budget bar from 75% (current) to overflow
            const bar = budgetVisual.querySelector('.budget-bar__fill');
            if (bar) {
              setTimeout(function () {
                bar.style.width = '125%';
                bar.classList.remove('budget-bar__fill--ok');
                bar.classList.add('budget-bar__fill--over');
              }, 800);
            }
            budgetObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    budgetObserver.observe(budgetVisual);
  }

  // ============================================================
  // PIPELINE STEP-BY-STEP REVEAL
  // ============================================================
  const riskVisual = document.getElementById('risk-visual');
  if (riskVisual && !prefersReducedMotion) {
    const steps = riskVisual.querySelectorAll('.pipeline-step');
    const connectors = riskVisual.querySelectorAll('.pipeline-connector');

    // Initially hide steps
    steps.forEach(function (step, i) {
      step.style.opacity = '0';
      step.style.transform = 'translateY(16px)';
      step.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });
    connectors.forEach(function (c) {
      c.style.opacity = '0';
      c.style.transition = 'opacity 0.4s ease';
    });

    const riskObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            let delay = 200;
            steps.forEach(function (step, i) {
              setTimeout(function () {
                step.style.opacity = '1';
                step.style.transform = 'translateY(0)';
              }, delay);
              // Show connector after step
              if (connectors[i]) {
                setTimeout(function () {
                  connectors[i].style.opacity = '1';
                }, delay + 200);
              }
              delay += 350;
            });
            riskObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.25 }
    );
    riskObserver.observe(riskVisual);
  }

  // ============================================================
  // FLOW STEP LIGHT TRAVEL ANIMATION
  // ============================================================
  const flowSection = document.querySelector('.flow');
  if (flowSection && !prefersReducedMotion) {
    const flowSteps = flowSection.querySelectorAll('.flow-step__icon');
    const flowConnectors = flowSection.querySelectorAll('.flow-connector__line');

    const flowObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            let delay = 0;
            flowSteps.forEach(function (icon, i) {
              setTimeout(function () {
                icon.style.borderColor = 'rgba(201, 168, 76, 0.5)';
                icon.style.boxShadow = '0 0 30px rgba(201, 168, 76, 0.15)';
                setTimeout(function () {
                  icon.style.borderColor = '';
                  icon.style.boxShadow = '';
                }, 800);
              }, delay);
              delay += 500;
            });
            flowObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    flowObserver.observe(flowSection);
  }

  // ============================================================
  // SESSION CARD STAGGERED TYPING EFFECT
  // ============================================================
  // The reveal animation already handles staggered appearance.
  // We add a subtle glow when session cards become visible.
  const sessionCards = document.querySelectorAll('.session-card');
  if (!prefersReducedMotion) {
    sessionCards.forEach(function (card) {
      const cardObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              card.style.transition = 'box-shadow 1.5s ease';
              card.style.boxShadow = '0 0 40px rgba(201, 168, 76, 0.05)';
              setTimeout(function () {
                card.style.boxShadow = '';
              }, 2000);
              cardObserver.unobserve(card);
            }
          });
        },
        { threshold: 0.4 }
      );
      cardObserver.observe(card);
    });
  }

  // ============================================================
  // ARCHITECTURE NODE SEQUENTIAL HIGHLIGHT
  // ============================================================
  const archDiagram = document.querySelector('.arch-diagram');
  if (archDiagram && !prefersReducedMotion) {
    const archNodes = archDiagram.querySelectorAll('.arch-node');
    const archObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            let delay = 0;
            archNodes.forEach(function (node) {
              setTimeout(function () {
                node.style.transition = 'border-color 0.5s ease, box-shadow 0.5s ease';
                node.style.borderColor = 'rgba(201, 168, 76, 0.3)';
                node.style.boxShadow = '0 0 20px rgba(201, 168, 76, 0.08)';
                setTimeout(function () {
                  if (!node.classList.contains('arch-node--highlight')) {
                    node.style.borderColor = '';
                    node.style.boxShadow = '';
                  }
                }, 1200);
              }, delay);
              delay += 300;
            });
            archObserver.unobserve(archDiagram);
          }
        });
      },
      { threshold: 0.3 }
    );
    archObserver.observe(archDiagram);
  }

})();
