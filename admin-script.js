

// Səhifə yükləndikdə
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
    setupEventListeners();
    
    // Serverdən məlumatları al
    socket.emit('getAdminData');
    
    // Məlumatları dinlə
    socket.on('adminData', (data) => {
        allOrders = data.orders || [];
        allPizzas = data.pizzas || [];
        updateDashboard();
        renderOrders();
        renderMenu();
        updateCharts();
    });
    
    // Pizza yeniləmələrini dinlə
    socket.on('pizzasUpdated', (updatedPizzas) => {
        allPizzas = updatedPizzas;
        renderMenu();
        console.log('Admin: Pizza menyusu yeniləndi');
    });
    
    // Real-time yeniləmələr
    socket.on('orderUpdated', (data) => {
        allOrders = data.orders;
        updateDashboard();
        renderOrders();
        updateCharts();
        showNotification('Sifariş yeniləndi', 'success');
    });
    
    socket.on('newOrder', (data) => {
        allOrders = data.orders;
        updateDashboard();
        renderOrders();
        updateCharts();
        showNotification('Yeni sifariş', 'success');
    });
    
    // Xəta mesajlarını dinlə
    socket.on('error', (data) => {
        showNotification(data.message, 'error');
    });
});

// Admin paneli işə salmaq
function initializeAdminPanel() {
    // Dashboard-u göstər
    showSection('dashboard');
    
    // Statistikaları yenilə
    updateDashboard();
}

// Event listener-ləri qurmaq
function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const sectionId = this.getAttribute('data-section');
                showSection(sectionId);
                
                // Aktiv linki yenilə
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    // Çıxış butonu
    document.getElementById('logout-btn').addEventListener('click', function() {
        if (confirm('Admin panelindən çıxmaq istədiyinizə əminsiniz?')) {
            window.location.href = '/';
        }
    });
    
    // Filter kontrolları
    document.getElementById('status-filter').addEventListener('change', renderOrders);
    document.getElementById('date-filter').addEventListener('change', renderOrders);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    
    // Pizza əlavə et butonu
    document.getElementById('add-pizza-btn').addEventListener('click', function() {
        showPizzaModal();
    });
    
    // Modal bağlama
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // Pizza formu
    document.getElementById('pizza-form').addEventListener('submit', function(e) {
        e.preventDefault();
        savePizza();
    });
    
    // Pizza ləğv et butonu
    document.getElementById('cancel-pizza-btn').addEventListener('click', function() {
        document.getElementById('pizza-modal').style.display = 'none';
    });
}

// Section göstərmək
function showSection(sectionId) {
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
    pageTitle.textContent = document.querySelector(`[data-section="${sectionId}"]`).textContent;
}

// Dashboard-u yeniləmək
function updateDashboard() {
    const today = new Date().toDateString();
    const todayOrders = allOrders.filter(order => 
        new Date(order.timestamp).toDateString() === today
    );
    
    const pendingOrders = allOrders.filter(order => 
        ['pending', 'confirmed', 'preparing'].includes(order.status)
    );
    
    const completedOrders = allOrders.filter(order => 
        order.status === 'delivered'
    );
    
    const todayRevenue = todayOrders.reduce((total, order) => total + order.total, 0);
    
    // Statistikaları güncəllə
    document.getElementById('today-orders').textContent = todayOrders.length;
    document.getElementById('today-revenue').textContent = todayRevenue.toFixed(2) + ' AZN';
    document.getElementById('pending-orders').textContent = pendingOrders.length;
    document.getElementById('completed-orders').textContent = completedOrders.length;
    
    // Son sifarişləri göstər
    renderRecentOrders();
}

// Son sifarişləri göstərmək
function renderRecentOrders() {
    const recentOrdersList = document.getElementById('recent-orders-list');
    const recentOrders = allOrders.slice(-5).reverse();
    
    if (recentOrders.length === 0) {
        recentOrdersList.innerHTML = `
            <div class="empty-state">
                <h3>Heç bir sifariş yoxdur</h3>
                <p>Hələlik heç bir sifariş qəbul edilməyib</p>
            </div>
        `;
        return;
    }
    
    recentOrdersList.innerHTML = recentOrders.map(order => `
        <div class="order-item">
            <div class="order-info">
                <div class="order-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="order-status ${getStatusClass(order.status)}">${getStatusText(order.status)}</span>
                </div>
                <div class="order-details">
                    <strong>${order.customerName}</strong> - ${order.items.length} məhsul - ${order.total.toFixed(2)} AZN
                </div>
            </div>
            <div class="order-actions">
                <button class="btn btn-primary btn-small" onclick="viewOrderDetails('${order.id}')">Bax</button>
                <button class="btn btn-secondary btn-small" onclick="updateOrderStatus('${order.id}', '${getNextStatus(order.status)}')">
                    ${getNextStatusText(order.status)}
                </button>
            </div>
        </div>
    `).join('');
}

