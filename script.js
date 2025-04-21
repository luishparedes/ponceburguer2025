// Configuración inicial
const { jsPDF } = window.jspdf;
const ADMIN_PASSWORD = "0194"; // Clave de administrador predeterminada

// Base de datos simulada
const database = {
    users: [
        { 
            username: 'admin', 
            password: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // SHA-256 de 'admin123'
            role: 'admin', 
            name: 'Administrador',
            createdAt: new Date()
        },
        { 
            username: 'cajero1', 
            password: 'f6c5b7a2e4b7a3c8f8b7a3d4e5c8b9a0f7e6d5c4b3a2f1e0d9c8b7a6', // SHA-256 de 'cajero123'
            role: 'cashier', 
            name: 'Carlos Pérez',
            createdAt: new Date()
        }
    ],
    products: [],
    inventoryLogs: [],
    sales: [],
    settings: {
        exchangeRate: 36.50, // Tasa por defecto
        lowStockThreshold: 5
    },
    costList: [] // Lista interna de costos
};

// Variables globales
let currentUser = null;
let currentSale = [];
let selectedPaymentMethod = null;
let selectedProductForDeletion = null;

// Elementos del DOM
const loginScreen = document.getElementById('login-screen');
const app = document.getElementById('app');
const loginButton = document.getElementById('login-button');
const logoutLink = document.getElementById('logout-link');
const currentUserDisplay = document.getElementById('current-user');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const modal = document.getElementById('modal');
const adminModal = document.getElementById('admin-modal');
const notificationContainer = document.getElementById('notification-container');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Cargar datos del localStorage si existen
    loadFromLocalStorage();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Si hay usuarios, mostrar login, sino mostrar creación de usuario admin
    if (database.users.length === 0) {
        showAdminCreation();
    }
});

// Función para cargar datos del localStorage
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('ponceBurguerDB');
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        Object.assign(database, parsedData);
    }
}

// Función para guardar datos en localStorage
function saveToLocalStorage() {
    localStorage.setItem('ponceBurguerDB', JSON.stringify(database));
}

// Función para configurar event listeners
function setupEventListeners() {
    // Login
    loginButton.addEventListener('click', login);
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    // Logout
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
    
    // Tabs
    tabs.forEach(tab => {
        tab.addEventListener('click', switchTab);
    });
    
    // Modales
    document.getElementById('modal-cancel').addEventListener('click', () => {
        modal.classList.add('hidden');
    });
    
    document.getElementById('admin-cancel').addEventListener('click', () => {
        adminModal.classList.add('hidden');
    });
    
    document.getElementById('admin-confirm').addEventListener('click', verifyAdminPassword);
    
    // Configurar cada pestaña
    setupProductsTab();
    setupInventoryTab();
    setupSalesTab();
    setupReportsTab();
    setupCurrencyTab();
    setupUsersTab();
}

// Función para mostrar la creación de usuario admin inicial
function showAdminCreation() {
    loginScreen.innerHTML = `
        <div class="logo">
            <i class="fas fa-hamburger"></i>
            <h1>PONCE BURGUER</h1>
        </div>
        <h2>Configuración Inicial</h2>
        <p>No se encontraron usuarios. Por favor, cree una cuenta de administrador:</p>
        <div class="form-group">
            <label for="admin-name"><i class="fas fa-user"></i> Nombre:</label>
            <input type="text" id="admin-name" placeholder="Su nombre completo">
        </div>
        <div class="form-group">
            <label for="admin-username"><i class="fas fa-user-tag"></i> Usuario:</label>
            <input type="text" id="admin-username" placeholder="Nombre de usuario">
        </div>
        <div class="form-group">
            <label for="admin-password"><i class="fas fa-lock"></i> Contraseña:</label>
            <input type="password" id="admin-password" placeholder="Contraseña segura">
        </div>
        <div class="form-group">
            <label for="admin-confirm-password"><i class="fas fa-lock"></i> Confirmar Contraseña:</label>
            <input type="password" id="admin-confirm-password" placeholder="Repita la contraseña">
        </div>
        <button id="create-admin-btn" class="btn-primary"><i class="fas fa-user-shield"></i> Crear Administrador</button>
    `;
    
    document.getElementById('create-admin-btn').addEventListener('click', createAdminAccount);
}

// Función para crear cuenta de administrador inicial
async function createAdminAccount() {
    const name = document.getElementById('admin-name').value.trim();
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;
    const confirmPassword = document.getElementById('admin-confirm-password').value;
    
    if (!name || !username || !password) {
        showNotification('Todos los campos son obligatorios', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    const hashedPassword = await hashPassword(password);
    
    database.users.push({
        username,
        password: hashedPassword,
        role: 'admin',
        name,
        createdAt: new Date()
    });
    
    saveToLocalStorage();
    showNotification('Cuenta de administrador creada con éxito', 'success');
    setTimeout(() => {
        location.reload();
    }, 1500);
}

// Función para hashear contraseñas
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Función de login
async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (!username || !password) {
        showNotification('Usuario y contraseña son obligatorios', 'error');
        return;
    }
    
    const hashedPassword = await hashPassword(password);
    const user = database.users.find(u => u.username === username && u.password === hashedPassword);
    
    if (user) {
        currentUser = user;
        loginScreen.classList.add('hidden');
        app.classList.remove('hidden');
        currentUserDisplay.textContent = user.name;
        
        // Mostrar/ocultar pestañas según rol
        if (user.role !== 'admin') {
            document.getElementById('users-tab').style.display = 'none';
        }
        
        loadInitialData();
        showNotification(`Bienvenido, ${user.name}`, 'success');
    } else {
        showNotification('Usuario o contraseña incorrectos', 'error');
    }
}

// Función de logout
function logout() {
    currentUser = null;
    app.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    showNotification('Sesión cerrada con éxito', 'success');
}

// Función para cambiar de pestaña
function switchTab(event) {
    const tabId = event.target.getAttribute('data-tab');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
}

// Función para mostrar notificaciones
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 
                         type === 'error' ? 'exclamation-circle' : 
                         type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    notificationContainer.appendChild(notification);
    
    // Eliminar después de la animación
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Función para mostrar modal de confirmación
function showModal(title, message, confirmCallback) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    
    const confirmBtn = document.getElementById('modal-confirm');
    confirmBtn.onclick = function() {
        confirmCallback();
        modal.classList.add('hidden');
    };
    
    modal.classList.remove('hidden');
}

// Función para verificar contraseña de admin
function verifyAdminPassword() {
    const password = document.getElementById('admin-password').value;
    
    if (password === ADMIN_PASSWORD) {
        adminModal.classList.add('hidden');
        return true;
    } else {
        showNotification('Clave de administrador incorrecta', 'error');
        return false;
    }
}

// Función para solicitar contraseña de admin
function requestAdminPassword(callback) {
    document.getElementById('admin-password').value = '';
    adminModal.classList.remove('hidden');
    
    const confirmBtn = document.getElementById('admin-confirm');
    confirmBtn.onclick = function() {
        if (verifyAdminPassword()) {
            callback();
        }
    };
}

