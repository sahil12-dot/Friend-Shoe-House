import {
  auth,
  db,
  storage,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  collection,
  addDoc,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
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
let currentImagePath = "";
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
    await signOut(auth);
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
    loginError.textContent = "Invalid email or password.";
  }
});

// Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
});

// Load products from Firestore
function loadProducts() {
  if (unsubscribeProducts) {
    unsubscribeProducts();
  }

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

    row.append(
      imageCell,
      nameCell,
      categoryCell,
      priceCell,
      actionCell
    );

    productList.appendChild(row);
  });
}

// Image preview
productImage.addEventListener("change", () => {
  const file = productImage.files[0];

  if (!file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    alert("Please select a JPG, PNG or WebP image.");
    productImage.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Image size must be less than 5 MB.");
    productImage.value = "";
    return;
  }

  imagePreview.src = URL.createObjectURL(file);
  imagePreview.hidden = false;
});

// Add or update product
productForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = productName.value.trim();
  const category = productCategory.value;
  const price = Number(productPrice.value);
  const file = productImage.files[0];

  if (!name || !category || !Number.isFinite(price) || price <= 0) {
    productMessage.textContent = "Please enter valid product details.";
    return;
  }

  if (!productId.value && !file) {
    productMessage.textContent = "Please select a product image.";
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  let uploadedImagePath = "";
  let uploadedImageURL = "";

  try {
    let imageURL = currentImageURL;
    let imagePath = currentImagePath;

    // Upload new image
    if (file) {
      const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const newPath =
        `product-images/${auth.currentUser.uid}/${Date.now()}-${safeFileName}`;

      const imageRef = ref(storage, newPath);

      await uploadBytes(imageRef, file);

      uploadedImagePath = newPath;
      uploadedImageURL = await getDownloadURL(imageRef);

      imageURL = uploadedImageURL;
      imagePath = uploadedImagePath;
    }

    const productData = {
      name,
      category,
      price,
      image: imageURL,
      imagePath,
      updatedAt: serverTimestamp()
    };

    if (productId.value) {
      await updateDoc(
        doc(db, "products", productId.value),
        productData
      );

      // Remove old image after successful update
      if (file && currentImagePath) {
        try {
          await deleteObject(ref(storage, currentImagePath));
        } catch (error) {
          console.warn("Old image could not be deleted:", error);
        }
      }

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

    // Clean up a newly uploaded image if saving the product failed
    if (uploadedImagePath) {
      try {
        await deleteObject(ref(storage, uploadedImagePath));
      } catch (cleanupError) {
        console.warn(cleanupError);
      }
    }

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

  currentImageURL = product.image || "";
  currentImagePath = product.imagePath || "";

  if (currentImageURL) {
    imagePreview.src = currentImageURL;
    imagePreview.hidden = false;
  }

  document.getElementById("form-heading").textContent = "Edit Product";
  saveBtn.textContent = "Update Product";
  cancelEdit.hidden = false;

  productMessage.textContent = "";

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// Delete product
async function deleteProduct(id) {
  const product = products.find((item) => item.id === id);

  if (!product) return;

  const confirmed = confirm(
    `Are you sure you want to delete "${product.name}"?`
  );

  if (!confirmed) return;

  try {
    await deleteDoc(doc(db, "products", id));

    if (product.imagePath) {
      try {
        await deleteObject(ref(storage, product.imagePath));
      } catch (error) {
        console.warn("Product image could not be deleted:", error);
      }
    }

    productMessage.textContent = "Product deleted successfully!";

    if (productId.value === id) {
      resetForm();
    }

  } catch (error) {
    console.error(error);
    productMessage.textContent = "Unable to delete product.";
  }
}

// Cancel edit
cancelEdit.addEventListener("click", resetForm);

// Reset form
function resetForm() {
  productForm.reset();

  productId.value = "";
  currentImageURL = "";
  currentImagePath = "";

  imagePreview.src = "";
  imagePreview.hidden = true;

  document.getElementById("form-heading").textContent = "Add New Product";

  saveBtn.textContent = "Add Product";
  cancelEdit.hidden = true;
}

// Make functions available if needed
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
