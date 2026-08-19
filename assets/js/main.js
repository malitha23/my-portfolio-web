// =============================================
// 5. PORTFOLIO + REVIEW + LOG SYSTEM
// =============================================
(function portfolioAndLog() {
    const REVIEWS_KEY = 'project_reviews';
    let projects = [];
    let logFileHandle = null;

    // ----- LOG SYSTEM (File-based) -----
    async function writeLogFile(type, message, projectName = '', email = '') {
        // --- Try Google Apps Script (serverless) ---
        try {


            const formData = new URLSearchParams();
            formData.append('type', type);
            formData.append('message', message);
            formData.append('projectName', projectName || '');
            formData.append('email', email || '');
            formData.append('url', window.location.href);
            formData.append('userAgent', navigator.userAgent);
            formData.append('referrer', document.referrer || 'Direct');
            formData.append('screen', `${window.screen.width}x${window.screen.height}`);
            formData.append('language', navigator.language);
            formData.append('timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
            formData.append('timestamp', new Date().toISOString());

            const response = await fetch('https://script.google.com/macros/s/AKfycbx60Szn7dFtkMClEStIKi_TZjkwp5gsWldWlnMMQBEqsAHSYpKizAyLrmFYFNltpaoA/exec', {
                method: 'POST',
                mode: 'no-cors',   // prevents CORS errors – request still goes through
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData.toString()

            });


            if (response.ok) {
                const result = await response.json();
                console.log(`${type} log sent to Google Apps Script`, result);
                return; // success – stop here
            } else {
                console.warn('Apps Script responded with error, falling back...');
            }
        } catch (error) {
            console.warn('Apps Script logging failed, falling back to localStorage', error);
        }


    }


    // ----- Render logs (from localStorage fallback) -----
    function renderLogs() {
        const list = document.getElementById('logList');
        if (!list) return;

        const LOG_KEY = 'portfolio_logs';
        let logs = [];
        try {
            logs = JSON.parse(localStorage.getItem(LOG_KEY)) || [];
        } catch { logs = []; }

        if (!logs.length) {
            list.innerHTML =
                `<div class="log-entry" style="justify-content:center;color:var(--text-muted);padding:12px 0;">No activity yet.</div>`;
            return;
        }

        list.innerHTML = logs.map(log => {
            let iconClass = 'visit',
                iconSymbol = 'fa-eye';
            if (log.type === 'review') {
                iconClass = 'review';
                iconSymbol = 'fa-star';
            }
            if (log.type === 'contact') {
                iconClass = 'contact';
                iconSymbol = 'fa-envelope';
            }
            let detail = log.message;
            if (log.projectName) detail = `${log.message} (${log.projectName})`;
            return `<div class="log-entry">
                        <span class="log-icon ${iconClass}"><i class="fas ${iconSymbol}"></i></span>
                        <span>${detail}</span>
                        <span class="log-time">${log.timestamp}</span>
                    </div>`;
        }).join('');
    }

    // ----- Add log entry (unified) -----
    function addLogEntry(type, message, projectName = '', email = '') {
        // Try file-based logging first
        writeLogFile(type, message, projectName, email);

        // Also store in localStorage for display
        // const LOG_KEY = 'portfolio_logs';
        // try {
        //     const logs = JSON.parse(localStorage.getItem(LOG_KEY)) || [];
        //     const timestamp = new Date().toLocaleString();
        //     logs.unshift({ type, message, projectName, timestamp });
        //     if (logs.length > 50) logs.pop();
        //     localStorage.setItem(LOG_KEY, JSON.stringify(logs));
        //     renderLogs();
        // } catch (e) {
        //     console.warn('Could not save log to localStorage:', e);
        // }
    }

    // ----- FETCH PROJECTS FROM JSON -----
    async function fetchProjects() {
        const loader = document.getElementById('pageLoader');
        if (loader) loader.classList.remove('hidden');
        try {
            const response = await fetch('assets/data/projects.json');
            if (!response.ok) throw new Error('Failed to load projects');
            projects = await response.json();
            renderProjects('all');
            setupFilterButtons();
            setupReviewModal();
            renderLogs();
            setupContactForm();
        } catch (error) {
            console.error('Error loading projects:', error);
            document.getElementById('portfolioGrid').innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);">
                    <i class="fas fa-exclamation-triangle" style="font-size:40px;color:var(--secondary);"></i>
                    <p>Failed to load projects. Please try again later.</p>
                </div>
            `;
        }finally{
               if (loader) loader.classList.add('hidden');
        }
    }

    // ----- RENDER PORTFOLIO (UPDATED WITH ALL FIELDS) -----
    const grid = document.getElementById('portfolioGrid');

    function renderProjects(filter = 'all') {
        const filtered = filter === 'all' ? projects : projects.filter(p => p.category === filter);
        if (!filtered.length) {
            grid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-secondary);">
                    <i class="fas fa-folder-open" style="font-size:40px;color:var(--text-muted);"></i>
                    <p>No projects found in this category.</p>
                </div>
            `;
            return;
        }
        grid.innerHTML = filtered.map((p, index) => `
            <div class="portfolio-item" data-id="${p.id}" data-category="${p.category}" style="animation-delay: ${index * 0.05}s;">
                <div class="thumb">
                    <img src="${p.image}" alt="${p.title}" loading="lazy" />
                    <div class="overlay"><i class="fas fa-plus"></i></div>
                </div>
                <div class="info">
                    <span class="tag">${p.tag}</span>
                    <h5>${p.title}</h5>
                    <p>${p.desc}</p>
                    
                    <!-- Technologies -->
                    ${p.technologies && p.technologies.length > 0 ? `
                        <div style="font-size:12px;color:var(--text-muted);margin:6px 0;line-height:1.6;">
                            ${p.technologies.slice(0, 4).join(' · ')}
                            ${p.technologies.length > 4 ? ` · +${p.technologies.length - 4} more` : ''}
                        </div>
                    ` : ''}
                    
                    <!-- Links -->
                    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
                        ${p.github_frontend ? `<a href="${p.github_frontend}" target="_blank" class="btn-link"><i class="fab fa-github"></i> Frontend</a>` : ''}
                        ${p.github_backend ? `<a href="${p.github_backend}" target="_blank" class="btn-link"><i class="fab fa-github"></i> Backend</a>` : ''}
                        ${p.live_demo ? `<a href="${p.live_demo}" target="_blank" class="btn-link live"><i class="fas fa-external-link-alt"></i> Live Demo</a>` : ''}
                        ${p.link && !p.github_frontend && !p.github_backend ? `<a href="${p.link}" target="_blank" class="btn-link"><i class="fab fa-github"></i> View Project</a>` : ''}
                    </div>
                    
                    <button class="review-btn" data-id="${p.id}" data-title="${p.title}" style="margin-top:10px;">
                        <i class="fas fa-star"></i> Review
                    </button>
                </div>
            </div>
        `).join('');

        // Click on thumb -> open main link
        grid.querySelectorAll('.portfolio-item .thumb').forEach((thumb, idx) => {
            const item = thumb.closest('.portfolio-item');
            const data = filtered[idx];
            if (data && data.link) {
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.review-btn') || e.target.closest('.btn-link')) return;
                    window.open(data.link, '_blank');
                });
            }
        });

        // Review buttons
        grid.querySelectorAll('.review-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.dataset.id);
                const title = btn.dataset.title;
                openReviewModal(id, title);
            });
        });
    }

    // ----- FILTER BUTTONS WITH ANIMATION -----
    function setupFilterButtons() {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Add filtering class for animation
                grid.classList.add('filtering');

                const filter = btn.dataset.filter;
                const items = grid.querySelectorAll('.portfolio-item');

                items.forEach((item, index) => {
                    const category = item.dataset.category || 'all';
                    if (filter === 'all' || category === filter) {
                        item.style.display = 'block';
                        item.style.animation = 'none';
                        // Force reflow
                        void item.offsetHeight;
                        item.style.animation = `portfolioItem 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards`;
                        item.style.animationDelay = `${index * 0.05}s`;
                    } else {
                        item.style.display = 'none';
                    }
                });

                // Remove filtering class after animation
                setTimeout(() => {
                    grid.classList.remove('filtering');
                }, 600);
            });
        });
    }

    // ----- REVIEW MODAL -----
    let currentProjectId = null;
    let selectedRating = 0;
    let modal, modalProjectName, starContainer, reviewComment, submitReviewBtn, closeModalBtn;

    function setupReviewModal() {
        modal = document.getElementById('reviewModal');
        modalProjectName = document.getElementById('modalProjectName');
        starContainer = document.getElementById('starContainer');
        reviewComment = document.getElementById('reviewComment');
        submitReviewBtn = document.getElementById('submitReview');
        closeModalBtn = document.getElementById('closeModal');

        starContainer.querySelectorAll('i').forEach(star => {
            star.addEventListener('click', () => {
                const val = parseInt(star.dataset.value);
                selectedRating = val;
                starContainer.querySelectorAll('i').forEach(s => {
                    s.classList.toggle('active', parseInt(s.dataset.value) <= val);
                });
            });
            star.addEventListener('mouseenter', () => {
                const val = parseInt(star.dataset.value);
                starContainer.querySelectorAll('i').forEach(s => {
                    s.classList.toggle('active', parseInt(s.dataset.value) <= val);
                });
            });
            star.addEventListener('mouseleave', () => {
                starContainer.querySelectorAll('i').forEach(s => {
                    s.classList.toggle('active', parseInt(s.dataset.value) <= selectedRating);
                });
            });
        });

        closeModalBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

        submitReviewBtn.addEventListener('click', () => {
            if (selectedRating === 0) { alert('Please select a star rating.'); return; }
            const comment = reviewComment.value.trim() || 'No comment.';
            const project = projects.find(p => p.id === currentProjectId);
            const projectName = project ? project.title : 'Unknown project';

            const reviews = JSON.parse(localStorage.getItem(REVIEWS_KEY) || '[]');
            reviews.push({
                projectId: currentProjectId, projectName, rating: selectedRating, comment,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));

            addLogEntry('review', `Reviewed "${projectName}" with ${selectedRating}★`, projectName);
            alert('Thank you for your review!');
            closeModal();
        });
    }

    function openReviewModal(id, title) {
        currentProjectId = id;
        modalProjectName.textContent = title;
        selectedRating = 0;
        reviewComment.value = '';
        starContainer.querySelectorAll('i').forEach(s => s.classList.remove('active'));
        modal.classList.add('active');
    }

    function closeModal() { if (modal) modal.classList.remove('active'); }

    // ----- CONTACT FORM -----
    function setupContactForm() {
        const contactForm = document.getElementById('contactForm');
        const contactStatus = document.getElementById('contactStatus');
        const submitBtn = document.getElementById('contactSubmit');

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('contactName').value.trim();
            const email = document.getElementById('contactEmail').value.trim();
            const message = document.getElementById('contactMessage').value.trim();

            if (!name || !email || !message) {
                contactStatus.textContent = 'Please fill all fields.';
                contactStatus.style.color = 'var(--secondary)';
                return;
            }

            // ==============================
            // SHOW LOADER
            // ==============================
            submitBtn.disabled = true;

            const originalText = submitBtn.innerHTML;

            submitBtn.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            Sending...
        `;

            contactStatus.textContent = '';

            try {
                // Small delay for loader visibility
                await new Promise(resolve => setTimeout(resolve, 800));

                // ==============================
                // ADD LOG
                // ==============================
                addLogEntry(
                    'contact',
                    `Message from ${name} (${email}): ${message}`
                );

                // ==============================
                // SAVE MESSAGE
                // ==============================
                const messages = JSON.parse(
                    localStorage.getItem('contact_messages') || '[]'
                );

                messages.push({
                    name,
                    email,
                    message,
                    timestamp: new Date().toISOString()
                });

                localStorage.setItem(
                    'contact_messages',
                    JSON.stringify(messages)
                );

                // ==============================
                // SUCCESS
                // ==============================
                contactStatus.textContent =
                    'Message sent successfully!';

                contactStatus.style.color = '#22C55E';

                contactForm.reset();

            } catch (error) {

                console.error('Contact form error:', error);

                contactStatus.textContent =
                    'Something went wrong. Please try again.';

                contactStatus.style.color =
                    'var(--secondary)';

            } finally {

                // ==============================
                // HIDE LOADER
                // ==============================
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // ----- ADD CSS FOR LINK BUTTONS -----
    function addLinkStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .btn-link {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 12px;
                border-radius: 100px;
                font-size: 11px;
                font-weight: 500;
                color: var(--text-secondary);
                background: rgba(255,255,255,0.04);
                border: 1px solid var(--border-color);
                transition: var(--transition);
                text-decoration: none;
            }
            .btn-link:hover {
                color: var(--text-primary);
                border-color: var(--primary-light);
                background: rgba(124,58,237,0.08);
            }
            .btn-link.live {
                color: #22C55E;
                border-color: rgba(34,197,94,0.2);
            }
            .btn-link.live:hover {
                border-color: #22C55E;
                background: rgba(34,197,94,0.08);
            }
        `;
        document.head.appendChild(style);
    }

    // ----- INIT -----
    // Visit log (once per session)
    if (!sessionStorage.getItem('visit_logged_final')) {
        setTimeout(() => {
            addLogEntry('visit', 'Visited portfolio');
            sessionStorage.setItem('visit_logged_final', 'true');
        }, 500);
    }

    addLinkStyles();
    fetchProjects();
})();