// Configuración de cada pestaña
function setupProductsTab() {
    const productsTab = document.getElementById('products');
    
    productsTab.innerHTML = `
        <h2><i class="fas fa-box-open"></i> Gestión de Productos</h2>
        <div class="alert alert-info">
            <i class="fas fa-info-circle"></i> Los precios se calculan automáticamente usando la fórmula: Precio = Costo / (1 - (Utilidad/100))
        </div>
        
        <form id="product-form">
            <div class="form-row">
                <div class="form-group">
                    <label for="product-name"><i class="fas fa-tag"></i> Nombre del Producto:</label>
                    <input type="text" id="product-name" required>
                </div>
                <div class="form-group">
                    <label for="product-cost"><i class="fas fa-dollar-sign"></i> Costo ($):</label>
                    <input type="number" id="product-cost" step="0.01" min="0" required>
                </div>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="product-units"><i class="fas fa-boxes"></i> Unidades Iniciales:</label>
                    <input type="number" id="product-units" min="0" required>
                </div>
                <div class="form-group">
                    <label for="product-utility"><i class="fas fa-percentage"></i> Utilidad Deseada (%):</label>
                    <input type="number" id="product-utility" step="0.1" min="0" max="100" required>
                </div>
            </div>
            
            <div class="form-group">
                <label for="product-price"><i class="fas fa-tags"></i> Precio de Venta ($):</label>
                <input type="text" id="product-price" readonly>
            </div>
            
            <div class="form-group">
                <label for="product-potential"><i class="fas fa-coins"></i> Utilidad Potencial ($/unidad):</label>
                <input type="text" id="product-potential" readonly>
            </div>
            
            <button type="submit" class="btn-primary"><i class="fas fa-plus-circle"></i> Agregar Producto</button>
            <button type="button" id="export-products" class="btn-secondary"><i class="fas fa-file-pdf"></i> Exportar a PDF</button>
        </form>
        
        <div id="products-list">
            <h3><i class="fas fa-list"></i> Lista de Productos</h3>
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th><i class="fas fa-barcode"></i> Código</th>
                            <th><i class="fas fa-tag"></i> Nombre</th>
                            <th><i class="fas fa-dollar-sign"></i> Costo ($)</th>
                            <th><i class="fas fa-percentage"></i> Utilidad</th>
                            <th><i class="fas fa-tags"></i> Precio ($)</th>
                            <th><i class="fas fa-coins"></i> Utilidad/unidad</th>
                            <th><i class="fas fa-boxes"></i> Unidades</th>
                            <th><i class="fas fa-cog"></i> Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="products-table-body"></tbody>
                </table>
            </div>
        </div>
    `;
    
    // Event listeners para cálculos automáticos
    document.getElementById('product-cost').addEventListener('input', calculateProductPrice);
    document.getElementById('product-utility').addEventListener('input', calculateProductPrice);
    
    // Formulario de productos
    document.getElementById('product-form').addEventListener('submit', addProduct);
    
    // Exportar a PDF
    document.getElementById('export-products').addEventListener('click', exportProductsToPDF);
    
    // Renderizar productos existentes
    renderProducts();
}

// Función para calcular precio automático
function calculateProductPrice() {
    const cost = parseFloat(document.getElementById('product-cost').value) || 0;
    const utility = parseFloat(document.getElementById('product-utility').value) || 0;
    
    if (utility >= 100) {
        document.getElementById('product-utility').value = 99.99;
        return;
    }
    
    const price = cost / (1 - (utility / 100));
    const potential = price - cost;
    
    document.getElementById('product-price').value = price.toFixed(2);
    document.getElementById('product-potential').value = potential.toFixed(2);
}

// Función para agregar producto
function addProduct(event) {
    event.preventDefault();
    
    const name = document.getElementById('product-name').value.trim();
    const cost = parseFloat(document.getElementById('product-cost').value);
    const units = parseInt(document.getElementById('product-units').value);
    const utility = parseFloat(document.getElementById('product-utility').value);
    
    if (!name || isNaN(cost) || isNaN(units) || isNaN(utility)) {
        showNotification('Todos los campos son obligatorios', 'error');
        return;
    }
    
    if (utility >= 100) {
        showNotification('La utilidad debe ser menor al 100%', 'error');
        return;
    }
    
    // Calcular precio de venta
    const salePrice = cost / (1 - (utility / 100));
    const potentialProfit = salePrice - cost;
    
    // Generar código único
    const code = generateProductCode(name);
    
    const product = {
        code,
        name,
        cost,
        utility,
        salePrice,
        potentialProfit,
        units,
        minStock: database.settings.lowStockThreshold
    };
    
    database.products.push(product);
    
    // Registrar en inventario
    addInventoryLog(code, 'initial', units, 'Registro inicial');
    
    // Registrar en lista de costos
    database.costList.push({
        code,
        name,
        cost,
        date: new Date(),
        registeredBy: currentUser.username
    });
    
    // Actualizar listas
    renderProducts();
    setupSaleProducts();
    
    // Limpiar formulario
    event.target.reset();
    document.getElementById('product-price').value = '';
    document.getElementById('product-potential').value = '';
    
    // Mostrar notificación
    showNotification(`Producto "${name}" agregado con código ${code}`, 'success');
    
    // Guardar en localStorage
    saveToLocalStorage();
}

