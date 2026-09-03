// Тесты просмотра и панели. Зона денег и доступа — обязательны.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert';
import { processView } from './gift-view.js';
import { processAdmin } from './gift-admin.js';

const TOKEN = 'test-admin-token-длинный';
const WRONG = 'wrong-admin-token-длинн';

const state = { rows: [], updates: [], securityEvents: [] };

function future(days = 100) {
    return new Date(Date.now() + days * 864e5).toISOString();
}
function past(days = 10) {
    return new Date(Date.now() - days * 864e5).toISOString();
}

function baseCert(over = {}) {
    return {
        code: 'RST-AAAA-BBBB',
        product_id: 'banya',
        product_title: 'Банная перезагрузка',
        amount_idr: 850000,
        remaining_idr: 850000,
        recipient_name: 'Марина',
        sender_name: 'Аня',
        message: 'С днём рождения',
        status: 'active',
        paid: false,
        paid_at: null,
        paid_note: null,
        created_at: new Date().toISOString(),
        created_ip: '1.2.3.4',
        expires_at: future(),
        redeemed_at: null,
        redeemed_note: null,
        id: 'uuid-secret',
        ...over,
    };
}

function fakeFrom(table) {
    if (table === 'security_log') {
        return {
            insert: (row) => {
                state.securityEvents.push(row);
                return Promise.resolve({ error: null });
            },
        };
    }

    if (table !== 'gift_certificates') throw new Error('unexpected table ' + table);

    const builder = {
        _filters: {},
        select() { return builder; },
        eq(col, val) { builder._filters[col] = val; return builder; },
        order() { return builder; },
        limit() { return builder; },
        _rows() {
            return state.rows.filter((r) =>
                Object.entries(builder._filters).every(([k, v]) => r[k] === v)
            );
        },
        // Настоящий билдер Supabase — thenable: результат приходит при await,
        // а .eq() можно цеплять и после .limit(). Фейк должен вести себя так же.
        then(resolve, reject) {
            return Promise.resolve({ data: builder._rows(), error: null }).then(resolve, reject);
        },
        maybeSingle() {
            return Promise.resolve({ data: builder._rows()[0] || null, error: null });
        },
        update(patch) {
            builder._patch = patch;
            return builder;
        },
        single() {
            const row = builder._rows()[0];
            if (builder._patch && row) {
                Object.assign(row, builder._patch);
                state.updates.push(builder._patch);
            }
            return Promise.resolve({ data: row || null, error: null });
        },
    };
    return builder;
}

const deps = { supabase: { from: fakeFrom }, adminToken: TOKEN };

beforeEach(() => {
    state.rows = [baseCert()];
    state.updates = [];
    state.securityEvents = [];
});

function view(code) {
    return processView(
        { httpMethod: 'GET', headers: {}, queryStringParameters: code ? { code } : {} },
        deps
    );
}

function admin(method, { token = TOKEN, body = null, query = null } = {}) {
    return processAdmin(
        {
            httpMethod: method,
            headers: { 'x-admin-token': token, 'x-forwarded-for': '1.2.3.4' },
            body: body ? JSON.stringify(body) : null,
            queryStringParameters: query,
        },
        deps
    );
}

/* ── ПРОСМОТР ─────────────────────────────────────────── */

test('просмотр не отдаёт paid, created_ip и id', async () => {
    const res = await view('RST-AAAA-BBBB');
    const data = JSON.parse(res.body);
    assert.equal(res.statusCode, 200);
    for (const leak of ['paid', 'paid_note', 'created_ip', 'id', 'amount_idr']) {
        assert.equal(data[leak], undefined, 'утечка поля ' + leak);
    }
});

test('просмотр отдаёт то, что нужно получателю', async () => {
    const data = JSON.parse((await view('RST-AAAA-BBBB')).body);
    assert.equal(data.product_title, 'Банная перезагрузка');
    assert.equal(data.recipient_name, 'Марина');
    assert.equal(data.sender_name, 'Аня');
    assert.equal(data.usable, true);
});

test('остаток скрыт, пока равен номиналу', async () => {
    const data = JSON.parse((await view('RST-AAAA-BBBB')).body);
    assert.equal(data.remaining_idr, null);
});

test('остаток показывается после поздней отмены', async () => {
    state.rows[0].remaining_idr = 425000;
    const data = JSON.parse((await view('RST-AAAA-BBBB')).body);
    assert.equal(data.remaining_idr, 425000);
});

test('истёкший сертификат помечен и непригоден', async () => {
    state.rows[0].expires_at = past();
    const data = JSON.parse((await view('RST-AAAA-BBBB')).body);
    assert.equal(data.expired, true);
    assert.equal(data.usable, false);
});

test('погашенный непригоден', async () => {
    state.rows[0].status = 'redeemed';
    const data = JSON.parse((await view('RST-AAAA-BBBB')).body);
    assert.equal(data.usable, false);
});

test('неизвестный код — 404 без подробностей', async () => {
    const res = await view('RST-ZZZZ-ZZZZ');
    assert.equal(res.statusCode, 404);
    assert.equal(JSON.parse(res.body).error, 'Not found');
});

test('без кода — 400', async () => {
    assert.equal((await view(null)).statusCode, 400);
});

/* ── ДОСТУП В ПАНЕЛЬ ──────────────────────────────────── */

