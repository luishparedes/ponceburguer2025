// Base de datos simulada
const database = {
    users: [
        { username: 'admin', password: 'admin123', role: 'admin', name: 'Administrador' },
        { username: 'cajero1', password: 'cajero123', role: 'cashier', name: 'Carlos Pérez' }
    ],
    products: [],
    inventoryLogs: [],
    sales: [],
    settings: {
        exchangeRate: 77 // Tasa por defecto
    }
};

// Variables globales
let currentUser = null;
let currentSale = [];
let selectedPaymentMethod = null;

// Elementos del DOM
const loginScreen = document.getElementById('login-screen');
const app = document.getElementById('app');
const loginButton = document.getElementById('login-button');
const logoutLink = document.getElementById('logout-link');
const currentUserDisplay = document.getElementById('current-user');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Funciones de autenticación
function login() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    
    const user = database.users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        loginScreen.classList.add('hidden');
        app.classList.remove('hidden');
        currentUserDisplay.textContent = user.name;
        loadInitialData();
    } else {
        alert('Usuario o contraseña incorrectos');
    }
}

function logout() {
    currentUser = null;
    app.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
}

// Funciones de navegación
function switchTab(event) {
    const tabId = event.target.getAttribute('data-tab');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// Funciones de productos
function addProduct(event) {
    event.preventDefault();
    
    const name = document.getElementById('product-name').value;
    const cost = parseFloat(document.getElementById('product-cost').value);
    const units = parseInt(document.getElementById('product-units').value);
    const utility = parseInt(document.getElementById('product-utility').value);
    
    // Calcular precio de venta
    const salePrice = cost * (1 + utility / 100);
    
    // Generar código único
    const code = generateProductCode(name);
    
    const product = {
        code,
        name,
        cost,
        utility,
        salePrice,
        units,
        minStock: 5 // Stock mínimo por defecto
    };
    
    database.products.push(product);
    
    // Registrar en inventario
    addInventoryLog(code, 'initial', units, 'Registro inicial');
    
    // Actualizar lista
    renderProducts();
    setupSaleProducts();
    
    // Limpiar formulario
    event.target.reset();
    
    // Mostrar alerta
    showAlert(`Producto "${name}" agregado con código ${code}`, 'success');
}

function generateProductCode(name) {
    const prefix = name.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}${randomNum}`;
}

function renderProducts() {
    const tbody = document.getElementById('products-table-body');
    tbody.innerHTML = '';
    
    database.products.forEach(product => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td>${product.cost.toFixed(2)}</td>
            <td>${product.utility}%</td>
            <td>${product.salePrice.toFixed(2)}</td>
            <td>${product.units}</td>
            <td>
                <button class="edit-product" data-code="${product.code}">Editar</button>
                <button class="delete-product" data-code="${product.code}">Eliminar</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Agregar event listeners a los botones
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', () => editProduct(btn.getAttribute('data-code')));
    });
    
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', () => deleteProduct(btn.getAttribute('data-code')));
    });
}

function editProduct(code) {
    const product = database.products.find(p => p.code === code);
    if (!product) return;
    
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-cost').value = product.cost;
    document.getElementById('product-units').value = product.units;
    document.getElementById('product-utility').value = product.utility;
    
    // Cambiar texto del botón
    const form = document.getElementById('product-form');
    form.querySelector('button').textContent = 'Actualizar Producto';
    
    // Cambiar el event listener temporalmente
    form.onsubmit = function(e) {
        e.preventDefault();
        
        product.name = document.getElementById('product-name').value;
        product.cost = parseFloat(document.getElementById('product-cost').value);
        product.units = parseInt(document.getElementById('product-units').value);
        product.utility = parseInt(document.getElementById('product-utility').value);
        product.salePrice = product.cost * (1 + product.utility / 100);
        
        renderProducts();
        setupSaleProducts();
        form.reset();
        form.querySelector('button').textContent = 'Agregar Producto';
        form.onsubmit = addProduct;
        
        showAlert(`Producto ${product.name} actualizado`, 'success');
    };
}

function deleteProduct(code) {
    if (confirm('¿Está seguro de eliminar este producto?')) {
        const index = database.products.findIndex(p => p.code === code);
        if (index !== -1) {
            database.products.splice(index, 1);
            renderProducts();
            setupSaleProducts();
            showAlert('Producto eliminado', 'success');
        }
    }
}

// Funciones de inventario
function addInventoryLog(code, action, quantity, reason) {
    const product = database.products.find(p => p.code === code);
    if (!product) return;
    
    // Actualizar unidades
    if (action === 'add' || action === 'initial') {
        product.units += quantity;
    } else if (action === 'remove') {
        product.units -= quantity;
    }
    
    // Registrar en logs
    database.inventoryLogs.push({
        code,
        action,
        quantity,
        reason,
        date: new Date(),
        user: currentUser.username
    });
    
    // Actualizar vistas
    renderInventory();
    checkLowStock();
}

function renderInventory() {
    const tbody = document.getElementById('inventory-table-body');
    tbody.innerHTML = '';
    
    database.products.forEach(product => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td>${product.units}</td>
            <td>
                <button class="manage-inventory" data-code="${product.code}">Gestionar</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Agregar event listeners a los botones
    document.querySelectorAll('.manage-inventory').forEach(btn => {
        btn.addEventListener('click', () => setupInventoryManagement(btn.getAttribute('data-code')));
    });
}

function setupInventoryManagement(code) {
    const product = database.products.find(p => p.code === code);
    if (!product) return;
    
    document.getElementById('inventory-product-code').value = product.code;
    document.getElementById('inventory-product-name').value = product.name;
    
    document.getElementById('inventory-actions').classList.remove('hidden');
}

function processInventoryAction(event) {
    event.preventDefault();
    
    const code = document.getElementById('inventory-product-code').value;
    const action = document.getElementById('inventory-action').value;
    const quantity = parseInt(document.getElementById('inventory-quantity').value);
    const reason = document.getElementById('inventory-reason').value;
    
    if (quantity <= 0) {
        showAlert('La cantidad debe ser mayor a cero', 'warning');
        return;
    }
    
    addInventoryLog(code, action, quantity, reason);
    
    // Limpiar y ocultar
    event.target.reset();
    document.getElementById('inventory-actions').classList.add('hidden');
    
    showAlert('Inventario actualizado', 'success');
}

function checkLowStock() {
    const alertsContainer = document.getElementById('inventory-alerts');
    alertsContainer.innerHTML = '';
    
    const lowStockProducts = database.products.filter(p => p.units <= p.minStock);
    
    if (lowStockProducts.length > 0) {
        alertsContainer.classList.remove('hidden');
        
        lowStockProducts.forEach(product => {
            const alert = document.createElement('div');
            alert.className = 'alert alert-warning';
            alert.textContent = `¡Stock bajo! ${product.name} (${product.code}): ${product.units} unidades restantes`;
            alertsContainer.appendChild(alert);
        });
    } else {
        alertsContainer.classList.add('hidden');
    }
}

// Funciones de ventas
function setupSaleProducts() {
    const grid = document.getElementById('sale-products-grid');
    grid.innerHTML = '';
    
    database.products.forEach(product => {
        if (product.units > 0) {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.setAttribute('data-code', product.code);
            
            card.innerHTML = `
                <h4>${product.name}</h4>
                <p>${product.code}</p>
                <p>Precio: ${product.salePrice.toFixed(2)} Bs</p>
                <p>Disponibles: ${product.units}</p>
            `;
            
            card.addEventListener('click', () => addToSale(product.code));
            grid.appendChild(card);
        }
    });
}

function addToSale(code) {
    const product = database.products.find(p => p.code === code);
    if (!product || product.units <= 0) return;
    
    // Verificar si ya está en la venta
    const existingItem = currentSale.find(item => item.code === code);
    
    if (existingItem) {
        if (existingItem.quantity < product.units) {
            existingItem.quantity++;
        } else {
            showAlert('No hay suficientes unidades disponibles', 'warning');
        }
    } else {
        currentSale.push({
            code: product.code,
            name: product.name,
            price: product.salePrice,
            quantity: 1
        });
    }
    
    renderSaleItems();
}

function renderSaleItems() {
    const tbody = document.getElementById('sale-items');
    tbody.innerHTML = '';
    
    let total = 0;
    
    currentSale.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.price.toFixed(2)}</td>
            <td>
                <button class="decrease-quantity" data-index="${index}">-</button>
                ${item.quantity}
                <button class="increase-quantity" data-index="${index}">+</button>
            </td>
            <td>${subtotal.toFixed(2)}</td>
            <td><button class="remove-item" data-index="${index}">Eliminar</button></td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Actualizar totales
    document.getElementById('sale-total').value = total.toFixed(2);
    document.getElementById('sale-total-dollars').value = (total / database.settings.exchangeRate).toFixed(2);
    
    // Agregar event listeners
    document.querySelectorAll('.decrease-quantity').forEach(btn => {
        btn.addEventListener('click', () => adjustQuantity(btn.getAttribute('data-index'), -1));
    });
    
    document.querySelectorAll('.increase-quantity').forEach(btn => {
        btn.addEventListener('click', () => adjustQuantity(btn.getAttribute('data-index'), 1));
    });
    
    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', () => removeItem(btn.getAttribute('data-index')));
    });
}

function adjustQuantity(index, change) {
    const item = currentSale[index];
    const product = database.products.find(p => p.code === item.code);
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        currentSale.splice(index, 1);
    } else if (newQuantity > product.units) {
        showAlert('No hay suficientes unidades disponibles', 'warning');
    } else {
        item.quantity = newQuantity;
    }
    
    renderSaleItems();
}

function removeItem(index) {
    currentSale.splice(index, 1);
    renderSaleItems();
}

function selectPaymentMethod(event) {
    const method = event.target.getAttribute('data-method');
    selectedPaymentMethod = method;
    
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('active');
    });
    
    event.target.classList.add('active');
}

function completeSale() {
    if (currentSale.length === 0) {
        showAlert('No hay productos en la venta', 'warning');
        return;
    }
    
    if (!selectedPaymentMethod) {
        showAlert('Seleccione un método de pago', 'warning');
        return;
    }
    
    // Registrar venta
    const totalBs = parseFloat(document.getElementById('sale-total').value);
    const totalDollars = parseFloat(document.getElementById('sale-total-dollars').value);
    
    const sale = {
        date: new Date(),
        items: [...currentSale],
        totalBs,
        totalDollars,
        paymentMethod: selectedPaymentMethod,
        cashier: currentUser.username,
        exchangeRate: database.settings.exchangeRate
    };
    
    database.sales.push(sale);
    
    // Actualizar inventario
    currentSale.forEach(item => {
        const product = database.products.find(p => p.code === item.code);
        if (product) {
            product.units -= item.quantity;
            addInventoryLog(item.code, 'remove', item.quantity, 'Venta');
        }
    });
    
    // Limpiar venta actual
    currentSale = [];
    selectedPaymentMethod = null;
    renderSaleItems();
    
    // Actualizar vistas
    setupSaleProducts();
    renderReports();
    
    // Mostrar resumen
    const methodText = getPaymentMethodText(sale.paymentMethod);
    const message = `Venta completada por ${sale.totalBs.toFixed(2)} Bs (${sale.totalDollars.toFixed(2)} $)\n` +
                   `Método: ${methodText}\n` +
                   `Tasa: ${sale.exchangeRate} Bs/$`;
    
    showAlert(message, 'success');
    
    // Limpiar selección de pago
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('active');
    });
}

function getPaymentMethodText(method) {
    const methods = {
        'cash-dollars': 'Efectivo $',
        'cash-bs': 'Efectivo Bs',
        'mobile-bs': 'PagoMóvil Bs',
        'card-bs': 'Tarjeta Bs'
    };
    return methods[method] || method;
}

// Funciones de reportes
function renderReports() {
    const tbody = document.getElementById('reports-table-body');
    tbody.innerHTML = '';
    
    database.sales.forEach(sale => {
        const date = new Date(sale.date);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        
        const productsList = sale.items.map(item => 
            `${item.name} (${item.quantity}x ${item.price.toFixed(2)} Bs)`
        ).join(', ');
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${timeStr}</td>
            <td>${sale.cashier}</td>
            <td>${productsList}</td>
            <td>${sale.totalBs.toFixed(2)}</td>
            <td>${sale.totalDollars.toFixed(2)}</td>
            <td>${getPaymentMethodText(sale.paymentMethod)}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Funciones de moneda/tasa
function setupCurrencyTab() {
    document.getElementById('exchange-rate').value = database.settings.exchangeRate;
    
    document.getElementById('currency-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const rate = parseFloat(document.getElementById('exchange-rate').value);
        
        if (rate <= 0) {
            showAlert('La tasa debe ser mayor a cero', 'warning', 'currency-message');
            return;
        }
        
        database.settings.exchangeRate = rate;
        showAlert(`Tasa de cambio actualizada: $1 = ${rate} Bs`, 'success', 'currency-message');
        
        // Actualizar total en dólares si hay una venta en curso
        if (currentSale.length > 0) {
            renderSaleItems();
        }
    });
}

// Funciones de búsqueda
function setupSearch() {
    // Búsqueda en inventario
    document.getElementById('inventory-search').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const rows = document.querySelectorAll('#inventory-table-body tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
    
    // Búsqueda en ventas
    document.getElementById('sale-search').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const cards = document.querySelectorAll('#sale-products-grid .product-card');
        
        cards.forEach(card => {
            const text = card.textContent.toLowerCase();
            card.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    });
}

// Función para mostrar alertas
function showAlert(message, type, containerId = null) {
    const container = containerId ? document.getElementById(containerId) : null;
    
    if (container) {
        container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        container.classList.remove('hidden');
    } else {
        alert(message); // Fallback a alerta nativa
    }
}

// Carga inicial
function loadInitialData() {
    // Datos de ejemplo para PONCE BURGUER
    if (database.products.length === 0) {
        const sampleProducts = [
            { name: 'Hamburguesa Clásica', cost: 3.50, utility: 50, units: 20 },
            { name: 'Hamburguesa Especial', cost: 4.50, utility: 50, units: 15 },
            { name: 'Perro Caliente', cost: 2.80, utility: 45, units: 18 },
            { name: 'Papas Fritas', cost: 1.50, utility: 60, units: 25 },
            { name: 'Refresco', cost: 1.00, utility: 80, units: 30 }
        ];
        
        sampleProducts.forEach(p => {
            const code = generateProductCode(p.name);
            const salePrice = p.cost * (1 + p.utility / 100);
            
            database.products.push({
                code,
                name: p.name,
                cost: p.cost,
                utility: p.utility,
                salePrice,
                units: p.units,
                minStock: 5
            });
            
            addInventoryLog(code, 'initial', p.units, 'Registro inicial');
        });
    }
    
    // Renderizar vistas
    renderProducts();
    renderInventory();
    setupSaleProducts();
    renderReports();
    checkLowStock();
    setupSearch();
    setupCurrencyTab();
}

// Event listeners
loginButton.addEventListener('click', login);
logoutLink.addEventListener('click', function(e) {
    e.preventDefault();
    logout();
});

tabs.forEach(tab => {
    tab.addEventListener('click', switchTab);
});

document.getElementById('product-form').addEventListener('submit', addProduct);
document.getElementById('inventory-form').addEventListener('submit', processInventoryAction);
document.getElementById('complete-sale').addEventListener('click', completeSale);

document.querySelectorAll('.payment-method').forEach(method => {
    method.addEventListener('click', selectPaymentMethod);
});