// Función para generar código de producto
function generateProductCode(name) {
    const prefix = name.substring(0, 3).toUpperCase();
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${prefix}${randomNum}`;
}

// Función para renderizar lista de productos
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
            <td>${(product.salePrice - product.cost).toFixed(2)}</td>
            <td>${product.units}</td>
            <td class="actions">
                <button class="btn-secondary edit-product" data-code="${product.code}"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn-danger delete-product" data-code="${product.code}"><i class="fas fa-trash-alt"></i> Eliminar</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Agregar event listeners a los botones
    document.querySelectorAll('.edit-product').forEach(btn => {
        btn.addEventListener('click', () => editProduct(btn.getAttribute('data-code')));
    });
    
    document.querySelectorAll('.delete-product').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedProductForDeletion = btn.getAttribute('data-code');
            requestAdminPassword(() => deleteProduct(selectedProductForDeletion));
        });
    });
}

// Función para editar producto
function editProduct(code) {
    const product = database.products.find(p => p.code === code);
    if (!product) return;
    
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-cost').value = product.cost;
    document.getElementById('product-units').value = product.units;
    document.getElementById('product-utility').value = product.utility;
    calculateProductPrice();
    
    // Cambiar texto del botón
    const form = document.getElementById('product-form');
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Producto';
    
    // Cambiar el event listener temporalmente
    form.onsubmit = function(e) {
        e.preventDefault();
        
        product.name = document.getElementById('product-name').value.trim();
        product.cost = parseFloat(document.getElementById('product-cost').value);
        product.units = parseInt(document.getElementById('product-units').value);
        product.utility = parseFloat(document.getElementById('product-utility').value);
        product.salePrice = product.cost / (1 - (product.utility / 100));
        product.potentialProfit = product.salePrice - product.cost;
        
        // Actualizar lista de costos si cambió el precio
        const costEntry = database.costList.find(c => c.code === code);
        if (costEntry && costEntry.cost !== product.cost) {
            database.costList.push({
                code,
                name: product.name,
                cost: product.cost,
                date: new Date(),
                registeredBy: currentUser.username,
                previousCost: costEntry.cost
            });
        }
        
        renderProducts();
        setupSaleProducts();
        form.reset();
        submitBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Agregar Producto';
        form.onsubmit = addProduct;
        
        showNotification(`Producto ${product.name} actualizado`, 'success');
        saveToLocalStorage();
    };
}

// Función para eliminar producto
function deleteProduct(code) {
    const product = database.products.find(p => p.code === code);
    if (!product) return;
    
    const index = database.products.findIndex(p => p.code === code);
    if (index !== -1) {
        database.products.splice(index, 1);
        
        // Registrar en inventario
        addInventoryLog(code, 'remove', product.units, 'Producto eliminado');
        
        renderProducts();
        setupSaleProducts();
        showNotification('Producto eliminado', 'success');
        saveToLocalStorage();
    }
}

// Función para exportar productos a PDF
function exportProductsToPDF() {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Lista de Precios - PONCE BURGUER', 105, 15, { align: 'center' });
    
    // Fecha
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 105, 22, { align: 'center' });
    
    // Encabezados de tabla
    doc.setFontSize(12);
    doc.setDrawColor(0);
    doc.setFillColor(231, 76, 60);
    doc.rect(10, 30, 190, 10, 'F');
    doc.setTextColor(255);
    doc.text('Código', 15, 36);
    doc.text('Producto', 45, 36);
    doc.text('Precio ($)', 150, 36);
    doc.text('Precio (Bs)', 175, 36);
    
    // Datos de productos
    doc.setFontSize(10);
    doc.setTextColor(0);
    let y = 42;
    
    database.products.forEach((product, index) => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        
        doc.text(product.code, 15, y);
        doc.text(product.name, 45, y);
        doc.text(product.salePrice.toFixed(2), 150, y);
        doc.text((product.salePrice * database.settings.exchangeRate).toFixed(2), 175, y);
        
        // Línea separadora
        if (index < database.products.length - 1) {
            doc.line(10, y + 4, 200, y + 4);
        }
        
        y += 8;
    });
    
    // Tasa de cambio
    doc.setFontSize(10);
    doc.text(`Tasa de cambio: $1 = ${database.settings.exchangeRate} Bs`, 105, y + 10, { align: 'center' });
    
    // Guardar PDF
    doc.save(`PonceBurguer_Precios_${new Date().toISOString().slice(0,10)}.pdf`);
    showNotification('Lista de precios exportada a PDF', 'success');
}

// Configuración de pestaña de inventario
function setupInventoryTab() {
    const inventoryTab = document.getElementById('inventory');
    
    inventoryTab.innerHTML = `
        <h2><i class="fas fa-clipboard-list"></i> Inventario</h2>
        
        <div class="form-group">
            <label for="inventory-search"><i class="fas fa-search"></i> Buscar Producto:</label>
            <input type="text" id="inventory-search" placeholder="Ingrese código, nombre o 'stock:5' para filtrar por stock">
        </div>
        
        <div id="inventory-alerts" class="alert alert-warning hidden"></div>
        
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th><i class="fas fa-barcode"></i> Código</th>
                        <th><i class="fas fa-tag"></i> Nombre</th>
                        <th><i class="fas fa-boxes"></i> Unidades</th>
                        <th><i class="fas fa-cog"></i> Acciones</th>
                    </tr>
                </thead>
                <tbody id="inventory-table-body"></tbody>
            </table>
        </div>
        
        <div id="inventory-actions" class="hidden">
            <h3><i class="fas fa-edit"></i> Gestión de Inventario</h3>
            <form id="inventory-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="inventory-product-code"><i class="fas fa-barcode"></i> Código:</label>
                        <input type="text" id="inventory-product-code" readonly>
                    </div>
                    <div class="form-group">
                        <label for="inventory-product-name"><i class="fas fa-tag"></i> Nombre:</label>
                        <input type="text" id="inventory-product-name" readonly>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="inventory-action"><i class="fas fa-exchange-alt"></i> Acción:</label>
                        <select id="inventory-action">
                            <option value="add">Agregar Unidades</option>
                            <option value="remove">Retirar Unidades</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="inventory-quantity"><i class="fas fa-calculator"></i> Cantidad:</label>
                        <input type="number" id="inventory-quantity" min="1" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="inventory-reason"><i class="fas fa-comment"></i> Motivo:</label>
                    <input type="text" id="inventory-reason" required>
                </div>
                
                <button type="submit" class="btn-primary"><i class="fas fa-check-circle"></i> Ejecutar Acción</button>
                <button type="button" id="cancel-inventory" class="btn-danger"><i class="fas fa-times-circle"></i> Cancelar</button>
            </form>
        </div>
    `;
    
    // Event listeners
    document.getElementById('inventory-search').addEventListener('input', filterInventory);
    document.getElementById('inventory-form').addEventListener('submit', processInventoryAction);
    document.getElementById('cancel-inventory').addEventListener('click', () => {
        document.getElementById('inventory-actions').classList.add('hidden');
    });
    
    // Renderizar inventario
    renderInventory();
    checkLowStock();
}

// Función para filtrar inventario
function filterInventory() {
    const searchTerm = this.value.toLowerCase();
    const rows = document.querySelectorAll('#inventory-table-body tr');
    
    rows.forEach(row => {
        const code = row.cells[0].textContent.toLowerCase();
        const name = row.cells[1].textContent.toLowerCase();
        const stock = parseInt(row.cells[2].textContent);
        
        const matchesSearch = code.includes(searchTerm) || name.includes(searchTerm);
        const matchesStock = searchTerm.includes('stock:') ? 
            stock <= parseInt(searchTerm.split(':')[1]) : true;
        
        row.style.display = (matchesSearch || matchesStock) ? '' : 'none';
    });
}

// Función para renderizar inventario
function renderInventory() {
    const tbody = document.getElementById('inventory-table-body');
    tbody.innerHTML = '';
    
    database.products.forEach(product => {
        const row = document.createElement('tr');
        
        // Resaltar si stock bajo
        if (product.units <= product.minStock) {
            row.classList.add('low-stock');
        }
        
        row.innerHTML = `
            <td>${product.code}</td>
            <td>${product.name}</td>
            <td>${product.units}</td>
            <td class="actions">
                <button class="btn-secondary manage-inventory" data-code="${product.code}"><i class="fas fa-edit"></i> Gestionar</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Agregar event listeners a los botones
    document.querySelectorAll('.manage-inventory').forEach(btn => {
        btn.addEventListener('click', () => setupInventoryManagement(btn.getAttribute('data-code')));
    });
}

// Función para configurar gestión de inventario
function setupInventoryManagement(code) {
    const product = database.products.find(p => p.code === code);
    if (!product) return;
    
    document.getElementById('inventory-product-code').value = product.code;
    document.getElementById('inventory-product-name').value = product.name;
    
    document.getElementById('inventory-actions').classList.remove('hidden');
    document.getElementById('inventory-quantity').focus();
}

// Función para procesar acción de inventario
function processInventoryAction(event) {
    event.preventDefault();
    
    const code = document.getElementById('inventory-product-code').value;
    const action = document.getElementById('inventory-action').value;
    const quantity = parseInt(document.getElementById('inventory-quantity').value);
    const reason = document.getElementById('inventory-reason').value.trim();
    
    if (quantity <= 0) {
        showNotification('La cantidad debe ser mayor a cero', 'error');
        return;
    }
    
    if (!reason) {
        showNotification('Debe especificar un motivo', 'error');
        return;
    }
    
    const product = database.products.find(p => p.code === code);
    if (!product) {
        showNotification('Producto no encontrado', 'error');
        return;
    }
    
    if (action === 'remove' && quantity > product.units) {
        showNotification('No hay suficientes unidades para retirar', 'error');
        return;
    }
    
    addInventoryLog(code, action, quantity, reason);
    
    // Limpiar y ocultar
    event.target.reset();
    document.getElementById('inventory-actions').classList.add('hidden');
    
    showNotification('Inventario actualizado', 'success');
    saveToLocalStorage();
}

// Función para agregar registro de inventario
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
        user: currentUser.username,
        newStock: product.units
    });
    
    // Actualizar vistas
    renderInventory();
    checkLowStock();
    
    // Si estamos en la pestaña de ventas, actualizar productos disponibles
    if (document.getElementById('sales').classList.contains('active')) {
        setupSaleProducts();
    }
}

