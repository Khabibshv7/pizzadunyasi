// Socket.io əlaqəsi
const socket = io();

// Global dəyişənlər
let cart = [];
let currentFilter = 'all';
let currentPizzaDetail = null;
let currentQuantity = 1;
let pizzas = []; // Serverdən alınacaq

// DOM elementləri
const pizzaMenu = document.getElementById('pizza-menu');
const cartItems = document.getElementById('cart-items');
const totalPriceElement = document.getElementById('total-price');
const orderBtn = document.getElementById('order-btn');
const filterButtons = document.querySelectorAll('.filter-btn');
const pizzaModal = document.getElementById('pizza-modal');
const modalBody = document.getElementById('modal-body');
const closeModalButtons = document.querySelectorAll('.close');
const orderModal = document.getElementById('order-modal');
const orderForm = document.getElementById('order-form');
const activeOrders = document.getElementById('active-orders');

// Səhifə yükləndikdə
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    
    // Serverdən pizza məlumatlarını al
    socket.emit('getPizzas');
    
    // Pizza məlumatlarını dinlə
    socket.on('pizzasUpdated', (updatedPizzas) => {
        pizzas = updatedPizzas;
        renderPizzaMenu();
        console.log('Pizza menyusu yeniləndi');
    });
    
    // Serverdən aktiv sifarişləri dinlə
    socket.on('activeOrders', (orders) => {
        renderActiveOrders(orders);
    });
    
    // Yeni sifariş əlavə olunduqda
    socket.on('newOrder', (order) => {
        renderActiveOrders(order.activeOrders);
        showNotification(`Yeni sifariş: ${order.orderId}`);
    });
    
    // Sifariş statusu dəyişdikdə
    socket.on('orderStatusUpdate', (data) => {
        renderActiveOrders(data.activeOrders);
        showNotification(`Sifariş #${data.orderId} statusu: ${getStatusText(data.status)}`);
    });
    
    // Sifariş ləğv olunduqda
    socket.on('orderCancelled', (data) => {
        renderActiveOrders(data.activeOrders);
        showNotification(`Sifariş #${data.orderId} ləğv edildi`);
    });
});

// Event listener-ləri qurmaq
function setupEventListeners() {
    // Filter butonları
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.getAttribute('data-filter');
            renderPizzaMenu();
        });
    });
    
    // Modal bağlama
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function() {
            pizzaModal.style.display = 'none';
            orderModal.style.display = 'none';
        });
    });
    
    // Modal xaricində klikləmə
    window.addEventListener('click', function(event) {
        if (event.target === pizzaModal) {
            pizzaModal.style.display = 'none';
        }
        if (event.target === orderModal) {
            orderModal.style.display = 'none';
        }
    });
    
    // Sifariş et butonu
    orderBtn.addEventListener('click', function() {
        if (cart.length > 0) {
            orderModal.style.display = 'block';
        }
    });
    
    // Sifariş formu
    orderForm.addEventListener('submit', function(e) {
        e.preventDefault();
        submitOrder();
    });
}

// Pizza menyusunu göstərmək
function renderPizzaMenu() {
    if (!pizzaMenu) return;
    
    pizzaMenu.innerHTML = '';
    
    if (pizzas.length === 0) {
        pizzaMenu.innerHTML = '<div class="empty-state">Pizza menyusu yüklənir...</div>';
        return;
    }
    
    const filteredPizzas = currentFilter === 'all' 
        ? pizzas 
        : pizzas.filter(pizza => pizza.category === currentFilter);
    
    if (filteredPizzas.length === 0) {
        pizzaMenu.innerHTML = '<div class="empty-state">Bu kateqoriyada pizza tapılmadı</div>';
        return;
    }
    
    filteredPizzas.forEach(pizza => {
        const pizzaCard = document.createElement('div');
        pizzaCard.className = 'pizza-card';
        pizzaCard.setAttribute('data-id', pizza.id);
        
        pizzaCard.innerHTML = `
            <div class="pizza-img" style="background-image: url('${pizza.image}')"></div>
            <div class="pizza-info">
                <div class="pizza-name">${pizza.name}</div>
                <div class="pizza-description">${pizza.description}</div>
                <div class="pizza-footer">
                    <div class="pizza-price">${pizza.price.toFixed(2)} AZN</div>
                    <button class="add-to-cart" data-id="${pizza.id}">Səbətə əlavə et</button>
                </div>
            </div>
        `;
        
        pizzaMenu.appendChild(pizzaCard);
        
        // Pizza kartına klik etdikdə
        pizzaCard.addEventListener('click', function(e) {
            if (!e.target.classList.contains('add-to-cart')) {
                showPizzaDetail(pizza);
            }
        });
        
        // Səbətə əlavə et butonu
        const addToCartBtn = pizzaCard.querySelector('.add-to-cart');
        addToCartBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            addToCart(pizza);
        });
    });
}

