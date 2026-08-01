// ========== CHARGEMENT DES COMPOSANTS (si nécessaire) ==========
async function loadComponents() {
    try {
        const headerContainer = document.getElementById('header-container');
        const footerContainer = document.getElementById('footer-container');
        
        // Vérification si le contenu est déjà présent (statique)
        const isHeaderStatic = headerContainer && headerContainer.children.length > 0;
        const isFooterStatic = footerContainer && footerContainer.children.length > 0;

        if (!isHeaderStatic && headerContainer) {
            try {
                const headerUrl = new URL('./components/header.html', window.location.href).href + '?v=' + Date.now();
                const headerRes = await fetch(headerUrl);
                if (headerRes.ok) {
                    const headerHtml = await headerRes.text();
                    insertHTMLSafe(headerContainer, headerHtml);
                } else {
                    console.warn('Header non trouvé, utilisation du HTML statique existant.');
                }
            } catch (e) {
                console.warn('Erreur chargement header:', e);
            }
        }

        if (!isFooterStatic && footerContainer) {
            try {
                const footerUrl = new URL('./components/footer.html', window.location.href).href + '?v=' + Date.now();
                const footerRes = await fetch(footerUrl);
                if (footerRes.ok) {
                    const footerHtml = await footerRes.text();
                    insertHTMLSafe(footerContainer, footerHtml);
                } else {
                    console.warn('Footer non trouvé, utilisation du HTML statique existant.');
                }
            } catch (e) {
                console.warn('Erreur chargement footer:', e);
            }
        }

        initMobileMenu();
        initMegaMenu();
        setActiveLink();
        initIframeLinks();
    } catch (error) {
        console.error('Erreur critique chargement des composants:', error);
    }
}

// ========== UTILITAIRES GÉNÉRAUX ==========
function escapeHTML(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
}

function insertHTMLSafe(container, html) {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        while (container.firstChild) container.removeChild(container.firstChild);
        Array.from(doc.body.childNodes).forEach(node => {
            container.appendChild(document.importNode(node, true));
        });
    } catch (err) {
        container.textContent = html;
        console.error('insertHTMLSafe failed:', err);
    }
}

function setButtonLoading(btn, text) {
    if (!btn) return;
    while (btn.firstChild) btn.removeChild(btn.firstChild);
    const spinner = document.createElement('span'); 
    spinner.className = 'loading';
    btn.appendChild(spinner);
    btn.appendChild(document.createTextNode(' ' + text));
}

function setButtonText(btn, icon, text) {
    if (!btn) return;
    while (btn.firstChild) btn.removeChild(btn.firstChild);
    if (icon) {
        const span = document.createElement('span'); 
        span.textContent = icon; 
        btn.appendChild(span);
        btn.appendChild(document.createTextNode(' '));
    }
    btn.appendChild(document.createTextNode(text));
}

function createToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'assertive');
        container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = 'error', duration = 4500) {
    const container = createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));

    const hide = () => {
        toast.classList.remove('visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };

    setTimeout(hide, duration);
}

// ========== MENU MOBILE ==========
function initMobileMenu() {
    const btn = document.getElementById('mobileMenuBtn');
    const menu = document.getElementById('navMenu');
    if (btn && menu) {
        btn.addEventListener('click', () => {
            menu.classList.toggle('show');
            btn.setAttribute('aria-expanded', menu.classList.contains('show'));
        });
    }
}

// ========== MÉGA-MENU ==========
function initMegaMenu() {
    const dropdowns = document.querySelectorAll('.nav-item-dropdown');

    dropdowns.forEach(dropdown => {
        const trigger = dropdown.querySelector('.dropdown-trigger');

        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('is-open') || dropdown.classList.contains('active');

                dropdowns.forEach(other => {
                    if (other !== dropdown) {
                        other.classList.remove('active', 'is-open');
                        other.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
                    }
                });

                if (!isOpen) {
                    dropdown.classList.add('active', 'is-open');
                    trigger.setAttribute('aria-expanded', 'true');
                    dropdown.querySelector('.mega-menu-item')?.focus();
                } else {
                    dropdown.classList.remove('active', 'is-open');
                    trigger.setAttribute('aria-expanded', 'false');
                }
            });
        }

        const menuItems = dropdown.querySelectorAll('.mega-menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                dropdown.classList.remove('active', 'is-open');
                dropdown.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
            });
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-item-dropdown')) {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('active', 'is-open');
                dropdown.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
            });
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('active', 'is-open');
                dropdown.querySelector('.dropdown-trigger')?.setAttribute('aria-expanded', 'false');
            });
        }
    });
}

// ========== IFRAME-LINKS ==========
function initIframeLinks() {
    document.querySelectorAll('[data-open-iframe]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.href;
            openIframeModal(href);
        });
    });
}

function openIframeModal(url) {
    if (document.querySelector('.iframe-modal')) return;

    const modal = document.createElement('div');
    modal.className = 'iframe-modal';

    const wrap = document.createElement('div');
    wrap.className = 'iframe-wrap';

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('aria-label', 'Outil WebM');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'iframe-close';
    closeBtn.innerText = '✕';

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', onKeyDown);

    wrap.appendChild(closeBtn);
    wrap.appendChild(iframe);
    modal.appendChild(wrap);
    document.body.appendChild(modal);

    function closeModal() {
        document.removeEventListener('keydown', onKeyDown);
        modal.remove();
    }

    function onKeyDown(e) {
        if (e.key === 'Escape') closeModal();
    }
}

// ========== LIEN ACTIF ==========
function setActiveLink() {
    const path = window.location.pathname;
    const routes = [
        { slug: '/accueil', page: 'home' },
        { slug: '/compression', page: 'compression' },
        { slug: '/webp', page: 'webp' },
        { slug: '/avif', page: 'avif' },
        { slug: '/webm', page: 'webm' },
        { slug: '/alt-checker', page: 'alt-checker' },
        { slug: '/faq', page: 'faq' },
        { slug: '/contact', page: 'contact' }
    ];

    const currentPage = routes.find(route => 
        path === route.slug || path.startsWith(route.slug + '/') || path.endsWith(route.slug + '.html')
    )?.page || 'home';

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === currentPage);
    });
}

// ========== DÉTECTION DE PAGE ==========
function detectPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    
    const pageMap = {
        'index.html': 'home',
        'accueil.html': 'home',
        'compression.html': 'compression',
        'webp.html': 'webp',
        'avif.html': 'avif',
        'webm-converter.html': 'webm',
        'alt-checker.html': 'alt-checker',
        'faq.html': 'faq',
        'contact.html': 'contact'
    };
    
    return pageMap[filename] || 'home';
}

// ========== INITIALISATION PAR PAGE ==========
function initPage() {
    const page = detectPage();
    console.log(`Page détectée : ${page}`);
    
    // Initialiser la page compression
    if (page === 'compression') {
        if (typeof window.initCompressionPage === 'function') {
            window.initCompressionPage();
        }
    }
    
    // Initialiser la page WebM Converter
    if (page === 'webm') {
        if (typeof window.initWebmConverterPage === 'function') {
            window.initWebmConverterPage();
        }
    }
    
    // Initialiser la page WebP Converter
    if (page === 'webp') {
        if (typeof window.initWebpPage === 'function') {
            window.initWebpPage();
        }
    }

    // Initialiser la page AVIF Converter
    if (page === 'avif') {
        if (typeof window.initAvifPage === 'function') {
            window.initAvifPage();
        }
    }
}

// ========== DÉMARRAGE ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Chargé, démarrage...');
    await loadComponents();
    initPage();
});