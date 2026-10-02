/* ===== Trendings Storefront Script ===== */

// Product database (shared across all pages)
const ALL_PRODUCTS = [
    { id: 1, slug: "oversized-linen-shirt-white", cat: "shirts", catLabel: "Shirts", brand: "Trendings", name: "Oversized Linen Shirt — White", price: 1895, image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80", sizes: ["S","M","L","XL"] },
    { id: 2, slug: "relaxed-cotton-shirt-black", cat: "shirts", catLabel: "Shirts", brand: "Trendings", name: "Relaxed Cotton Shirt — Black", price: 1695, image: "https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?w=800&q=80", sizes: ["S","M","L","XL"] },
    { id: 3, slug: "striped-oxford-shirt-blue", cat: "shirts", catLabel: "Shirts", brand: "Trendings", name: "Striped Oxford Shirt — Blue", price: 1995, image: "https://images.unsplash.com/photo-1621072156002-e2fccdc0b176?w=800&q=80", sizes: ["S","M","L","XL"] },
    { id: 4, slug: "brushed-flannel-shirt-beige", cat: "shirts", catLabel: "Shirts", brand: "Trendings", name: "Brushed Flannel Shirt — Beige", price: 2195, image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80", sizes: ["S","M","L","XL"] },
    { id: 5, slug: "heavyweight-tee-white", cat: "tshirts", catLabel: "T-Shirts", brand: "Trendings", name: "Heavyweight Tee — White", price: 995, image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80", sizes: ["S","M","L","XL"] },
    { id: 6, slug: "boxy-tee-black", cat: "tshirts", catLabel: "T-Shirts", brand: "Trendings", name: "Boxy Tee — Black", price: 995, image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80", sizes: ["S","M","L","XL"] },
    { id: 7, slug: "washed-pocket-tee-olive", cat: "tshirts", catLabel: "T-Shirts", brand: "Trendings", name: "Washed Pocket Tee — Olive", price: 1195, image: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80", sizes: ["S","M","L","XL"] },
    { id: 8, slug: "stripe-tee-navy-white", cat: "tshirts", catLabel: "T-Shirts", brand: "Trendings", name: "Stripe Tee — Navy/White", price: 1295, image: "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=800&q=80", sizes: ["S","M","L","XL"] },
    { id: 9, slug: "wide-leg-jeans-stone-wash", cat: "denim", catLabel: "Wide Leg Denim", brand: "Trendings", name: "Wide Leg Jeans — Stone Wash", price: 2495, image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&q=80", sizes: ["28","30","32","34","36"] },
    { id: 10, slug: "wide-leg-jeans-dark-indigo", cat: "denim", catLabel: "Wide Leg Denim", brand: "Trendings", name: "Wide Leg Jeans — Dark Indigo", price: 2695, image: "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=800&q=80", sizes: ["28","30","32","34","36"] },
    { id: 11, slug: "wide-leg-jeans-jet-black", cat: "denim", catLabel: "Wide Leg Denim", brand: "Trendings", name: "Wide Leg Jeans — Jet Black", price: 2595, image: "https://images.unsplash.com/photo-1598554747436-c9293d6a588f?w=800&q=80", sizes: ["28","30","32","34","36"] },
    { id: 12, slug: "wide-leg-jeans-washed-blue", cat: "denim", catLabel: "Wide Leg Denim", brand: "Trendings", name: "Wide Leg Jeans — Washed Blue", price: 2395, image: "https://images.unsplash.com/photo-1475178626620-a4d07b4aa000?w=800&q=80", sizes: ["28","30","32","34","36"] },
];

// Cart state
let cart = [];

// DOM refs
const cartBtn = document.getElementById('cartBtn');
const cartDrawer = document.getElementById('cartDrawer');
const cartOverlay = document.getElementById('cartOverlay');
const cartClose = document.getElementById('cartClose');
const cartBody = document.getElementById('cartBody');
const cartFooter = document.getElementById('cartFooter');
const cartCount = document.getElementById('cartCount');
const cartTotal = document.getElementById('cartTotal');

const searchBtn = document.getElementById('searchBtn');
const searchOverlay = document.getElementById('searchOverlay');
const searchClose = document.getElementById('searchClose');
const searchInput = document.getElementById('searchInput');

const menuToggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');
const navOverlay = document.getElementById('navOverlay');

// Quick Add Popup
const quickaddOverlay = document.getElementById('quickaddOverlay');
const quickaddPopup = document.getElementById('quickaddPopup');
const quickaddClose = document.getElementById('quickaddClose');
const quickaddImg = document.getElementById('quickaddImg');
const quickaddName = document.getElementById('quickaddName');
const quickaddPrice = document.getElementById('quickaddPrice');
const quickaddSizes = document.getElementById('quickaddSizes');
const quickaddViewLink = document.getElementById('quickaddViewLink');
const quickaddConfirm = document.getElementById('quickaddConfirm');

let quickaddProduct = null;
let quickaddSelectedSize = null;

// ===== Header scroll effect =====
window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (window.scrollY > 100) {
        header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.06)';
    } else {
        header.style.boxShadow = 'none';
    }
});

// ===== Mobile Menu =====
menuToggle.addEventListener('click', () => {
    nav.classList.toggle('active');
    navOverlay.classList.toggle('active');
    document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
});

navOverlay.addEventListener('click', () => {
    nav.classList.remove('active');
    navOverlay.classList.remove('active');
    document.body.style.overflow = '';
});

nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        nav.classList.remove('active');
        navOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
});

// ===== Search =====
searchBtn.addEventListener('click', () => {
    searchOverlay.classList.add('active');
    searchInput.focus();
    document.body.style.overflow = 'hidden';
});

searchClose.addEventListener('click', closeSearch);
searchOverlay.addEventListener('click', (e) => {
    if (e.target === searchOverlay) closeSearch();
});

function closeSearch() {
    searchOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeSearch();
        closeCart();
        closeQuickAdd();
    }
});

