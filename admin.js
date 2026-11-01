
import {
  auth,
  db,
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
  serverTimestamp
} from "./firebase.js";


// CLOUDINARY SETTINGS
const CLOUD_NAME = "muorhog2";
const UPLOAD_PRESET = "Friend Shoe";


// HTML ELEMENTS
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");

const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginError = document.getElementById("login-error");

const logoutBtn = document.getElementById("logout-btn");

const productForm = document.getElementById("product-form");
const productIdInput = document.getElementById("product-id");
const productName = document.getElementById("product-name");
const productCategory = document.getElementById("product-category");
const productPrice = document.getElementById("product-price");

const productImages = document.getElementById("product-images");
const imagePreview = document.getElementById("image-preview");

const saveBtn = document.getElementById("save-btn");
const cancelEditBtn = document.getElementById("cancel-edit");

const productMessage = document.getElementById("product-message");
const productList = document.getElementById("admin-product-list");
const totalProducts = document.getElementById("total-products");

const formHeading = document.getElementById("form-heading");


// VARIABLES
let currentImages = [];
let unsubscribeProducts = null;


// AUTHENTICATION
onAuthStateChanged(auth, async (user) => {

  if (user) {

    try {
      const adminRef = doc(db, "admins", user.uid);
      const adminSnapshot = await getDoc(adminRef);

      if (adminSnapshot.exists()) {

        loginSection.hidden = true;
        dashboardSection.hidden = false;

        loadProducts();

      } else {

        await signOut(auth);

        loginError.textContent =
          "You are not authorized as an admin.";

      }

    } catch (error) {

      console.error(error);

      loginError.textContent =
        "Admin verification failed: " + error.message;

    }

  } else {

    loginSection.hidden = false;
    dashboardSection.hidden = true;

    if (unsubscribeProducts) {
      unsubscribeProducts();
      unsubscribeProducts = null;
    }

  }

});


// LOGIN
loginForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  loginError.textContent = "Logging in...";

  try {

    await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    );

    loginError.textContent = "";

  } catch (error) {

    loginError.textContent = error.message;

  }

});


// LOGOUT
logoutBtn.addEventListener("click", async () => {

  try {

    await signOut(auth);

    productForm.reset();
    resetForm();

  } catch (error) {

    alert(error.message);

  }

});


// IMAGE PREVIEW
function showPreviews() {

  imagePreview.innerHTML = "";

  const files = Array.from(productImages.files || []);

  currentImages.forEach((url) => {

    const img = document.createElement("img");

    img.src = url;
    img.alt = "Product image";

    imagePreview.appendChild(img);

  });

  files.forEach((file) => {

    const img = document.createElement("img");

    img.src = URL.createObjectURL(file);
    img.alt = "Selected image";

    imagePreview.appendChild(img);

  });

}


// IMAGE INPUT CHANGE
productImages.addEventListener("change", () => {

  const files = Array.from(productImages.files || []);

  if (currentImages.length + files.length > 5) {

    alert("You can upload maximum 5 images per product.");

    productImages.value = "";
    showPreviews();

    return;

  }

  showPreviews();

});


// UPLOAD IMAGES TO CLOUDINARY
async function uploadImages(files) {

  const uploadedURLs = [];

  for (const file of files) {

    if (!file.type.startsWith("image/")) {
      throw new Error("Please select image files only.");
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

      throw new Error(
        result.error?.message || "Image upload failed."
      );

    }

    uploadedURLs.push(result.secure_url);

  }

  return uploadedURLs;

}