test('без токена панель закрыта', async () => {
    const res = await processAdmin(
        { httpMethod: 'GET', headers: {}, queryStringParameters: null },
        deps
    );
    assert.equal(res.statusCode, 401);
});

test('чужой токен закрыт и попадает в security_log', async () => {
    const res = await admin('GET', { token: WRONG });
    assert.equal(res.statusCode, 401);
    assert.equal(state.securityEvents.length, 1);
    assert.equal(state.securityEvents[0].event, 'gift_admin_auth_failed');
});

test('чужой токен не меняет состояние', async () => {
    await admin('POST', { token: WRONG, body: { code: 'RST-AAAA-BBBB', action: 'redeem' } });
    assert.equal(state.rows[0].status, 'active');
    assert.equal(state.updates.length, 0);
});

test('верный токен пускает к списку', async () => {
    const res = await admin('GET');
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(res.body).items.length, 1);
});

/* ── ДЕЙСТВИЯ ─────────────────────────────────────────── */

test('pay отмечает оплату', async () => {
    const res = await admin('POST', { body: { code: 'RST-AAAA-BBBB', action: 'pay', note: 'перевод' } });
    assert.equal(res.statusCode, 200);
    assert.equal(state.rows[0].paid, true);
    assert.ok(state.rows[0].paid_at);
});

test('повторная отметка оплаты отклоняется', async () => {
    state.rows[0].paid = true;
    const res = await admin('POST', { body: { code: 'RST-AAAA-BBBB', action: 'pay' } });
    assert.equal(res.statusCode, 409);
});

test('неоплаченный сертификат не гасится', async () => {
    const res = await admin('POST', { body: { code: 'RST-AAAA-BBBB', action: 'redeem' } });
    assert.equal(res.statusCode, 409);
    assert.match(JSON.parse(res.body).error, /Оплата не отмечена/);
    assert.equal(state.rows[0].status, 'active');
});

test('оплаченный гасится и обнуляет остаток', async () => {
    state.rows[0].paid = true;
    const res = await admin('POST', { body: { code: 'RST-AAAA-BBBB', action: 'redeem' } });
    assert.equal(res.statusCode, 200);
    assert.equal(state.rows[0].status, 'redeemed');
    assert.equal(state.rows[0].remaining_idr, 0);
    assert.ok(state.rows[0].redeemed_at);
});

test('повторное погашение отклоняется', async () => {
    state.rows[0].paid = true;
    state.rows[0].status = 'redeemed';
    const res = await admin('POST', { body: { code: 'RST-AAAA-BBBB', action: 'redeem' } });
    assert.equal(res.statusCode, 409);
    assert.match(JSON.parse(res.body).error, /уже погашен/);
});

test('истёкший не гасится даже оплаченный', async () => {
    state.rows[0].paid = true;
    state.rows[0].expires_at = past();
    const res = await admin('POST', { body: { code: 'RST-AAAA-BBBB', action: 'redeem' } });
    assert.equal(res.statusCode, 409);
    assert.match(JSON.parse(res.body).error, /истёк/);
    assert.equal(state.rows[0].status, 'active');
});

test('аннулированный не гасится', async () => {
    state.rows[0].paid = true;
    state.rows[0].status = 'void';
    const res = await admin('POST', { body: { code: 'RST-AAAA-BBBB', action: 'redeem' } });
    assert.equal(res.statusCode, 409);
});

test('partial оставляет половину номинала и держит статус активным', async () => {
    const res = await admin('POST', { body: { code: 'RST-AAAA-BBBB', action: 'partial' } });
    assert.equal(res.statusCode, 200);
    assert.equal(state.rows[0].remaining_idr, 425000);
    assert.equal(state.rows[0].status, 'active');
});

test('повторный partial не съедает остаток дальше', async () => {
    await admin('POST', { body: { code: 'RST-AAAA-BBBB', action: 'partial' } });
    await admin('POST', { body: { code: 'RST-AAAA-BBBB', action: 'partial' } });
    assert.equal(state.rows[0].remaining_idr, 425000);
});

test('void аннулирует и обнуляет остаток', async () => {
    const res = await admin('POST', { body: { code: 'RST-AAAA-BBBB', action: 'void' } });
    assert.equal(res.statusCode, 200);
    assert.equal(state.rows[0].status, 'void');
    assert.equal(state.rows[0].remaining_idr, 0);
});

test('неизвестный код — 404', async () => {
    const res = await admin('POST', { body: { code: 'RST-ZZZZ-ZZZZ', action: 'pay' } });
    assert.equal(res.statusCode, 404);
});

test('неизвестное действие отклоняется', async () => {
    const res = await admin('POST', { body: { code: 'RST-AAAA-BBBB', action: 'delete_all' } });
    assert.equal(res.statusCode, 400);
    assert.equal(state.updates.length, 0);
});

test('битое тело не роняет панель', async () => {
    const res = await processAdmin(
        { httpMethod: 'POST', headers: { 'x-admin-token': TOKEN }, body: '{сломано' },
        deps
    );
    assert.equal(res.statusCode, 400);
});

test('фильтр по неоплаченным работает', async () => {
    state.rows.push(baseCert({ code: 'RST-CCCC-DDDD', paid: true }));
    const res = await admin('GET', { query: { paid: 'false' } });
    const items = JSON.parse(res.body).items;
    assert.equal(items.length, 1);
    assert.equal(items[0].code, 'RST-AAAA-BBBB');
});