// Qalan funksiyalar eyni qalır...
// (showPizzaDetail, addToCart, updateCart, renderActiveOrders, submitOrder və s.)

// Pizza detalını göstərmək
function showPizzaDetail(pizza) {
    currentPizzaDetail = pizza;
    currentQuantity = 1;
    
    modalBody.innerHTML = `
        <div class="pizza-detail">
            <div class="pizza-detail-header">
                <div class="pizza-detail-img" style="background-image: url('${pizza.image}')"></div>
                <div class="pizza-detail-info">
                    <div class="pizza-detail-name">${pizza.name}</div>
                    <div class="pizza-detail-price">${pizza.price.toFixed(2)} AZN</div>
                    <div class="pizza-detail-description">${pizza.description}</div>
                </div>
            </div>
            <div class="pizza-detail-ingredients">
                <div class="ingredients-title">Tərkibi:</div>
                <div class="ingredients-list">
                    ${pizza.ingredients.map(ingredient => 
                        `<span class="ingredient">${ingredient}</span>`
                    ).join('')}
                </div>
            </div>
            <div class="pizza-detail-actions">
                <div class="quantity-selector">
                    <button id="decrease-quantity">-</button>
                    <span id="current-quantity">${currentQuantity}</span>
                    <button id="increase-quantity">+</button>
                </div>
                <button id="add-to-cart-detail" class="add-to-cart">Səbətə əlavə et - ${(pizza.price * currentQuantity).toFixed(2)} AZN</button>
            </div>
        </div>
    `;
    
    pizzaModal.style.display = 'block';
    
    // Miqdar dəyişdirici butonlar
    document.getElementById('decrease-quantity').addEventListener('click', function() {
        if (currentQuantity > 1) {
            currentQuantity--;
            updateQuantityDisplay();
        }
    });
    
    document.getElementById('increase-quantity').addEventListener('click', function() {
        currentQuantity++;
        updateQuantityDisplay();
    });
    
    // Səbətə əlavə et butonu
    document.getElementById('add-to-cart-detail').addEventListener('click', function() {
        addToCart(pizza, currentQuantity);
        pizzaModal.style.display = 'none';
    });
}

// Miqdar göstəricisini yeniləmək
function updateQuantityDisplay() {
    const quantityElement = document.getElementById('current-quantity');
    const addButton = document.getElementById('add-to-cart-detail');
    
    if (quantityElement && addButton && currentPizzaDetail) {
        quantityElement.textContent = currentQuantity;
        addButton.textContent = 
            `Səbətə əlavə et - ${(currentPizzaDetail.price * currentQuantity).toFixed(2)} AZN`;
    }
}

// Səbətə pizza əlavə etmək
function addToCart(pizza, quantity = 1) {
    const existingItem = cart.find(item => item.id === pizza.id);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: pizza.id,
            name: pizza.name,
            price: pizza.price,
            quantity: quantity
        });
    }
    
    updateCart();
    showNotification(`${pizza.name} səbətə əlavə edildi!`);
}