// ADD / UPDATE PRODUCT
productForm.addEventListener("submit", async (e) => {

  e.preventDefault();

  const name = productName.value.trim();
  const category = productCategory.value;
  const price = Number(productPrice.value);

  const files = Array.from(productImages.files || []);
  const productId = productIdInput.value;

  if (!name || !category || price <= 0) {

    productMessage.textContent =
      "Please fill all product details.";

    return;

  }

  if (currentImages.length + files.length > 5) {

    productMessage.textContent =
      "Maximum 5 images are allowed.";

    return;

  }

  if (!productId && files.length === 0) {

    productMessage.textContent =
      "Please select at least one product image.";

    return;

  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Please wait...";

  productMessage.textContent = "Saving product...";

  try {

    const newImages = await uploadImages(files);

    const allImages = [
      ...currentImages,
      ...newImages
    ];

    const productData = {

      name: name,
      category: category,
      price: price,
      images: allImages,
      image: allImages[0],
      updatedAt: serverTimestamp()

    };

    if (productId) {

      await updateDoc(
        doc(db, "products", productId),
        productData
      );

      productMessage.textContent =
        "Product updated successfully!";

    } else {

      productData.createdAt = serverTimestamp();

      await addDoc(
        collection(db, "products"),
        productData
      );

      productMessage.textContent =
        "Product added successfully!";

    }

    productForm.reset();
    resetForm();

  } catch (error) {

    console.error(error);

    productMessage.textContent =
      "Error: " + error.message;

  } finally {

    saveBtn.disabled = false;

    saveBtn.textContent = productIdInput.value
      ? "Update Product"
      : "Add Product";

  }

});


// LOAD PRODUCTS
function loadProducts() {

  if (unsubscribeProducts) {
    unsubscribeProducts();
  }

  unsubscribeProducts = onSnapshot(
    collection(db, "products"),

    (snapshot) => {

      productList.innerHTML = "";

      totalProducts.textContent = snapshot.size;

      if (snapshot.empty) {

        productList.innerHTML = `
          <tr>
            <td colspan="5">No products available.</td>
          </tr>
        `;

        return;

      }

      snapshot.forEach((productDoc) => {

        const product = productDoc.data();
        const id = productDoc.id;

        const firstImage =
          product.images?.[0] || product.image || "";

        const row = document.createElement("tr");

        const imageCell = document.createElement("td");
        const img = document.createElement("img");

        img.src = firstImage;
        img.alt = product.name || "Product";
        img.style.width = "65px";
        img.style.height = "65px";
        img.style.objectFit = "cover";

        imageCell.appendChild(img);

        const nameCell = document.createElement("td");
        nameCell.textContent = product.name || "";

        const categoryCell = document.createElement("td");
        categoryCell.textContent = product.category || "";

        const priceCell = document.createElement("td");
        priceCell.textContent = "₹" + product.price;

        const actionCell = document.createElement("td");

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.type = "button";
        editBtn.dataset.action = "edit";
        editBtn.dataset.id = id;

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.type = "button";
        deleteBtn.dataset.action = "delete";
        deleteBtn.dataset.id = id;

        actionCell.appendChild(editBtn);
        actionCell.appendChild(deleteBtn);

        row.appendChild(imageCell);
        row.appendChild(nameCell);
        row.appendChild(categoryCell);
        row.appendChild(priceCell);
        row.appendChild(actionCell);

        productList.appendChild(row);

      });

    },

    (error) => {

      console.error(error);

      productList.innerHTML = `
        <tr>
          <td colspan="5">Error loading products.</td>
        </tr>
      `;

    }

  );

}


// EDIT / DELETE BUTTONS
productList.addEventListener("click", async (e) => {

  const button = e.target.closest("button");

  if (!button) return;

  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "edit") {

    await editProduct(id);

  }

  if (action === "delete") {

    await removeProduct(id);

  }

});


// EDIT PRODUCT
async function editProduct(id) {

  try {

    const productRef = doc(db, "products", id);
    const snapshot = await getDoc(productRef);

    if (!snapshot.exists()) {

      alert("Product not found.");
      return;

    }

    const product = snapshot.data();

    productIdInput.value = id;

    productName.value = product.name || "";
    productCategory.value = product.category || "";
    productPrice.value = product.price || "";

    currentImages = product.images?.length
      ? [...product.images]
      : product.image
        ? [product.image]
        : [];

    productImages.value = "";

    showPreviews();

    formHeading.textContent = "Edit Product";
    saveBtn.textContent = "Update Product";

    cancelEditBtn.hidden = false;

    productMessage.textContent = "";

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });

  } catch (error) {

    alert("Error: " + error.message);

  }

}


// DELETE PRODUCT
async function removeProduct(id) {

  const confirmDelete = confirm(
    "Are you sure you want to delete this product?"
  );

  if (!confirmDelete) return;

  try {

    await deleteDoc(
      doc(db, "products", id)
    );

    alert("Product deleted successfully.");

  } catch (error) {

    alert("Error: " + error.message);

  }

}


// RESET FORM
function resetForm() {

  productIdInput.value = "";

  currentImages = [];

  productImages.value = "";

  imagePreview.innerHTML = "";

  formHeading.textContent = "Add New Product";

  saveBtn.textContent = "Add Product";

  cancelEditBtn.hidden = true;

}


// CANCEL EDIT
cancelEditBtn.addEventListener("click", () => {

  productForm.reset();

  resetForm();

  productMessage.textContent = "";

});