// Función para verificar stock bajo
function checkLowStock() {
    const alertsContainer = document.getElementById('inventory-alerts');
    alertsContainer.innerHTML = '';
    
    const lowStockProducts = database.products.filter(p => p.units <= p.minStock);
    
    if (lowStockProducts.length > 0) {
        alertsContainer.classList.remove('hidden');
        
        lowStockProducts.forEach(product => {
            const alert = document.createElement('div');
            alert.className = 'alert alert-warning';
            alert.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i> 
                <strong>¡Stock bajo!</strong> ${product.name} (${product.code}): ${product.units} unidades restantes
            `;
            alertsContainer.appendChild(alert);
        });
    } else {
        alertsContainer.classList.add('hidden');
    }
}

// Configuración de pestaña de ventas
function setupSalesTab() {
    const salesTab = document.getElementById('sales');
    
    salesTab.innerHTML = `
        <h2><i class="fas fa-cash-register"></i> Nueva Venta</h2>
        
        <div class="form-group">
            <label for="sale-search"><i class="fas fa-search"></i> Buscar Producto:</label>
            <input type="text" id="sale-search" placeholder="Ingrese código o nombre">
        </div>
        
        <div class="quick-actions">
            <div class="quick-action" data-code="HAM001"><i class="fas fa-hamburger"></i> Hamburguesa</div>
            <div class="quick-action" data-code="PER001"><i class="fas fa-hotdog"></i> Perro Caliente</div>
            <div class="quick-action" data-code="PAP001"><i class="fas fa-french-fries"></i> Papas Fritas</div>
            <div class="quick-action" data-code="REF001"><i class="fas fa-glass-whiskey"></i> Refresco</div>
        </div>
        
        <div class="product-grid" id="sale-products-grid"></div>
        
        <div class="sale-summary">
            <h3><i class="fas fa-receipt"></i> Resumen de Venta</h3>
            
            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th><i class="fas fa-tag"></i> Producto</th>
                            <th><i class="fas fa-tags"></i> Precio Unit.</th>
                            <th><i class="fas fa-calculator"></i> Cantidad</th>
                            <th><i class="fas fa-money-bill-wave"></i> Subtotal</th>
                            <th><i class="fas fa-trash-alt"></i> Acción</th>
                        </tr>
                    </thead>
                    <tbody id="sale-items"></tbody>
                </table>
            </div>
            
            <div class="totals">
                <div class="form-group">
                    <label for="sale-total"><i class="fas fa-dollar-sign"></i> Total ($):</label>
                    <input type="text" id="sale-total" readonly>
                </div>
                
                <div class="form-group">
                    <label for="sale-total-bs"><i class="fas fa-bolt"></i> Total (Bs):</label>
                    <input type="text" id="sale-total-bs" readonly>
                </div>
            </div>
            
            <div class="payment-section">
                <h4><i class="fas fa-credit-card"></i> Método de Pago</h4>
                <div class="payment-methods">
                    <div class="payment-method" data-method="cash-dollars"><i class="fas fa-money-bill-wave"></i> Efectivo $</div>
                    <div class="payment-method" data-method="cash-bs"><i class="fas fa-money-bill-alt"></i> Efectivo Bs</div>
                    <div class="payment-method" data-method="mobile-bs"><i class="fas fa-mobile-alt"></i> PagoMóvil Bs</div>
                    <div class="payment-method" data-method="card-bs"><i class="fas fa-credit-card"></i> Tarjeta Bs</div>
                </div>
            </div>
            
            <div class="change-calculator hidden">
                <h4><i class="fas fa-calculator"></i> Calculadora de Cambio</h4>
                <div class="form-group">
                    <label for="amount-received"><i class="fas fa-hand-holding-usd"></i> Monto Recibido:</label>
                    <input type="number" id="amount-received" step="0.01" min="0">
                </div>
                <div id="change-result" class="alert alert-info"></div>
            </div>
            
            <button id="complete-sale" class="btn-success"><i class="fas fa-check-circle"></i> Completar Venta</button>
            <button id="cancel-sale" class="btn-danger"><i class="fas fa-times-circle"></i> Cancelar Venta</button>
        </div>
    `;
    
    // Event listeners
    document.getElementById('sale-search').addEventListener('input', filterSaleProducts);
    document.querySelectorAll('.quick-action').forEach(action => {
        action.addEventListener('click', () => {
            const code = action.getAttribute('data-code');
            addToSale(code);
        });
    });
    
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', selectPaymentMethod);
    });
    
    document.getElementById('complete-sale').addEventListener('click', completeSale);
    document.getElementById('cancel-sale').addEventListener('click', cancelSale);
    document.getElementById('amount-received').addEventListener('input', calculateChange);
    
    // Configurar productos para venta
    setupSaleProducts();
}

// Función para filtrar productos en venta
function filterSaleProducts() {
    const searchTerm = this.value.toLowerCase();
    const cards = document.querySelectorAll('#sale-products-grid .product-card');
    
    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Función para configurar productos disponibles para venta
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
                <p><i class="fas fa-barcode"></i> ${product.code}</p>
                <p><i class="fas fa-tags"></i> Precio: $${product.salePrice.toFixed(2)} (Bs ${(product.salePrice * database.settings.exchangeRate).toFixed(2)})</p>
                <p><i class="fas fa-boxes"></i> Disponibles: ${product.units}</p>
            `;
            
            card.addEventListener('click', () => addToSale(product.code));
            grid.appendChild(card);
        }
    });
}

// Función para agregar producto a la venta
function addToSale(code) {
    const product = database.products.find(p => p.code === code);
    if (!product || product.units <= 0) {
        showNotification('Producto no disponible', 'error');
        return;
    }
    
    // Verificar si ya está en la venta
    const existingItem = currentSale.find(item => item.code === code);
    
    if (existingItem) {
        if (existingItem.quantity < product.units) {
            existingItem.quantity++;
        } else {
            showNotification('No hay suficientes unidades disponibles', 'warning');
        }
    } else {
        currentSale.push({
            code: product.code,
            name: product.name,
            price: product.salePrice,
            quantity: 1,
            cost: product.cost
        });
    }
    
    renderSaleItems();
}