// Səbəti yeniləmək
function updateCart() {
    if (!cartItems) return;
    
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p>Səbətiniz boşdur</p>';
        if (orderBtn) orderBtn.disabled = true;
    } else {
        let total = 0;
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price.toFixed(2)} AZN x ${item.quantity}</div>
                </div>
                <div class="cart-item-controls">
                    <button class="quantity-btn decrease" data-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn increase" data-id="${item.id}">+</button>
                    <button class="remove-btn" data-id="${item.id}">Sil</button>
                </div>
            `;
            
            cartItems.appendChild(cartItem);
            
            // Miqdar dəyişdirici butonlar
            cartItem.querySelector('.decrease').addEventListener('click', function() {
                if (item.quantity > 1) {
                    item.quantity--;
                } else {
                    cart = cart.filter(cartItem => cartItem.id !== item.id);
                }
                updateCart();
            });
            
            cartItem.querySelector('.increase').addEventListener('click', function() {
                item.quantity++;
                updateCart();
            });
            
            // Sil butonu
            cartItem.querySelector('.remove-btn').addEventListener('click', function() {
                cart = cart.filter(cartItem => cartItem.id !== item.id);
                updateCart();
                showNotification(`${item.name} səbətdən silindi`);
            });
        });
        
        if (totalPriceElement) totalPriceElement.textContent = total.toFixed(2);
        if (orderBtn) orderBtn.disabled = false;
    }
}

// Aktiv sifarişləri göstərmək
function renderActiveOrders(orders) {
    if (!activeOrders) return;
    
    activeOrders.innerHTML = '';
    
    if (orders.length === 0) {
        activeOrders.innerHTML = '<p>Hazırlanan sifariş yoxdur</p>';
        return;
    }
    
    // Yalnız bu müştəriyə aid sifarişləri göstər (sadəlik üçün hamısını göstəririk)
    orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = 'order-card';
        
        orderCard.innerHTML = `
            <div class="order-header">
                <div class="order-id">Sifariş #${order.id}</div>
                <div class="order-status ${getStatusClass(order.status)}">${getStatusText(order.status)}</div>
            </div>
            <div class="order-items">
                ${order.items.map(item => `
                    <div class="order-item">
                        <span>${item.name}</span>
                        <span>${item.quantity} x ${item.price.toFixed(2)} AZN</span>
                    </div>
                `).join('')}
            </div>
            <div class="order-customer">
                <div><strong>Müştəri:</strong> ${order.customerName}</div>
                <div><strong>Telefon:</strong> ${order.customerPhone}</div>
            </div>
            <div class="order-payment">
                <strong>Ödəniş:</strong> ${getPaymentText(order.paymentMethod)}
            </div>
        `;
        
        activeOrders.appendChild(orderCard);
    });
}

// Sifarişi göndərmək
function submitOrder() {
    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;
    const customerAddress = document.getElementById('customer-address').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const orderNotes = document.getElementById('order-notes').value;
    
    const order = {
        id: generateOrderId(),
        customerName,
        customerPhone,
        customerAddress,
        paymentMethod,
        orderNotes,
        items: cart,
        total: calculateTotal(),
        status: 'pending',
        timestamp: new Date().toISOString()
    };
    
    // Serverə sifarişi göndər
    socket.emit('placeOrder', order);
    
    // Səbəti təmizlə
    cart = [];
    updateCart();
    
    // Modalı bağla
    orderModal.style.display = 'none';
    
    // Formu təmizlə
    orderForm.reset();
    
    showNotification('Sifarişiniz qəbul edildi! Gözləmə statusundadır.');
}

// Yardımcı funksiyalar
function generateOrderId() {
    return 'ORD' + Date.now().toString().slice(-6);
}

function calculateTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

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

function getPaymentText(paymentMethod) {
    switch(paymentMethod) {
        case 'card': return 'Kartla ödəniş';
        case 'cash': return 'Qapıda nağd ödəniş';
        case 'online': return 'Onlayn ödəniş';
        default: return paymentMethod;
    }
}

// Bildiriş göstərmək
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 10000;
        transition: opacity 0.3s;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Scroll animasiyaları üçün
function initScrollAnimations() {
    const reveals = document.querySelectorAll('.reveal');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, { threshold: 0.1 });
    
    reveals.forEach(reveal => {
        observer.observe(reveal);
    });
}

// Elementə pulse animasiyası əlavə etmək
function addPulseAnimation(element) {
    element.classList.add('pulse');
    setTimeout(() => {
        element.classList.remove('pulse');
    }, 600);
}

// Səbətə əlavə etdikdə animasiya
function addToCartWithAnimation(pizza, quantity = 1) {
    const existingItem = cart.find(item => item.id === pizza.id);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: pizza.id,
            name: pizza.name,
            price: pizza.price,
            quantity: quantity
        });
    }
    
    updateCart();
    
    // Animasiya
    const notification = showNotification(`✅ ${pizza.name} səbətə əlavə edildi!`);
    notification.classList.add('success-animation');
    
    // Səbət buttonuna animasiya
    const orderBtn = document.getElementById('order-btn');
    if (orderBtn) {
        addPulseAnimation(orderBtn);
    }
}

// Sifariş göndərildikdə animasiya
function submitOrderWithAnimation() {
    const customerName = document.getElementById('customer-name').value;
    const customerPhone = document.getElementById('customer-phone').value;
    const customerAddress = document.getElementById('customer-address').value;
    const paymentMethod = document.getElementById('payment-method').value;
    const orderNotes = document.getElementById('order-notes').value;
    
    const order = {
        id: generateOrderId(),
        customerName,
        customerPhone,
        customerAddress,
        paymentMethod,
        orderNotes,
        items: cart,
        total: calculateTotal(),
        status: 'pending',
        timestamp: new Date().toISOString()
    };
    
    // Serverə sifarişi göndər
    socket.emit('placeOrder', order);
    
    // Animasiya
    const notification = showNotification('🎉 Sifarişiniz qəbul edildi! Hazırlanır...');
    notification.style.background = 'linear-gradient(135deg, #27ae60, #219653)';
    
    // Səbəti təmizlə
    cart = [];
    updateCart();
    
    // Modalı bağla
    orderModal.style.display = 'none';
    
    // Formu təmizlə
    orderForm.reset();
}

// Bildiriş göstərmək (yenilənmiş)
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: var(--shadow-hover);
        z-index: 10000;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateX(100%);
        opacity: 0;
        font-weight: 500;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Giriş animasiyası
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
        notification.style.opacity = '1';
    }, 100);
    
    // Çıxış animasiyası
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        notification.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
    
    return notification;
}

// Səhifə yükləndikdə animasiyaları işə sal
document.addEventListener('DOMContentLoaded', function() {
    // Əsas funksiyalar
    setupEventListeners();
    socket.emit('getPizzas');
    
    // Scroll animasiyalarını işə sal
    initScrollAnimations();
    
    // Section-lara reveal class əlavə et
    document.querySelectorAll('section').forEach(section => {
        section.classList.add('reveal');
    });
    
    // Pizza kartlarına hover effekti
    document.addEventListener('mousemove', function(e) {
        const cards = document.querySelectorAll('.pizza-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
});

// Pizza əlavə et funksiyasını yenilə
function addToCart(pizza, quantity = 1) {
    addToCartWithAnimation(pizza, quantity);
}

// Sifariş et funksiyasını yenilə
function submitOrder() {
    submitOrderWithAnimation();
}
// Səbəti yeniləmək - YENİLƏNİB
function updateCart() {
    if (!cartItems) return;
    
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-state">
                <h3>Səbətiniz boşdur</h3>
                <p>Pizza əlavə etmək üçün menyudan seçim edin</p>
            </div>
        `;
        if (orderBtn) orderBtn.disabled = true;
    } else {
        let total = 0;
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${item.price.toFixed(2)} AZN</div>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-controls">
                        <button class="quantity-btn decrease" data-id="${item.id}">-</button>
                        <span class="quantity-display">${item.quantity}</span>
                        <button class="quantity-btn increase" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-btn" data-id="${item.id}">Sil</button>
                </div>
            `;
            
            cartItems.appendChild(cartItem);
            
            // Miqdar dəyişdirici butonlar
            cartItem.querySelector('.decrease').addEventListener('click', function() {
                if (item.quantity > 1) {
                    item.quantity--;
                } else {
                    cart = cart.filter(cartItem => cartItem.id !== item.id);
                }
                updateCart();
                showNotification(`${item.name} miqdarı azaldıldı`);
            });
            
            cartItem.querySelector('.increase').addEventListener('click', function() {
                item.quantity++;
                updateCart();
                showNotification(`${item.name} miqdarı artırıldı`);
            });
            
            // Sil butonu
            cartItem.querySelector('.remove-btn').addEventListener('click', function() {
                cart = cart.filter(cartItem => cartItem.id !== item.id);
                updateCart();
                showNotification(`${item.name} səbətdən silindi`);
            });
        });
        
        if (totalPriceElement) totalPriceElement.textContent = total.toFixed(2) + ' AZN';
        if (orderBtn) orderBtn.disabled = false;
    }
}