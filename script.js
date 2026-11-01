
import {
    db,
    collection,
    onSnapshot
} from "./firebase.js";

// BUSINESS WHATSAPP NUMBER
const WHATSAPP_NUMBER = "916280172514";

// PRODUCTS FROM FIRESTORE
let products = [];

// CART
let cart = JSON.parse(localStorage.getItem("friendShoesCart")) || [];

let selectedCategory = "All";

// HTML safety
function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Save cart
function saveCart() {
    localStorage.setItem("friendShoesCart", JSON.stringify(cart));
}

// LOAD PRODUCTS FROM FIRESTORE
function loadProducts() {
    const list = document.getElementById("product-list");
    list.innerHTML = "<p>Loading products...</p>";

    onSnapshot(
        collection(db, "products"),
        (snapshot) => {
            products = snapshot.docs.map(item => ({
                id: item.id,
                ...item.data()
            }));

            displayProducts(selectedCategory);
        },
        (error) => {
            console.error("Product loading error:", error);
            list.innerHTML = "<p>Unable to load products. Please try again.</p>";
        }
    );
}

// DISPLAY PRODUCTS
function displayProducts(category = "All") {
    selectedCategory = category;

    const list = document.getElementById("product-list");

    const filtered = category === "All"
        ? products
        : products.filter(p => p.category === category);

    if (filtered.length === 0) {
        list.innerHTML = "<p>No products available in this collection.</p>";
        return;
    }

    list.innerHTML = filtered.map(p => {
        const id = escapeHTML(p.id);
        const name = escapeHTML(p.name);
        const categoryName = escapeHTML(p.category);
        const price = Number(p.price) || 0;

        let imageURL = "";

        try {
            const parsedURL = new URL(p.image);
            if (["https:", "http:"].includes(parsedURL.protocol)) {
                imageURL = escapeHTML(p.image);
            }
        } catch {
            imageURL = "";
        }

        return `
            <div class="product-card">
                <img
                    src="${imageURL}"
                    alt="${name}"
                    loading="lazy"
                    onerror="this.src='https://placehold.co/600x400?text=Shoe'"
                >

                <div class="product-info">
                    <span class="category">${categoryName}</span>
                    <h3>${name}</h3>

                    <div class="price">
                        ₹${price.toLocaleString("en-IN")}
                    </div>

                    <select id="size-${id}" class="size-select"
                        aria-label="Select shoe size"
                        style="width:100%;padding:10px;margin-bottom:12px;border:1px solid #ddd">
                        <option value="">Select Size</option>
                        ${[6,7,8,9,10,11].map(s =>
                            `<option value="${s}">UK ${s}</option>`
                        ).join("")}
                    </select>

                    <button class="add-btn" data-product-id="${id}">
                        ADD TO CART +
                    </button>
                </div>
            </div>
        `;
    }).join("");

    list.querySelectorAll(".add-btn").forEach(button => {
        button.addEventListener("click", () => {
            addToCart(button.dataset.productId);
        });
    });
}

// FILTER PRODUCTS
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

    if (!product) return;

    const sizeElement = document.getElementById(`size-${id}`);
    const size = sizeElement.value;

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
            id: product.id,
            name: product.name,
            category: product.category,
            price: Number(product.price),
            image: product.image,
            size: size,
            quantity: 1
        });
    }

    saveCart();
    updateCart();
    alert("Product added to cart!");
}

// UPDATE CART

// UPDATE CART
function updateCart() {
    const items = document.getElementById("cart-items");

    const count = cart.reduce(
        (sum, item) => sum + Number(item.quantity), 0
    );

    const total = cart.reduce(
        (sum, item) => sum + Number(item.price) * Number(item.quantity), 0
    );

    document.getElementById("cart-count").innerText = count;

    document.getElementById("cart-total").innerText =
        total.toLocaleString("en-IN");

    if (cart.length === 0) {
        items.innerHTML = "<p>Your cart is empty.</p>";
        return;
    }

    items.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div>
                <h4>${escapeHTML(item.name)}</h4>
                <small>UK Size: ${escapeHTML(item.size)}</small>
                <p>₹${Number(item.price)} × ${Number(item.quantity)}</p>

                <div class="quantity">
                    <button type="button" data-action="decrease" data-index="${index}">−</button>
                    <span>${item.quantity}</span>
                    <button type="button" data-action="increase" data-index="${index}">+</button>
                </div>
            </div>

            <button type="button" class="remove-btn"
                data-action="remove" data-index="${index}">
                Remove
            </button>
        </div>
    `).join("");

    items.querySelectorAll("[data-action]").forEach(button => {
        button.addEventListener("click", () => {
            const index = Number(button.dataset.index);
            const item = cart[index];

            if (!item) return;

            const action = button.dataset.action;

            if (action === "increase") {
                changeQuantity(item.id, item.size, 1);
            } else if (action === "decrease") {
                changeQuantity(item.id, item.size, -1);
            } else if (action === "remove") {
                removeItem(item.id, item.size);
            }
        });
    });
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

// REMOVE ITEM
function removeItem(id, size) {
    cart = cart.filter(
        p => !(p.id === id && p.size === size)
    );

    saveCart();
    updateCart();
}

// CART OPEN/CLOSE
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
        alert("Please set your correct WhatsApp business number.");
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

    window.open(whatsappURL, "_blank");

    document.getElementById("checkout-modal").classList.remove("show");
});

// CONTACT WHATSAPP
function contactWhatsApp() {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        "Hello Friend Shoes House! I want to know more about your shoes."
    )}`;

    window.open(url, "_blank");
}

// MAKE FUNCTIONS AVAILABLE TO HTML
window.filterProducts = filterProducts;
window.toggleCart = toggleCart;
window.openCheckout = openCheckout;
window.closeCheckout = closeCheckout;
window.changeQuantity = changeQuantity;
window.removeItem = removeItem;
window.contactWhatsApp = contactWhatsApp;

// INITIAL LOAD
updateCart();
loadProducts();
