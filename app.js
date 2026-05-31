/**
 * D1K — Single-Page Portfolio
 * app.js — Accessibility-compliant edition
 *
 * A11Y fixes applied:
 * #2  Keyboard navigation — all interactive elements operable via keyboard
 * #3  Focus management — Project and Konami dialogs trap focus and return it on close
 * #5  Semantic roles — modal dialog and filter button states managed
 * #6  ARIA state — filter aria-pressed toggled
 * #7  Live region — filter result count announced to screen readers
 * #9  Reduced motion — canvas animation skipped if prefers-reduced-motion
 * #10 Link purpose — all "View Project" links have unique aria-labels in HTML
 */

'use strict';

/* ============================================================
   1. PARTICLE NETWORK BACKGROUND
   Respects prefers-reduced-motion — skips entirely if set.
============================================================ */
(function bg() {
  // A11Y #9 — skip animation if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const NODE_COUNT   = 65;
  const CONNECT_DIST = 175;
  const SPEED        = 0.36;

  let W, H, nodes = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function make() {
    nodes = Array.from({ length: NODE_COUNT }, () => ({
      x:  Math.random() * W,
      y:  Math.random() * H,
      vx: (Math.random() - .5) * SPEED,
      vy: (Math.random() - .5) * SPEED,
      r:  .7 + Math.random() * 1.8,
      ph: Math.random() * Math.PI * 2,
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);

    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy; n.ph += .016;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < CONNECT_DIST) {
          const a = (1 - d / CONNECT_DIST) * .16;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(161,0,255,${a})`;
          ctx.lineWidth = .6;
          ctx.stroke();
        }
      }
    }

    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(161,0,255,${.3 + .25 * Math.sin(n.ph)})`;
      ctx.fill();
    });

    requestAnimationFrame(frame);
  }

  resize(); make(); frame();

  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => { resize(); make(); }, 200);
  });
})();


/* ============================================================
   2. SKILL READINESS DIALS
   Animated circular meters for service readiness.
============================================================ */
(function readinessDials() {
  const dials = document.querySelectorAll('.svc-dial[data-value]');
  if (!dials.length) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setDial(dial, percent) {
    const progress = dial.querySelector('.dial-progress');
    const valueEl = dial.querySelector('.dial-value');
    if (!progress || !valueEl) return;

    const radius = parseFloat(progress.getAttribute('r')) || 46;
    const circumference = 2 * Math.PI * radius;
    progress.style.strokeDasharray = String(circumference);
    progress.style.strokeDashoffset = String(circumference - (percent / 100) * circumference);
    valueEl.textContent = `${Math.round(percent)}%`;
  }

  function animateDial(dial) {
    if (dial.dataset.animated === 'true') return;
    dial.dataset.animated = 'true';

    const target = Math.max(0, Math.min(100, Number(dial.dataset.value) || 0));

    if (reducedMotion) {
      setDial(dial, target);
      return;
    }

    const duration = 1200;
    const start = performance.now();

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDial(dial, target * eased);
      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateDial(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.35 });

  dials.forEach(dial => {
    setDial(dial, 0);
    observer.observe(dial);
  });
})();


/* ============================================================
   3. PROJECT MODAL
   Cards open an accessible modal instead of expanding inline.
   A11Y: keyboard support, Escape close, focus trap, focus restore.
============================================================ */
const cards = document.querySelectorAll('.card');

const projectModal       = document.getElementById('project-modal');
const projectModalPanel  = projectModal ? projectModal.querySelector('.project-modal-panel') : null;
const projectModalTitle  = document.getElementById('project-modal-title');
const projectModalImg    = document.getElementById('project-modal-img');
const projectModalTags   = document.getElementById('project-modal-tags');
const projectModalDesc   = document.getElementById('project-modal-desc');
const projectModalLaunch = document.getElementById('project-modal-launch');
let lastProjectFocus = null;

cards.forEach(card => {
  card.addEventListener('click', e => {
    // Keep normal behavior for any real links/buttons that may be added later.
    if (e.target.closest('a, button')) return;
    openProjectModal(card);
  });

  // A11Y #2 — keyboard operability
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openProjectModal(card);
    }
  });
});

function openProjectModal(card) {
  if (!projectModal || !projectModalPanel) return;

  lastProjectFocus = document.activeElement;

  const title = card.querySelector('h3')?.textContent.trim() || 'Project';
  const thumb = card.querySelector('.project-thumb');
  const tags  = card.querySelector('.card-tags');
  const detail = card.querySelector('.card-detail');
  const projectLink = detail?.querySelector('.card-link');
  const actionLabel = card.dataset.action || 'Launch Project';

  projectModalTitle.textContent = title;

  if (thumb && projectModalImg) {
    projectModalImg.src = thumb.getAttribute('src');
    projectModalImg.alt = `${title} project preview`;
  }

  if (projectModalTags) {
    projectModalTags.innerHTML = '';
    if (tags) projectModalTags.appendChild(tags.cloneNode(true));
  }

  if (projectModalDesc) {
    projectModalDesc.innerHTML = '';
    const summary = detail?.querySelector('p')?.cloneNode(true);
    const cols = detail?.querySelector('.detail-cols')?.cloneNode(true);
    if (summary) projectModalDesc.appendChild(summary);
    if (cols) projectModalDesc.appendChild(cols);
  }

  if (projectModalLaunch && projectLink) {
    projectModalLaunch.href = projectLink.href;
    projectModalLaunch.textContent = `${actionLabel} ›`;
    projectModalLaunch.setAttribute('aria-label', `${actionLabel}: ${title} (opens in new tab)`);
  }

  projectModal.hidden = false;
  document.body.classList.add('modal-open');
  projectModalPanel.focus();
}

