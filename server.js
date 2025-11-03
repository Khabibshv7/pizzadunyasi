const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Statik faylları xidmət etmək
app.use(express.static(path.join(__dirname)));

// Məlumatları saxlamaq üçün fayl yolu
const DATA_FILE = path.join(__dirname, 'pizza-data.json');

// Default pizza məlumatları
const defaultPizzas = [
    {
        id: 1,
        name: "Margarita",
        category: "classic",
        price: 12.00,
        description: "Klassik italyan pizzası, təzə pomidor sousu, mozzarella pendiri və fesleğen ilə.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Fesleğen"],
        image: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=400&h=300&fit=crop"
    },
    {
        id: 2,
        name: "Pepperoni",
        category: "classic",
        price: 14.50,
        description: "Pepperoni kolbasası və ədviyyatlı pomidor sousu ilə.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Pepperoni"],
        image: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop"
    },
    {
        id: 3,
        name: "Dörd Fəsil",
        category: "special",
        price: 18.00,
        description: "Dörd müxtəlif hissədən ibarət: pepperoni, göbələk, bibər və zeytun.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Pepperoni", "Göbələk", "Bibər", "Zeytun"],
        image: "https://images.unsplash.com/photo-1595708684082-a173bb3a06c5?w=400&h=300&fit=crop"
    },
    {
        id: 4,
        name: "Vegetarian",
        category: "vegetarian",
        price: 15.00,
        description: "Təzə tərəvəzlərlə hazırlanmış sağlam pizza.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Göbələk", "Bibər", "Soğan", "Zeytun", "Qarğıdalı"],
        image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop"
    },
    {
        id: 5,
        name: "Mexicano",
        category: "spicy",
        price: 16.50,
        description: "Acılı kolbasa, halapenyo bibəri və xüsusi acı sous ilə.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Acılı kolbasa", "Halapenyo", "Acı sous"],
        image: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&h=300&fit=crop"
    },
    {
        id: 6,
        name: "Quattro Formaggi",
        category: "special",
        price: 17.50,
        description: "Dörd növ pendir: mozzarella, parmezan, qorgonzola və rikotta.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Parmezan", "Qorgonzola", "Rikotta"],
        image: "https://images.unsplash.com/photo-1552539618-7eec9f4e1556?w=400&h=300&fit=crop"
    },
    {
        id: 7,
        name: "Hawaiian",
        category: "special",
        price: 15.50,
        description: "Ananas, donuz ətii və mozzarella pendiri ilə.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Donuz ətii", "Ananas"],
        image: "https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=400&h=300&fit=crop"
    },
    {
        id: 8,
        name: "BBQ Toyuq",
        category: "special",
        price: 16.00,
        description: "BBQ sousu, toyuq əti, soğan və qırmızı bibər ilə.",
        ingredients: ["BBQ sousu", "Mozzarella", "Toyuq əti", "Soğan", "Qırmızı bibər"],
        image: "https://images.unsplash.com/photo-1593246049226-ded77bf90326?w=400&h=300&fit=crop"
    },
    {
        id: 9,
        name: "Supreme",
        category: "special",
        price: 19.00,
        description: "Pepperoni, göbələk, soğan, bibər, zeytun və ədviyyatlar ilə.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Pepperoni", "Göbələk", "Soğan", "Bibər", "Zeytun"],
        image: "https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?w=400&h=300&fit=crop"
    },
    {
        id: 10,
        name: "Spinach & Feta",
        category: "vegetarian",
        price: 14.50,
        description: "Ispanak, feta pendiri, qırmızı soğan və sarımsaq ilə.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Ispanak", "Feta", "Qırmızı soğan", "Sarımsaq"],
        image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop"
    },
    {
        id: 11,
        name: "Truffle Pizza",
        category: "premium",
        price: 24.00,
        description: "Trüfl yağı, qəhvəyi göbələk və parmezan ilə lüks pizza.",
        ingredients: ["Trüfl yağı", "Mozzarella", "Göbələk", "Parmezan", "Rokfor pendiri"],
        image: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop"
    },
    {
        id: 12,
        name: "Seafood Deluxe",
        category: "premium",
        price: 26.50,
        description: "Qaridəs, midyə, kalamar və xüsusi dəniz məhsulları sousu ilə.",
        ingredients: ["Dəniz məhsulları sousu", "Mozzarella", "Qaridəs", "Midyə", "Kalamar", "Limon"],
        image: "https://images.unsplash.com/photo-1595854341625-f33ee10dbf94?w=400&h=300&fit=crop"
    },
    {
        id: 13,
        name: "Prosciutto",
        category: "premium",
        price: 22.00,
        description: "İncə doğranmış prosciutto, rukola və parmezan ilə.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Prosciutto", "Rukola", "Parmezan"],
        image: "https://images.unsplash.com/photo-1593504049359-311301d3dc85?w=400&h=300&fit=crop"
    },
    {
        id: 14,
        name: "Spicy Diavola",
        category: "spicy",
        price: 17.00,
        description: "Acı italyan kolbasası, qırmızı bibər və sarımsaq ilə.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Diavola kolbasası", "Qırmızı bibər", "Sarımsaq"],
        image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=400&h=300&fit=crop"
    },
    {
        id: 15,
        name: "Farmers Pizza",
        category: "vegetarian",
        price: 16.50,
        description: "Təzə tərəvəzlər, zeytun yağı və ədviyyatlar ilə.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Badımcan", "Qırmızı soğan", "Bibər", "Zeytun"],
        image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop"
    },
    {
        id: 16,
        name: "Meat Feast",
        category: "special",
        price: 20.00,
        description: "Pepperoni, donuz ətii, mal ətii və italyan kolbasası ilə.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Pepperoni", "Donuz ətii", "Mal ətii", "Kolbasa"],
        image: "https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=400&h=300&fit=crop"
    },
    {
        id: 17,
        name: "White Pizza",
        category: "vegetarian",
        price: 15.00,
        description: "Pomidorsuz, zeytun yağı, sarımsaq və müxtəlif pendirlər ilə.",
        ingredients: ["Zeytun yağı", "Rikotta", "Mozzarella", "Parmezan", "Sarımsaq", "Rukola"],
        image: "https://images.unsplash.com/photo-1593504049359-311301d3dc85?w=400&h=300&fit=crop"
    },
    {
        id: 18,
        name: "Mushroom Paradise",
        category: "vegetarian",
        price: 16.00,
        description: "Müxtəlif növ göbələklər, sarımsaq və ədviyyatlar ilə.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Göbələk", "Sarımsaq", "Fesleğen"],
        image: "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&h=300&fit=crop"
    },
    {
        id: 19,
        name: "Buffalo Chicken",
        category: "spicy",
        price: 18.50,
        description: "Buffalo sousu, toyuq əti, seleri və penir ilə.",
        ingredients: ["Buffalo sousu", "Mozzarella", "Toyuq əti", "Seleri", "Bleu pendiri"],
        image: "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=400&h=300&fit=crop"
    },
    {
        id: 20,
        name: "Mediterranean",
        category: "vegetarian",
        price: 17.00,
        description: "Aron, quru pomidor, zeytun və feta pendiri ilə.",
        ingredients: ["Pomidor sousu", "Mozzarella", "Aron", "Quru pomidor", "Zeytun", "Feta"],
        image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop"
    }
];