// Sifarişləri göstərmək
function renderOrders() {
    const ordersList = document.getElementById('orders-list');
    const statusFilter = document.getElementById('status-filter').value;
    const dateFilter = document.getElementById('date-filter').value;
    
    let filteredOrders = allOrders;
    
    // Status filteri
    if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }
    
    // Tarix filteri
    if (dateFilter) {
        filteredOrders = filteredOrders.filter(order => 
            new Date(order.timestamp).toISOString().split('T')[0] === dateFilter
        );
    }
    
    // Ən yeni sifarişlər üstdə
    filteredOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (filteredOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-state">
                <h3>Heç bir sifariş tapılmadı</h3>
                <p>Filter parametrlərini dəyişin və ya yeni sifariş gözləyin</p>
            </div>
        `;
        return;
    }
    
    ordersList.innerHTML = filteredOrders.map(order => `
        <div class="order-item">
            <div class="order-info">
                <div class="order-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="order-status ${getStatusClass(order.status)}">${getStatusText(order.status)}</span>
                    <span class="order-time">${formatDate(order.timestamp)}</span>
                </div>
                <div class="order-details">
                    <div><strong>Müştəri:</strong> ${order.customerName} | ${order.customerPhone}</div>
                    <div><strong>Ünvan:</strong> ${order.customerAddress}</div>
                    <div><strong>Ödəniş:</strong> ${getPaymentText(order.paymentMethod)}</div>
                    <div><strong>Məhsullar:</strong> ${order.items.map(item => `${item.name} (${item.quantity})`).join(', ')}</div>
                    <div><strong>Ümumi:</strong> ${order.total.toFixed(2)} AZN</div>
                    ${order.orderNotes ? `<div><strong>Qeydlər:</strong> ${order.orderNotes}</div>` : ''}
                </div>
            </div>
            <div class="order-actions">
                <button class="btn btn-primary btn-small" onclick="viewOrderDetails('${order.id}')">Detallı Bax</button>
                ${order.status !== 'delivered' ? `
                    <button class="btn btn-success btn-small" onclick="updateOrderStatus('${order.id}', '${getNextStatus(order.status)}')">
                        ${getNextStatusText(order.status)}
                    </button>
                ` : ''}
                ${order.status === 'pending' ? `
                    <button class="btn btn-danger btn-small" onclick="cancelOrder('${order.id}')">Ləğv Et</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Menyunu göstərmək
function renderMenu() {
    const menuGrid = document.getElementById('admin-menu-grid');
    
    if (allPizzas.length === 0) {
        menuGrid.innerHTML = `
            <div class="empty-state">
                <h3>Heç bir pizza yoxdur</h3>
                <p>İlk pizzanızı əlavə edin</p>
            </div>
        `;
        return;
    }
    
    menuGrid.innerHTML = allPizzas.map(pizza => `
        <div class="menu-item">
            <div class="menu-item-img" style="background-image: url('${pizza.image}')"></div>
            <div class="menu-item-info">
                <div class="menu-item-header">
                    <div class="menu-item-name">${pizza.name}</div>
                    <div class="menu-item-price">${pizza.price.toFixed(2)} AZN</div>
                </div>
                <div class="menu-item-description">${pizza.description}</div>
                <div class="menu-item-category">
                    <span class="category-badge">${getCategoryText(pizza.category)}</span>
                </div>
                <div class="menu-item-actions">
                    <button class="btn btn-primary btn-small" onclick="editPizza(${pizza.id})">Redaktə</button>
                    <button class="btn btn-danger btn-small" onclick="deletePizza(${pizza.id})">Sil</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Pizza modalını göstərmək
function showPizzaModal(pizza = null) {
    const modal = document.getElementById('pizza-modal');
    const form = document.getElementById('pizza-form');
    const title = document.getElementById('modal-title');
    
    currentEditingPizza = pizza;
    
    if (pizza) {
        title.textContent = 'Pizzanı Redaktə Et';
        document.getElementById('pizza-name').value = pizza.name;
        document.getElementById('pizza-price').value = pizza.price;
        document.getElementById('pizza-category').value = pizza.category;
        document.getElementById('pizza-image').value = pizza.image;
        document.getElementById('pizza-description').value = pizza.description;
        document.getElementById('pizza-ingredients').value = Array.isArray(pizza.ingredients) ? pizza.ingredients.join(', ') : pizza.ingredients;
    } else {
        title.textContent = 'Yeni Pizza Əlavə Et';
        form.reset();
    }
    
    modal.style.display = 'block';
}

// Pizza yadda saxlamaq
function savePizza() {
    const formData = {
        name: document.getElementById('pizza-name').value,
        price: document.getElementById('pizza-price').value,
        category: document.getElementById('pizza-category').value,
        image: document.getElementById('pizza-image').value,
        description: document.getElementById('pizza-description').value,
        ingredients: document.getElementById('pizza-ingredients').value
    };
    
    // Validation
    if (!formData.name || !formData.price || !formData.image || !formData.description || !formData.ingredients) {
        showNotification('Zəhmət olmasa bütün sahələri doldurun', 'error');
        return;
    }
    
    if (currentEditingPizza) {
        // Redaktə
        formData.id = currentEditingPizza.id;
        socket.emit('updatePizza', formData);
        showNotification('Pizza yenilənir...', 'success');
    } else {
        // Yeni pizza
        socket.emit('addPizza', formData);
        showNotification('Pizza əlavə edilir...', 'success');
    }
    
    document.getElementById('pizza-modal').style.display = 'none';
}

// Pizza redaktə etmək
function editPizza(pizzaId) {
    const pizza = allPizzas.find(p => p.id === pizzaId);
    if (pizza) {
        showPizzaModal(pizza);
    }
}

// Pizza silmək
function deletePizza(pizzaId) {
    if (confirm('Bu pizzanı silmək istədiyinizə əminsiniz? Bu əməliyyat geri alına bilməz!')) {
        socket.emit('deletePizza', pizzaId);
        showNotification('Pizza silinir...', 'success');
    }
}

// Sifariş statusunu yeniləmək
function updateOrderStatus(orderId, newStatus) {
    socket.emit('updateOrderStatus', { orderId, status: newStatus });
    showNotification('Sifariş statusu yenilənir...', 'success');
}

// Sifarişi ləğv etmək
function cancelOrder(orderId) {
    if (confirm('Bu sifarişi ləğv etmək istədiyinizə əminsiniz?')) {
        socket.emit('cancelOrder', orderId);
        showNotification('Sifariş ləğv edilir...', 'success');
    }
}

// Sifariş detallarını göstərmək
function viewOrderDetails(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const modal = document.getElementById('order-detail-modal');
    const content = document.getElementById('order-detail-content');
    
    content.innerHTML = `
        <div class="order-detail">
            <div class="detail-section">
                <h3>Sifariş Məlumatları</h3>
                <p><strong>Sifariş ID:</strong> #${order.id}</p>
                <p><strong>Status:</strong> <span class="order-status ${getStatusClass(order.status)}">${getStatusText(order.status)}</span></p>
                <p><strong>Tarix:</strong> ${formatDateTime(order.timestamp)}</p>
            </div>
            
            <div class="detail-section">
                <h3>Müştəri Məlumatları</h3>
                <p><strong>Ad:</strong> ${order.customerName}</p>
                <p><strong>Telefon:</strong> ${order.customerPhone}</p>
                <p><strong>Ünvan:</strong> ${order.customerAddress}</p>
                <p><strong>Ödəniş Metodu:</strong> ${getPaymentText(order.paymentMethod)}</p>
            </div>
            
            <div class="detail-section">
                <h3>Sifariş Edilənlər</h3>
                ${order.items.map(item => `
                    <div class="order-item-detail">
                        <span>${item.name}</span>
                        <span>${item.quantity} x ${item.price.toFixed(2)} AZN</span>
                        <span>${(item.price * item.quantity).toFixed(2)} AZN</span>
                    </div>
                `).join('')}
                <div class="order-total">
                    <strong>Ümumi: ${order.total.toFixed(2)} AZN</strong>
                </div>
            </div>
            
            ${order.orderNotes ? `
                <div class="detail-section">
                    <h3>Əlavə Qeydlər</h3>
                    <p>${order.orderNotes}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    modal.style.display = 'block';
}

// Filterləri sıfırlamaq
function resetFilters() {
    document.getElementById('status-filter').value = 'all';
    document.getElementById('date-filter').value = '';
    renderOrders();
}

// Chart-ları yeniləmək
function updateCharts() {
    // Burada chart.js ilə qrafiklər yaradılacaq
    console.log('Charts would be updated here');
}

// Yardımcı funksiyalar
function getStatusClass(status) {
    switch(status) {
        case 'pending': return 'status-pending';
        case 'confirmed': return 'status-confirmed';
        case 'preparing': return 'status-preparing';
        case 'ready': return 'status-ready';
        case 'delivered': return 'status-delivered';
        default: return 'status-pending';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'pending': return 'Gözləyir';
        case 'confirmed': return 'Təsdiqləndi';
        case 'preparing': return 'Hazırlanır';
        case 'ready': return 'Hazırdır';
        case 'delivered': return 'Çatdırılıb';
        default: return status;
    }
}

function getCategoryText(category) {
    switch(category) {
        case 'classic': return 'Klassik';
        case 'special': return 'Xüsusi';
        case 'vegetarian': return 'Vegetarian';
        case 'spicy': return 'Ədvalı';
        case 'premium': return 'Premium';
        default: return category;
    }
}

function getNextStatus(currentStatus) {
    switch(currentStatus) {
        case 'pending': return 'confirmed';
        case 'confirmed': return 'preparing';
        case 'preparing': return 'ready';
        case 'ready': return 'delivered';
        default: return currentStatus;
    }
}

function getNextStatusText(currentStatus) {
    switch(currentStatus) {
        case 'pending': return 'Təsdiqlə';
        case 'confirmed': return 'Hazırla';
        case 'preparing': return 'Hazırdır';
        case 'ready': return 'Çatdır';
        default: return 'Tamamla';
    }
}

function getPaymentText(paymentMethod) {
    switch(paymentMethod) {
        case 'card': return 'Kartla ödəniş';
        case 'cash': return 'Qapıda nağd ödəniş';
        case 'online': return 'Onlayn ödəniş';
        default: return paymentMethod;
    }
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('az-AZ');
}

function formatDateTime(timestamp) {
    return new Date(timestamp).toLocaleString('az-AZ');
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Socket.io əlaqəsi
const socket = io();

// Global dəyişənlər
let allOrders = [];
let allPizzas = [];
let currentEditingPizza = null;
const ADMIN_CODE = "admin22"; // Admin kodu

// DOM elementləri
const loginScreen = document.getElementById('login-screen');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const adminCodeInput = document.getElementById('admin-code');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const logoutSidebar = document.getElementById('logout-sidebar');

const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');
const pageTitle = document.getElementById('page-title');

// Səhifə yükləndikdə
document.addEventListener('DOMContentLoaded', function() {
    initializeLogin();
    setupEventListeners();
    
    // Əgər artıq login olunubsa, admin paneli göstər
    if (localStorage.getItem('adminLoggedIn') === 'true') {
        showAdminPanel();
    }
});

// Login sistemini işə salmaq
function initializeLogin() {
    loginScreen.classList.remove('hidden');
    adminPanel.classList.add('hidden');
}

// Event listener-ləri qurmaq
function setupEventListeners() {
    // Login formu
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin();
    });
    
    // Admin kod input'una keypress event
    adminCodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    });
    
    // Çıxış butonları
    logoutBtn.addEventListener('click', handleLogout);
    logoutSidebar.addEventListener('click', handleLogout);
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const sectionId = this.getAttribute('data-section');
                showSection(sectionId);
                
                // Aktiv linki yenilə
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    // Filter kontrolları
    document.getElementById('status-filter').addEventListener('change', renderOrders);
    document.getElementById('date-filter').addEventListener('change', renderOrders);
    document.getElementById('reset-filters').addEventListener('click', resetFilters);
    
    // Pizza əlavə et butonu
    document.getElementById('add-pizza-btn').addEventListener('click', function() {
        showPizzaModal();
    });
    
    // Modal bağlama
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        });
    });
    
    // Pizza formu
    document.getElementById('pizza-form').addEventListener('submit', function(e) {
        e.preventDefault();
        savePizza();
    });
    
    // Pizza ləğv et butonu
    document.getElementById('cancel-pizza-btn').addEventListener('click', function() {
        document.getElementById('pizza-modal').style.display = 'none';
    });
}

