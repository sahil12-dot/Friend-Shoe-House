
// CHANGE THIS TO YOUR BUSINESS WHATSAPP NUMBER
// Example: 919876543210 (without + sign)
const WHATSAPP_NUMBER = "916280172514";

// PRODUCTS
const products = [
    {
        id: 1,
        name: "Red Air Sneakers",
        category: "Sneakers",
        price: 1499,
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600"
    },
    {
        id: 2,
        name: "Classic White Shoes",
        category: "Casual",
        price: 1199,
        image: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=600"
    },
    {
        id: 3,
        name: "Sports Running Shoes",
        category: "Sports",
        price: 1799,
        image: "https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600"
    },
    {
        id: 4,
        name: "Black Street Sneakers",
        category: "Sneakers",
        price: 1599,
        image: "https://images.unsplash.com/photo-1495555961986-6d4c1ecb7be3?w=600"
    },
    {
        id: 5,
        name: "Everyday Casual Shoes",
        category: "Casual",
        price: 999,
        image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=600"
    },
    {
        id: 6,
        name: "Premium Sports Shoes",
        category: "Sports",
        price: 1999,
        image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600"
    }
];

// CART
let cart = JSON.parse(localStorage.getItem("friendShoesCart")) || [];

function saveCart() {
    localStorage.setItem("friendShoesCart", JSON.stringify(cart));
}

function displayProducts(category = "All") {
    const list = document.getElementById("product-list");

    const filtered = category === "All"
        ? products
        : products.filter(p => p.category === category);

    list.innerHTML = filtered.map(p => `
        <div class="product-card">
            <img src="${p.image}" alt="${p.name}" loading="lazy"
                 onerror="this.src='https://placehold.co/600x400?text=Shoe'">

            <div class="product-info">
                <span class="category">${p.category}</span>
                <h3>${p.name}</h3>
                <div class="price">₹${p.price.toLocaleString("en-IN")}</div>

                <select id="size-${p.id}" class="size-select"
                    aria-label="Select shoe size"
                    style="width:100%;padding:10px;margin-bottom:12px;border:1px solid #ddd">
                    <option value="">Select Size</option>
                    ${[6,7,8,9,10,11].map(s => `<option value="${s}">UK ${s}</option>`).join("")}
                </select>

                <button class="add-btn" onclick="addToCart(${p.id})">
                    ADD TO CART +
                </button>
            </div>
        </div>
    `).join("");
}

function filterProducts(category, button) {
    document.querySelectorAll(".filter").forEach(btn => {
        btn.classList.remove("active");
    });

    button.classList.add("active");
    displayProducts(category);
}

// ADD TO CART
function addToCart(id) {
    const product = products.find(p => p.id === id);
    const size = document.getElementById(`size-${id}`).value;

    if (!size) {
        alert("Please select shoe size first!");
        return;
    }

    const existing = cart.find(
        item => item.id === id && item.size === size
    );

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            ...product,
            size: size,
            quantity: 1
        });
    }

    saveCart();
    updateCart();
    alert("Product added to cart!");
}

// UPDATE CART
function updateCart() {
    const items = document.getElementById("cart-items");
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    document.getElementById("cart-count").innerText = count;
    document.getElementById("cart-total").innerText =
        total.toLocaleString("en-IN");

    if (cart.length === 0) {
        items.innerHTML = "<p>Your cart is empty.</p>";
        return;
    }

    items.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <h4>${item.name}</h4>
                <small>UK Size: ${item.size}</small>
                <p>₹${item.price} × ${item.quantity}</p>

                <div class="quantity">
                    <button onclick="changeQuantity(${item.id},'${item.size}',-1)">−</button>
                    <span>${item.quantity}</span>
                    <button onclick="changeQuantity(${item.id},'${item.size}',1)">+</button>
                </div>
            </div>

            <button class="remove-btn"
                onclick="removeItem(${item.id},'${item.size}')">
                Remove
            </button>
        </div>
    `).join("");
}

// CHANGE QUANTITY
function changeQuantity(id, size, change) {
    const item = cart.find(
        p => p.id === id && p.size === size
    );

    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        cart = cart.filter(
            p => !(p.id === id && p.size === size)
        );
    }

    saveCart();
    updateCart();
}

// REMOVE PRODUCT
function removeItem(id, size) {
    cart = cart.filter(
        p => !(p.id === id && p.size === size)
    );

    saveCart();
    updateCart();
}

// OPEN/CLOSE CART
function toggleCart() {
    document.getElementById("cart-panel").classList.toggle("open");
    document.getElementById("overlay").classList.toggle("open");
}

// CHECKOUT
function openCheckout() {
    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    document.getElementById("cart-panel").classList.remove("open");
    document.getElementById("overlay").classList.remove("open");
    document.getElementById("checkout-modal").classList.add("show");
}

function closeCheckout() {
    document.getElementById("checkout-modal").classList.remove("show");
}

// WHATSAPP ORDER
document.getElementById("checkout-form").addEventListener("submit", function(e) {
    e.preventDefault();

    if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    if (!/^91[6-9]\d{9}$/.test(WHATSAPP_NUMBER)) {
        alert("Please set your correct WhatsApp business number in script.js");
        return;
    }

    const name = document.getElementById("customer-name").value.trim();
    const phone = document.getElementById("customer-phone").value.trim();
    const address = document.getElementById("customer-address").value.trim();
    const payment = document.getElementById("payment-method").value;

    if (!name || !phone || !address || !payment) {
        alert("Please complete all details.");
        return;
    }

    const total = cart.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
    );

    let message = `*NEW ORDER - FRIEND SHOES HOUSE*\n\n`;
    message += `*Customer Details*\n`;
    message += `Name: ${name}\n`;
    message += `Phone: ${phone}\n`;
    message += `Address: ${address}\n\n`;
    message += `*ORDER ITEMS*\n`;

    cart.forEach((item, index) => {
        message += `\n${index + 1}. ${item.name}\n`;
        message += `Size: UK ${item.size}\n`;
        message += `Price: Rs. ${item.price}\n`;
        message += `Quantity: ${item.quantity}\n`;
        message += `Subtotal: Rs. ${item.price * item.quantity}\n`;
    });

    message += `\n*TOTAL: Rs. ${total}*\n`;
    message += `Payment: ${payment}\n`;
    message += `\nPlease confirm my order.`;

    const whatsappURL =
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    // Save cart until customer returns; order is not yet confirmed.
    window.open(whatsappURL, "_blank");

    document.getElementById("checkout-modal").classList.remove("show");
});

// CONTACT WHATSAPP
function contactWhatsApp() {
    if (!/^91[6-9]\d{9}$/.test(WHATSAPP_NUMBER)) {
        alert("Please set your WhatsApp number in script.js first.");
        return;
    }

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        "Hello Friend Shoes House! I want to know more about your shoes."
    )}`;

    window.open(url, "_blank");
}

// INITIAL LOAD
displayProducts();
updateCart();
