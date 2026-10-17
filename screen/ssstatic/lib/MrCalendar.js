/* CC0. Native calendar shared by the SimpleScreens calendars; no build or date library. */
(() => {
    'use strict';
    if (customElements.get('mr-calendar')) return;
    const day = value => { const d = new Date(value); d.setHours(0, 0, 0, 0); return d; };
    const addDays = (value, count) => { const d = new Date(value); d.setDate(d.getDate() + count); return d; };
    const dateKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const parseDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date(value);
    class MrCalendar extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
            this.date = day(new Date());
            this.view = 'week';
            this.generation = 0;
        }
        connectedCallback() { this.render(); }
        disconnectedCallback() { this.generation++; if (this.controller) this.controller.abort(); }
        format(value, options) {
            return new Intl.DateTimeFormat(this.getAttribute('lang') || undefined, options).format(value);
        }
        node(tag, text, parent) {
            const node = document.createElement(tag);
            if (text != null) node.textContent = text;
            if (parent) parent.append(node);
            return node;
        }
        button(text, action, parent) {
            const button = this.node('button', text, parent);
            button.type = 'button';
            button.addEventListener('click', action);
            return button;
        }
        async render() {
            if (this.controller) this.controller.abort();
            this.controller = new AbortController();
            const generation = ++this.generation;
            let start = day(this.date), end;
            if (this.view === 'month') {
                start.setDate(1);
                start = addDays(start, -start.getDay());
                end = new Date(this.date.getFullYear(), this.date.getMonth() + 1, 1);
                end = addDays(end, (7 - end.getDay()) % 7);
            } else if (this.view === 'week') {
                start = addDays(start, -start.getDay());
                end = addDays(start, 7);
            } else end = addDays(start, 1);
            const root = this.shadowRoot;
            root.replaceChildren();
            this.node('style', ':host{display:block;color:inherit}button,a{font:inherit}button{cursor:pointer;padding:.35rem .6rem}nav{display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;margin:.5rem 0}h2{font-size:1.2rem;margin:0 .5rem}.grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));overflow-wrap:anywhere}.grid.day{grid-template-columns:1fr}section{border:1px solid #9996;padding:.4rem;min-height:7rem}section.today{background:#80808018}h3{font-size:.95rem;margin:0 0 .5rem}ul{padding:0;list-style:none;margin:0}li{border-left:3px solid #31708f;padding:.2rem .3rem;margin:.25rem 0;background:#80808012}a{color:inherit;text-decoration:underline}p{margin:.5rem 0}[role=alert]{color:#b22}@media(max-width:650px){.grid{grid-template-columns:1fr}section{min-height:3rem}}', root);
            const nav = this.node('nav', null, root);
            nav.setAttribute('aria-label', 'Calendar navigation');
            const move = amount => {
                if (this.view === 'month') this.date = new Date(this.date.getFullYear(), this.date.getMonth() + amount, 1);
                else this.date = addDays(this.date, amount * (this.view === 'week' ? 7 : 1));
                this.render();
            };
            this.button('Previous', () => move(-1), nav);
            this.button('Next', () => move(1), nav);
            this.button('Today', () => { this.date = day(new Date()); this.render(); }, nav);
            const title = this.view === 'month' ? this.format(this.date, { month: 'long', year: 'numeric' }) :
                this.format(start, { dateStyle: 'medium' }) + (this.view === 'week' ? ' – ' + this.format(addDays(end, -1), { dateStyle: 'medium' }) : '');
            this.node('h2', title, nav);
            for (const view of ['month', 'week', 'day']) {
                const button = this.button(view[0].toUpperCase() + view.slice(1), () => { this.view = view; this.render(); }, nav);
                button.setAttribute('aria-pressed', String(this.view === view));
            }
            this.button('Refresh', () => this.render(), nav);
            const status = this.node('p', 'Loading events…', root);
            status.setAttribute('role', 'status');
            const grid = this.node('div', null, root);
            grid.className = 'grid ' + this.view;
            const cells = [];
            for (let date = start; date < end; date = addDays(date, 1)) {
                const section = this.node('section', null, grid);
                if (dateKey(date) === dateKey(new Date())) section.className = 'today';
                this.node('h3', this.format(date, { weekday: 'short', month: 'short', day: 'numeric' }), section);
                cells.push({ date, list: this.node('ul', null, section) });
            }
            const params = { start: dateKey(start), end: dateKey(end) };
            for (const key of ['partyId', 'facilityId', 'assetId']) if (this.dataset[key]) params[key] = this.dataset[key];
            const sources = [['eventsUrl', '#31708f'], ['tasksUrl', '#4cae4c']].filter(([key]) => this.dataset[key]);
            let count = 0, failed = 0;
            await Promise.all(sources.map(async ([key, color]) => {
                try {
                    // Both HTML and QVT expose moqui.request, but return native Response and a parsed result respectively.
                    const url = new URL(this.dataset[key], location.href);
                    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
                    const result = await window.moqui.request(url.href, {
                        headers: { Accept: 'application/json' }, signal: this.controller.signal
                    });
                    if (!result.ok) throw new Error('HTTP ' + result.status);
                    const data = typeof result.json === 'function' ? await result.json() : result.json;
                    const events = Array.isArray(data) ? data : data && data.eventList;
                    if (!Array.isArray(events)) throw new Error('Calendar response is not an event list');
                    if (generation !== this.generation) return;
                    events.sort((a, b) => parseDate(a.start) - parseDate(b.start));
                    for (const event of events) {
                        const from = parseDate(event.start);
                        if (Number.isNaN(from.getTime())) continue;
                        const to = event.end ? parseDate(event.end) : from;
                        let shown = false;
                        for (const cell of cells) {
                            if (from >= addDays(cell.date, 1) || (to > from ? to <= cell.date : day(from) < cell.date)) continue;
                            shown = true;
                            const item = this.node('li', null, cell.list);
                            item.style.borderColor = event.borderColor || color;
                            const time = event.allDay ? '' : this.format(from, { hour: 'numeric', minute: '2-digit' }) + ' ';
                            let link;
                            try {
                                const detail = this.dataset[key === 'tasksUrl' ? 'taskDetailUrl' : 'eventDetailUrl'];
                                const target = event.url || (event.id && detail ? detail + '?workEffortId=' + encodeURIComponent(event.id) : '');
                                const url = new URL(target, location.href);
                                if (target && ['http:', 'https:'].includes(url.protocol)) link = url.href;
                            } catch (_) { /* Missing/invalid event URLs render as text. */ }
                            const label = this.node(link ? 'a' : 'span', time + (event.title || '(Untitled)'), item);
                            if (link) label.href = link;
                            label.title = (event.title || '') + '\n' + this.format(from, { dateStyle: 'medium', ...(event.allDay ? {} : { timeStyle: 'short' }) });
                        }
                        if (shown) count++;
                    }
                } catch (error) {
                    if (generation !== this.generation || error.aborted || error.name === 'AbortError') return;
                    failed++;
                    console.error('Calendar source ' + this.dataset[key], error);
                    const message = this.node('p', 'Could not load ' + (key === 'tasksUrl' ? 'tasks' : 'events') + '. Use Refresh to retry.', root);
                    message.setAttribute('role', 'alert');
                }
            }));
            if (generation === this.generation) status.textContent = count + ' events' + (failed ? ' (some sources failed)' : count ? '' : ' in this period');
        }
    }
    customElements.define('mr-calendar', MrCalendar);
})();
