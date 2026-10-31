
import {
  auth,
  db,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  addDoc,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp
} from "./firebase.js";

const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginForm = document.getElementById("login-form");
const productForm = document.getElementById("product-form");

const loginError = document.getElementById("login-error");
const productMessage = document.getElementById("product-message");

const productList = document.getElementById("admin-product-list");
const totalProducts = document.getElementById("total-products");

const productId = document.getElementById("product-id");
const productName = document.getElementById("product-name");
const productCategory = document.getElementById("product-category");
const productPrice = document.getElementById("product-price");
const productImage = document.getElementById("product-image");

const imagePreview = document.getElementById("image-preview");
const saveBtn = document.getElementById("save-btn");
const cancelEdit = document.getElementById("cancel-edit");

let products = [];
let currentImageURL = "";
let unsubscribeProducts = null;

// Admin access check
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    if (unsubscribeProducts) {
      unsubscribeProducts();
      unsubscribeProducts = null;
    }

    loginSection.hidden = false;
    dashboardSection.hidden = true;
    return;
  }

  try {
    const adminRef = doc(db, "admins", user.uid);
    const adminSnapshot = await getDoc(adminRef);

    if (!adminSnapshot.exists()) {
      await signOut(auth);
      loginError.textContent = "You are not authorized as admin.";
      return;
    }

    loginSection.hidden = true;
    dashboardSection.hidden = false;
    loadProducts();

  } catch (error) {
    console.error(error);
    loginError.textContent = "Could not verify admin access.";
  }
});

// Login
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginError.textContent = "Logging in...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginError.textContent = "";
  } catch (error) {
    console.error(error);
    loginError.textContent = "Invalid email or password.";
  }
});

// Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
});

// Load products
function loadProducts() {
  if (unsubscribeProducts) unsubscribeProducts();

  unsubscribeProducts = onSnapshot(
    collection(db, "products"),
    (snapshot) => {
      products = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      renderProducts();
    },
    (error) => {
      console.error(error);
      productList.textContent = "Unable to load products.";
    }
  );
}

// Display products
function renderProducts() {
  totalProducts.textContent = products.length;
  productList.replaceChildren();

  if (products.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No products added yet.";
    row.appendChild(cell);
    productList.appendChild(row);
    return;
  }

  products.forEach((product) => {
    const row = document.createElement("tr");

    const imageCell = document.createElement("td");
    const image = document.createElement("img");
    image.src = product.image || "";
    image.alt = product.name || "Product";
    imageCell.appendChild(image);

    const nameCell = document.createElement("td");
    nameCell.textContent = product.name || "";

    const categoryCell = document.createElement("td");
    categoryCell.textContent = product.category || "";

    const priceCell = document.createElement("td");
    priceCell.textContent = "₹" + Number(product.price || 0);

    const actionCell = document.createElement("td");

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.className = "edit-btn";
    editButton.addEventListener("click", () => editProduct(product.id));

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.className = "delete-btn";
    deleteButton.addEventListener("click", () => deleteProduct(product.id));

    actionCell.append(editButton, deleteButton);

    row.append(imageCell, nameCell, categoryCell, priceCell, actionCell);
    productList.appendChild(row);
  });
}

// Image URL preview
productImage.addEventListener("input", () => {
  const url = productImage.value.trim();

  if (url) {
    imagePreview.src = url;
    imagePreview.hidden = false;
  } else {
    imagePreview.src = "";
    imagePreview.hidden = true;
  }
});

// Add or update product
productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = productName.value.trim();
  const category = productCategory.value;
  const price = Number(productPrice.value);
  const imageURL = productImage.value.trim();

  if (!name || !category || !Number.isFinite(price) || price <= 0 || !imageURL) {
    productMessage.textContent = "Please enter all product details and image URL.";
    return;
  }

  try {
    new URL(imageURL);

    if (!["https:", "http:"].includes(new URL(imageURL).protocol)) {
      throw new Error("Invalid image URL");
    }
  } catch {
    productMessage.textContent = "Please enter a valid image URL.";
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";
  productMessage.textContent = "";

  try {
    const productData = {
      name,
      category,
      price,
      image: imageURL,
      updatedAt: serverTimestamp()
    };

    if (productId.value) {
      await updateDoc(doc(db, "products", productId.value), productData);
      productMessage.textContent = "Product updated successfully!";
    } else {
      await addDoc(collection(db, "products"), {
        ...productData,
        createdAt: serverTimestamp()
      });
      productMessage.textContent = "Product added successfully!";
    }

    resetForm();

  } catch (error) {
    console.error(error);
    productMessage.textContent = "Error: " + error.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = productId.value ? "Update Product" : "Add Product";
  }
});

// Edit product
function editProduct(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;

  productId.value = product.id;
  productName.value = product.name || "";
  productCategory.value = product.category || "";
  productPrice.value = product.price || "";
  productImage.value = product.image || "";

  currentImageURL = product.image || "";

  if (currentImageURL) {
    imagePreview.src = currentImageURL;
    imagePreview.hidden = false;
  }

  document.getElementById("form-heading").textContent = "Edit Product";
  saveBtn.textContent = "Update Product";
  cancelEdit.hidden = false;
  productMessage.textContent = "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Delete product
async function deleteProduct(id) {
  const product = products.find((item) => item.id === id);
  if (!product) return;

  if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
    return;
  }

  try {
    await deleteDoc(doc(db, "products", id));
    productMessage.textContent = "Product deleted successfully!";

    if (productId.value === id) resetForm();

  } catch (error) {
    console.error(error);
    productMessage.textContent = "Unable to delete product: " + error.message;
  }
}

// Cancel edit
cancelEdit.addEventListener("click", resetForm);

// Reset form
function resetForm() {
  productForm.reset();
  productId.value = "";
  currentImageURL = "";

  imagePreview.src = "";
  imagePreview.hidden = true;

  document.getElementById("form-heading").textContent = "Add New Product";
  saveBtn.textContent = "Add Product";
  cancelEdit.hidden = true;
}

window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