// Login funksiyası
function handleLogin() {
    const enteredCode = adminCodeInput.value.trim();
    
    if (enteredCode === ADMIN_CODE) {
        // Uğurlu login
        localStorage.setItem('adminLoggedIn', 'true');
        showAdminPanel();
        showNotification('Admin panelinə uğurla daxil oldunuz!', 'success');
    } else {
        // Yanlış kod
        loginError.textContent = 'Yanlış admin kodu! Zəhmət olmasa yenidən cəhd edin.';
        loginError.classList.add('show');
        adminCodeInput.style.borderColor = 'var(--primary-color)';
        
        // Input-u təmizlə və fokus et
        setTimeout(() => {
            adminCodeInput.value = '';
            adminCodeInput.focus();
        }, 1000);
    }
}

// Logout funksiyası
function handleLogout(e) {
    e.preventDefault();
    
    if (confirm('Admin panelindən çıxmaq istədiyinizə əminsiniz?')) {
        localStorage.removeItem('adminLoggedIn');
        loginScreen.classList.remove('hidden');
        adminPanel.classList.add('hidden');
        adminCodeInput.value = '';
        loginError.classList.remove('show');
        showNotification('Admin panelindən çıxış edildi', 'success');
    }
}

// Admin panelini göstərmək
function showAdminPanel() {
    loginScreen.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    
    // Admin panelini işə sal
    initializeAdminPanel();
    
    // Serverdən məlumatları al
    socket.emit('getAdminData');
    
    // Məlumatları dinlə
    socket.on('adminData', (data) => {
        allOrders = data.orders || [];
        allPizzas = data.pizzas || [];
        updateDashboard();
        renderOrders();
        renderMenu();
        updateCharts();
    });
    
    // Pizza yeniləmələrini dinlə
    socket.on('pizzasUpdated', (updatedPizzas) => {
        allPizzas = updatedPizzas;
        renderMenu();
        console.log('Admin: Pizza menyusu yeniləndi');
    });
    
    // Real-time yeniləmələr
    socket.on('orderUpdated', (data) => {
        allOrders = data.orders;
        updateDashboard();
        renderOrders();
        updateCharts();
        showNotification('Sifariş yeniləndi', 'success');
    });
    
    socket.on('newOrder', (data) => {
        allOrders = data.orders;
        updateDashboard();
        renderOrders();
        updateCharts();
        showNotification('Yeni sifariş', 'success');
    });
    
    // Xəta mesajlarını dinlə
    socket.on('error', (data) => {
        showNotification(data.message, 'error');
    });
}

