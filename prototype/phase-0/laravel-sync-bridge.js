/* Cognitive Care NER — Laravel Backend Sync & Mimo Gateway Bridge.
 * Connects the offline-first web shell / Capacitor Android app to the Laravel API.
 */
(function() {
    'use strict';

    const BASE_URL = window.CCNER_API_BASE_URL || '/api/v1';
    const OUTBOX_KEY = 'ccner.laravel.outbox.v1';

    function getAuthToken() {
        return localStorage.getItem('ccner-token') || null;
    }

    function readOutbox() {
        try {
            return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
        } catch (_) {
            return [];
        }
    }

    function saveOutbox(items) {
        localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
    }

    async function pushBatch(payload) {
        const token = getAuthToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${BASE_URL}/sync/batch`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`Sync failed with HTTP ${response.status}`);
        return await response.json();
    }

    async function flushOutbox() {
        const outbox = readOutbox();
        if (!outbox.length || !navigator.onLine) return;

        const sessions = outbox.filter(item => item.type === 'session').map(item => item.data);
        const tasks = outbox.filter(item => item.type === 'task').map(item => item.data);

        try {
            const result = await pushBatch({ sessions, tasks });
            const syncedIds = new Set(result.synced_sessions || []);
            const remaining = outbox.filter(item => item.type !== 'session' || !syncedIds.has(item.data.client_session_id));
            saveOutbox(remaining);
            console.log('Cognitive Care Laravel Sync: Batch successfully synced.');
        } catch (e) {
            console.warn('Cognitive Care Laravel Sync: Outbox push delayed until next retry.', e);
        }
    }

    // Intercept completed game sessions and queue for sync
    window.addEventListener('ccner:game-session-complete', function(e) {
        const detail = e.detail || {};
        const clientSessionId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'sess_' + Date.now();

        const sessionPayload = {
            client_session_id: clientSessionId,
            session_type: 'five_game_continuous',
            started_at: new Date(Date.now() - 300000).toISOString(),
            completed_at: new Date().toISOString(),
            overall_score: Math.round((detail.accuracy || 0) * 100),
            accuracy: detail.accuracy || 0,
            avg_response_time_seconds: detail.avgResponse || 0,
            games_completed: 5,
            game_order: detail.order || ['sequence', 'stroop', 'house', 'pattern', 'spot'],
            results: detail.results || [],
        };

        const outbox = readOutbox();
        outbox.push({ type: 'session', data: sessionPayload, queued_at: Date.now() });
        saveOutbox(outbox);

        flushOutbox();
    });

    // Wire up Mimo AI Gateway with Laravel proxy
    window.ccnerChatWithMimo = async function(message, history = [], screen = 'homeView', game = 'none', level = 1) {
        const token = getAuthToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
            const r = await fetch(`${BASE_URL}/companion/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ message, history, screen, game, level }),
            });
            if (!r.ok) throw new Error('Mimo Gateway error');
            const data = await r.json();
            return data.reply;
        } catch (e) {
            return "Woof! I'm right here with you. Let's take today one step at a time! 🐾";
        }
    };

    window.addEventListener('online', flushOutbox);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) flushOutbox();
    });

    setTimeout(flushOutbox, 1500);
})();