// =============================================
// TYPING ANIMATION
// =============================================
(function typingAnimation() {
    const typingText = document.getElementById('typingText');
    if (!typingText) return;

    const roles = [
        'Mobile Developer',
        'Web Developer',
        'Software Engineer',
        'Full Stack Developer',
        'Flutter Developer',
        'React Native Developer'
    ];

    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let isPaused = false;

    function typeEffect() {
        const currentRole = roles[roleIndex];

        if (!isDeleting && !isPaused) {
            typingText.textContent = currentRole.substring(0, charIndex + 1);
            charIndex++;

            if (charIndex === currentRole.length) {
                isPaused = true;
                setTimeout(() => {
                    isPaused = false;
                    isDeleting = true;
                    setTimeout(typeEffect, 100);
                }, 2000);
                return;
            }

            setTimeout(typeEffect, 80 + Math.random() * 40);
        } else if (isDeleting && !isPaused) {
            typingText.textContent = currentRole.substring(0, charIndex - 1);
            charIndex--;

            if (charIndex === 0) {
                isDeleting = false;
                roleIndex = (roleIndex + 1) % roles.length;
                setTimeout(typeEffect, 300);
                return;
            }

            setTimeout(typeEffect, 40 + Math.random() * 30);
        }
    }

    setTimeout(typeEffect, 1000);
})();

