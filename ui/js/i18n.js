// ---------- Langue du logiciel (Paramètres > Langue) ----------
// The texts of the editor are written in the scripts (mostly English, the start screen in French). This file translates what is on screen:
// every text node and every title / placeholder / aria-label is looked up in the tables of i18n-data.js (the whole text first, then the
// known pieces it is made of, for texts built from pieces like 'The rooms are ' + n + ' cm higher'). Nothing in the logic changes.
// The choice is kept in localStorage 'mlo.lang'. Anything inside [data-noi18n] (or an input / textarea) is never touched.
window.MLO = window.MLO || {};
(function (M) {
    'use strict';
    // the 10 most spoken languages in the world (total speakers, Ethnologue 2025)
    const LANGS = [
        { code: 'en', name: 'English', native: 'English', glyph: 'Aa', speakers: '1,53 Md', rank: 1 },
        { code: 'zh', name: 'Chinese', native: '中文', glyph: '文', speakers: '1,18 Md', rank: 2 },
        { code: 'hi', name: 'Hindi', native: 'हिन्दी', glyph: 'अ', speakers: '609 M', rank: 3 },
        { code: 'es', name: 'Spanish', native: 'Español', glyph: 'Ñ', speakers: '558 M', rank: 4 },
        { code: 'ar', name: 'Arabic', native: 'العربية', glyph: 'ع', speakers: '335 M', rank: 5, rtl: true },
        { code: 'fr', name: 'French', native: 'Français', glyph: 'É', speakers: '312 M', rank: 6 },
        { code: 'bn', name: 'Bengali', native: 'বাংলা', glyph: 'অ', speakers: '284 M', rank: 7 },
        { code: 'pt', name: 'Portuguese', native: 'Português', glyph: 'Ã', speakers: '267 M', rank: 8 },
        { code: 'ru', name: 'Russian', native: 'Русский', glyph: 'Я', speakers: '253 M', rank: 9 },
        { code: 'ur', name: 'Urdu', native: 'اردو', glyph: 'ے', speakers: '246 M', rank: 10, rtl: true }
    ];
    const ATTRS = ['title', 'placeholder', 'aria-label'];
    const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CANVAS: 1, svg: 1, SVG: 1 };
    const I = { LANGS, lang: 'fr' };
    try { const l = localStorage.getItem('mlo.lang'); if (l && LANGS.some(x => x.code === l)) I.lang = l; } catch (e) { }

    // the tables: data.src = every source text, data.tr[code][i] = its translation (null / missing = keep the source)
    let maps = {}, rx = {}, cache = {};
    function table(code) {
        if (maps[code]) return maps[code];
        const D = M.I18N_DATA, m = new Map();
        if (D && D.tr && D.tr[code]) D.src.forEach((s, i) => { const t = D.tr[code][i]; if (t != null && t !== '' && t !== s) m.set(s, t); });
        maps[code] = m; return m;
    }
    function piecesRx(code) {
        if (rx[code] !== undefined) return rx[code];
        const keys = [...table(code).keys()].filter(k => k.replace(/[^\p{L}]/gu, '').length >= 2).sort((a, b) => b.length - a.length);
        const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // a piece that starts / ends with a letter must not be glued to other letters there ('Door' is not in 'Doorway')
        const W = /^[\p{L}\p{N}]/u, E = /[\p{L}\p{N}]$/u;
        const alt = keys.map(k => (W.test(k) ? '(?<![\\p{L}\\p{N}_])' : '') + esc(k) + (E.test(k) ? '(?![\\p{L}\\p{N}_])' : ''));
        rx[code] = keys.length ? new RegExp(alt.join('|'), 'gu') : null;
        return rx[code];
    }
    // translate one text: whole first (keeping the spaces around it), else piece by piece
    function tr(text, code) {
        code = code || I.lang;
        if (!text || !/\p{L}/u.test(text)) return text;
        const m = table(code); if (!m.size) return text;
        const c = cache[code] || (cache[code] = new Map());
        if (c.has(text)) return c.get(text);
        let out = m.get(text);
        if (out == null) {
            const lead = text.match(/^\s*/)[0], trail = text.match(/\s*$/)[0], core = text.trim();
            if (m.has(core)) out = lead + m.get(core) + trail;
            else { const r = piecesRx(code); out = r ? text.replace(r, (k) => m.get(k) || k) : text; }
        }
        if (c.size > 6000) c.clear();
        c.set(text, out); return out;
    }
    I.t = (s) => tr(String(s));

    // what is on screen: each text node / attribute remembers its source text, so switching language starts again from it
    const orig = new WeakMap(), done = new WeakMap(), aOrig = new WeakMap();
    const skipEl = (e) => { for (let n = e; n && n.nodeType === 1; n = n.parentNode) { if (SKIP[n.nodeName] || (n.hasAttribute && n.hasAttribute('data-noi18n')) || n.isContentEditable) return true; } return false; };
    function doText(n) {
        if (!n.parentNode || skipEl(n.parentNode)) return;
        const cur = n.data;
        if (done.get(n) === cur) return;                       // our own write
        orig.set(n, cur);
        const out = tr(cur); done.set(n, out);
        if (out !== cur) n.data = out;
    }
    function doAttrs(e) {
        if (skipEl(e)) return;
        let rec = aOrig.get(e); if (!rec) { rec = {}; aOrig.set(e, rec); }
        ATTRS.forEach(a => {
            if (!e.hasAttribute(a)) return; const v = e.getAttribute(a);
            if (rec[a] && rec[a].out === v) return;
            rec[a] = { src: v, out: tr(v) }; if (rec[a].out !== v) e.setAttribute(a, rec[a].out);
        });
    }
    function walk(root) {
        if (root.nodeType === 3) { doText(root); return; }
        if (root.nodeType !== 1 || SKIP[root.nodeName] || (root.hasAttribute && root.hasAttribute('data-noi18n'))) return;
        doAttrs(root);
        const tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode: (n) => n.nodeType === 1 ? ((SKIP[n.nodeName] || n.hasAttribute('data-noi18n')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) : NodeFilter.FILTER_ACCEPT });
        let n; while ((n = tw.nextNode())) { if (n.nodeType === 3) doText(n); else doAttrs(n); }
    }
    let obs = null;
    function observe() {
        if (obs) return;
        obs = new MutationObserver((list) => {
            for (const r of list) {
                if (r.type === 'childList') r.addedNodes.forEach(walk);
                else if (r.type === 'characterData') doText(r.target);
                else if (r.type === 'attributes') doAttrs(r.target);
            }
        });
        obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }
    // back to the source texts, then translated again in the new language
    function rerunAll() {
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
        let n; const texts = [], els = [document.body];
        while ((n = tw.nextNode())) (n.nodeType === 3 ? texts : els).push(n);
        texts.forEach(t => { if (orig.has(t) && done.get(t) === t.data) { const o = orig.get(t); done.delete(t); if (t.data !== o) t.data = o; } });
        els.forEach(e => { const rec = aOrig.get(e); if (rec) { ATTRS.forEach(a => { if (rec[a] && e.getAttribute(a) === rec[a].out) e.setAttribute(a, rec[a].src); }); aOrig.delete(e); } });
        walk(document.body);
    }
    function applyDir() {
        const L = LANGS.find(x => x.code === I.lang) || LANGS[5];
        document.documentElement.lang = L.code;
        document.documentElement.classList.toggle('rtl-text', !!L.rtl);
        document.documentElement.setAttribute('data-lang', L.code);
    }
    I.current = () => LANGS.find(x => x.code === I.lang) || LANGS[5];
    I.set = function (code) {
        if (!LANGS.some(x => x.code === code)) return;
        I.lang = code; try { localStorage.setItem('mlo.lang', code); } catch (e) { }
        applyDir(); rerunAll();
        try { if (M.UI && M.UI.renderAll && M.Model && M.Model.state && M.Model.state.project) M.UI.renderAll(); } catch (e) { }
    };
    function start() { applyDir(); walk(document.body); observe(); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
    M.I18n = I;
})(window.MLO);