// Función para renderizar items de la venta
function renderSaleItems() {
    const tbody = document.getElementById('sale-items');
    tbody.innerHTML = '';
    
    let total = 0;
    let totalCost = 0;
    
    currentSale.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        totalCost += item.cost * item.quantity;
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${item.name}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td class="quantity-controls">
                <button class="btn-secondary decrease-quantity" data-index="${index}"><i class="fas fa-minus"></i></button>
                <span>${item.quantity}</span>
                <button class="btn-secondary increase-quantity" data-index="${index}"><i class="fas fa-plus"></i></button>
            </td>
            <td>$${subtotal.toFixed(2)}</td>
            <td><button class="btn-danger remove-item" data-index="${index}"><i class="fas fa-trash-alt"></i></button></td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Actualizar totales
    document.getElementById('sale-total').value = total.toFixed(2);
    document.getElementById('sale-total-bs').value = (total * database.settings.exchangeRate).toFixed(2);
    
    // Mostrar/ocultar calculadora de cambio si es pago en efectivo
    const changeCalculator = document.querySelector('.change-calculator');
    if (selectedPaymentMethod && (selectedPaymentMethod === 'cash-dollars' || selectedPaymentMethod === 'cash-bs')) {
        changeCalculator.classList.remove('hidden');
    } else {
        changeCalculator.classList.add('hidden');
    }
    
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

// Función para ajustar cantidad de un item
function adjustQuantity(index, change) {
    const item = currentSale[index];
    const product = database.products.find(p => p.code === item.code);
    
    const newQuantity = item.quantity + change;
    
    if (newQuantity <= 0) {
        currentSale.splice(index, 1);
    } else if (newQuantity > product.units) {
        showNotification('No hay suficientes unidades disponibles', 'warning');
    } else {
        item.quantity = newQuantity;
    }
    
    renderSaleItems();
}

// Función para eliminar item de la venta
function removeItem(index) {
    currentSale.splice(index, 1);
    renderSaleItems();
}

// Función para seleccionar método de pago
function selectPaymentMethod(event) {
    const method = event.target.getAttribute('data-method');
    selectedPaymentMethod = method;
    
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    // Mostrar calculadora de cambio si es pago en efectivo
    const changeCalculator = document.querySelector('.change-calculator');
    if (method === 'cash-dollars' || method === 'cash-bs') {
        changeCalculator.classList.remove('hidden');
        document.getElementById('amount-received').value = '';
        document.getElementById('change-result').textContent = '';
    } else {
        changeCalculator.classList.add('hidden');
    }
    
    renderSaleItems();
}

// Función para calcular cambio
function calculateChange() {
    const amountReceived = parseFloat(this.value) || 0;
    const total = parseFloat(document.getElementById('sale-total').value);
    
    if (selectedPaymentMethod === 'cash-dollars') {
        const change = amountReceived - total;
        document.getElementById('change-result').innerHTML = `
            <i class="fas fa-exchange-alt"></i> Cambio: $${change.toFixed(2)}
        `;
    } else if (selectedPaymentMethod === 'cash-bs') {
        const totalBs = parseFloat(document.getElementById('sale-total-bs').value);
        const change = amountReceived - totalBs;
        document.getElementById('change-result').innerHTML = `
            <i class="fas fa-exchange-alt"></i> Cambio: Bs ${change.toFixed(2)}
        `;
    }
}

// Función para completar venta
function completeSale() {
    if (currentSale.length === 0) {
        showNotification('No hay productos en la venta', 'error');
        return;
    }
    
    if (!selectedPaymentMethod) {
        showNotification('Seleccione un método de pago', 'error');
        return;
    }
    
    // Verificar si es pago en efectivo y se ingresó monto recibido
    if (selectedPaymentMethod === 'cash-dollars' || selectedPaymentMethod === 'cash-bs') {
        const amountReceived = parseFloat(document.getElementById('amount-received').value) || 0;
        const total = selectedPaymentMethod === 'cash-dollars' ? 
            parseFloat(document.getElementById('sale-total').value) :
            parseFloat(document.getElementById('sale-total-bs').value);
        
        if (amountReceived < total) {
            showNotification('El monto recibido es menor al total', 'error');
            return;
        }
    }
    
    // Registrar venta
    const totalDollars = parseFloat(document.getElementById('sale-total').value);
    const totalBs = parseFloat(document.getElementById('sale-total-bs').value);
    
    const sale = {
        id: Date.now().toString(),
        date: new Date(),
        items: [...currentSale],
        totalDollars,
        totalBs,
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
            addInventoryLog(item.code, 'remove', item.quantity, 'Venta registrada');
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
    const message = `Venta completada exitosamente\n` +
                   `Total: $${sale.totalDollars.toFixed(2)} (Bs ${sale.totalBs.toFixed(2)})\n` +
                   `Método: ${methodText}`;
    
    showNotification(message, 'success');
    
    // Limpiar selección de pago
    document.querySelectorAll('.payment-method').forEach(el => {
        el.classList.remove('active');
    });
    
    // Guardar en localStorage
    saveToLocalStorage();
    
    // Verificar si hay 100 ventas para notificar al admin
    if (currentUser.role === 'admin' && database.sales.length % 100 === 0) {
        showNotification(`Se han registrado ${database.sales.length} ventas. Considere exportar los reportes para mantener el sistema óptimo.`, 'warning');
    }
}

// Función para cancelar venta
function cancelSale() {
    if (currentSale.length === 0) {
        showNotification('No hay venta para cancelar', 'warning');
        return;
    }
    
    showModal(
        'Cancelar Venta',
        '¿Está seguro de cancelar esta venta? Todos los productos serán devueltos al inventario.',
        () => {
            currentSale = [];
            selectedPaymentMethod = null;
            renderSaleItems();
            showNotification('Venta cancelada', 'info');
        }
    );
}

// Función para obtener texto de método de pago
function getPaymentMethodText(method) {
    const methods = {
        'cash-dollars': 'Efectivo $',
        'cash-bs': 'Efectivo Bs',
        'mobile-bs': 'PagoMóvil Bs',
        'card-bs': 'Tarjeta Bs'
    };
    return methods[method] || method;
}

// Configuración de pestaña de reportes
function setupReportsTab() {
    const reportsTab = document.getElementById('reports');
    
    reportsTab.innerHTML = `
        <h2><i class="fas fa-chart-bar"></i> Reportes de Ventas</h2>
        
        <div class="filters">
            <div class="form-row">
                <div class="form-group">
                    <label for="report-start-date"><i class="fas fa-calendar-alt"></i> Fecha inicio:</label>
                    <input type="date" id="report-start-date">
                </div>
                <div class="form-group">
                    <label for="report-end-date"><i class="fas fa-calendar-alt"></i> Fecha fin:</label>
                    <input type="date" id="report-end-date">
                </div>
                <div class="form-group">
                    <label for="report-cashier"><i class="fas fa-user"></i> Cajero:</label>
                    <select id="report-cashier">
                        <option value="all">Todos</option>
                    </select>
                </div>
            </div>
            
            <button id="apply-filters" class="btn-primary"><i class="fas fa-filter"></i> Aplicar Filtros</button>
            <button id="reset-filters" class="btn-secondary"><i class="fas fa-redo"></i> Reiniciar</button>
            <button id="export-report" class="btn-success"><i class="fas fa-file-pdf"></i> Exportar a PDF</button>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <h4><i class="fas fa-dollar-sign"></i> Total en $</h4>
                <p id="total-dollars">$0.00</p>
            </div>
            <div class="stat-card">
                <h4><i class="fas fa-bolt"></i> Total en Bs</h4>
                <p id="total-bs">Bs 0.00</p>
            </div>
            <div class="stat-card">
                <h4><i class="fas fa-cash-register"></i> Ventas</h4>
                <p id="total-sales">0</p>
            </div>
            <div class="stat-card">
                <h4><i class="fas fa-boxes"></i> Productos</h4>
                <p id="total-products">0</p>
            </div>
        </div>
        
        <div class="charts">
            <canvas id="sales-chart" width="400" height="200"></canvas>
        </div>
        
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th><i class="fas fa-calendar"></i> Fecha</th>
                        <th><i class="fas fa-clock"></i> Hora</th>
                        <th><i class="fas fa-user"></i> Cajero</th>
                        <th><i class="fas fa-list"></i> Productos</th>
                        <th><i class="fas fa-dollar-sign"></i> Total $</th>
                        <th><i class="fas fa-bolt"></i> Total Bs</th>
                        <th><i class="fas fa-credit-card"></i> Método</th>
                        <th><i class="fas fa-cog"></i> Acciones</th>
                    </tr>
                </thead>
                <tbody id="reports-table-body"></tbody>
            </table>
        </div>
    `;
    
    // Configurar select de cajeros
    const cashierSelect = document.getElementById('report-cashier');
    const cashiers = [...new Set(database.users.map(u => u.name))];
    cashiers.forEach(cashier => {
        const option = document.createElement('option');
        option.value = cashier;
        option.textContent = cashier;
        cashierSelect.appendChild(option);
    });
    
    // Event listeners
    document.getElementById('apply-filters').addEventListener('click', applyReportFilters);
    document.getElementById('reset-filters').addEventListener('click', resetReportFilters);
    document.getElementById('export-report').addEventListener('click', exportReportToPDF);
    
    // Renderizar reportes iniciales
    renderReports();
}

// Función para aplicar filtros a reportes
function applyReportFilters() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const cashier = document.getElementById('report-cashier').value;
    
    let filteredSales = [...database.sales];
    
    if (startDate) {
        const start = new Date(startDate);
        filteredSales = filteredSales.filter(sale => new Date(sale.date) >= start);
    }
    
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Incluir todo el día
        filteredSales = filteredSales.filter(sale => new Date(sale.date) <= end);
    }
    
    if (cashier !== 'all') {
        filteredSales = filteredSales.filter(sale => sale.cashier === cashier);
    }
    
    renderReports(filteredSales);
}