// Admin paneli işə salmaq
function initializeAdminPanel() {
    // Dashboard-u göstər
    showSection('dashboard');
    
    // Statistikaları yenilə
    updateDashboard();
}

// Qalan funksiyalar eyni qalır (showSection, updateDashboard, renderOrders, renderMenu, vs.)

// Section göstərmək
function showSection(sectionId) {
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
    pageTitle.textContent = document.querySelector(`[data-section="${sectionId}"]`).textContent;
}

// Dashboard-u yeniləmək
function updateDashboard() {
    const today = new Date().toDateString();
    const todayOrders = allOrders.filter(order => 
        new Date(order.timestamp).toDateString() === today
    );
    
    const pendingOrders = allOrders.filter(order => 
        ['pending', 'confirmed', 'preparing'].includes(order.status)
    );
    
    const completedOrders = allOrders.filter(order => 
        order.status === 'delivered'
    );
    
    const todayRevenue = todayOrders.reduce((total, order) => total + order.total, 0);
    
    // Statistikaları güncəllə
    document.getElementById('today-orders').textContent = todayOrders.length;
    document.getElementById('today-revenue').textContent = todayRevenue.toFixed(2) + ' AZN';
    document.getElementById('pending-orders').textContent = pendingOrders.length;
    document.getElementById('completed-orders').textContent = completedOrders.length;
    
    // Son sifarişləri göstər
    renderRecentOrders();
}

