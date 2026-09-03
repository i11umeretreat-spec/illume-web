// Тесты создания сертификата. Зона денег — обязательны.
// Supabase и Resend подменяются через mock перед импортом функции,
// живая база в тестах не участвует.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert';
import { processCreate } from '../netlify/functions/gift-create.js';

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-key';
process.env.RESEND_API_KEY_ILLUME = 'test-resend';
process.env.SITE_URL = 'https://reset.i11ume.com';

// Состояние поддельной базы, доступное каждому тесту
const db = {
    inserted: [],
    rateRow: null,
    rateWrites: [],
    insertError: null,
    readError: null,
};

let sentEmails = [];
let resendShouldFail = false;

function fakeFrom(table) {
    if (table === 'rate_limits') {
        return {
            select: () => ({
                eq: () => ({
                    maybeSingle: async () =>
                        db.readError
                            ? { data: null, error: db.readError }
                            : { data: db.rateRow, error: null },
                }),
            }),
            upsert: async (row) => {
                db.rateWrites.push(row);
                db.rateRow = row;
                return { error: null };
            },
            update: (patch) => ({
                eq: async () => {
                    db.rateWrites.push(patch);
                    if (db.rateRow) db.rateRow.count = patch.count;
                    return { error: null };
                },
            }),
        };
    }

    if (table === 'gift_certificates') {
        return {
            insert: (row) => ({
                select: () => ({
                    single: async () => {
                        if (db.insertError) {
                            const err = db.insertError;
                            db.insertError = null; // ошибка одноразовая, чтобы тестировать ретрай
                            return { data: null, error: err };
                        }
                        db.inserted.push(row);
                        return { data: { code: row.code }, error: null };
                    },
                }),
            }),
        };
    }

    throw new Error('unexpected table ' + table);
}

const fakeSupabase = { from: fakeFrom };
const fakeResend = {
    emails: {
        send: async (msg) => {
            if (resendShouldFail) throw new Error('resend down');
            sentEmails.push(msg);
            return { id: 'x' };
        },
    },
};

beforeEach(() => {
    db.inserted = [];
    db.rateRow = null;
    db.rateWrites = [];
    db.insertError = null;
    db.readError = null;
    sentEmails = [];
    resendShouldFail = false;
});

function call(body, ip = '1.2.3.4', method = 'POST') {
    return processCreate(
        {
            httpMethod: method,
            headers: { 'x-forwarded-for': ip },
            body: JSON.stringify(body),
        },
        { supabase: fakeSupabase, resend: fakeResend }
    );
}