// ===== Cart =====
cartBtn.addEventListener('click', () => {
    cartDrawer.classList.add('active');
    cartOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
});

cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

function closeCart() {
    cartDrawer.classList.remove('active');
    cartOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function addToCart(name, price, image, size) {
    const existing = cart.find(item => item.name === name && item.size === size);
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ name, price, image, size: size || 'M', qty: 1 });
    }
    renderCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

function renderCart() {
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    cartCount.textContent = totalItems;

    if (cart.length === 0) {
        cartBody.innerHTML = '<p class="cart-empty">Your bag is empty.</p>';
        cartFooter.style.display = 'none';
        return;
    }

    cartFooter.style.display = 'block';
    cartTotal.textContent = '৳' + totalPrice.toLocaleString();

    cartBody.innerHTML = cart.map((item, i) => `
        <div class="cart-item">
            <img class="cart-item-img" src="${item.image}" alt="${item.name}">
            <div class="cart-item-details">
                <span class="cart-item-name">${item.name}</span>
                <span class="cart-item-size">Size: ${item.size}</span>
                <span class="cart-item-price">৳${item.price.toLocaleString()}${item.qty > 1 ? ` × ${item.qty}` : ''}</span>
                <button class="cart-item-remove" onclick="removeFromCart(${i})">Remove</button>
            </div>
        </div>
    `).join('');
}

// ===== Quick Add Popup =====
function openQuickAdd(slug, encodedName, price, encodedImage) {
    const name = decodeURIComponent(encodedName);
    const image = decodeURIComponent(encodedImage);
    const product = ALL_PRODUCTS.find(p => p.slug === slug);
    const sizes = product ? product.sizes : ['S', 'M', 'L', 'XL'];

    quickaddProduct = { slug, name, price, image };
    quickaddSelectedSize = sizes[1] || sizes[0]; // default M

    quickaddImg.src = image;
    quickaddImg.alt = name;
    quickaddName.textContent = name;
    quickaddPrice.textContent = '৳' + price.toLocaleString();
    quickaddViewLink.href = 'product.html?slug=' + slug;

    quickaddSizes.innerHTML = sizes.map(s =>
        `<button class="size-btn ${s === quickaddSelectedSize ? 'active' : ''}" data-size="${s}">${s}</button>`
    ).join('');

    quickaddSizes.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            quickaddSizes.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            quickaddSelectedSize = btn.dataset.size;
        });
    });

    quickaddOverlay.classList.add('active');
    quickaddPopup.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeQuickAdd() {
    quickaddOverlay.classList.remove('active');
    quickaddPopup.classList.remove('active');
    document.body.style.overflow = '';
}

quickaddClose.addEventListener('click', closeQuickAdd);
quickaddOverlay.addEventListener('click', closeQuickAdd);

quickaddConfirm.addEventListener('click', () => {
    if (quickaddProduct) {
        addToCart(quickaddProduct.name, quickaddProduct.price, quickaddProduct.image, quickaddSelectedSize);
        closeQuickAdd();
        // Open cart to show added item
        cartDrawer.classList.add('active');
        cartOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
});

// ===== "+" button click handler (delegated) =====
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.quick-add-btn');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();

    const slug = btn.dataset.slug;
    if (!slug) return;

    const product = ALL_PRODUCTS.find(p => p.slug === slug);
    if (product) {
        openQuickAdd(slug, encodeURIComponent(product.name), product.price, encodeURIComponent(product.image));
    }
});

// ===== Size buttons (generic) =====
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.size-btn');
    if (!btn || btn.closest('.quickadd-popup')) return; // quickadd has its own handler
    const parent = btn.parentElement;
    parent.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
});

// ===== Intersection Observer for fade-in =====
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('.section, .featured-text, .explainer, .newsletter, .lookbook');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        fadeObserver.observe(section);
    });
});

// ===== Smooth scroll for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});