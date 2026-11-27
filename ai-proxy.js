/* ==========================================================================
   Cloudflare Worker: AI proxy
   Keeps the AI API key on the server. The browser only calls this Worker.

   Setup:
   1. npx wrangler init ai-proxy  (choose "Hello World" worker) and paste this file.
   2. Secrets:   npx wrangler secret put GEMINI_API_KEY
   3. Vars in wrangler.toml:
        [vars]
        ALLOWED_ORIGIN = "https://ben7830aoks-a11y.github.io"
        AI_MODEL = "gemini-1.5-flash"        // change to any model you have access to
   4. npx wrangler deploy
   5. Put the deployed URL into Platform.AI_PROXY_URL in platform-libs.js.
   ========================================================================== */
export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        const allowed = env.ALLOWED_ORIGIN || '';
        const corsHeaders = {
            'Access-Control-Allow-Origin': origin === allowed ? origin : allowed,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Vary': 'Origin'
        };

        if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
        if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        if (origin !== allowed) return new Response('Origin not allowed', { status: 403, headers: corsHeaders });

        let body;
        try { body = await request.json(); } catch (_) {
            return new Response('Bad JSON', { status: 400, headers: corsHeaders });
        }
        const prompt = String(body.prompt || '').slice(0, 8000);
        if (!prompt) return new Response('Empty prompt', { status: 400, headers: corsHeaders });

        const model = env.AI_MODEL || 'gemini-1.5-flash';
        const upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }
        );
        if (!upstream.ok) {
            return new Response('Upstream error', { status: 502, headers: corsHeaders });
        }
        const data = await upstream.json();
        const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
        return new Response(JSON.stringify({ text }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
};
