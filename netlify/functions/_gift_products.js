// netlify/functions/_gift_products.js
// Подарочные сертификаты reset.i11ume.com — цены, генерация кода, срок действия.
//
// Это единственный источник цен. Фронт присылает только product_id и никогда
// не присылает сумму: любое amount из тела запроса игнорируется.
// Комбо считает баню по 650 000, а не по 850 000 — так опубликовано на странице
// практик, сертификат не должен с ней расходиться.

import crypto from 'node:crypto';

const GIFT_PRODUCTS = {
    banya:           { title: 'Банная перезагрузка',                        amount: 850000 },
    massage_express: { title: 'Экспресс-активация · 45 минут',              amount: 600000 },
    massage_deep:    { title: 'Глубокая проработка · 90 минут',             amount: 1000000 },
    combo_express:   { title: 'День без единой мысли · баня и экспресс',    amount: 1250000 },
    combo_deep:      { title: 'День без единой мысли · баня и глубокий',    amount: 1650000 },
};

const VALID_MONTHS = 6;

// Без 0, O, 1, I, L — чтобы код не путали при чтении вслух и в переписке.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function getProduct(productId) {
    // Object.hasOwn, а не просто индексация: без этого getProduct('constructor')
    // вернул бы функцию из прототипа Object и сумма улетела бы в undefined.
    if (typeof productId !== 'string' || !Object.hasOwn(GIFT_PRODUCTS, productId)) {
        throw new Error('Unknown product_id: ' + productId);
    }
    return GIFT_PRODUCTS[productId];
}

function randomBlock(length) {
    // crypto.randomInt, а не Math.random: код — это одновременно и секрет доступа
    // к сертификату, предсказуемый генератор здесь неуместен.
    let out = '';
    for (let i = 0; i < length; i++) {
        out += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
    }
    return out;
}

function generateCode() {
    return 'RST-' + randomBlock(4) + '-' + randomBlock(4);
}

function expiryFrom(date) {
    const base = date ? new Date(date) : new Date();
    const out = new Date(base);
    out.setMonth(out.getMonth() + VALID_MONTHS);
    return out;
}

// Поля от пользователя: режем длину и вычищаем управляющие символы,
// чтобы кривой ввод не ломал ни базу, ни вёрстку сертификата.
function cleanText(value, maxLength) {
    if (value === undefined || value === null) return null;
    const cleaned = String(value)
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .trim()
        .slice(0, maxLength);
    return cleaned.length ? cleaned : null;
}

export {
    GIFT_PRODUCTS,
    VALID_MONTHS,
    CODE_ALPHABET,
    getProduct,
    generateCode,
    expiryFrom,
    cleanText,
};