// Función para reiniciar filtros
function resetReportFilters() {
    document.getElementById('report-start-date').value = '';
    document.getElementById('report-end-date').value = '';
    document.getElementById('report-cashier').value = 'all';
    renderReports();
}

// Función para renderizar reportes
function renderReports(sales = database.sales) {
    const tbody = document.getElementById('reports-table-body');
    tbody.innerHTML = '';
    
    // Calcular totales
    let totalDollars = 0;
    let totalBs = 0;
    let totalProducts = 0;
    
    sales.forEach(sale => {
        const date = new Date(sale.date);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const productsList = sale.items.map(item => 
            `${item.name} (${item.quantity}x)`
        ).join(', ');
        
        const productsCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        
        totalDollars += sale.totalDollars;
        totalBs += sale.totalBs;
        totalProducts += productsCount;
        
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${dateStr}</td>
            <td>${timeStr}</td>
            <td>${sale.cashier}</td>
            <td>${productsList}</td>
            <td>$${sale.totalDollars.toFixed(2)}</td>
            <td>Bs ${sale.totalBs.toFixed(2)}</td>
            <td>${getPaymentMethodText(sale.paymentMethod)}</td>
            <td class="actions">
                <button class="btn-secondary view-sale" data-id="${sale.id}"><i class="fas fa-eye"></i></button>
                ${currentUser.role === 'admin' ? 
                    `<button class="btn-danger delete-sale" data-id="${sale.id}"><i class="fas fa-trash-alt"></i></button>` : ''}
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Actualizar estadísticas
    document.getElementById('total-dollars').textContent = `$${totalDollars.toFixed(2)}`;
    document.getElementById('total-bs').textContent = `Bs ${totalBs.toFixed(2)}`;
    document.getElementById('total-sales').textContent = sales.length;
    document.getElementById('total-products').textContent = totalProducts;
    
    // Actualizar gráfico
    updateSalesChart(sales);
    
    // Agregar event listeners
    document.querySelectorAll('.view-sale').forEach(btn => {
        btn.addEventListener('click', () => viewSaleDetails(btn.getAttribute('data-id')));
    });
    
    if (currentUser.role === 'admin') {
        document.querySelectorAll('.delete-sale').forEach(btn => {
            btn.addEventListener('click', () => {
                requestAdminPassword(() => deleteSale(btn.getAttribute('data-id')));
            });
        });
    }
}

// Función para ver detalles de venta
function viewSaleDetails(saleId) {
    const sale = database.sales.find(s => s.id === saleId);
    if (!sale) return;
    
    const date = new Date(sale.date);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    let itemsHtml = sale.items.map(item => `
        <tr>
            <td>${item.name}</td>
            <td>${item.code}</td>
            <td>${item.quantity}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
    `).join('');
    
    showModal(
        `Detalles de Venta #${sale.id}`,
        `
        <div class="sale-details">
            <p><strong>Fecha:</strong> ${dateStr} ${timeStr}</p>
            <p><strong>Cajero:</strong> ${sale.cashier}</p>
            <p><strong>Método de pago:</strong> ${getPaymentMethodText(sale.paymentMethod)}</p>
            <p><strong>Tasa de cambio:</strong> $1 = ${sale.exchangeRate} Bs</p>
            
            <h4>Productos:</h4>
            <table class="sale-items">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Código</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            
            <div class="sale-totals">
                <p><strong>Total en dólares:</strong> $${sale.totalDollars.toFixed(2)}</p>
                <p><strong>Total en bolívares:</strong> Bs ${sale.totalBs.toFixed(2)}</p>
            </div>
        </div>
        `,
        () => {}
    );
}

// Función para eliminar venta
function deleteSale(saleId) {
    const saleIndex = database.sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1) return;
    
    const sale = database.sales[saleIndex];
    
    showModal(
        'Eliminar Venta',
        `¿Está seguro de eliminar esta venta del ${new Date(sale.date).toLocaleDateString()} por $${sale.totalDollars.toFixed(2)}? Esta acción no se puede deshacer.`,
        () => {
            // Devolver productos al inventario
            sale.items.forEach(item => {
                const product = database.products.find(p => p.code === item.code);
                if (product) {
                    product.units += item.quantity;
                    addInventoryLog(item.code, 'add', item.quantity, 'Venta eliminada');
                }
            });
            
            // Eliminar venta
            database.sales.splice(saleIndex, 1);
            
            // Actualizar reportes
            renderReports();
            showNotification('Venta eliminada correctamente', 'success');
            saveToLocalStorage();
        }
    );
}

// Función para actualizar gráfico de ventas
function updateSalesChart(sales = database.sales) {
    const ctx = document.getElementById('sales-chart').getContext('2d');
    
    // Agrupar ventas por fecha
    const salesByDate = {};
    sales.forEach(sale => {
        const date = new Date(sale.date).toLocaleDateString();
        if (!salesByDate[date]) {
            salesByDate[date] = {
                dollars: 0,
                bolivares: 0,
                count: 0
            };
        }
        salesByDate[date].dollars += sale.totalDollars;
        salesByDate[date].bolivares += sale.totalBs;
        salesByDate[date].count++;
    });
    
    const dates = Object.keys(salesByDate);
    const dollarsData = dates.map(date => salesByDate[date].dollars);
    const bolivaresData = dates.map(date => salesByDate[date].bolivares);
    const countData = dates.map(date => salesByDate[date].count);
    
    // Si ya existe un gráfico, destruirlo
    if (window.salesChart) {
        window.salesChart.destroy();
    }
    
    window.salesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Ventas en $',
                    data: dollarsData,
                    backgroundColor: 'rgba(231, 76, 60, 0.7)',
                    yAxisID: 'y'
                },
                {
                    label: 'Ventas en Bs',
                    data: bolivaresData,
                    backgroundColor: 'rgba(243, 156, 18, 0.7)',
                    yAxisID: 'y1'
                },
                {
                    label: 'Número de ventas',
                    data: countData,
                    type: 'line',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Resumen de Ventas'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Dólares ($)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Bolívares (Bs)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                y2: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Número de ventas'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    min: 0
                }
            }
        }
    });
}