test('корректный запрос создаёт одну строку с суммой из матрицы', async () => {
    const res = await call({ product_id: 'banya', recipient_name: 'Марина' });
    assert.equal(res.statusCode, 200);
    assert.equal(db.inserted.length, 1);

    const row = db.inserted[0];
    assert.equal(row.amount_idr, 850000);
    assert.equal(row.remaining_idr, row.amount_idr);
    assert.equal(row.product_title, 'Банная перезагрузка');
    assert.equal(row.recipient_name, 'Марина');
    assert.match(row.code, /^RST-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

    const payload = JSON.parse(res.body);
    assert.ok(payload.url.includes(payload.code));
});

test('сертификат создаётся неоплаченным и активным', async () => {
    await call({ product_id: 'banya', recipient_name: 'Марина' });
    const row = db.inserted[0];
    // paid и status в insert не передаются — их ставит база по умолчанию
    assert.equal(row.paid, undefined);
    assert.equal(row.status, undefined);
});

test('сумма из тела запроса игнорируется', async () => {
    await call({
        product_id: 'combo_deep',
        recipient_name: 'Марина',
        amount_idr: 1,
        amount: 1,
        price: 1,
    });
    assert.equal(db.inserted[0].amount_idr, 1650000);
});

test('все пять продуктов дают свои суммы', async () => {
    const expected = {
        banya: 850000,
        massage_express: 600000,
        massage_deep: 1000000,
        combo_express: 1250000,
        combo_deep: 1650000,
    };
    for (const [id, amount] of Object.entries(expected)) {
        db.inserted = [];
        db.rateRow = null;
        await call({ product_id: id, recipient_name: 'X' });
        assert.equal(db.inserted[0].amount_idr, amount, id);
    }
});

test('неизвестный product_id отклоняется, строки нет', async () => {
    const res = await call({ product_id: 'banya_free', recipient_name: 'Марина' });
    assert.equal(res.statusCode, 400);
    assert.equal(db.inserted.length, 0);
});

test('product_id из прототипа отклоняется', async () => {
    const res = await call({ product_id: 'constructor', recipient_name: 'Марина' });
    assert.equal(res.statusCode, 400);
    assert.equal(db.inserted.length, 0);
});

test('без имени получателя не создаётся', async () => {
    const res = await call({ product_id: 'banya', recipient_name: '   ' });
    assert.equal(res.statusCode, 400);
    assert.equal(db.inserted.length, 0);
});

test('не POST отклоняется', async () => {
    const res = await call({ product_id: 'banya', recipient_name: 'X' }, '1.2.3.4', 'GET');
    assert.equal(res.statusCode, 405);
    assert.equal(db.inserted.length, 0);
});

test('битое тело не роняет функцию', async () => {
    const res = await processCreate(
        { httpMethod: 'POST', headers: {}, body: '{не json' },
        { supabase: fakeSupabase, resend: fakeResend }
    );
    assert.equal(res.statusCode, 400);
});

test('шестой запрос с одного IP за час отклоняется', async () => {
    db.rateRow = { key: 'gift-create:9.9.9.9', count: 5, window_start: new Date().toISOString() };
    const res = await call({ product_id: 'banya', recipient_name: 'Марина' }, '9.9.9.9');
    assert.equal(res.statusCode, 429);
    assert.equal(db.inserted.length, 0);
});

test('старое окно лимита не блокирует', async () => {
    db.rateRow = {
        key: 'gift-create:9.9.9.9',
        count: 99,
        window_start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    };
    const res = await call({ product_id: 'banya', recipient_name: 'Марина' }, '9.9.9.9');
    assert.equal(res.statusCode, 200);
});

test('сбой счётчика лимита не останавливает продажу', async () => {
    db.readError = { message: 'rate table down' };
    const res = await call({ product_id: 'banya', recipient_name: 'Марина' });
    assert.equal(res.statusCode, 200);
    assert.equal(db.inserted.length, 1);
});

test('длинные поля обрезаются, а не роняют вставку', async () => {
    await call({
        product_id: 'banya',
        recipient_name: 'М'.repeat(300),
        sender_name: 'А'.repeat(300),
        message: 'С'.repeat(900),
    });
    const row = db.inserted[0];
    assert.equal(row.recipient_name.length, 60);
    assert.equal(row.sender_name.length, 60);
    assert.equal(row.message.length, 200);
});

test('коллизия кода ретраится и сертификат всё равно создаётся', async () => {
    db.insertError = { code: '23505', message: 'duplicate key' };
    const res = await call({ product_id: 'banya', recipient_name: 'Марина' });
    assert.equal(res.statusCode, 200);
    assert.equal(db.inserted.length, 1);
});

test('ошибка базы отдаёт 500 и не притворяется успехом', async () => {
    db.insertError = { code: '42501', message: 'permission denied' };
    const res = await call({ product_id: 'banya', recipient_name: 'Марина' });
    assert.equal(res.statusCode, 500);
    assert.equal(db.inserted.length, 0);
});

test('падение письма не отменяет созданный сертификат', async () => {
    resendShouldFail = true;
    const res = await call({ product_id: 'banya', recipient_name: 'Марина' });
    assert.equal(res.statusCode, 200);
    assert.equal(db.inserted.length, 1);
    assert.equal(sentEmails.length, 0);
});

test('уведомление уходит с кодом и суммой', async () => {
    await call({ product_id: 'massage_deep', recipient_name: 'Марина' });
    assert.equal(sentEmails.length, 1);
    assert.ok(sentEmails[0].subject.includes(db.inserted[0].code));
    assert.ok(sentEmails[0].html.includes('Глубокая проработка'));
});

test('срок действия — 30 дней вперёд', async () => {
    await call({ product_id: 'banya', recipient_name: 'Марина' });
    const expires = new Date(db.inserted[0].expires_at);
    const days = (expires - new Date()) / (24 * 60 * 60 * 1000);
    assert.ok(days > 29.9 && days <= 30, 'дней до истечения: ' + days);
});

test('IP записывается в строку', async () => {
    await call({ product_id: 'banya', recipient_name: 'Марина' }, '77.88.99.11');
    assert.equal(db.inserted[0].created_ip, '77.88.99.11');
});

test('без почтового клиента сертификат всё равно создаётся', async () => {
    // Живой прогон поймал: new Resend(undefined) бросает ошибку в конструкторе
    // и роняет всю функцию из-за необязательного уведомления.
    const res = await processCreate(
        {
            httpMethod: 'POST',
            headers: { 'x-forwarded-for': '5.5.5.5' },
            body: JSON.stringify({ product_id: 'banya', recipient_name: 'Марина' }),
        },
        { supabase: fakeSupabase, resend: null }
    );
    assert.equal(res.statusCode, 200);
    assert.equal(db.inserted.length, 1);
    assert.equal(sentEmails.length, 0);
});
