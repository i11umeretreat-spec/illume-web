// netlify/functions/gift-admin.js
// Панель сертификатов: список, отметка оплаты, погашение, поздняя отмена,
// аннулирование. Всё требует GIFT_ADMIN_TOKEN.
//
// Это единственная защита денег в контуре: код активен сразу после создания,
// поэтому сертификат без paid=true гасить нельзя, каким бы настоящим он ни
// выглядел. Проверка на это — в действии 'redeem'.

import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ACTIONS = ['pay', 'redeem', 'partial', 'void'];

function jsonResponse(statusCode, payload) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-admin-token',
        },
        body: JSON.stringify(payload),
    };
}

function timingSafeEqualStrings(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
}

function getClientIp(event) {
    return (event.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
}

function authorized(event, expectedToken) {
    const received = event.headers['x-admin-token'];
    if (!received || !expectedToken) return false;
    return timingSafeEqualStrings(received, expectedToken);
}

export async function processAdmin(event, deps) {
    const { supabase, adminToken } = deps;

    if (event.httpMethod === 'OPTIONS') {
        return jsonResponse(200, {});
    }

    if (!authorized(event, adminToken)) {
        supabase
            .from('security_log')
            .insert({ event: 'gift_admin_auth_failed', ip: getClientIp(event), details: {} })
            .then(() => {}, (err) => console.error('security_log:', err.message));
        return jsonResponse(401, { error: 'Unauthorized' });
    }

    if (event.httpMethod === 'GET') return listCertificates(supabase, event);
    if (event.httpMethod === 'POST') return applyAction(supabase, event);
    return jsonResponse(405, { error: 'Method Not Allowed' });
}

async function listCertificates(supabase, event) {
    const params = event.queryStringParameters || {};
    let query = supabase
        .from('gift_certificates')
        .select('code, product_title, amount_idr, remaining_idr, recipient_name, sender_name, status, paid, paid_at, created_at, expires_at, redeemed_at, redeemed_note, paid_note')
        .order('created_at', { ascending: false })
        .limit(200);

    if (params.status) query = query.eq('status', params.status);
    if (params.paid === 'true') query = query.eq('paid', true);
    if (params.paid === 'false') query = query.eq('paid', false);

    const { data, error } = await query;
    if (error) {
        console.error('gift-admin list error:', error.message);
        return jsonResponse(500, { error: 'Database error' });
    }

    const now = new Date();
    return jsonResponse(200, {
        items: (data || []).map((row) => ({
            ...row,
            expired: new Date(row.expires_at) < now,
        })),
    });
}

async function applyAction(supabase, event) {
    let body;
    try {
        body = JSON.parse(event.body);
    } catch {
        return jsonResponse(400, { error: 'Invalid JSON' });
    }

    const { code, action } = body;
    if (!code) return jsonResponse(400, { error: 'Missing code' });
    if (!ACTIONS.includes(action)) return jsonResponse(400, { error: 'Unknown action' });

    const note = body.note ? String(body.note).slice(0, 200) : null;

    const { data: cert, error: readError } = await supabase
        .from('gift_certificates')
        .select('code, status, paid, amount_idr, remaining_idr, expires_at')
        .eq('code', code)
        .maybeSingle();

    if (readError) {
        console.error('gift-admin read error:', readError.message);
        return jsonResponse(500, { error: 'Database error' });
    }
    if (!cert) return jsonResponse(404, { error: 'Сертификат не найден' });

    const expired = new Date(cert.expires_at) < new Date();
    let patch;

    if (action === 'pay') {
        if (cert.paid) return jsonResponse(409, { error: 'Оплата уже отмечена' });
        patch = { paid: true, paid_at: new Date().toISOString(), paid_note: note };
    } else if (action === 'redeem') {
        if (cert.status === 'redeemed') return jsonResponse(409, { error: 'Сертификат уже погашен' });
        if (cert.status === 'void') return jsonResponse(409, { error: 'Сертификат аннулирован' });
        if (expired) return jsonResponse(409, { error: 'Срок действия истёк' });
        if (!cert.paid) return jsonResponse(409, { error: 'Оплата не отмечена — сначала подтвердите перевод' });
        patch = {
            status: 'redeemed',
            remaining_idr: 0,
            redeemed_at: new Date().toISOString(),
            redeemed_note: note,
        };
    } else if (action === 'partial') {
        if (cert.status !== 'active') return jsonResponse(409, { error: 'Сертификат уже не активен' });
        if (expired) return jsonResponse(409, { error: 'Срок действия истёк' });
        // Половина от номинала, а не от текущего остатка: правило про позднюю
        // отмену считается один раз, повторное применение не съедает остаток дальше.
        patch = { remaining_idr: Math.floor(cert.amount_idr / 2), redeemed_note: note };
    } else if (action === 'void') {
        if (cert.status === 'void') return jsonResponse(409, { error: 'Сертификат уже аннулирован' });
        patch = { status: 'void', remaining_idr: 0, redeemed_note: note };
    }

    const { data, error } = await supabase
        .from('gift_certificates')
        .update(patch)
        .eq('code', code)
        .select('code, status, paid, remaining_idr, redeemed_at, paid_at')
        .single();

    if (error) {
        console.error('gift-admin update error:', error.message);
        return jsonResponse(500, { error: 'Database error' });
    }

    return jsonResponse(200, { ok: true, certificate: data });
}

export const handler = (event) =>
    processAdmin(event, {
        supabase: createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY),
        adminToken: process.env.GIFT_ADMIN_TOKEN,
    });