// Función para exportar reporte a PDF
function exportReportToPDF() {
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const cashier = document.getElementById('report-cashier').value;
    
    let filteredSales = [...database.sales];
    let title = 'Reporte de Ventas - PONCE BURGUER';
    
    if (startDate || endDate || cashier !== 'all') {
        title += ' (Filtrado)';
        
        if (startDate) {
            const start = new Date(startDate);
            filteredSales = filteredSales.filter(sale => new Date(sale.date) >= start);
        }
        
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filteredSales = filteredSales.filter(sale => new Date(sale.date) <= end);
        }
        
        if (cashier !== 'all') {
            filteredSales = filteredSales.filter(sale => sale.cashier === cashier);
        }
    }
    
    if (filteredSales.length === 0) {
        showNotification('No hay datos para exportar con los filtros actuales', 'warning');
        return;
    }
    
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text(title, 105, 15, { align: 'center' });
    
    // Filtros aplicados
    doc.setFontSize(10);
    let filtersText = `Generado el: ${new Date().toLocaleDateString()} | `;
    
    if (startDate || endDate) {
        filtersText += `Período: ${startDate || 'Inicio'} - ${endDate || 'Fin'} | `;
    }
    
    if (cashier !== 'all') {
        filtersText += `Cajero: ${cashier} | `;
    }
    
    filtersText += `Total ventas: ${filteredSales.length}`;
    
    doc.text(filtersText, 105, 22, { align: 'center' });
    
    // Estadísticas
    const totalDollars = filteredSales.reduce((sum, sale) => sum + sale.totalDollars, 0);
    const totalBs = filteredSales.reduce((sum, sale) => sum + sale.totalBs, 0);
    
    doc.setFontSize(12);
    doc.text(`Total en dólares: $${totalDollars.toFixed(2)}`, 20, 35);
    doc.text(`Total en bolívares: Bs ${totalBs.toFixed(2)}`, 20, 42);
    doc.text(`Tasa de cambio promedio: $1 = ${(totalBs / totalDollars).toFixed(2)} Bs`, 20, 49);
    
    // Tabla de ventas
    doc.setFontSize(12);
    doc.setDrawColor(0);
    doc.setFillColor(231, 76, 60);
    doc.rect(10, 60, 190, 10, 'F');
    doc.setTextColor(255);
    doc.text('Fecha', 15, 66);
    doc.text('Cajero', 50, 66);
    doc.text('Total $', 120, 66);
    doc.text('Total Bs', 160, 66);
    doc.text('Método', 190, 66);
    
    // Datos de ventas
    doc.setFontSize(10);
    doc.setTextColor(0);
    let y = 72;
    
    filteredSales.forEach((sale, index) => {
        if (y > 280) {
            doc.addPage();
            y = 20;
        }
        
        const date = new Date(sale.date).toLocaleDateString();
        
        doc.text(date, 15, y);
        doc.text(sale.cashier, 50, y);
        doc.text(sale.totalDollars.toFixed(2), 120, y);
        doc.text(sale.totalBs.toFixed(2), 160, y);
        doc.text(getPaymentMethodText(sale.paymentMethod).substring(0, 3), 190, y);
        
        // Línea separadora
        if (index < filteredSales.length - 1) {
            doc.line(10, y + 4, 200, y + 4);
        }
        
        y += 8;
    });
    
    // Guardar PDF
    let fileName = 'PonceBurguer_Reporte';
    
    if (startDate) fileName += `_${startDate}`;
    if (endDate) fileName += `-${endDate}`;
    if (cashier !== 'all') fileName += `_${cashier.replace(' ', '')}`;
    
    fileName += `.pdf`;
    
    doc.save(fileName);
    showNotification('Reporte exportado a PDF', 'success');
}

// Configuración de pestaña de moneda
function setupCurrencyTab() {
    const currencyTab = document.getElementById('currency');
    
    currencyTab.innerHTML = `
        <h2><i class="fas fa-exchange-alt"></i> Configuración de Moneda</h2>
        
        <form id="currency-form">
            <div class="form-group">
                <label for="exchange-rate"><i class="fas fa-dollar-sign"></i> Tasa de Cambio ($1 = Bs):</label>
                <input type="number" id="exchange-rate" step="0.01" min="0" value="${database.settings.exchangeRate}" required>
            </div>
            
            <div class="form-group">
                <label for="low-stock"><i class="fas fa-exclamation-triangle"></i> Alerta de stock bajo (unidades):</label>
                <input type="number" id="low-stock" min="1" value="${database.settings.lowStockThreshold}" required>
            </div>
            
            <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Guardar Configuración</button>
        </form>
        
        <div id="currency-message" class="alert hidden"></div>
        
        <div class="currency-history">
            <h3><i class="fas fa-history"></i> Historial de Tasas</h3>
            <table>
                <thead>
                    <tr>
                        <th><i class="fas fa-calendar"></i> Fecha</th>
                        <th><i class="fas fa-user"></i> Usuario</th>
                        <th><i class="fas fa-dollar-sign"></i> Tasa (Bs/$)</th>
                    </tr>
                </thead>
                <tbody id="rate-history"></tbody>
            </table>
        </div>
    `;
    
    // Event listener para el formulario
    document.getElementById('currency-form').addEventListener('submit', saveCurrencySettings);
    
    // Renderizar historial de tasas
    renderRateHistory();
}

// Función para guardar configuración de moneda
function saveCurrencySettings(event) {
    event.preventDefault();
    
    const rate = parseFloat(document.getElementById('exchange-rate').value);
    const lowStock = parseInt(document.getElementById('low-stock').value);
    
    if (isNaN(rate) || rate <= 0) {
        showNotification('La tasa de cambio debe ser mayor a cero', 'error', 'currency-message');
        return;
    }
    
    if (isNaN(lowStock) || lowStock <= 0) {
        showNotification('El stock mínimo debe ser mayor a cero', 'error', 'currency-message');
        return;
    }
    
    // Registrar cambio de tasa si es diferente
    if (rate !== database.settings.exchangeRate) {
        database.settings.exchangeRateHistory = database.settings.exchangeRateHistory || [];
        database.settings.exchangeRateHistory.push({
            rate: database.settings.exchangeRate,
            changedTo: rate,
            date: new Date(),
            user: currentUser.username
        });
    }
    
    database.settings.exchangeRate = rate;
    database.settings.lowStockThreshold = lowStock;
    
    // Actualizar umbral en todos los productos
    database.products.forEach(product => {
        product.minStock = lowStock;
    });
    
    // Verificar stock bajo con el nuevo umbral
    checkLowStock();
    
    showNotification('Configuración guardada correctamente', 'success', 'currency-message');
    renderRateHistory();
    saveToLocalStorage();
}

