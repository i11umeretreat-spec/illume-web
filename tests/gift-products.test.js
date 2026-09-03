// Тесты матрицы цен и генератора кода. Зона денег — обязательны.
// Запуск: node --test netlify/functions/

import { test } from 'node:test';
import assert from 'node:assert';
import {
    GIFT_PRODUCTS,
    getProduct,
    generateCode,
    expiryFrom,
    cleanText,
} from '../netlify/functions/_gift_products.js';

// Ожидаемые суммы дублируются здесь намеренно: если кто-то поправит цену
// в _gift_products.js, тест должен упасть и потребовать осознанного решения.
const EXPECTED = {
    banya: 850000,
    massage_express: 600000,
    massage_deep: 1000000,
    combo_express: 1250000,
    combo_deep: 1650000,
};

test('каждый product_id отдаёт сумму из матрицы', () => {
    for (const [id, amount] of Object.entries(EXPECTED)) {
        assert.equal(getProduct(id).amount, amount, 'цена ' + id);
    }
});

test('в матрице ровно пять продуктов, лишних не завезли', () => {
    assert.deepEqual(Object.keys(GIFT_PRODUCTS).sort(), Object.keys(EXPECTED).sort());
});

test('у каждого продукта непустое название', () => {
    for (const id of Object.keys(GIFT_PRODUCTS)) {
        assert.ok(getProduct(id).title.length > 0, 'название ' + id);
    }
});

test('неизвестный product_id бросает ошибку, а не молчит', () => {
    assert.throws(() => getProduct('banya_free'), /Unknown product_id/);
    assert.throws(() => getProduct(''), /Unknown product_id/);
    assert.throws(() => getProduct(undefined), /Unknown product_id/);
});

test('прототипные ключи не проходят как продукт', () => {
    // getProduct('constructor') не должен вернуть функцию из прототипа Object
    assert.throws(() => getProduct('constructor'), /Unknown product_id/);
    assert.throws(() => getProduct('toString'), /Unknown product_id/);
});

test('код имеет формат RST-XXXX-XXXX', () => {
    for (let i = 0; i < 200; i++) {
        assert.match(generateCode(), /^RST-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    }
});

test('в коде нет символов 0 O 1 I L', () => {
    for (let i = 0; i < 2000; i++) {
        const body = generateCode().slice(4).replace('-', '');
        assert.ok(!/[0O1IL]/.test(body), 'плохой символ в ' + body);
    }
});

test('10 000 кодов без повторов', () => {
    const seen = new Set();
    for (let i = 0; i < 10000; i++) {
        seen.add(generateCode());
    }
    assert.equal(seen.size, 10000);
});

test('срок действия — ровно шесть месяцев', () => {
    const from = new Date('2026-09-03T10:00:00Z');
    const until = expiryFrom(from);
    assert.equal(until.getFullYear(), 2027);
    assert.equal(until.getMonth(), 2); // март, месяцы с нуля
});

test('срок от 31 августа не уезжает мимо февраля', () => {
    // 31 августа + 6 месяцев = 31 февраля, которого нет.
    // Проверяем, что результат остался валидной датой, а не Invalid Date.
    const until = expiryFrom(new Date('2026-08-31T10:00:00Z'));
    assert.ok(!isNaN(until.getTime()));
    assert.ok(until > new Date('2027-02-01T00:00:00Z'));
});

test('cleanText режет длину', () => {
    assert.equal(cleanText('a'.repeat(300), 60).length, 60);
});

test('cleanText вычищает переносы и управляющие символы', () => {
    assert.equal(cleanText('Марина\nСергеевна\t', 60), 'Марина Сергеевна');
});

test('cleanText отдаёт null для пустого и отсутствующего', () => {
    assert.equal(cleanText('   ', 60), null);
    assert.equal(cleanText(undefined, 60), null);
    assert.equal(cleanText(null, 60), null);
});

test('cleanText не падает на числах и объектах', () => {
    assert.equal(cleanText(42, 60), '42');
    assert.ok(typeof cleanText({ a: 1 }, 60) === 'string');
});

test('кириллица переживает очистку', () => {
    assert.equal(cleanText('Нади · подарок «от Ани»', 60), 'Нади · подарок «от Ани»');
});
