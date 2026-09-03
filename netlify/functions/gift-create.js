// netlify/functions/gift-create.js
// Создаёт подарочный сертификат: пишет строку в gift_certificates и возвращает
// код со ссылкой. Оплаты здесь нет — код активен сразу, перевод сверяется
// постфактум через панель (gift-admin.js, действие 'pay').
//
// Деньги: сумма берётся только из _gift_products.js по product_id.
// Любое amount из тела запроса игнорируется.

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getProduct, generateCode, expiryFrom, cleanText } from './_gift_products.js';

const FROM_EMAIL = 'i11ume <hello@i11ume.com>';
const NOTIFY_EMAIL = process.env.GIFT_NOTIFY_EMAIL || 'hello@i11ume.com';

const SITE_URL = process.env.SITE_URL || 'https://reset.i11ume.com';

const RATE_LIMIT_PER_HOUR = 5;
const CODE_RETRIES = 5;

const NAME_MAX = 60;
const MESSAGE_MAX = 200;

function jsonResponse(statusCode, payload) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: JSON.stringify(payload),
    };
}

function getClientIp(event) {
    return (event.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
}

// Лимит на переиспользуемой таблице rate_limits, а не на своей:
// счётчик уже есть в проекте, вторая такая же сущность только развела бы схему.
async function overRateLimit(supabase, ip) {
    const key = 'gift-create:' + ip;
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('rate_limits')
        .select('key, count, window_start')
        .eq('key', key)
        .maybeSingle();

    if (error) {
        // Счётчик недоступен — пропускаем запрос. Иначе сбой служебной таблицы
        // остановил бы продажи целиком, а это дороже, чем лишний сертификат.
        console.error('rate_limit read error:', error.message);
        return false;
    }

    if (!data || data.window_start < hourAgo) {
        await supabase
            .from('rate_limits')
            .upsert({ key, count: 1, window_start: new Date().toISOString() });
        return false;
    }

    if (data.count >= RATE_LIMIT_PER_HOUR) return true;

    await supabase
        .from('rate_limits')
        .update({ count: data.count + 1 })
        .eq('key', key);
    return false;
}

async function insertWithUniqueCode(supabase, row) {
    // Коллизия кода почти невероятна, но уникальный индекс всё равно её поймает.
    // Ретраим, чтобы покупатель не увидел ошибку из-за случайного совпадения.
    for (let attempt = 0; attempt < CODE_RETRIES; attempt++) {
        const code = generateCode();
        const { data, error } = await supabase
            .from('gift_certificates')
            .insert({ ...row, code })
            .select('code')
            .single();

        if (!error) return data.code;
        if (error.code !== '23505') throw new Error(error.message);
    }
    throw new Error('Could not generate unique code');
}

// Логика вынесена из handler и принимает клиентов аргументом: так её можно
// прогнать тестами без живой базы и без мока модулей.
export async function processCreate(event, deps) {
    const { supabase, resend } = deps;
    if (event.httpMethod === 'OPTIONS') {
        return jsonResponse(200, {});
    }
    if (event.httpMethod !== 'POST') {
        return jsonResponse(405, { error: 'Method Not Allowed' });
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return jsonResponse(400, { error: 'Invalid JSON' });
    }

    let product;
    try {
        product = getProduct(body.product_id);
    } catch {
        return jsonResponse(400, { error: 'Unknown product' });
    }

    const recipientName = cleanText(body.recipient_name, NAME_MAX);
    if (!recipientName) {
        return jsonResponse(400, { error: 'Missing recipient_name' });
    }

    const ip = getClientIp(event);
    if (await overRateLimit(supabase, ip)) {
        return jsonResponse(429, { error: 'Too many certificates, try later' });
    }

    let code;
    try {
        code = await insertWithUniqueCode(supabase, {
            product_id: body.product_id,
            product_title: product.title,
            amount_idr: product.amount,
            remaining_idr: product.amount,
            recipient_name: recipientName,
            sender_name: cleanText(body.sender_name, NAME_MAX),
            message: cleanText(body.message, MESSAGE_MAX),
            expires_at: expiryFrom().toISOString(),
            created_ip: ip,
        });
    } catch (err) {
        console.error('gift insert error:', err.message);
        return jsonResponse(500, { error: 'Database error' });
    }

    // Письмо — уведомление для Нади, а не часть выдачи сертификата.
    // Его падение не должно отменять уже созданный сертификат.
    try {
        await notify(resend, code, product, recipientName);
    } catch (err) {
        console.error('gift notify error:', err.message);
    }

    return jsonResponse(200, {
        code,
        url: SITE_URL + '/gift/view.html?c=' + encodeURIComponent(code),
    });
}

export const handler = (event) =>
    processCreate(event, {
        supabase: createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY),
        resend: new Resend(process.env.RESEND_API_KEY_ILLUME),
    });

async function notify(resend, code, product, recipientName) {
    await resend.emails.send({
        from: FROM_EMAIL,
        to: NOTIFY_EMAIL,
        subject: 'Новый сертификат ' + code + ' — ждёт оплаты',
        html:
            '<div style="font-family:sans-serif;line-height:1.6">' +
            '<p><b>' + code + '</b></p>' +
            '<p>' + product.title + '<br>' +
            product.amount.toLocaleString('ru-RU') + ' IDR<br>' +
            'Для: ' + recipientName + '</p>' +
            '<p>Отметить оплату — в панели сертификатов.</p>' +
            '</div>',
    });
}