// =============================================
// SKILLS PROGRESS BARS ANIMATION
// =============================================
(function animateSkillBars() {
    const skillItems = document.querySelectorAll('.skill-item');

    if (!skillItems.length) return;

    function animateBar(item) {
        const fill = item.querySelector('.fill');
        if (!fill) return;

        const width = parseInt(item.dataset.width) || 0;
        fill.style.width = '0%';

        requestAnimationFrame(() => {
            fill.style.transition = 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)';
            fill.style.width = width + '%';
        });
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const item = entry.target;
                if (!item.classList.contains('animated')) {
                    animateBar(item);
                    item.classList.add('animated');
                }
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px'
    });

    skillItems.forEach(item => {
        observer.observe(item);

        const rect = item.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
            setTimeout(() => {
                if (!item.classList.contains('animated')) {
                    animateBar(item);
                    item.classList.add('animated');
                }
            }, 300);
        }
    });

    let scrollTimeout;
    window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            skillItems.forEach(item => {
                if (!item.classList.contains('animated')) {
                    const rect = item.getBoundingClientRect();
                    if (rect.top < window.innerHeight - 100) {
                        animateBar(item);
                        item.classList.add('animated');
                    }
                }
            });
        }, 100);
    });

    console.log('✅ Skill bars animation initialized');
})();