// Son sifarişləri göstərmək
function renderRecentOrders() {
    const recentOrdersList = document.getElementById('recent-orders-list');
    const recentOrders = allOrders.slice(-5).reverse();
    
    if (recentOrders.length === 0) {
        recentOrdersList.innerHTML = `
            <div class="empty-state">
                <h3>Heç bir sifariş yoxdur</h3>
                <p>Hələlik heç bir sifariş qəbul edilməyib</p>
            </div>
        `;
        return;
    }
    
    recentOrdersList.innerHTML = recentOrders.map(order => `
        <div class="order-item">
            <div class="order-info">
                <div class="order-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="order-status ${getStatusClass(order.status)}">${getStatusText(order.status)}</span>
                </div>
                <div class="order-details">
                    <strong>${order.customerName}</strong> - ${order.items.length} məhsul - ${order.total.toFixed(2)} AZN
                </div>
            </div>
            <div class="order-actions">
                <button class="btn btn-primary btn-small" onclick="viewOrderDetails('${order.id}')">Bax</button>
                <button class="btn btn-secondary btn-small" onclick="updateOrderStatus('${order.id}', '${getNextStatus(order.status)}')">
                    ${getNextStatusText(order.status)}
                </button>
            </div>
        </div>
    `).join('');
}

// Sifarişləri göstərmək
function renderOrders() {
    const ordersList = document.getElementById('orders-list');
    const statusFilter = document.getElementById('status-filter').value;
    const dateFilter = document.getElementById('date-filter').value;
    
    let filteredOrders = allOrders;
    
    // Status filteri
    if (statusFilter !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
    }
    
    // Tarix filteri
    if (dateFilter) {
        filteredOrders = filteredOrders.filter(order => 
            new Date(order.timestamp).toISOString().split('T')[0] === dateFilter
        );
    }
    
    // Ən yeni sifarişlər üstdə
    filteredOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    if (filteredOrders.length === 0) {
        ordersList.innerHTML = `
            <div class="empty-state">
                <h3>Heç bir sifariş tapılmadı</h3>
                <p>Filter parametrlərini dəyişin və ya yeni sifariş gözləyin</p>
            </div>
        `;
        return;
    }
    
    ordersList.innerHTML = filteredOrders.map(order => `
        <div class="order-item">
            <div class="order-info">
                <div class="order-header">
                    <span class="order-id">#${order.id}</span>
                    <span class="order-status ${getStatusClass(order.status)}">${getStatusText(order.status)}</span>
                    <span class="order-time">${formatDate(order.timestamp)}</span>
                </div>
                <div class="order-details">
                    <div><strong>Müştəri:</strong> ${order.customerName} | ${order.customerPhone}</div>
                    <div><strong>Ünvan:</strong> ${order.customerAddress}</div>
                    <div><strong>Ödəniş:</strong> ${getPaymentText(order.paymentMethod)}</div>
                    <div><strong>Məhsullar:</strong> ${order.items.map(item => `${item.name} (${item.quantity})`).join(', ')}</div>
                    <div><strong>Ümumi:</strong> ${order.total.toFixed(2)} AZN</div>
                    ${order.orderNotes ? `<div><strong>Qeydlər:</strong> ${order.orderNotes}</div>` : ''}
                </div>
            </div>
            <div class="order-actions">
                <button class="btn btn-primary btn-small" onclick="viewOrderDetails('${order.id}')">Detallı Bax</button>
                ${order.status !== 'delivered' ? `
                    <button class="btn btn-success btn-small" onclick="updateOrderStatus('${order.id}', '${getNextStatus(order.status)}')">
                        ${getNextStatusText(order.status)}
                    </button>
                ` : ''}
                ${order.status === 'pending' ? `
                    <button class="btn btn-danger btn-small" onclick="cancelOrder('${order.id}')">Ləğv Et</button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Qalan funksiyalar eyni qalır (renderMenu, showPizzaModal, savePizza, editPizza, deletePizza, vs.)

// Bildiriş göstərmək
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Yardımcı funksiyalar (getStatusClass, getStatusText, formatDate, vs.) eyni qalır