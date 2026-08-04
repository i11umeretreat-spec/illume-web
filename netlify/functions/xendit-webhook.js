// netlify/functions/xendit-webhook.js
// Обрабатывает invoice.paid от Xendit (Invoices API v2).
// Пишет покупку в illume_purchases и сразу шлёт письмо с готовыми подписанными
// ссылками на 4 трека — без отдельного плеера/verify-token, минимальный контур.
//
// Верификация подлинности: заголовок x-callback-token сравнивается с
// XENDIT_CALLBACK_TOKEN timing-safe сравнением (тот же паттерн, что
// dashboard-auth.js у Донны).

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Resend } = require('resend');
const { COCOON_TRACKS } = require('./_cocoon_tracks');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const r2 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const BUCKET = process.env.R2_BUCKET_NAME;
const LINK_EXPIRY = 60 * 60 * 24 * 6; // 6 дней — с запасом от лимита SigV4 в 7 дней

const resend = new Resend(process.env.RESEND_API_KEY_ILLUME);
// TODO: подтвердить отправителя после верификации домена в Resend для i11ume
const FROM_EMAIL = 'i11ume <hello@i11ume.com>';

function timingSafeEqualStrings(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

function logSecurityEvent(eventName, ip, details) {
    supabase
        .from('security_log')
        .insert({ event: eventName, ip: ip, details: details })
        .then(function() {})
        .catch(function(err) { console.error('security_log write error:', err.message); });
}

function getClientIp(event) {
    return (event.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
}

exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const receivedToken = event.headers['x-callback-token'];
    const ip = getClientIp(event);

    if (!receivedToken || !timingSafeEqualStrings(receivedToken, process.env.XENDIT_CALLBACK_TOKEN)) {
        console.error('Xendit callback token mismatch');
        logSecurityEvent('xendit_token_failed', ip, {});
        return { statusCode: 401, body: 'Unauthorized' };
    }

    let payload;
    try {
        payload = JSON.parse(event.body);
    } catch (err) {
        return { statusCode: 400, body: 'Invalid JSON' };
    }

    if (payload.status !== 'PAID') {
        return { statusCode: 200, body: 'Event ignored' };
    }

    const email = payload.payer_email;
    if (!email) {
        console.error('No payer_email in invoice:', payload.id);
        return { statusCode: 400, body: 'Missing email' };
    }

    const externalIdParts = String(payload.external_id || '').split('|');
    const utmSource = externalIdParts[1] || 'direct';

    const token = crypto.randomUUID();
    const trackIds = Object.keys(COCOON_TRACKS);

    const { error } = await supabase
        .from('illume_purchases')
        .insert({
            token: token,
            email: email,
            product_id: 'audio_cocoon',
            track_ids: trackIds,
            amount: payload.paid_amount || payload.amount || null,
            currency: payload.currency || 'IDR',
            external_payment_id: payload.id,
            utm_source: utmSource,
        });

    if (error) {
        console.error('Supabase insert error:', error.message);
        return { statusCode: 500, body: 'Database error' };
    }

    let links = [];
    try {
        links = await buildSignedLinks(trackIds);
    } catch (err) {
        // Покупка уже записана — не фейлим вебхук из-за R2/письма.
        // Ссылки всегда можно перегенерировать вручную по token из illume_purchases.
        console.error('R2 signing error:', err.message);
    }

    try {
        await sendEmail(email, links);
    } catch (err) {
        console.error('Email send error:', err.message);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

async function buildSignedLinks(trackIds) {
    return Promise.all(
        trackIds.map(async function(id) {
            const track = COCOON_TRACKS[id];
            const command = new GetObjectCommand({
                Bucket: BUCKET,
                Key: track.file,
                ResponseContentDisposition: 'attachment; filename="' + encodeURIComponent(track.title) + '.mp3"',
            });
            const url = await getSignedUrl(r2, command, { expiresIn: LINK_EXPIRY });
            return { title: track.title, url: url };
        })
    );
}

async function sendEmail(email, links) {
    await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Твои аудиококоны готовы',
        html: buildEmailHtml(links),
    });
}

function buildEmailHtml(links) {
    const linksHtml = links.map(function(l) {
        return '<a href="' + l.url + '" style="display:block;margin-bottom:14px;color:#E0A93A;text-decoration:none;font-family:sans-serif;">' + l.title + '</a>';
    }).join('');

    return '<!DOCTYPE html><html><body style="background:#0A1420;font-family:sans-serif;padding:40px 20px;">' +
        '<div style="max-width:480px;margin:0 auto;text-align:center;color:#EAE2D6;">' +
        '<h1 style="font-weight:300;font-size:22px;margin-bottom:24px;">Аудиококоны готовы</h1>' +
        '<div style="text-align:left;">' + linksHtml + '</div>' +
        '<p style="color:rgba(234,226,214,0.4);font-size:11px;margin-top:32px;">Ссылки активны 6 дней. Если понадобится позже — напиши нам, перевыпустим.</p>' +
        '</div></body></html>';
}