// =============================================
// ABOUT SECTION SCROLL ANIMATION
// =============================================
(function aboutAnimation() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const delay = parseInt(element.dataset.delay) || 0;

                setTimeout(() => {
                    element.classList.add('visible');
                }, delay);
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    animatedElements.forEach(el => {
        observer.observe(el);
    });

    setTimeout(() => {
        animatedElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight - 100) {
                const delay = parseInt(el.dataset.delay) || 0;
                setTimeout(() => {
                    el.classList.add('visible');
                }, delay);
            }
        });
    }, 300);

    console.log('✅ About section animations initialized');
})();

// =============================================
// SERVICES SECTION SCROLL ANIMATION
// =============================================
(function servicesAnimation() {
    const serviceCards = document.querySelectorAll('.service-card');

    if (!serviceCards.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                card.classList.add('visible');
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    serviceCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(40px)';
        card.style.transition = `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.08}s`;
        observer.observe(card);
    });

    // Check for cards already in view
    setTimeout(() => {
        serviceCards.forEach(card => {
            const rect = card.getBoundingClientRect();
            if (rect.top < window.innerHeight - 100) {
                card.classList.add('visible');
            }
        });
    }, 300);

    console.log('✅ Services section animations initialized');
})();

// =============================================
// PORTFOLIO ITEM ANIMATION KEYFRAMES
// =============================================
(function addPortfolioKeyframes() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes portfolioItem {
            from {
                opacity: 0;
                transform: translateY(40px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }
        
        .portfolio-item {
            opacity: 0;
            animation: portfolioItem 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        
        .service-card.visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);
})();

// =============================================
// MOBILE HAMBURGER MENU TOGGLE
// =============================================
(function mobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('navLinks');

    if (!hamburger || !navLinks) {
        console.warn('Mobile menu elements not found.');
        return;
    }

    // Toggle menu on hamburger click
    hamburger.addEventListener('click', function (e) {
        e.stopPropagation();
        navLinks.classList.toggle('open');   // CSS uses class "open"
        hamburger.classList.toggle('active'); // for the animated bars
    });

    // Close menu when a link is clicked
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
            hamburger.classList.remove('active');
        });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function (e) {
        if (!navLinks.contains(e.target) && !hamburger.contains(e.target)) {
            navLinks.classList.remove('open');
            hamburger.classList.remove('active');
        }
    });

    console.log('✅ Mobile menu initialized');
})();