// Función para renderizar historial de tasas
function renderRateHistory() {
    const tbody = document.getElementById('rate-history');
    tbody.innerHTML = '';
    
    const history = database.settings.exchangeRateHistory || [];
    
    if (history.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="3" class="text-center">No hay historial registrado</td>`;
        tbody.appendChild(row);
        return;
    }
    
    // Ordenar por fecha (más reciente primero)
    history.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    history.forEach(item => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${new Date(item.date).toLocaleDateString()}</td>
            <td>${item.user}</td>
            <td>${item.rate.toFixed(2)} → ${item.changedTo.toFixed(2)}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// Configuración de pestaña de usuarios
function setupUsersTab() {
    const usersTab = document.getElementById('users');
    
    // Ocultar pestaña si no es admin
    if (currentUser.role !== 'admin') {
        usersTab.style.display = 'none';
        return;
    }
    
    usersTab.innerHTML = `
        <h2><i class="fas fa-users"></i> Gestión de Usuarios</h2>
        
        <div class="user-actions">
            <button id="add-user" class="btn-primary"><i class="fas fa-user-plus"></i> Agregar Usuario</button>
        </div>
        
        <div class="table-responsive">
            <table>
                <thead>
                    <tr>
                        <th><i class="fas fa-user"></i> Usuario</th>
                        <th><i class="fas fa-id-card"></i> Nombre</th>
                        <th><i class="fas fa-user-tag"></i> Rol</th>
                        <th><i class="fas fa-calendar"></i> Fecha Creación</th>
                        <th><i class="fas fa-cog"></i> Acciones</th>
                    </tr>
                </thead>
                <tbody id="users-table-body"></tbody>
            </table>
        </div>
        
        <div id="user-form-container" class="hidden">
            <h3 id="user-form-title"><i class="fas fa-user-edit"></i> Agregar Usuario</h3>
            <form id="user-form">
                <input type="hidden" id="user-username-original">
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="user-username"><i class="fas fa-user-tag"></i> Usuario:</label>
                        <input type="text" id="user-username" required>
                    </div>
                    <div class="form-group">
                        <label for="user-name"><i class="fas fa-id-card"></i> Nombre:</label>
                        <input type="text" id="user-name" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="user-password"><i class="fas fa-lock"></i> Contraseña:</label>
                        <input type="password" id="user-password">
                    </div>
                    <div class="form-group">
                        <label for="user-confirm-password"><i class="fas fa-lock"></i> Confirmar Contraseña:</label>
                        <input type="password" id="user-confirm-password">
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="user-role"><i class="fas fa-user-tag"></i> Rol:</label>
                    <select id="user-role" required>
                        <option value="admin">Administrador</option>
                        <option value="cashier">Cajero</option>
                    </select>
                </div>
                
                <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Guardar</button>
                <button type="button" id="cancel-user" class="btn-danger"><i class="fas fa-times"></i> Cancelar</button>
            </form>
        </div>
    `;
    
    // Event listeners
    document.getElementById('add-user').addEventListener('click', () => showUserForm());
    document.getElementById('cancel-user').addEventListener('click', () => {
        document.getElementById('user-form-container').classList.add('hidden');
    });
    document.getElementById('user-form').addEventListener('submit', saveUser);
    
    // Renderizar usuarios
    renderUsers();
}

// Función para renderizar lista de usuarios
function renderUsers() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    
    database.users.forEach(user => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.name}</td>
            <td>${user.role === 'admin' ? 'Administrador' : 'Cajero'}</td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td class="actions">
                <button class="btn-secondary edit-user" data-username="${user.username}"><i class="fas fa-edit"></i> Editar</button>
                ${user.username !== currentUser.username ? 
                    `<button class="btn-danger delete-user" data-username="${user.username}"><i class="fas fa-trash-alt"></i> Eliminar</button>` : 
                    '<button class="btn-danger" disabled><i class="fas fa-trash-alt"></i> Eliminar</button>'}
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // Agregar event listeners
    document.querySelectorAll('.edit-user').forEach(btn => {
        btn.addEventListener('click', () => editUser(btn.getAttribute('data-username')));
    });
    
    document.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', () => {
            const username = btn.getAttribute('data-username');
            showModal(
                'Eliminar Usuario',
                `¿Está seguro de eliminar al usuario ${username}? Esta acción no se puede deshacer.`,
                () => deleteUser(username)
            );
        });
    });
}

// Función para mostrar formulario de usuario
function showUserForm(user = null) {
    const formContainer = document.getElementById('user-form-container');
    const formTitle = document.getElementById('user-form-title');
    const form = document.getElementById('user-form');
    
    form.reset();
    formTitle.textContent = user ? 'Editar Usuario' : 'Agregar Usuario';
    document.getElementById('user-username-original').value = user ? user.username : '';
    
    if (user) {
        document.getElementById('user-username').value = user.username;
        document.getElementById('user-name').value = user.name;
        document.getElementById('user-role').value = user.role;
        
        // Las contraseñas no se precargan por seguridad
        document.getElementById('user-password').placeholder = 'Dejar en blanco para no cambiar';
        document.getElementById('user-confirm-password').placeholder = 'Dejar en blanco para no cambiar';
    } else {
        document.getElementById('user-password').placeholder = '';
        document.getElementById('user-confirm-password').placeholder = '';
        document.getElementById('user-role').value = 'cashier';
    }
    
    formContainer.classList.remove('hidden');
}

// Función para editar usuario
function editUser(username) {
    const user = database.users.find(u => u.username === username);
    if (!user) return;
    
    showUserForm(user);
}

// Función para guardar usuario
async function saveUser(event) {
    event.preventDefault();
    
    const originalUsername = document.getElementById('user-username-original').value;
    const username = document.getElementById('user-username').value.trim();
    const name = document.getElementById('user-name').value.trim();
    const password = document.getElementById('user-password').value;
    const confirmPassword = document.getElementById('user-confirm-password').value;
    const role = document.getElementById('user-role').value;
    
    if (!username || !name || !role) {
        showNotification('Todos los campos son obligatorios', 'error');
        return;
    }
    
    // Validar contraseña si es nuevo usuario o se está cambiando
    if ((!originalUsername || password) && password !== confirmPassword) {
        showNotification('Las contraseñas no coinciden', 'error');
        return;
    }
    
    if ((!originalUsername || password) && password.length < 6) {
        showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    // Verificar si el nombre de usuario ya existe (excepto para edición del mismo usuario)
    if (database.users.some(u => u.username === username && u.username !== originalUsername)) {
        showNotification('El nombre de usuario ya está en uso', 'error');
        return;
    }
    
    // Si es un usuario nuevo o se está cambiando la contraseña
    const hashedPassword = password ? await hashPassword(password) : null;
    
    if (originalUsername) {
        // Editar usuario existente
        const userIndex = database.users.findIndex(u => u.username === originalUsername);
        if (userIndex === -1) return;
        
        const user = database.users[userIndex];
        user.username = username;
        user.name = name;
        user.role = role;
        
        if (hashedPassword) {
            user.password = hashedPassword;
        }
        
        showNotification('Usuario actualizado correctamente', 'success');
    } else {
        // Crear nuevo usuario
        database.users.push({
            username,
            password: hashedPassword,
            name,
            role,
            createdAt: new Date()
        });
        
        showNotification('Usuario creado correctamente', 'success');
    }
    
    // Cerrar formulario y actualizar lista
    document.getElementById('user-form-container').classList.add('hidden');
    renderUsers();
    saveToLocalStorage();
}

// Función para eliminar usuario
function deleteUser(username) {
    if (username === currentUser.username) {
        showNotification('No puede eliminarse a sí mismo', 'error');
        return;
    }
    
    const userIndex = database.users.findIndex(u => u.username === username);
    if (userIndex === -1) return;
    
    database.users.splice(userIndex, 1);
    renderUsers();
    showNotification('Usuario eliminado correctamente', 'success');
    saveToLocalStorage();
}

// Función para cargar datos iniciales
function loadInitialData() {
    // Si no hay productos, cargar datos de ejemplo
    if (database.products.length === 0) {
        const sampleProducts = [
            { name: 'Hamburguesa Clásica', cost: 3.50, utility: 30, units: 20 },
            { name: 'Hamburguesa Especial', cost: 4.50, utility: 30, units: 15 },
            { name: 'Perro Caliente', cost: 2.80, utility: 25, units: 18 },
            { name: 'Papas Fritas', cost: 1.50, utility: 40, units: 25 },
            { name: 'Refresco', cost: 1.00, utility: 50, units: 30 }
        ];
        
        sampleProducts.forEach(p => {
            const code = generateProductCode(p.name);
            const salePrice = p.cost / (1 - (p.utility / 100));
            
            database.products.push({
                code,
                name: p.name,
                cost: p.cost,
                utility: p.utility,
                salePrice,
                potentialProfit: salePrice - p.cost,
                units: p.units,
                minStock: database.settings.lowStockThreshold
            });
            
            // Registrar en inventario
            addInventoryLog(code, 'initial', p.units, 'Registro inicial');
            
            // Registrar en lista de costos
            database.costList.push({
                code,
                name: p.name,
                cost: p.cost,
                date: new Date(),
                registeredBy: 'system'
            });
        });
        
        // Guardar en localStorage
        saveToLocalStorage();
    }
    
    // Renderizar vistas
    renderProducts();
    renderInventory();
    setupSaleProducts();
    renderReports();
    checkLowStock();
}