// Məlumatları yükləmək
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Data faylı yoxdur, default məlumatlar istifadə edilir:', error.message);
    }
    
    // Default məlumatları qaytar və fayla yaz
    const defaultData = {
        pizzas: defaultPizzas,
        orders: [],
        orderHistory: []
    };
    saveData(defaultData);
    return defaultData;
}

// Məlumatları saxlamaq
function saveData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        console.log('Məlumatlar uğurla saxlanıldı');
    } catch (error) {
        console.error('Məlumatları saxlamaq mümkün olmadı:', error);
    }
}

// İlkin məlumatları yüklə
let data = loadData();
let pizzas = data.pizzas || [];
let activeOrders = data.orders || [];
let orderHistory = data.orderHistory || [];

// Ana səhifə
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin səhifəsi
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Pizza məlumatları API
app.get('/api/pizzas', (req, res) => {
    res.json(pizzas);
});

// Sifariş məlumatları API
app.get('/api/orders', (req, res) => {
    res.json({
        active: activeOrders,
        history: orderHistory
    });
});

// Socket.io əlaqəsi
io.on('connection', (socket) => {
    console.log('Yeni istifadəçi qoşuldu:', socket.id);
    
    // Hər yeni qoşulan istifadəçiyə cari pizzaları göndər
    socket.emit('pizzasUpdated', pizzas);
    
    // Aktiv sifarişləri göndər
    socket.emit('activeOrders', activeOrders);

    // Admin məlumatlarını göndər
    socket.on('getAdminData', () => {
        socket.emit('adminData', {
            orders: [...activeOrders, ...orderHistory],
            pizzas: pizzas
        });
    });
    
    // Pizza məlumatlarını istə
    socket.on('getPizzas', () => {
        socket.emit('pizzasUpdated', pizzas);
    });
    
    // Sifariş qəbul etmək
    socket.on('placeOrder', (order) => {
        console.log('Yeni sifariş:', order);
        activeOrders.push(order);
        
        // Məlumatları saxla
        saveData({
            pizzas: pizzas,
            orders: activeOrders,
            orderHistory: orderHistory
        });
        
        // Bütün klientlərə (həm əsas sayt, həm də admin) bildir
        io.emit('newOrder', {
            orderId: order.id,
            activeOrders: activeOrders,
            orders: [...activeOrders, ...orderHistory]
        });
        
        // Admin panelinə xüsusi bildiriş
        io.emit('adminNotification', {
            type: 'newOrder',
            message: `Yeni sifariş: #${order.id}`,
            order: order
        });
    });
    
    // Sifariş statusunu yeniləmək
    socket.on('updateOrderStatus', (data) => {
        updateOrderStatus(data.orderId, data.status, socket.id);
    });
    
    // Sifarişi ləğv etmək
    socket.on('cancelOrder', (orderId) => {
        const order = activeOrders.find(o => o.id === orderId);
        if (order) {
            activeOrders = activeOrders.filter(order => order.id !== orderId);
            
            // Məlumatları saxla
            saveData({
                pizzas: pizzas,
                orders: activeOrders,
                orderHistory: orderHistory
            });
            
            io.emit('orderUpdated', {
                orders: [...activeOrders, ...orderHistory]
            });
            io.emit('orderCancelled', {
                orderId: orderId,
                activeOrders: activeOrders
            });
        }
    });
    
    // YENİ PİZZA ƏLAVƏ ETMƏK
    socket.on('addPizza', (pizzaData) => {
        try {
            // Yeni ID yarat
            const newId = pizzas.length > 0 ? Math.max(...pizzas.map(p => p.id)) + 1 : 1;
            
            const newPizza = {
                id: newId,
                name: pizzaData.name,
                category: pizzaData.category,
                price: parseFloat(pizzaData.price),
                description: pizzaData.description,
                ingredients: Array.isArray(pizzaData.ingredients) ? pizzaData.ingredients : pizzaData.ingredients.split(',').map(i => i.trim()),
                image: pizzaData.image
            };
            
            pizzas.push(newPizza);
            
            // MƏLUMATLARI FAYLA YAZ
            saveData({
                pizzas: pizzas,
                orders: activeOrders,
                orderHistory: orderHistory
            });
            
            // BÜTÜN qoşulu klientlərə pizzaları yenilə
            io.emit('pizzasUpdated', pizzas);
            io.emit('pizzaAdded', { 
                pizzas: pizzas,
                newPizza: newPizza 
            });
            
            console.log('Yeni pizza əlavə edildi:', newPizza.name);
            
        } catch (error) {
            console.error('Pizza əlavə edilərkən xəta:', error);
            socket.emit('error', { message: 'Pizza əlavə edilərkən xəta baş verdi' });
        }
    });
    
    // PİZZA YENİLƏMƏK
    socket.on('updatePizza', (pizzaData) => {
        try {
            const index = pizzas.findIndex(p => p.id === parseInt(pizzaData.id));
            if (index !== -1) {
                const updatedPizza = {
                    id: parseInt(pizzaData.id),
                    name: pizzaData.name,
                    category: pizzaData.category,
                    price: parseFloat(pizzaData.price),
                    description: pizzaData.description,
                    ingredients: Array.isArray(pizzaData.ingredients) ? pizzaData.ingredients : pizzaData.ingredients.split(',').map(i => i.trim()),
                    image: pizzaData.image
                };
                
                pizzas[index] = updatedPizza;
                
                // MƏLUMATLARI FAYLA YAZ
                saveData({
                    pizzas: pizzas,
                    orders: activeOrders,
                    orderHistory: orderHistory
                });
                
                // BÜTÜN qoşulu klientlərə pizzaları yenilə
                io.emit('pizzasUpdated', pizzas);
                io.emit('pizzaUpdated', { 
                    pizzas: pizzas,
                    updatedPizza: updatedPizza 
                });
                
                console.log('Pizza yeniləndi:', updatedPizza.name);
            }
        } catch (error) {
            console.error('Pizza yenilənərkən xəta:', error);
            socket.emit('error', { message: 'Pizza yenilənərkən xəta baş verdi' });
        }
    });
    
    // PİZZA SİLMƏK
    socket.on('deletePizza', (pizzaId) => {
        try {
            const pizza = pizzas.find(p => p.id === parseInt(pizzaId));
            if (pizza) {
                pizzas = pizzas.filter(p => p.id !== parseInt(pizzaId));
                
                // MƏLUMATLARI FAYLA YAZ
                saveData({
                    pizzas: pizzas,
                    orders: activeOrders,
                    orderHistory: orderHistory
                });
                
                // BÜTÜN qoşulu klientlərə pizzaları yenilə
                io.emit('pizzasUpdated', pizzas);
                io.emit('pizzaDeleted', { 
                    pizzas: pizzas,
                    deletedPizzaId: parseInt(pizzaId)
                });
                
                console.log('Pizza silindi:', pizza.name);
            }
        } catch (error) {
            console.error('Pizza silinərkən xəta:', error);
            socket.emit('error', { message: 'Pizza silinərkən xəta baş verdi' });
        }
    });
    
    // Bağlantı kəsildikdə
    socket.on('disconnect', () => {
        console.log('İstifadəçi ayrıldı:', socket.id);
    });
});

