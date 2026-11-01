
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

// CLOUDINARY SETTINGS
const CLOUD_NAME = "muorhog2";
const UPLOAD_PRESET = "Friend Shoe";

// HTML ELEMENTS
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

const productImages = document.getElementById("product-images");
const imagePreview = document.getElementById("image-preview");

const saveBtn = document.getElementById("save-btn");
const cancelEdit = document.getElementById("cancel-edit");

let products = [];
let currentImages = [];
let unsubscribeProducts = null;

// ADMIN ACCESS CHECK
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

// LOGIN
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

// LOGOUT
document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
});

// LOAD PRODUCTS
function loadProducts() {
  if (unsubscribeProducts) unsubscribeProducts();

  unsubscribeProducts = onSnapshot(
    collection(db, "products"),
    (snapshot) => {
      products = snapshot.docs.map(item => ({
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

// DISPLAY PRODUCTS
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

  products.forEach(product => {
    const row = document.createElement("tr");

    const imageCell = document.createElement("td");
    const image = document.createElement("img");

    const images = product.images || [];
    image.src = images[0] || product.image || "";
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

// IMAGE PREVIEW
function showPreviews(urls) {
  imagePreview.replaceChildren();

  urls.forEach(url => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = "Product preview";

    img.style.width = "90px";
    img.style.height = "90px";
    img.style.objectFit = "cover";
    img.style.borderRadius = "8px";
    img.style.margin = "5px";

    imagePreview.appendChild(img);
  });
}

// SELECTED IMAGE PREVIEW
productImages.addEventListener("change", () => {
  const files = Array.from(productImages.files);

  if (files.length + currentImages.length > 5) {
    alert("Maximum 5 images allowed per product.");
    productImages.value = "";
    return;
  }

  const previews = files.map(file => URL.createObjectURL(file));

  showPreviews([...currentImages, ...previews]);
});

// UPLOAD IMAGES TO CLOUDINARY
async function uploadImages(files) {
  const uploadedURLs = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please select valid image files.");
    }

    const formData = new FormData();

    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "Image upload failed.");
    }

    uploadedURLs.push(result.secure_url);
  }

  return uploadedURLs;
}

// ADD OR UPDATE PRODUCT
productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = productName.value.trim();
  const category = productCategory.value;
  const price = Number(productPrice.value);

  const files = Array.from(productImages.files);

  if (!name || !category || !Number.isFinite(price) || price <= 0) {
    productMessage.textContent = "Please enter all product details.";
    return;
  }

  if (currentImages.length + files.length > 5) {
    productMessage.textContent = "Maximum 5 images allowed.";
    return;
  }

  if (currentImages.length === 0 && files.length === 0) {
    productMessage.textContent = "Please select at least one image.";
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Uploading Images...";
  productMessage.textContent = "Please wait. Uploading images...";

  try {
    const newURLs = await uploadImages(files);

    const allImages = [...currentImages, ...newURLs];

    const productData = {
      name,
      category,
      price,
      images: allImages,
      image: allImages[0],
      updatedAt: serverTimestamp()
    };

    if (productId.value) {
      await updateDoc(
        doc(db, "products", productId.value),
        productData
      );

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

// EDIT PRODUCT
function editProduct(id) {
  const product = products.find(item => item.id === id);
  if (!product) return;

  productId.value = product.id;
  productName.value = product.name || "";
  productCategory.value = product.category || "";
  productPrice.value = product.price || "";

  currentImages = product.images?.length
    ? [...product.images]
    : product.image ? [product.image] : [];

  productImages.value = "";
  showPreviews(currentImages);

  document.getElementById("form-heading").textContent = "Edit Product";
  saveBtn.textContent = "Update Product";
  cancelEdit.hidden = false;
  productMessage.textContent = "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// DELETE PRODUCT
async function deleteProduct(id) {
  const product = products.find(item => item.id === id);
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

// CANCEL EDIT
cancelEdit.addEventListener("click", resetForm);

// RESET FORM
function resetForm() {
  productForm.reset();
  productId.value = "";
  currentImages = [];

  imagePreview.replaceChildren();

  document.getElementById("form-heading").textContent = "Add New Product";
  saveBtn.textContent = "Add Product";
  cancelEdit.hidden = true;
}

// GLOBAL FUNCTIONS
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
