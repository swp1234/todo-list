/**
 * Todo List App - Main Application Logic
 * Features: CRUD, priorities, categories, due dates, dark mode, statistics, drag-drop
 */

class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.currentPriorityFilter = '';
        this.currentCategoryFilter = '';
        this.searchQuery = '';
        this.currentEditId = null;
        this.touchStartX = 0;
        this.draggedItem = null;

        this.init();
    }

    /**
     * Initialize app
     */
    async init() {
        // Wait for i18n
        if (window.i18n && !i18n.initialized) {
            await new Promise(resolve => {
                const check = setInterval(() => {
                    if (i18n.initialized) { clearInterval(check); resolve(); }
                }, 50);
                setTimeout(() => { clearInterval(check); resolve(); }, 1000);
            });
        }

        this.loadTodos();
        this.setupEventListeners();
        this.setupTheme();
        this.registerServiceWorker();
        this.loadAds();
        this.renderTodos();
        this.updateProgress();
        this.updateStats();

        // Hide app loader
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.classList.add('hidden');
            setTimeout(() => loader.remove(), 300);
        }

        // First visit: highlight input and pulse add button
        this.enhanceFirstVisitUX();

        // Track engagement for GA4 bounce rate improvement
        this.engagementTracked = false;
    }

    /**
     * Enhance UX for first-time visitors to reduce bounce
     */
    enhanceFirstVisitUX() {
        const input = document.getElementById('input-todo');
        const addBtn = document.getElementById('btn-add');

        // Auto-focus input field
        setTimeout(() => {
            if (input) {
                input.focus();
                input.classList.add('highlight');
                // Remove highlight after animation
                setTimeout(() => input.classList.remove('highlight'), 6000);
            }
            // Add pulse to add button
            if (addBtn) addBtn.classList.add('pulse');
        }, 500);

        // Remove pulse on first interaction
        const removePulse = () => {
            if (addBtn) addBtn.classList.remove('pulse');
            this.trackEngagement('first_interaction');
            document.removeEventListener('click', removePulse);
            document.removeEventListener('keydown', removePulse);
        };
        document.addEventListener('click', removePulse, { once: true });
        document.addEventListener('keydown', removePulse, { once: true });
    }

    /**
     * Track GA4 engagement event (reduces bounce rate)
     */
    trackEngagement(label) {
        if (this.engagementTracked) return;
        this.engagementTracked = true;
        if (typeof gtag === 'function') {
            gtag('event', 'engagement', {
                event_category: 'todo_list',
                event_label: label
            });
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Add todo
        document.getElementById('btn-add').addEventListener('click', () => this.addTodo());
        document.getElementById('input-todo').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });

        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.getAttribute('data-filter');
                this.renderTodos();
            });
        });

        // Priority and category filters
        document.getElementById('select-priority').addEventListener('change', (e) => {
            this.currentPriorityFilter = e.target.value;
            this.renderTodos();
        });

        document.getElementById('select-category').addEventListener('change', (e) => {
            this.currentCategoryFilter = e.target.value;
            this.renderTodos();
        });

        // Search
        document.getElementById('search-input').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.renderTodos();
        });

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Modal close buttons
        document.getElementById('modal-close').addEventListener('click', () => this.closeEditModal());
        document.getElementById('modal-cancel').addEventListener('click', () => this.closeEditModal());
        document.getElementById('modal-save').addEventListener('click', () => this.saveEdit());

        document.getElementById('modal-premium-close').addEventListener('click', () => this.closePremiumModal());

        // Premium button
        document.getElementById('btn-premium').addEventListener('click', () => this.showPremiumAnalysis());

        // Close modals on background click
        document.getElementById('modal-edit').addEventListener('click', (e) => {
            if (e.target.id === 'modal-edit') this.closeEditModal();
        });

        document.getElementById('modal-premium').addEventListener('click', (e) => {
            if (e.target.id === 'modal-premium') this.closePremiumModal();
        });

        // Language change event
        window.addEventListener('languageChanged', () => {
            this.renderTodos();
            this.updateStats();
            this.updateProgress();
        });
    }

    /**
     * Setup theme (dark/light mode)
     */
    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        this.applyTheme(savedTheme);
    }

    /**
     * Apply theme
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const body = document.body;
        if (theme === 'light') {
            body.classList.add('light-mode');
        } else {
            body.classList.remove('light-mode');
        }
        localStorage.setItem('theme', theme);
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = theme === 'light' ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>' : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
        }
    }

    /**
     * Toggle between dark and light mode
     */
    toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
    }

    /**
     * Register service worker for PWA
     */
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => {
                console.log('ServiceWorker registration failed:', err);
            });
        }
    }

    /**
     * Load ads
     */
    loadAds() {
        if (typeof window.adsbygoogle !== 'undefined') {
            window.adsbygoogle = window.adsbygoogle || [];
            window.adsbygoogle.push({
                google_ad_client: 'ca-pub-3600813755953882',
                enable_page_level_ads: true
            });
        }
    }

    /**
     * Load todos from localStorage
     */
    loadTodos() {
        const saved = localStorage.getItem('todos');
        if (saved) {
            this.todos = JSON.parse(saved);
        } else {
            // First visit: add sample todos to show app value immediately
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            this.todos = [
                {
                    id: Date.now(),
                    title: '✅ Tap to complete a task',
                    completed: false,
                    priority: 'high',
                    category: 'personal',
                    dueDate: now.toISOString().split('T')[0],
                    notes: '',
                    createdAt: now.toISOString()
                },
                {
                    id: Date.now() + 1,
                    title: '📝 Try adding your own task above',
                    completed: false,
                    priority: 'medium',
                    category: 'learning',
                    dueDate: tomorrow.toISOString().split('T')[0],
                    notes: '',
                    createdAt: now.toISOString()
                },
                {
                    id: Date.now() + 2,
                    title: '🎯 Set priorities and categories',
                    completed: false,
                    priority: 'low',
                    category: 'work',
                    dueDate: '',
                    notes: '',
                    createdAt: now.toISOString()
                }
            ];
            this.saveTodos();
        }
    }

    /**
     * Save todos to localStorage
     */
    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    /**
     * Add new todo
     */
    addTodo() {
        const input = document.getElementById('input-todo');
        const title = input.value.trim();

        if (!title) return;

        const todo = {
            id: Date.now(),
            title,
            completed: false,
            priority: 'medium',
            category: 'personal',
            dueDate: '',
            notes: '',
            createdAt: new Date().toISOString(),
            completedAt: null
        };

        this.todos.push(todo);
        this.saveTodos();
        input.value = '';
        this.renderTodos();
        this.updateProgress();
        this.updateStats();
        if(typeof gtag!=='undefined') gtag('event','add_todo');
        this.trackEngagement('add_todo');
    }

    /**
     * Toggle todo completion
     */
    toggleTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (todo) {
            todo.completed = !todo.completed;
            todo.completedAt = todo.completed ? new Date().toISOString() : null;
            this.saveTodos();
            this.renderTodos();
            this.updateProgress();
            this.updateStats();

            if (todo.completed) {
                this.playConfetti();
                if(typeof gtag!=='undefined') gtag('event','complete_todo');
                this.trackEngagement('complete_todo');
            }
        }
    }

    /**
     * Open edit modal
     */
    openEditModal(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;

        this.currentEditId = id;
        document.getElementById('edit-title').value = todo.title;
        document.getElementById('edit-priority').value = todo.priority;
        document.getElementById('edit-category').value = todo.category;
        document.getElementById('edit-duedate').value = todo.dueDate;
        document.getElementById('edit-notes').value = todo.notes;

        document.getElementById('modal-edit').classList.remove('hidden');
    }

    /**
     * Close edit modal
     */
    closeEditModal() {
        document.getElementById('modal-edit').classList.add('hidden');
        this.currentEditId = null;
    }

    /**
     * Save edited todo
     */
    saveEdit() {
        const todo = this.todos.find(t => t.id === this.currentEditId);
        if (!todo) return;

        todo.title = document.getElementById('edit-title').value.trim();
        todo.priority = document.getElementById('edit-priority').value;
        todo.category = document.getElementById('edit-category').value;
        todo.dueDate = document.getElementById('edit-duedate').value;
        todo.notes = document.getElementById('edit-notes').value;

        this.saveTodos();
        this.closeEditModal();
        this.renderTodos();
        this.updateProgress();
        this.updateStats();
    }

    /**
     * Delete todo
     */
    deleteTodo(id) {
        if (confirm(i18n.t('confirm.delete'))) {
            this.todos = this.todos.filter(t => t.id !== id);
            this.saveTodos();
            this.renderTodos();
            this.updateProgress();
            this.updateStats();
        }
    }

    /**
     * Filter todos based on current filters
     */
    getFilteredTodos() {
        let filtered = this.todos;

        // Filter by status
        if (this.currentFilter === 'active') {
            filtered = filtered.filter(t => !t.completed);
        } else if (this.currentFilter === 'completed') {
            filtered = filtered.filter(t => t.completed);
        } else if (this.currentFilter === 'today') {
            const today = new Date().toISOString().split('T')[0];
            filtered = filtered.filter(t => {
                const dueDate = t.dueDate || '';
                const createdDate = t.createdAt.split('T')[0];
                return dueDate === today || createdDate === today;
            });
        } else if (this.currentFilter === 'week') {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filtered = filtered.filter(t => {
                const createdDate = new Date(t.createdAt);
                return createdDate >= weekAgo;
            });
        }

        // Filter by priority
        if (this.currentPriorityFilter) {
            filtered = filtered.filter(t => t.priority === this.currentPriorityFilter);
        }

        // Filter by category
        if (this.currentCategoryFilter) {
            filtered = filtered.filter(t => t.category === this.currentCategoryFilter);
        }

        // Filter by search
        if (this.searchQuery) {
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(this.searchQuery) ||
                t.notes.toLowerCase().includes(this.searchQuery)
            );
        }

        return filtered;
    }

    /**
     * Get priority badge emoji
     */
    getPriorityBadge(priority) {
        const badges = {
            high: '🔴',
            medium: '🟡',
            low: '🟢'
        };
        return badges[priority] || '';
    }

    /**
     * Get category badge emoji
     */
    getCategoryBadge(category) {
        const badges = {
            work: '💼',
            personal: '🎯',
            health: '💪',
            learning: '📚'
        };
        return badges[category] || '';
    }

    /**
     * Get priority label
     */
    getPriorityLabel(priority) {
        const labels = {
            high: i18n.t('priority.high'),
            medium: i18n.t('priority.medium'),
            low: i18n.t('priority.low')
        };
        return labels[priority] || priority;
    }

    /**
     * Get category label
     */
    getCategoryLabel(category) {
        const labels = {
            work: i18n.t('category.work'),
            personal: i18n.t('category.personal'),
            health: i18n.t('category.health'),
            learning: i18n.t('category.learning')
        };
        return labels[category] || category;
    }

    /**
     * Check if due date is overdue
     */
    isOverdue(dueDate) {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    }

    /**
     * Render todo list
     */
    renderTodos() {
        const todoList = document.getElementById('todo-list');
        const emptyState = document.getElementById('empty-state');
        const filtered = this.getFilteredTodos();

        todoList.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        filtered.forEach(todo => {
            const li = document.createElement('li');
            li.className = 'todo-item';
            if (todo.completed) li.classList.add('completed');
            li.draggable = true;
            li.dataset.id = todo.id;

            const priorityBadge = this.getPriorityBadge(todo.priority);
            const categoryBadge = this.getCategoryBadge(todo.category);
            const isOverdue = this.isOverdue(todo.dueDate) && !todo.completed;

            let dueDateHtml = '';
            if (todo.dueDate) {
                dueDateHtml = `
                    <span class="due-date ${isOverdue ? 'overdue' : ''}">
                        📅 ${i18n.formatDate(todo.dueDate)}
                    </span>
                `;
            }

            li.innerHTML = `
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                <div class="todo-content">
                    <div class="todo-header">
                        <span class="todo-text">${this.escapeHtml(todo.title)}</span>
                        <span class="priority-badge ${todo.priority}">${priorityBadge} ${this.getPriorityLabel(todo.priority)}</span>
                        <span class="category-badge">${categoryBadge} ${this.getCategoryLabel(todo.category)}</span>
                    </div>
                    <div class="todo-meta">
                        ${dueDateHtml}
                        ${todo.notes ? `<div style="margin-top: 4px; color: rgba(232,232,240,0.6);">📝 ${this.escapeHtml(todo.notes)}</div>` : ''}
                    </div>
                </div>
                <div class="todo-actions">
                    <button class="btn-edit" title="Edit">✎</button>
                    <button class="btn-delete" title="Delete">✕</button>
                </div>
            `;

            // Event listeners
            li.querySelector('.todo-checkbox').addEventListener('change', () => this.toggleTodo(todo.id));
            li.querySelector('.btn-edit').addEventListener('click', () => this.openEditModal(todo.id));
            li.querySelector('.btn-delete').addEventListener('click', () => this.deleteTodo(todo.id));

            // Drag and drop
            li.addEventListener('dragstart', (e) => this.handleDragStart(e, todo.id));
            li.addEventListener('dragend', (e) => this.handleDragEnd(e));
            li.addEventListener('dragover', (e) => this.handleDragOver(e));
            li.addEventListener('drop', (e) => this.handleDrop(e, todo.id));

            todoList.appendChild(li);
        });
    }

    /**
     * Drag and drop handlers
     */
    handleDragStart(e, id) {
        this.draggedItem = id;
        e.currentTarget.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    handleDragEnd(e) {
        e.currentTarget.classList.remove('dragging');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDrop(e, targetId) {
        e.preventDefault();
        if (!this.draggedItem || this.draggedItem === targetId) return;

        const draggedIndex = this.todos.findIndex(t => t.id === this.draggedItem);
        const targetIndex = this.todos.findIndex(t => t.id === targetId);

        if (draggedIndex > -1 && targetIndex > -1) {
            [this.todos[draggedIndex], this.todos[targetIndex]] = [this.todos[targetIndex], this.todos[draggedIndex]];
            this.saveTodos();
            this.renderTodos();
        }

        this.draggedItem = null;
    }

    /**
     * Update progress bar
     */
    updateProgress() {
        const today = new Date().toISOString().split('T')[0];
        const todayTodos = this.todos.filter(t => {
            const dueDate = t.dueDate || t.createdAt.split('T')[0];
            return dueDate === today;
        });

        const completed = todayTodos.filter(t => t.completed).length;
        const total = todayTodos.length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('completed-count').textContent = completed;
        document.getElementById('total-count').textContent = total;
        document.getElementById('progress-percent').textContent = `${percent}%`;
        document.getElementById('progress-fill').style.width = `${percent}%`;
    }

    /**
     * Update statistics
     */
    updateStats() {
        const statTotal = this.todos.length;
        const statCompleted = this.todos.filter(t => t.completed).length;
        const statCompletionRate = statTotal > 0 ? Math.round((statCompleted / statTotal) * 100) : 0;

        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const thisWeekTodos = this.todos.filter(t => new Date(t.createdAt) >= weekAgo);

        document.getElementById('stat-total').textContent = statTotal;
        document.getElementById('stat-this-week').textContent = thisWeekTodos.length;
        document.getElementById('stat-completion').textContent = `${statCompletionRate}%`;

        // Update weekly chart
        this.updateWeeklyChart();
    }

    /**
     * Update weekly chart
     */
    updateWeeklyChart() {
        const chartBars = document.querySelectorAll('.chart-bar');
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const counts = new Array(7).fill(0);

        const today = new Date();
        const dayOfWeek = today.getDay();

        // Calculate start of week (Monday)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

        // Count todos by day
        this.todos.forEach(todo => {
            const todoDate = new Date(todo.createdAt);
            const diffTime = todoDate - startOfWeek;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays >= 0 && diffDays < 7) {
                counts[diffDays]++;
            }
        });

        const maxCount = Math.max(...counts, 1);

        chartBars.forEach((bar, index) => {
            const barElement = bar.querySelector('.bar');
            const height = (counts[index] / maxCount) * 100;
            barElement.style.height = `${height}%`;
        });
    }

    /**
     * Show premium analysis modal
     */
    showPremiumAnalysis() {
        document.getElementById('modal-premium').classList.remove('hidden');
        const content = document.getElementById('premium-content');
        content.innerHTML = '<div class="loading"><div class="spinner"></div><p>' + i18n.t('analysis.analyzing') + '</p></div>';

        // Simulate ad watching and analysis
        setTimeout(() => {
            this.generatePremiumAnalysis();
        }, 2000);
    }

    /**
     * Generate premium analysis
     */
    generatePremiumAnalysis() {
        const content = document.getElementById('premium-content');

        const totalTodos = this.todos.length;
        const completedTodos = this.todos.filter(t => t.completed).length;
        const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

        const highPriority = this.todos.filter(t => t.priority === 'high').length;
        const workTodos = this.todos.filter(t => t.category === 'work').length;
        const learningTodos = this.todos.filter(t => t.category === 'learning').length;

        // Estimate productivity level
        let productivityLevel = i18n.t('analysis.productivityLevelGood');
        if (completionRate >= 80) productivityLevel = i18n.t('analysis.productivityLevelExcellent');
        if (completionRate <= 40) productivityLevel = i18n.t('analysis.productivityLevelNeedsImprovement');

        // Build completion summary
        const completionSummary = i18n.t('analysis.completionSummary')
            .replace('{{total}}', totalTodos)
            .replace('{{completed}}', completedTodos);

        const completionRate_text = i18n.t('analysis.completionRate')
            .replace('{{rate}}', completionRate)
            .replace('{{level}}', productivityLevel);

        const highPriorityText = i18n.t('analysis.highPriorityCount')
            .replace('{{count}}', highPriority);

        const highPriorityAdvice = i18n.t('analysis.highPriorityAdvice');

        const categoryText = i18n.t('analysis.workTodos') + ': ' + workTodos + ', ' +
                           i18n.t('analysis.learningTodos') + ': ' + learningTodos + '. ' +
                           i18n.t('analysis.categoryBalance');

        const html = `
            <div class="analysis-result">
                <div class="analysis-item">
                    <h4>📊 ${i18n.t('analysis.overview')}</h4>
                    <p>${completionSummary}
                    ${completionRate_text}</p>
                </div>

                <div class="analysis-item">
                    <h4>🎯 ${i18n.t('analysis.priorities')}</h4>
                    <p>${highPriorityText}
                    ${highPriorityAdvice}</p>
                </div>

                <div class="analysis-item">
                    <h4>💼 ${i18n.t('analysis.categories')}</h4>
                    <p>${categoryText}</p>
                </div>

                <div class="analysis-item">
                    <h4>💡 ${i18n.t('analysis.tips')}</h4>
                    <ul style="margin-top: 8px; margin-left: 20px;">
                        <li>${i18n.t('analysis.tip1')}</li>
                        <li>${i18n.t('analysis.tip2')}</li>
                        <li>${i18n.t('analysis.tip3')}</li>
                        <li>${i18n.t('analysis.tip4')}</li>
                    </ul>
                </div>
            </div>
        `;

        content.innerHTML = html;
    }

    /**
     * Close premium modal
     */
    closePremiumModal() {
        document.getElementById('modal-premium').classList.add('hidden');
    }

    /**
     * Play confetti animation
     */
    playConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const confetti = [];
        for (let i = 0; i < 50; i++) {
            confetti.push({
                x: Math.random() * canvas.width,
                y: -10,
                size: Math.random() * 5 + 3,
                speedX: Math.random() * 4 - 2,
                speedY: Math.random() * 7 + 4,
                color: ['#2980b9', '#3498db', '#e74c3c', '#f39c12', '#27ae60'][Math.floor(Math.random() * 5)],
                opacity: 1
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < confetti.length; i++) {
                const p = confetti[i];
                p.x += p.speedX;
                p.y += p.speedY;
                p.opacity -= 0.015;

                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.opacity;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            }

            confetti = confetti.filter(p => p.opacity > 0);

            if (confetti.length > 0) {
                requestAnimationFrame(animate);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        };

        animate();
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new TodoApp();
    });
} else {
    const app = new TodoApp();
}