function updateOrderStatus(orderId, status, socketId) {
    const order = activeOrders.find(o => o.id === orderId);
    if (order) {
        order.status = status;
        
        if (status === 'delivered') {
            setTimeout(() => {
                orderHistory.push(order);
                activeOrders = activeOrders.filter(o => o.id !== orderId);
                
                saveData({
                    pizzas: pizzas,
                    orders: activeOrders,
                    orderHistory: orderHistory
                });
                
                io.emit('orderUpdated', {
                    orders: [...activeOrders, ...orderHistory]
                });
            }, 30000);
        }
        
        saveData({
            pizzas: pizzas,
            orders: activeOrders,
            orderHistory: orderHistory
        });
        
        io.emit('orderUpdated', {
            orders: [...activeOrders, ...orderHistory]
        });
        
        io.emit('orderStatusUpdate', {
            orderId: orderId,
            status: status,
            activeOrders: activeOrders
        });
        
        console.log(`Sifariş #${orderId} statusu dəyişdirildi: ${status}`);
    }
}

// Serveri işə salmaq
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} ünvanında işləyir`);
    console.log(`Əsas sayt: http://localhost:${PORT}/`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`Məlumat faylı: ${DATA_FILE}`);
});


// Admin səhifəsi
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Admin API route (məxviyyət üçün)
app.post('/api/admin/login', (req, res) => {
    // Burada daha mürəkkəb auth sistemi əlavə edə bilərsiniz
    res.json({ success: true });
});