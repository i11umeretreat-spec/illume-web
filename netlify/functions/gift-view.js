// netlify/functions/gift-view.js
// Публичные данные сертификата по коду. Код — единственный секрет, этого
// достаточно для показа.
//
// Наружу НЕ отдаются: paid, paid_note, created_ip, id, redeemed_note.
// Статус оплаты не показывается намеренно: покупатель и так знает, платил ли он,
// а получателю строка «не оплачено» испортила бы подарок. Проверка оплаты —
// работа панели, а не этой страницы.

import { createClient } from '@supabase/supabase-js';

function jsonResponse(statusCode, payload) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(payload),
    };
}

export async function processView(event, deps) {
    const { supabase } = deps;

    if (event.httpMethod !== 'GET') {
        return jsonResponse(405, { error: 'Method Not Allowed' });
    }

    const code = (event.queryStringParameters || {}).code;
    if (!code) {
        return jsonResponse(400, { error: 'Missing code' });
    }

    const { data, error } = await supabase
        .from('gift_certificates')
        .select('code, product_title, amount_idr, remaining_idr, recipient_name, sender_name, message, status, expires_at')
        .eq('code', code)
        .maybeSingle();

    if (error) {
        console.error('gift-view read error:', error.message);
        return jsonResponse(500, { error: 'Database error' });
    }

    // Одинаковый ответ на «нет такого» и «неверный формат»: перебирающему коды
    // не сообщаем, насколько он близок.
    if (!data) {
        return jsonResponse(404, { error: 'Not found' });
    }

    const expired = new Date(data.expires_at) < new Date();

    return jsonResponse(200, {
        code: data.code,
        product_title: data.product_title,
        recipient_name: data.recipient_name,
        sender_name: data.sender_name,
        message: data.message,
        status: data.status,
        expires_at: data.expires_at,
        expired,
        // Остаток нужен на странице только когда он не равен номиналу —
        // после поздней отмены. Иначе получатель увидит сумму подарка.
        remaining_idr: data.remaining_idr < data.amount_idr ? data.remaining_idr : null,
        usable: data.status === 'active' && !expired,
    });
}

export const handler = (event) =>
    processView(event, {
        supabase: createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY),
    });