function closeProjectModal(restoreFocus = true) {
  if (!projectModal || projectModal.hidden) return;

  projectModal.hidden = true;
  document.body.classList.remove('modal-open');

  if (restoreFocus && lastProjectFocus && typeof lastProjectFocus.focus === 'function') {
    lastProjectFocus.focus();
  }
}

if (projectModal && projectModalPanel) {
  projectModal.addEventListener('click', e => {
    if (e.target.matches('[data-modal-close]')) closeProjectModal();
  });

  projectModalPanel.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;

    const focusable = projectModalPanel.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    if (document.activeElement === projectModalPanel) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !projectModal.hidden) {
      closeProjectModal();
    }
  });
}


/* ============================================================
   4. PROJECT FILTER
   A11Y: aria-pressed toggled on each button (not just class)
   A11Y: live region announces how many results are shown
============================================================ */
const filterBtns   = document.querySelectorAll('.filter');
const filterStatus = document.getElementById('filter-status');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => applyFilter(btn.dataset.filter, btn));
});

function applyFilter(filter, activeBtn) {
  // Update button states
  filterBtns.forEach(b => {
    const active = b === activeBtn;
    b.classList.toggle('active', active);
    // A11Y #6 — aria-pressed
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  let visibleCount = 0;

  cards.forEach(card => {
    const show = filter === 'all' || card.dataset.cat === filter;
    card.classList.toggle('hidden', !show);
    if (!show) {
      closeProjectModal(false);
    } else {
      visibleCount++;
    }
  });

  // A11Y #7 — announce result count to screen readers via live region
  if (filterStatus) {
    const label = activeBtn ? activeBtn.textContent : filter;
    filterStatus.textContent =
      filter === 'all'
        ? `Showing all ${visibleCount} projects.`
        : `Showing ${visibleCount} project${visibleCount !== 1 ? 's' : ''} in ${label}.`;
  }
}


/* ============================================================
   5. NAV SCROLL SPY
   Highlights nav link for current visible section.
   A11Y: uses aria-current="page" (not just colour change)
============================================================ */
(function scrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-links a');
  if (!sections.length || !links.length) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        links.forEach(l => {
          const active = l.getAttribute('href') === `#${id}`;
          // A11Y — use aria-current instead of just colour
          l.setAttribute('aria-current', active ? 'page' : 'false');
          l.style.color = active ? 'var(--purple)' : '';
        });
      }
    });
  }, { rootMargin: '-35% 0px -60% 0px' });

  sections.forEach(s => obs.observe(s));
})();


/* ============================================================
   6. KONAMI CODE  ↑↑↓↓←→←→BA
   A11Y: dialog has role, aria-modal, focus trap, focus restore
============================================================ */
(function konami() {
  const SEQ = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
               'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let buf = [];

  document.addEventListener('keydown', e => {
    buf.push(e.key);
    if (buf.length > SEQ.length) buf.shift();
    if (buf.every((k, i) => k === SEQ[i])) { fire(); buf = []; }
  });

  function fire() {
    // Remember what had focus before dialog opened
    const prevFocus = document.activeElement;

    const ov = document.createElement('div');
    // A11Y #6 — proper dialog role and modal flag
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-labelledby', 'konami-title');
    ov.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background:rgba(7,9,15,.94);
      display:flex;align-items:center;justify-content:center;
    `;

    ov.innerHTML = `
      <div style="
        font-family:'DM Mono','Courier New',monospace;
        text-align:center;max-width:460px;padding:2.5rem;
        border:1px solid rgba(161,0,255,.4);border-radius:8px;
        background:#0d1120;
      ">
        <div style="font-size:.6rem;letter-spacing:.18em;color:rgba(161,0,255,.55);margin-bottom:1.25rem"
             aria-hidden="true">
          // LEVEL 5 CLEARANCE GRANTED
        </div>
        <h2 id="konami-title"
            style="font-family:'Rajdhani',sans-serif;font-size:2.5rem;font-weight:700;
                   color:#f0f0f4;margin-bottom:1.25rem">
          YOU FOUND IT.
        </h2>
        <p style="font-size:.72rem;line-height:2.1;color:rgba(200,204,224,.65);margin-bottom:1rem">
          DESTERY HILDENBRAND<br>
          XR ARCHITECT · AI CONSULTANT · INSTRUCTIONAL DESIGNER<br>
          KIRKWOOD FACULTY · SPEAKER · FOUNDER D1K LLC
        </p>
        <p style="font-size:.72rem;color:#10b981;margin-bottom:2rem">
          "The needs analysis comes before the headset. Always."
        </p>
        <button id="konami-close" style="
          background:transparent;
          border:1px solid rgba(161,0,255,.4);border-radius:4px;
          color:rgba(161,0,255,.8);
          font-family:'DM Mono','Courier New',monospace;
          font-size:.65rem;letter-spacing:.1em;
          padding:.45rem 1.1rem;cursor:pointer;
        ">[ CLOSE TRANSMISSION ]</button>
      </div>
    `;

    document.body.appendChild(ov);

    // A11Y #3 — move focus into the dialog immediately
    const closeBtn = document.getElementById('konami-close');
    closeBtn.focus();

    // A11Y — focus trap: keep Tab inside the dialog
    ov.addEventListener('keydown', trapFocus);

    function trapFocus(e) {
      if (e.key !== 'Tab') return;
      // Only one focusable element in this dialog, so just prevent leaving
      e.preventDefault();
      closeBtn.focus();
    }

    function close() {
      ov.removeEventListener('keydown', trapFocus);
      ov.remove();
      // A11Y #3 — restore focus to where it was before dialog opened
      if (prevFocus) prevFocus.focus();
    }

    closeBtn.addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
  }
})();
