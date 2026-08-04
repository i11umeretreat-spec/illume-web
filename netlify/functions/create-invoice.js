// netlify/functions/create-invoice.js
// Создаёт Xendit Invoice (v2) для покупки аудиококонов и возвращает invoice_url,
// на который фронтенд редиректит покупателя. Оплата подтверждается отдельно
// вебхуком xendit-webhook.js — эта функция ничего не пишет в базу.

const crypto = require('crypto');

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const SITE_URL = process.env.SITE_URL || 'https://illumenew.netlify.app';

// TODO: цена — плейсхолдер, подтвердить с Дре/Катей перед запуском
const PRICE_IDR = 350000;

exports.handler = async function(event) {
    const headers = {
        'Access-Control-Allow-Origin': SITE_URL,
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: headers, body: 'Method Not Allowed' };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (err) {
        return { statusCode: 400, headers: headers, body: 'Invalid JSON' };
    }

    const email = body.email;
    const utmSource = body.utm_source || 'direct';

    if (!email) {
        return { statusCode: 400, headers: headers, body: 'Missing email' };
    }

    // external_id несёт utm тем же способом, что client_reference_id у Донны (split по '|')
    const externalId = 'cocoon-' + crypto.randomUUID() + '|' + utmSource;
    const auth = Buffer.from(XENDIT_SECRET_KEY + ':').toString('base64');

    let response;
    try {
        response = await fetch('https://api.xendit.co/v2/invoices', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + auth,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                external_id: externalId,
                amount: PRICE_IDR,
                payer_email: email,
                description: 'Аудиококоны — 4 практики (Донна x i11ume)',
                currency: 'IDR',
                success_redirect_url: SITE_URL + '/cocoons/thank-you',
                failure_redirect_url: SITE_URL + '/cocoons',
            }),
        });
    } catch (err) {
        console.error('Xendit request failed:', err.message);
        return { statusCode: 502, headers: headers, body: 'Payment provider unreachable' };
    }

    if (!response.ok) {
        const errText = await response.text();
        console.error('Xendit invoice error:', errText);
        return { statusCode: 502, headers: headers, body: 'Payment provider error' };
    }

    const invoice = await response.json();

    return {
        statusCode: 200,
        headers: headers,
        body: JSON.stringify({ invoice_url: invoice.invoice_url }),
    };
};
