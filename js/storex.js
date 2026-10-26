$(document).ready(function () {
    const csrfToken = $('meta[name="csrf-token"]').attr('content') || window.csrfToken || '';

    function showToast(message, type = 'success') {
        $('.storex-toast').remove();
        const colors = {
            success: { bg: 'rgba(13,148,136,0.95)', icon: '✓' },
            error: { bg: 'rgba(239,68,68,0.95)', icon: '✕' },
            info: { bg: 'rgba(124,58,237,0.95)', icon: 'ℹ' },
        };
        const c = colors[type] || colors.info;
        const $toast = $(`<div class="storex-toast" style="position:fixed;top:100px;right:25px;z-index:99999;padding:14px 22px;border-radius:12px;background:${c.bg};color:#fff;font-size:0.9rem;font-weight:600;box-shadow:0 15px 40px rgba(0,0,0,0.35);display:flex;align-items:center;gap:10px;opacity:0;transform:translateX(30px);transition:all 0.3s ease;"><span style="font-weight:800;">${c.icon}</span><span>${message}</span></div>`);
        $('body').append($toast);
        setTimeout(() => $toast.css({ opacity: 1, transform: 'translateX(0)' }), 50);
        setTimeout(() => { $toast.css({ opacity: 0, transform: 'translateX(30px)' }); setTimeout(() => $toast.remove(), 300); }, 2500);
    }

    // ADD TO CART
    $(document).on('click', '.add-to-cart-btn, #detailAddCart', function (event) {
        event.stopPropagation();
        const button = $(this);
        const productId = button.data('product-id');
        const quantity = parseInt($('#quantityValue').text()) || 1;
        if (!productId) return;
        const originalText = button.html();
        button.prop('disabled', true).css('opacity', '0.6');
        $.ajax({
            url: '/cart/add', method: 'POST',
            data: { _token: csrfToken, product_id: productId, quantity: quantity },
            success: function (res) {
                if (res.success) {
                    button.html('✓ Added').css({ background: '#0d9488', borderColor: '#0d9488', opacity: 1 });
                    $('.storex-cart-count').text(res.cart_count);
                    showToast('Added to cart!', 'success');
                    setTimeout(() => { button.html(originalText).css({ background: '', borderColor: '', opacity: 1 }); button.prop('disabled', false); }, 1500);
                }
            },
            error: function (xhr) {
                button.prop('disabled', false).css('opacity', '1');
                if (xhr.status === 401) { showToast('Please login first', 'error'); setTimeout(() => location.href = '/login', 1200); }
                else { showToast('Something went wrong', 'error'); button.html(originalText); }
            },
        });
    });

    // WISHLIST TOGGLE
    $(document).on('click', '.wishlist-toggle-btn, .product-wishlist[data-product-id]', function (event) {
        event.stopPropagation();
        const button = $(this);
        const productId = button.data('product-id');
        if (!productId) return;
        const isActive = button.hasClass('product-wishlist-active') || button.hasClass('wishlist-active');
        $.ajax({
            url: isActive ? '/wishlist/remove' : '/wishlist/add', method: 'POST',
            data: { _token: csrfToken, product_id: productId },
            success: function (res) {
                if (res.success) {
                    if (isActive) {
                        button.removeClass('product-wishlist-active wishlist-active').text('♡');
                        showToast('Removed from wishlist', 'info');
                        if (location.pathname === '/dashboard/wishlist') $('#wishlist-item-' + productId).fadeOut(400, function () { $(this).remove(); });
                    } else {
                        button.addClass('product-wishlist-active wishlist-active').text('♥');
                        showToast('Added to wishlist!', 'success');
                    }
                }
            },
            error: function (xhr) {
                if (xhr.status === 401) { showToast('Please login first', 'error'); setTimeout(() => location.href = '/login', 1200); }
            },
        });
    });

    // SHOP PAGINATION + FILTERS
    const shopGrid = $('#shopProductGrid');
    if (shopGrid.length) {
        const allProducts = $('.shop-product-item');
        const searchInput = $('#shopSearch');
        const priceFilter = $('#priceFilter');
        const priceValue = $('#priceValue');
        const sortProducts = $('#sortProducts');
        const categoryFilters = $('.category-filter');
        const ratingFilters = $('input[name="rating"]');
        const resetFilters = $('#resetFilters');
        const shopEmpty = $('#shopEmpty');
        const productsCount = $('.products-count strong');
        let currentPage = 1;

        function applyFilters() {
            const searchTerm = searchInput.val().toLowerCase().trim();
            const maxPrice = parseFloat(priceFilter.val());
            const selectedCategories = categoryFilters.filter(':checked').map(function () { return $(this).val(); }).get();
            const selectedRating = parseFloat(ratingFilters.filter(':checked').val()) || 0;
            let visibleProducts = [];
            allProducts.each(function () {
                const p = $(this);
                const pp = parseInt(p.data('page'));
                const pn = String(p.data('name')).toLowerCase();
                const pc = String(p.data('category')).toLowerCase();
                const pr = parseFloat(p.data('price'));
                const rt = parseFloat(p.data('rating'));
                const ok = (searchTerm === '' || pn.includes(searchTerm)) &&
                    (selectedCategories.length === 0 || selectedCategories.includes(pc)) &&
                    pr <= maxPrice && rt >= selectedRating && pp === currentPage;
                if (ok) { p.show(); visibleProducts.push(p); } else p.hide();
            });
            productsCount.text(visibleProducts.length);
            if (visibleProducts.length === 0) shopEmpty.fadeIn(250); else shopEmpty.hide();
        }

        $(document).on('click', '#shopPagination button', function () {
            const pageData = $(this).data('page');
            if (pageData === 'next') {
                currentPage = currentPage < 3 ? currentPage + 1 : 1;
                $('#shopPagination button').removeClass('pagination-active');
                $('#shopPagination button[data-page="' + currentPage + '"]').addClass('pagination-active');
            } else {
                currentPage = parseInt(pageData);
                $('#shopPagination button').removeClass('pagination-active');
                $(this).addClass('pagination-active');
            }
            applyFilters();
            $('html, body').animate({ scrollTop: shopGrid.offset().top - 120 }, 400);
        });

        searchInput.on('input', () => { currentPage = 1; applyFilters(); });
        categoryFilters.on('change', () => { currentPage = 1; applyFilters(); });
        priceFilter.on('input', function () { priceValue.text($(this).val()); applyFilters(); });
        ratingFilters.on('change', applyFilters);
        sortProducts.on('change', function () {
            const v = $(this).val();
            const arr = allProducts.get();
            arr.sort(function (a, b) {
                const A = $(a), B = $(b);
                if (v === 'price-low') return parseFloat(A.data('price')) - parseFloat(B.data('price'));
                if (v === 'price-high') return parseFloat(B.data('price')) - parseFloat(A.data('price'));
                if (v === 'rating') return parseFloat(B.data('rating')) - parseFloat(A.data('rating'));
                return 0;
            });
            $.each(arr, (_, p) => shopGrid.append(p));
            applyFilters();
        });
        resetFilters.on('click', function () {
            searchInput.val(''); categoryFilters.prop('checked', false); ratingFilters.prop('checked', false);
            priceFilter.val(500); priceValue.text(500); sortProducts.val('featured'); currentPage = 1;
            $('#shopPagination button').removeClass('pagination-active');
            $('#shopPagination button[data-page="1"]').addClass('pagination-active');
            applyFilters();
        });
        applyFilters();
    }

    // PRODUCT QUANTITY
    let productQuantity = 1;
    $(document).on('click', '#quantityPlus', () => { productQuantity++; $('#quantityValue').text(productQuantity); });
    $(document).on('click', '#quantityMinus', () => { if (productQuantity > 1) { productQuantity--; $('#quantityValue').text(productQuantity); } });

    // PRODUCT CARD CLICK
    $(document).on('click', '.product-card[data-product-url]', function (event) {
        if ($(event.target).closest('.product-cart, .product-wishlist, .add-to-cart-btn, .wishlist-toggle-btn').length) return;
        const url = $(this).data('product-url');
        if (url) location.href = url;
    });

    // CART QUANTITY
    $(document).on('click', '.cart-qty-plus', function () {
        const cartId = $(this).data('cart-id');
        const el = $('.cart-qty-value[data-cart-id="' + cartId + '"]');
        let qty = parseInt(el.text()) + 1;
        el.text(qty);
        updateCartItem(cartId, qty);
    });
    $(document).on('click', '.cart-qty-minus', function () {
        const cartId = $(this).data('cart-id');
        const el = $('.cart-qty-value[data-cart-id="' + cartId + '"]');
        let qty = parseInt(el.text());
        if (qty > 1) { qty--; el.text(qty); updateCartItem(cartId, qty); }
    });
    function updateCartItem(cartId, quantity) {
        $.ajax({ url: '/cart/update', method: 'POST', data: { _token: csrfToken, cart_id: cartId, quantity: quantity },
            success: function (r) {
                if (r.success) {
                    $('#cart-subtotal').text('$' + r.subtotal);
                    $('#cart-tax').text('$' + r.tax);
                    $('#cart-total').text('$' + r.total);
                    $('.storex-cart-count').text(r.cart_count);
                }
            },
        });
    }

    // CART REMOVE
    $(document).on('click', '.cart-item-remove', function () {
        if (!confirm('Remove this item?')) return;
        const cartId = $(this).data('cart-id');
        $.ajax({ url: '/cart/remove', method: 'POST', data: { _token: csrfToken, cart_id: cartId },
            success: function (r) {
                if (r.success) {
                    $('.cart-item[data-cart-id="' + cartId + '"]').fadeOut(300, function () {
                        $(this).remove();
                        if ($('.cart-item').length === 0) location.reload();
                    });
                    $('.storex-cart-count').text(r.cart_count);
                    showToast('Item removed', 'info');
                }
            },
        });
    });

    // CHECKOUT PAYMENT
    $(document).on('change', 'input[name="payment_method"]', function () {
        $('.payment-method').removeClass('payment-method-active');
        $(this).closest('.payment-method').addClass('payment-method-active');
        if ($(this).val() === 'card') $('#cardFields').slideDown(250); else $('#cardFields').slideUp(250);
    });
    $('#cardNumber').on('input', function () {
        let v = $(this).val().replace(/\s/g, '').replace(/(\d{4})(?=\d)/g, '$1 ');
        $(this).val(v);
    });
    $('#cardExpiry').on('input', function () {
        let v = $(this).val().replace(/\s/g, '').replace('/', '');
        if (v.length >= 3) v = v.substring(0, 2) + ' / ' + v.substring(2, 4);
        $(this).val(v);
    });
    $('#cardCvc').on('input', function () { $(this).val($(this).val().replace(/\D/g, '')); });

    // CONTACT FORM
    $('#contactForm').on('submit', function (e) {
        e.preventDefault();
        const btn = $(this).find('.contact-submit');
        const orig = btn.html();
        btn.html('Sending...').css('opacity', '0.7').prop('disabled', true);
        setTimeout(() => {
            btn.html('✓ Message sent').css({ background: '#0d9488', opacity: 1 });
            $('#contactForm')[0].reset();
            setTimeout(() => btn.html(orig).css('background', '').prop('disabled', false), 2500);
        }, 1500);
    });

    // PASSWORD TOGGLE + STRENGTH
    $(document).on('click', '.auth-password-toggle', function () {
        const input = $('#' + $(this).data('target'));
        if (input.attr('type') === 'password') { input.attr('type', 'text'); $(this).text('🙈'); }
        else { input.attr('type', 'password'); $(this).text('👁'); }
    });
    $('#regPassword').on('input', function () {
        const v = $(this).val();
        const bar = $('#strengthBar');
        let s = 0;
        if (v.length >= 8) s++;
        if (/[A-Z]/.test(v)) s++;
        if (/[0-9]/.test(v)) s++;
        if (/[^A-Za-z0-9]/.test(v)) s++;
        bar.removeClass('strength-weak strength-medium strength-strong');
        if (v.length === 0) bar.css('width', '0');
        else if (s <= 1) bar.addClass('strength-weak');
        else if (s === 2) bar.addClass('strength-medium');
        else bar.addClass('strength-strong');
    });

    // ADMIN ORDER STATUS DROPDOWN
    $(document).on('change', '.admin-order-status-select', function () {
        const sel = $(this);
        const url = sel.data('order-url');
        sel.prop('disabled', true).css('opacity', '0.6');
        $.ajax({
            url: url, method: 'POST',
            data: { _token: csrfToken, status: sel.val() },
            success: function (r) {
                sel.prop('disabled', false).css('opacity', '1');
                if (r.success) showToast(r.message || 'Status updated!', 'success');
            },
            error: function () {
                sel.prop('disabled', false).css('opacity', '1');
                showToast('Failed to update', 'error');
            },
        });
    });

    // ADMIN VENDOR APPROVE
    $(document).on('click', '.approve-vendor-btn', function () {
        const btn = $(this);
        const vendorId = btn.data('vendor-id');
        btn.prop('disabled', true).css({ background: '#0d9488', color: '#fff' }).html('✓');
        $.ajax({
            url: '/admin/vendors/' + vendorId + '/approve', method: 'POST', data: { _token: csrfToken },
            success: function (r) {
                if (r.success) {
                    showToast(r.message || 'Vendor approved!', 'success');
                    btn.closest('tr').fadeOut(500, function () { $(this).remove(); });
                    btn.closest('.admin-pending-vendor').fadeOut(500, function () { $(this).remove(); });
                }
            },
        });
    });

    // ADMIN VENDOR REJECT
    $(document).on('click', '.reject-vendor-btn', function () {
        const btn = $(this);
        const vendorId = btn.data('vendor-id');
        btn.prop('disabled', true).css({ background: '#ef4444', color: '#fff' }).html('✕');
        $.ajax({
            url: '/admin/vendors/' + vendorId + '/reject', method: 'POST', data: { _token: csrfToken },
            success: function (r) {
                if (r.success) {
                    showToast(r.message || 'Rejected', 'info');
                    btn.closest('tr').fadeOut(500, function () { $(this).remove(); });
                }
            },
        });
    });

    // NEWSLETTER
    $(document).on('submit', '#newsletterForm', function (e) {
        e.preventDefault();
        $(this).fadeOut(300, function () { $('#newsletterSuccess').fadeIn(400); });
    });

    // USER DROPDOWN
    $(document).on('click', '#storexUserBtn', function (e) {
        e.stopPropagation();
        $(this).toggleClass('active');
        $('#storexUserMenu').toggleClass('storex-user-menu-show');
    });
    $(document).on('click', function (e) {
        if (!$(e.target).closest('.storex-user-dropdown').length) {
            $('#storexUserMenu').removeClass('storex-user-menu-show');
            $('#storexUserBtn').removeClass('active');
        }
    });

    // CHAT WIDGET — MULTIPLE REPLIES
    $(document).on('click', '#storexChatBtn', function (e) { e.stopPropagation(); $('#storexChatModal').toggleClass('storex-chat-modal-open'); });
    $(document).on('click', '#storexChatClose', function () { $('#storexChatModal').removeClass('storex-chat-modal-open'); });
    $(document).on('click', function (e) { if (!$(e.target).closest('.storex-chat-widget').length) $('#storexChatModal').removeClass('storex-chat-modal-open'); });
    $(document).on('click', '#storexChatSend', sendChatMessage);
    $(document).on('keypress', '#storexChatInput', function (e) { if (e.which === 13) sendChatMessage(); });

    const chatReplies = {
        greetings: ["Hey there! 👋 How can I help you today?", "Hi! Welcome to StoreX. What can I help you with?", "Hello! 😊 Feel free to ask anything.", "Hey! Great to see you here."],
        orders: ["You can track your order status from your dashboard → Orders section. 📦", "Need help with an order? Head to Dashboard → My Orders.", "All your orders are visible in Dashboard → Orders."],
        shipping: ["We offer FREE shipping on orders over $75! 🚚", "Standard shipping takes 3-5 business days. Free over $75!", "Shipping is free on orders above $75."],
        returns: ["We offer 30-day easy returns on all products. ↩️", "Not satisfied? You have 30 days to return any product.", "30-day return policy — no questions asked!"],
        payment: ["We accept Credit/Debit Cards, PayPal, and Cash on Delivery. 💳", "Payment options: Card, PayPal, and COD. All secure!"],
        products: ["We have 24+ curated products! 🛍️", "Feel free to browse our Shop section.", "Check out the Shop page — handpicked products!"],
        vendors: ["We work with verified independent vendors. 🏪", "All vendors are verified for quality.", "Visit Vendors page to discover sellers."],
        account: ["You can manage your account from Dashboard → Profile. 👤", "Need to update info? Go to Dashboard → Profile.", "Account settings are in your dashboard."],
        thanks: ["You're welcome! 😊", "Happy to help!", "Anytime! 🙌"],
        bye: ["Goodbye! 👋", "See you soon!", "Take care!"],
        default: ["Thanks for your message! Our team will get back shortly. 🙌", "Got it! Someone will respond soon.", "Thank you for reaching out!", "Noted! We'll reply shortly.", "Appreciate your message!"],
    };
    function randomFrom(a) { return a[Math.floor(Math.random() * a.length)]; }
    function getChatReply(msg) {
        const m = msg.toLowerCase();
        if (/\b(hi|hello|hey|salam|assalam)\b/.test(m)) return randomFrom(chatReplies.greetings);
        if (/\b(order|track|parcel)\b/.test(m)) return randomFrom(chatReplies.orders);
        if (/\b(ship|shipping|deliver|delivery)\b/.test(m)) return randomFrom(chatReplies.shipping);
        if (/\b(return|refund|exchange)\b/.test(m)) return randomFrom(chatReplies.returns);
        if (/\b(pay|payment|card|paypal|cod)\b/.test(m)) return randomFrom(chatReplies.payment);
        if (/\b(product|item|buy|shop|price)\b/.test(m)) return randomFrom(chatReplies.products);
        if (/\b(vendor|seller|store)\b/.test(m)) return randomFrom(chatReplies.vendors);
        if (/\b(account|profile|password|login|register)\b/.test(m)) return randomFrom(chatReplies.account);
        if (/\b(thank|thanks|thx|shukriya)\b/.test(m)) return randomFrom(chatReplies.thanks);
        if (/\b(bye|goodbye|see you)\b/.test(m)) return randomFrom(chatReplies.bye);
        return randomFrom(chatReplies.default);
    }
    function sendChatMessage() {
        const input = $('#storexChatInput');
        const msg = input.val().trim();
        if (!msg) return;
        const body = $('.storex-chat-modal-body');
        body.append(`<div class="storex-chat-message storex-chat-message-user"><span>${$('<div>').text(msg).html()}</span></div>`);
        input.val('');
        body.scrollTop(body[0].scrollHeight);
        setTimeout(function () {
            body.append(`<div class="storex-chat-message storex-chat-message-bot"><span>${getChatReply(msg)}</span></div>`);
            body.scrollTop(body[0].scrollHeight);
        }, 800);
    }
});