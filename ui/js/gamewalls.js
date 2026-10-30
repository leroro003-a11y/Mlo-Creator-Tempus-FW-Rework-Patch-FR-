// New walls in a game interior (gamemlo.js): drawn on the floor, with doors, windows and passages cut into them, and a door of the game in a door opening.
// A wall: { id, a: [x, y], b: [x, y] (its middle line), z (its foot), h (height), t (thickness), tex (a texture of the program), room, ops: openings }; an
// opening: { id, type: 'door' | 'window' | 'pass', u (its middle, metres from a), w (width), z0 (sill), z1 (head, both above the wall's foot), door (a door
// model of the game) , flip (the door hung on the other side) }. Everything is in the interior's frame. A wall is made of boxes: the solid stretches between
// the openings, and over and under each opening; the boxes are the drawn faces and the collision both. The export makes one model per room of them
// (GameWalls.cs) and puts each door in as an object of the interior.
window.MLO = window.MLO || {};
(function (M) {
    'use strict';
    const { el, Model, TEX } = M, S = Model.state, bus = Model.bus;
    const GM = M.GameMlo, toast = (t, k) => bus.emit('toast', { text: t, kind: k });
    const r3 = (v) => Math.round(v * 1000) / 1000, f2 = (v) => (+v).toFixed(2);
    const randId = () => Math.random().toString(36).slice(2, 8);
    const walls = () => (S.project.game && S.project.game.walls) || [];
    // drawing: the settings new walls get; sel: the selected wall's id; doorFound: door models a search found
    const GW = M.GameWalls = { drawing: false, sel: null, h: 2.6, t: 0.12, tex: 'plaster_white', doorFound: null, doorQuery: '', doorBusy: false, doorFor: null };
    const byId = (id) => walls().find(w => w.id === id) || null;
    GW.selected = () => GW.sel ? byId(GW.sel) : null;

    // ---------- a wall's frame and pieces ----------
    function frame(w) { const dx = w.b[0] - w.a[0], dy = w.b[1] - w.a[1], L = Math.hypot(dx, dy) || 1e-6; return { L, ux: dx / L, uy: dy / L, nx: -dy / L, ny: dx / L, yaw: Math.atan2(dy, dx) }; }
    // the openings, kept inside the wall and apart from each other (sorted along it)
    function openings(w, L) {
        return (w.ops || []).map(o => { const hw = Math.min(o.w, L - 0.1) / 2; return Object.assign({}, o, { u0: Math.max(0.05, Math.min(L - 0.05 - 2 * hw, o.u - hw)), z0: Math.max(0, Math.min(o.z0, w.h - 0.1)), z1: Math.max(0.1, Math.min(o.z1, w.h)) }); })
            .map(o => Object.assign(o, { u1: o.u0 + Math.min(o.w, L - 0.1) })).sort((p, q) => p.u0 - q.u0);
    }
    // boxes in the wall's frame: { u0, u1, v0, v1, z0, z1, tex, glass }
    function pieces(w) {
        const f = frame(w), t = w.t / 2, out = [], ops = openings(w, f.L); let u = 0;
        ops.forEach(o => {
            const a = Math.max(u, o.u0); if (a > u + 0.005) out.push({ u0: u, u1: a, v0: -t, v1: t, z0: 0, z1: w.h, tex: w.tex });
            const b = Math.max(a, o.u1);
            if (o.z1 < w.h - 0.005) out.push({ u0: a, u1: b, v0: -t, v1: t, z0: o.z1, z1: w.h, tex: w.tex });
            if (o.z0 > 0.005) out.push({ u0: a, u1: b, v0: -t, v1: t, z0: 0, z1: o.z0, tex: w.tex });
            if (o.type === 'window') out.push({ u0: a, u1: b, v0: -0.01, v1: 0.01, z0: o.z0, z1: o.z1, tex: 'glass', glass: true });
            u = Math.max(u, b);
        });
        if (f.L > u + 0.005) out.push({ u0: u, u1: f.L, v0: -t, v1: t, z0: 0, z1: w.h, tex: w.tex });
        return out;
    }
    const toI = (w, f, u, v, z) => [w.a[0] + f.ux * u + f.nx * v, w.a[1] + f.uy * u + f.ny * v, w.z + z];

    // the faces of the pieces, by texture: { tex: { pos, nrm, uv, idx } } (uv in metres over the texture's size, running on round the wall)
    function mesh(w) {
        const f = frame(w), mats = {};
        pieces(w).forEach(p => {
            const m = mats[p.tex] || (mats[p.tex] = { glass: !!p.glass, pos: [], nrm: [], uv: [], idx: [] }), tile = p.glass ? 1 : TEX.tile(p.tex);
            const quad = (c, n, uv) => { const b = m.pos.length / 3; c.forEach((q, k) => { m.pos.push(...q); m.nrm.push(...n); m.uv.push(uv[k][0] / tile, uv[k][1] / tile); }); m.idx.push(b, b + 1, b + 2, b, b + 2, b + 3); };
            const P = (u, v, z) => toI(w, f, u, v, z), N = (u, v, z) => [f.ux * u + f.nx * v, f.uy * u + f.ny * v, z];
            const { u0, u1, v0, v1, z0, z1 } = p;
            quad([P(u0, v0, z0), P(u1, v0, z0), P(u1, v0, z1), P(u0, v0, z1)], N(0, -1, 0), [[u0, -z0], [u1, -z0], [u1, -z1], [u0, -z1]]);
            quad([P(u1, v1, z0), P(u0, v1, z0), P(u0, v1, z1), P(u1, v1, z1)], N(0, 1, 0), [[-u1, -z0], [-u0, -z0], [-u0, -z1], [-u1, -z1]]);
            quad([P(u0, v1, z0), P(u0, v0, z0), P(u0, v0, z1), P(u0, v1, z1)], N(-1, 0, 0), [[v1, -z0], [v0, -z0], [v0, -z1], [v1, -z1]]);
            quad([P(u1, v0, z0), P(u1, v1, z0), P(u1, v1, z1), P(u1, v0, z1)], N(1, 0, 0), [[v0, -z0], [v1, -z0], [v1, -z1], [v0, -z1]]);
            quad([P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)], N(0, 0, 1), [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
            quad([P(u0, v1, z0), P(u1, v1, z0), P(u1, v0, z0), P(u0, v0, z0)], N(0, 0, -1), [[u0, v1], [u1, v1], [u1, v0], [u0, v0]]);
        });
        return mats;
    }

    // ---------- the doors in the openings: objects of the game, hung at one side of the opening, turned with the wall ----------
    // A door model's leaf runs along its own x from its hinge (its origin); one that runs towards -x is hung at the other side. flip turns it round (it opens the other way).
    GW.doors = function () {
        const out = [];
        walls().forEach(w => {
            const f = frame(w);
            openings(w, f.L).forEach(o => {
                if (o.type !== 'door' || !o.door) return; const m = GM.model(o.door); if (!m || m.error) return;
                const neg = Math.abs(m.bmin[0]) > Math.abs(m.bmax[0]), flip = !!o.flip, hingeAtStart = neg === flip;
                const u = hingeAtStart ? o.u0 : o.u1, yaw = f.yaw + (flip ? Math.PI : 0), p = toI(w, f, u, 0, -m.bmin[2]);
                out.push({ n: o.door, p: p.map(r3), q: [0, 0, Math.sin(yaw / 2), Math.cos(yaw / 2)].map(v => Math.round(v * 1e6) / 1e6), s: [1, 1], room: w.room, set: -1, flags: 1572864, lod: -1, level: 'ORPHANHD', o: -1, wall: w.id, op: o.id });
            });
        });
        return out;
    };

    // ---------- in the view ----------
    GW.batches = function () {
        const out = [];
        walls().forEach(w => {
            const mats = mesh(w);
            Object.keys(mats).forEach(tex => {
                const m = mats[tex];
                out.push({ level: 0, kind: 'gm', group: 'gm', tex: m.glass ? '' : tex, imgKey: null, flat: null, alpha: 1, noCull: true, clip: true, pos: new Float32Array(m.pos), nrm: new Float32Array(m.nrm), uv: new Float32Array(m.uv), idx: new Uint16Array(m.idx), glass: m.glass, wall: w.id });
            });
        });
        GW.doors().forEach(d => GM.bake(d).forEach(b => { b.wall = d.wall; out.push(b); }));
        return out;
    };
    GW.visible = (b) => { const w = byId(b.wall); return !!w && !(GM.solo && GM.room != null && w.room !== GM.room); };

    // the nearest wall the ray meets (above the cutaway): { wall, t, pt } or null
    GW.pick = function (ray, ok) {
        let best = null; const rayBox = M.Tools.api.rayBox;
        walls().forEach(w => {
            if (!GW.visible({ wall: w.id })) return; const f = frame(w), ox = ray.o[0] - w.a[0], oy = ray.o[1] - w.a[1];
            const lr = { o: [ox * f.ux + oy * f.uy, ox * f.nx + oy * f.ny, ray.o[2] - w.z], d: [ray.d[0] * f.ux + ray.d[1] * f.uy, ray.d[0] * f.nx + ray.d[1] * f.ny, ray.d[2]] };
            pieces(w).forEach(p => {
                const t = rayBox(lr, [p.u0, p.v0, p.z0], [p.u1, p.v1, p.z1]); if (t == null || t <= 1e-4 || !ok(t) || (best && t >= best.t)) return;
                best = { wall: w.id, t, pt: [ray.o[0] + ray.d[0] * t, ray.o[1] + ray.d[1] * t, ray.o[2] + ray.d[2] * t] };
            });
        });
        return best;
    };
    GW.outline = function (R, w, col, top) {
        const f = frame(w), t = w.t / 2, cs = [[0, -t, 0], [f.L, -t, 0], [f.L, t, 0], [0, t, 0], [0, -t, w.h], [f.L, -t, w.h], [f.L, t, w.h], [0, t, w.h]].map(q => toI(w, f, q[0], q[1], q[2]));
        [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(e => (top ? R.ovTopLine : R.ovLine).call(R, cs[e[0]], cs[e[1]], col));
        openings(w, f.L).forEach(o => { const q = [[o.u0, 0, o.z0], [o.u1, 0, o.z0], [o.u1, 0, o.z1], [o.u0, 0, o.z1]].map(p => toI(w, f, p[0], p[1], p[2])); for (let k = 0; k < 4; k++) R.ovTopLine(q[k], q[(k + 1) % 4], [0.45, 0.85, 1, 0.9]); });
        return toI(w, f, f.L / 2, 0, w.h + 0.25);
    };

    // ---------- changing walls (each one step of undo) ----------
    const edit = (id, fn) => GM.change(P => { const w = (P.game.walls || []).find(q => q.id === id); if (w) fn(w); });
    GW.add = function (a, b, z) {
        const id = randId(), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z + 1];
        GM.change(P => { (P.game.walls = P.game.walls || []).push({ id, a: a.map(r3), b: b.map(r3), z: r3(z), h: GW.h, t: GW.t, tex: GW.tex, room: GM.roomAt(mid), ops: [] }); });
        GW.select(id);
    };
    GW.select = function (id) { GW.sel = id; if (id) GM.sel = null; GW.doorFor = null; M.UI.renderLeft(); M.UI.renderRight(); };
    GW.remove = function (id) { GM.change(P => { P.game.walls = (P.game.walls || []).filter(w => w.id !== id); }); if (GW.sel === id) GW.sel = null; M.UI.renderRight(); };
    GW.move = (id, dx, dy) => edit(id, w => { w.a = [r3(w.a[0] + dx), r3(w.a[1] + dy)]; w.b = [r3(w.b[0] + dx), r3(w.b[1] + dy)]; });
    GW.set = (id, fn) => edit(id, fn);
    GW.addOpening = function (id, type) {
        const w = byId(id); if (!w) return; const f = frame(w), sz = type === 'door' ? [0.9, 0, 2.1] : (type === 'window' ? [1.0, 0.9, 2.1] : [1.2, 0, 2.3]);
        const oid = randId(); edit(id, q => { (q.ops = q.ops || []).push({ id: oid, type, u: r3(f.L / 2), w: Math.min(sz[0], r3(f.L - 0.2)), z0: sz[1], z1: Math.min(sz[2], q.h - 0.1), door: null, flip: false }); });
        if (type === 'door') GW.chooseDoorFor(id, oid);
    };
    GW.setOpening = (id, oid, fn) => edit(id, w => { const o = (w.ops || []).find(q => q.id === oid); if (o) fn(o); });
    GW.removeOpening = (id, oid) => edit(id, w => { w.ops = (w.ops || []).filter(q => q.id !== oid); });
    // a door model in an opening: the opening takes the door's size (2 cm round it)
    GW.setDoor = async function (id, oid, n) {
        if (!GM.model(n)) { try { await GM.fetchModels([n]); } catch (e) { toast(e.message, 'err'); return; } }
        const m = GM.model(n); if (!m || m.error) { toast(n + ': ' + (m ? m.error : 'not found'), 'err'); return; }
        GW.setOpening(id, oid, o => { o.door = n; o.w = r3(m.bmax[0] - m.bmin[0] + 0.02); o.z0 = 0; o.z1 = r3(m.bmax[2] - m.bmin[2] + 0.02); });
        GW.doorFor = null; M.UI.renderRight();
    };
    GW.chooseDoorFor = function (id, oid) { GW.doorFor = { id, oid }; M.UI.renderRight(); if (!GW.doorFound) GW.searchDoors(''); };
    GW.searchDoors = async function (q) {
        GW.doorQuery = q = (q || '').trim(); GW.doorBusy = true; M.UI.renderRight();
        try { const r = await Model.api('buildings/doors', 'POST', { q, gta: '' }); if (r.ok === false) throw new Error(r.error); GW.doorFound = r.names || []; } catch (e) { GW.doorFound = []; toast(e.message, 'err'); }
        GW.doorBusy = false; M.UI.renderRight();
    };

    // ---------- drawing: press on the floor where the wall starts, let go where it ends ----------
    let draw = null, ghost = null;
    const snap5 = (v) => Math.round(v / 0.05) * 0.05;
    // an end close to the end of another new wall goes onto it (so walls meet), else onto a 5 cm grid
    function snapEnd(x, y, free) {
        let best = null, bd = 0.2; walls().forEach(w => [w.a, w.b].forEach(p => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = p; } }));
        return best ? best.slice() : (free ? [r3(x), r3(y)] : [snap5(x), snap5(y)]);
    }
    function groundAt(ray) {
        const h = GM.pickAny(ray); if (h) return h.pt;
        const b = GM.bounds(), z = b ? b.mn[2] : 0, p = M.Tools.api.planeHit(ray, z); return p ? [p.x, p.y, z] : null;
    }
    GW.tool = {
        down(e) { const p = groundAt(M.Tools.api.pointerRay(e)); if (!p) return; draw = { a: snapEnd(p[0], p[1], e.shiftKey), z: p[2], b: null }; },
        move(e) {
            const ray = M.Tools.api.pointerRay(e);
            if (draw) {
                const p = M.Tools.api.planeHit(ray, draw.z); if (!p) return; let b = snapEnd(p.x, p.y, e.shiftKey);
                if (!e.shiftKey) { const dx = b[0] - draw.a[0], dy = b[1] - draw.a[1], L = Math.hypot(dx, dy), ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12); if (L > 0.01) b = [r3(draw.a[0] + Math.cos(ang) * snap5(L)), r3(draw.a[1] + Math.sin(ang) * snap5(L))]; }
                draw.b = b; return;
            }
            ghost = groundAt(ray);
        },
        up() { const d = draw; draw = null; if (!d || !d.b || Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]) < 0.2) return; GW.add(d.a, d.b, d.z); },
        draw(R, label) {
            if (draw && draw.b) {
                const w = { a: draw.a, b: draw.b, z: draw.z, h: GW.h, t: GW.t, ops: [] }, at = GW.outline(R, w, [0.45, 0.95, 0.6, 1], true);
                label(f2(Math.hypot(draw.b[0] - draw.a[0], draw.b[1] - draw.a[1])) + ' m · Shift: any angle, no snapping', at); return;
            }
            if (ghost) { const c = [0.45, 0.95, 0.6, 0.9], s = 0.15; R.ovTopLine([ghost[0] - s, ghost[1], ghost[2] + 0.01], [ghost[0] + s, ghost[1], ghost[2] + 0.01], c); R.ovTopLine([ghost[0], ghost[1] - s, ghost[2] + 0.01], [ghost[0], ghost[1] + s, ghost[2] + 0.01], c); }
            label('Press where the wall starts and drag to where it ends · Esc stops drawing', ghost ? [ghost[0], ghost[1], ghost[2] + 0.3] : null);
        },
        cancel() { if (draw) { draw = null; return true; } return false; },
        busy: () => !!draw
    };
    GW.startDrawing = function (on) { GW.drawing = on; draw = null; ghost = null; if (on) { GM.sel = null; GW.sel = null; GM.chosen = null; } M.UI.renderLeft(); M.UI.renderRight(); };

    // ---------- the export: one group per room (the faces by texture, the boxes), the textures, and the doors as objects ----------
    GW.exportData = function () {
        const groups = {}, used = new Set();
        walls().forEach(w => {
            const g = groups[w.room] || (groups[w.room] = { room: w.room, mats: {}, boxes: [] }), f = frame(w), mats = mesh(w);
            Object.keys(mats).forEach(tex => {
                const src = mats[tex], m = g.mats[tex] || (g.mats[tex] = { tex: src.glass ? 'glass' : tex, glass: src.glass, pos: [], nrm: [], uv: [], idx: [] }), base = m.pos.length / 3;
                m.pos.push(...src.pos); m.nrm.push(...src.nrm); m.uv.push(...src.uv); src.idx.forEach(i => m.idx.push(base + i)); if (!src.glass) used.add(tex);
            });
            pieces(w).forEach(p => { const c = toI(w, f, (p.u0 + p.u1) / 2, (p.v0 + p.v1) / 2, (p.z0 + p.z1) / 2); g.boxes.push({ c: c.map(r3), h: [r3((p.u1 - p.u0) / 2), r3(Math.max(0.01, (p.v1 - p.v0) / 2)), r3((p.z1 - p.z0) / 2)], yaw: f.yaw, mat: p.glass ? 1 : TEX.colType(p.tex) }); });
        });
        const wallGroups = Object.keys(groups).map(k => {
            const g = groups[k];
            return { room: g.room, boxes: g.boxes, mats: Object.keys(g.mats).map(t => { const m = g.mats[t]; return { tex: m.tex, glass: m.glass, pos: M.toB64(new Float32Array(m.pos)), nrm: M.toB64(new Float32Array(m.nrm)), uv: M.toB64(new Float32Array(m.uv)), idx: M.toB64(new Int32Array(m.idx)) }; }) };
        });
        const wallTextures = [...used].map(id => { const t = TEX.pixels(id); return { name: id, size: t.size, rgba: M.toB64(new Uint8Array(t.data.buffer, t.data.byteOffset, t.data.byteLength)) }; });
        return { wallGroups, wallTextures, doors: GW.doors() };
    };

    // ---------- panels ----------
    const num = (label, value, step, set, unit) => el('div', { class: 'row' }, el('label', null, label), el('input', { type: 'number', class: 'grow', step, value, onchange: (ev) => { const v = parseFloat(ev.target.value); if (!isNaN(v)) set(v); } }), unit ? el('span', { class: 'note' }, unit) : null);
    const texSelect = (cur, set) => el('select', { class: 'grow', onchange: (ev) => set(ev.target.value) }, ...TEX.list.filter(t => t.cat !== 'Roof' && t.cat !== 'Carpet').map(t => el('option', { value: t.id, selected: t.id === cur ? true : null }, t.cat + ' · ' + t.name)));
    GW.renderLeft = function (root) {
        const n = walls().length;
        root.append(el('div', { class: 'h' }, 'New walls'));
        root.append(el('div', { class: 'row wrap' }, el('button', { class: 'btn sm' + (GW.drawing ? ' primary' : ''), onclick: () => GW.startDrawing(!GW.drawing) }, GW.drawing ? 'Stop drawing (Esc)' : 'Draw walls'),
            n ? el('span', { class: 'note' }, n + ' new wall' + (n === 1 ? '' : 's')) : null));
        if (GW.drawing) {
            root.append(el('div', { class: 'note' }, 'Press on the floor where a wall starts and drag to where it ends: it stands on what you pressed on, 15° and 5 cm steps (Shift: free). Ends close to another new wall join it.'));
            root.append(num('Height', GW.h, 0.05, v => { GW.h = Math.max(0.3, v); }, 'm'), num('Thickness', GW.t, 0.01, v => { GW.t = Math.max(0.03, v); }, 'm'),
                el('div', { class: 'row' }, el('label', null, 'Texture'), texSelect(GW.tex, v => { GW.tex = v; })));
        }
    };
    GW.renderRight = function (root) {
        const w = GW.selected(); if (!w) return false; const f = frame(w), g = S.project.game;
        root.append(el('div', { class: 'h' }, 'Selected wall'));
        root.append(el('div', { class: 'note' }, f2(f.L) + ' m long · drag it to move it · X deletes it'));
        root.append(num('Height', w.h, 0.05, v => GW.set(w.id, q => { q.h = r3(Math.max(0.3, v)); }), 'm'), num('Thickness', w.t, 0.01, v => GW.set(w.id, q => { q.t = r3(Math.max(0.03, v)); }), 'm'),
            num('Foot (Z)', w.z, 0.05, v => GW.set(w.id, q => { q.z = r3(v); }), 'm'), num('Length', r3(f.L), 0.05, v => GW.set(w.id, q => { const L = Math.max(0.2, v); q.b = [r3(q.a[0] + f.ux * L), r3(q.a[1] + f.uy * L)]; }), 'm'));
        root.append(el('div', { class: 'row' }, el('label', null, 'Texture'), texSelect(w.tex, v => GW.set(w.id, q => { q.tex = v; }))));
        root.append(el('div', { class: 'row' }, el('label', null, 'Room'), el('select', { class: 'grow', onchange: (ev) => GW.set(w.id, q => { q.room = parseInt(ev.target.value, 10); }) }, ...g.rooms.map((r, k) => el('option', { value: k, selected: k === w.room ? true : null }, r.name)))));
        root.append(el('div', { class: 'row wrap' }, el('button', { class: 'btn sm', onclick: () => GW.addOpening(w.id, 'door') }, '+ Door'), el('button', { class: 'btn sm', onclick: () => GW.addOpening(w.id, 'window') }, '+ Window'),
            el('button', { class: 'btn sm', onclick: () => GW.addOpening(w.id, 'pass') }, '+ Passage'), el('button', { class: 'btn sm', onclick: () => GW.set(w.id, q => { const a = q.a; q.a = q.b; q.b = a; (q.ops || []).forEach(o => { o.u = r3(f.L - o.u); }); }) }, 'Flip'),
            el('button', { class: 'btn sm danger', onclick: () => GW.remove(w.id) }, 'Delete wall')));
        (w.ops || []).forEach((o, k) => {
            const name = { door: 'Door', window: 'Window', pass: 'Passage' }[o.type] || o.type;
            root.append(el('div', { class: 'h', style: { margin: '10px 0 4px' } }, name + ' ' + (k + 1)));
            root.append(num('From start', o.u, 0.05, v => GW.setOpening(w.id, o.id, q => { q.u = r3(v); }), 'm'), num('Width', o.w, 0.05, v => GW.setOpening(w.id, o.id, q => { q.w = r3(Math.max(0.2, v)); }), 'm'));
            if (o.type === 'window') root.append(num('Sill', o.z0, 0.05, v => GW.setOpening(w.id, o.id, q => { q.z0 = r3(Math.max(0, v)); }), 'm'));
            root.append(num('Top', o.z1, 0.05, v => GW.setOpening(w.id, o.id, q => { q.z1 = r3(Math.max(0.3, v)); }), 'm'));
            if (o.type === 'door') {
                const m = o.door ? GM.model(o.door) : null;
                root.append(el('div', { class: 'note' }, 'Door: ', el('b', null, o.door || 'none (an open doorway)'), m && m.error ? ' · ' + m.error : ''));
                root.append(el('div', { class: 'row wrap' }, el('button', { class: 'btn sm', onclick: () => GW.chooseDoorFor(w.id, o.id) }, o.door ? 'Other door' : 'Choose a door'),
                    o.door ? el('button', { class: 'btn sm', onclick: () => GW.setOpening(w.id, o.id, q => { q.flip = !q.flip; }) }, 'Hang it the other way') : null,
                    o.door ? el('button', { class: 'btn sm', onclick: () => GW.setOpening(w.id, o.id, q => { q.door = null; }) }, 'No door') : null));
                if (GW.doorFor && GW.doorFor.oid === o.id) {
                    const q = el('input', { type: 'text', class: 'grow', placeholder: 'ph (police), med, gc, office...', value: GW.doorQuery, onkeydown: (ev) => { if (ev.key === 'Enter') GW.searchDoors(q.value); } });
                    root.append(el('div', { class: 'row' }, q, el('button', { class: 'btn sm primary', disabled: GW.doorBusy ? true : null, onclick: () => GW.searchDoors(q.value) }, GW.doorBusy ? '...' : 'Search')));
                    if (GW.doorFound) {
                        const l = el('div', { class: 'plist', style: { maxHeight: '170px' } });
                        GW.doorFound.forEach(n => l.append(el('div', { class: 'pitem', style: { padding: '3px 8px', background: o.door === n ? 'var(--accent-soft)' : '' }, title: n, onclick: () => GW.setDoor(w.id, o.id, n) }, el('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, n))));
                        root.append(GW.doorFound.length ? l : el('div', { class: 'note' }, 'No door model of the game has that in its name.'));
                    }
                }
            }
            root.append(el('div', { class: 'row wrap' }, el('button', { class: 'btn sm', title: 'A portal in this opening, between the rooms on its two sides', onclick: () => {
                const q = openings(w, f.L).find(x => x.id === o.id); if (!q) return;
                M.GameEdit.addPortal([[q.u0, q.z0], [q.u0, q.z1], [q.u1, q.z1], [q.u1, q.z0]].map(c => toI(w, f, c[0], 0, c[1])), [f.nx, f.ny, 0]);
            } }, 'Make a portal here'), el('button', { class: 'btn sm danger', onclick: () => GW.removeOpening(w.id, o.id) }, 'Remove the ' + name.toLowerCase())));
        });
        return true;
    };
})(window.MLO);
