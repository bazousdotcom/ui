/**
 * The Capture canvas: the public contract between an AI model and the Bazous UI.
 *
 * A model writes an HTML fragment for a captured bill. The server rejects any tag,
 * attribute, class or intent outside these lists, the fragment runs in a sandboxed
 * iframe with a CSP that forbids the network, and buttons only emit named intents.
 * The same lists are enforced server-side; a test keeps them identical.
 */

export const CANVAS_TAGS = [
  "section", "article", "header", "footer", "div", "span", "p", "h1", "h2", "h3", "h4",
  "ul", "ol", "li", "dl", "dt", "dd", "table", "thead", "tbody", "tr", "th", "td",
  "strong", "em", "b", "i", "small", "br", "hr", "button", "label", "input", "select",
  "option", "textarea", "figure", "figcaption", "blockquote", "code", "time", "mark",
] as const;

export const CANVAS_ATTRIBUTES = [
  "class", "id", "type", "name", "value", "placeholder", "for", "checked", "selected",
  "disabled", "min", "max", "step", "rows", "datetime", "title", "aria-label", "role",
  "data-intent", "data-field", "data-payload", "colspan", "scope", "data-pct",
] as const;

export const CANVAS_INTENTS = ["confirm", "discard", "answer", "reschedule", "mark_internal_transfer", "open_cockpit"] as const;
export type CanvasIntent = (typeof CANVAS_INTENTS)[number];

export const CANVAS_FIELDS = ["label", "amount", "currency", "due_date", "category"] as const;

export const CANVAS_CLASSES = [
  "page", "eyebrow", "title", "lead", "muted", "small", "card", "card-head", "tile", "tile-dark",
  "tile-value", "amount", "neg", "pos", "row", "date", "list", "grid-2", "grid-3", "chip",
  "chip-warn", "chip-ok", "banner", "banner-warn", "impact", "impact-before", "impact-after",
  "arrow", "question", "field", "actions", "button", "button-primary", "button-ghost",
  "source", "confidence", "timeline", "timeline-item", "table", "kv",
  "kpis", "kpi-label", "kpi-value", "kpi-note", "bars", "bar", "bar-label", "bar-track", "bar-fill",
  "bar-fill-2", "bar-fill-3", "bar-fill-4", "bar-value", "meter", "meter-fill", "stack", "stack-seg-1",
  "stack-seg-2", "stack-seg-3", "stack-seg-4", "legend", "legend-item", "swatch-1", "swatch-2",
  "swatch-3", "swatch-4", "spark", "spark-col", "spark-col-warn", "delta", "delta-up", "delta-down",
  "timeline-h", "timeline-h-item", "timeline-h-item-now", "timeline-h-item-warn", "gauge", "gauge-fill",
] as const;

/** Classes whose width (height for spark columns) comes from `data-pct="0..100"`, never from `style`. */
export const CANVAS_SIZED_CLASSES = [
  "bar-fill", "bar-fill-2", "bar-fill-3", "bar-fill-4", "meter-fill", "gauge-fill",
  "stack-seg-1", "stack-seg-2", "stack-seg-3", "stack-seg-4", "spark-col", "spark-col-warn",
] as const;

export const CANVAS_CSS = `
:root,[data-theme=dark]{color-scheme:dark;--ground:#0B0B0B;--ground-2:#1f1e1b;--card:#1A1A1A;--line:#3a3833;--line-2:#2a2926;--ink:#F5F3ED;--ink-2:#D9D6CE;--ink-3:#B7B5AE;--muted:#9a978f;--ember:#FF9292;--ember-2:#FFB4B4;--ember-bg:#392425;--ember-line:#6b3a3a;--gold:#DAAF37;--gold-2:#E8C46E;--leaf:#76CCA1;--leaf-bg:#1d3a2c;--contrast-bg:#0B0B0B;--contrast-line:#DAAF37;--contrast-ink:#F5F3ED;--contrast-muted:#B7B5AE;--quote:#23211d;--mark:#5a4a1c;--sans:"Montserrat",system-ui,-apple-system,"Segoe UI",sans-serif;--serif:"Playfair Display",Georgia,serif}
[data-theme=light]{color-scheme:light;--ground:#F5F3ED;--ground-2:#eae8e1;--card:#FFFFFF;--line:#cdd0d2;--line-2:#e2e3e2;--ink:#15191F;--ink-2:#323943;--ink-3:#555E6B;--muted:#838a93;--ember:#B33535;--ember-2:#8c2b2b;--ember-bg:#fff0f0;--ember-line:#e4b2b2;--gold:#896313;--gold-2:#DAAF37;--leaf:#1B704A;--leaf-bg:#e3f3ea;--contrast-bg:#0B0B0B;--contrast-line:#0B0B0B;--contrast-ink:#F5F3ED;--contrast-muted:#B7B5AE;--quote:#fbf8ee;--mark:#fbf3dd}
*{box-sizing:border-box}
html,body{margin:0;background:var(--ground);color:var(--ink);font-family:var(--sans);font-size:15px;line-height:1.45}
.page{display:flex;flex-direction:column;gap:16px;padding:8px 4px 24px}
h1,h2,h3,h4{font-family:var(--serif);font-weight:600;margin:0;letter-spacing:-.01em}
h1,.title{font-size:1.7rem;line-height:1.1}h2{font-size:1.2rem}h3{font-size:1.05rem}
p{margin:0}
.eyebrow{color:var(--gold);letter-spacing:.14em;font-size:.72rem;font-weight:600;text-transform:uppercase}
.lead{font-size:1.02rem;color:var(--ink-3)}
.muted{color:var(--ink-3)}.small{font-size:.8rem}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px 20px;display:flex;flex-direction:column;gap:10px}
.card-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.tile{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;display:flex;flex-direction:column;gap:6px}
.tile-dark{background:var(--contrast-bg);border-color:var(--contrast-line);color:var(--contrast-ink)}
.tile-dark .eyebrow,.tile-dark .muted{color:var(--contrast-muted)}
.tile-value{font-family:var(--serif);font-size:2rem;font-weight:600;letter-spacing:-.02em;line-height:1;font-variant-numeric:tabular-nums}
.tile-dark .tile-value{color:var(--gold-2)}
.amount{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
.neg{color:var(--ember)}.pos{color:var(--leaf)}
.grid-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
.list{display:flex;flex-direction:column}
.row{display:flex;align-items:center;gap:12px;padding:10px 0;border-top:1px solid var(--line-2);font-size:.9rem}
.row:first-child{border-top:0}
.date{width:48px;flex:none;color:var(--muted);font-variant-numeric:tabular-nums}
.chip{display:inline-block;font-size:.74rem;font-weight:600;padding:4px 10px;border-radius:999px;background:var(--ground-2);color:var(--ink-2)}
.chip-warn{background:var(--ember-bg);color:var(--ember-2)}
.chip-ok{background:var(--leaf-bg);color:var(--leaf)}
.banner{padding:12px 16px;border-radius:12px;background:var(--ground-2);font-size:.9rem}
.banner-warn{background:var(--ember-bg);border:1px solid var(--ember-line);color:var(--ember-2)}
.impact{display:flex;align-items:center;gap:14px;padding:14px 18px;background:var(--contrast-bg);border:1px solid var(--contrast-line);color:var(--contrast-ink);border-radius:12px;font-variant-numeric:tabular-nums;flex-wrap:wrap}
.impact-before{color:var(--contrast-muted);font-size:1.05rem}
.impact-after{color:var(--gold-2);font-family:var(--serif);font-size:1.6rem;font-weight:600}
.arrow{color:var(--contrast-muted);font-size:1.2rem}
.question{padding:12px 14px;background:var(--quote);border:1px solid var(--line);border-radius:10px;display:flex;flex-direction:column;gap:8px;font-size:.92rem}
.field{display:flex;flex-direction:column;gap:4px;font-size:.78rem;font-weight:600;color:var(--muted);letter-spacing:.04em;text-transform:uppercase}
.field input,.field select,.field textarea{font:500 15px var(--sans);color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:9px 11px;background:var(--card);text-transform:none;letter-spacing:0}
.field input:focus,.field select:focus,.field textarea:focus{outline:2px solid var(--gold);border-color:var(--gold)}
.actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.button{font:600 13px var(--sans);border:1px solid var(--line);border-radius:10px;padding:0 14px;height:38px;background:var(--card);color:var(--ink);cursor:pointer}
.button-primary{background:var(--gold-2);border-color:var(--gold-2);color:#0B0B0B}
.button-ghost{background:transparent;color:var(--gold)}
.button:hover{filter:brightness(.97)}
.source{font-size:.82rem;color:var(--ink-3);border-left:3px solid var(--gold);padding:6px 12px;background:var(--quote);border-radius:0 8px 8px 0;font-style:italic}
.confidence{font-size:.78rem;color:var(--muted)}
.timeline{display:flex;flex-direction:column;gap:0}
.timeline-item{display:flex;gap:12px;padding:8px 0;border-left:2px solid var(--line);padding-left:14px;font-size:.88rem;position:relative}
.timeline-item::before{content:"";position:absolute;left:-6px;top:14px;width:10px;height:10px;border-radius:50%;background:var(--ink)}
.table{width:100%;border-collapse:collapse;font-size:.88rem}
.table th,.table td{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line-2)}
.table th{font-size:.74rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.kv{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;font-size:.9rem}
.kv dt{color:var(--muted)}.kv dd{margin:0;font-weight:500}
hr{border:0;border-top:1px solid var(--line-2);margin:4px 0}
/* dashboard primitives — sized by data-pct, applied by the bridge */
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.kpi-label{font-size:.7rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.tile-dark .kpi-label{color:var(--contrast-muted)}
.kpi-value{font-family:var(--serif);font-size:1.75rem;font-weight:600;letter-spacing:-.02em;line-height:1.05;font-variant-numeric:tabular-nums}
.tile-dark .kpi-value{color:var(--gold-2)}
.kpi-note{font-size:.78rem;color:var(--ink-3)}
.tile-dark .kpi-note{color:var(--contrast-muted)}
.bars{display:flex;flex-direction:column;gap:8px}
.bar{display:grid;grid-template-columns:minmax(90px,38%) 1fr auto;align-items:center;gap:10px;font-size:.86rem}
.bar-label{color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bar-track{display:block;height:9px;border-radius:5px;background:var(--ground-2);overflow:hidden}
.bar-fill,.bar-fill-2,.bar-fill-3,.bar-fill-4{display:block;height:100%;border-radius:5px;width:0;transition:width .35s ease}
.bar-fill{background:var(--gold-2)}.bar-fill-2{background:var(--ink)}.bar-fill-3{background:var(--ink-2)}.bar-fill-4{background:var(--muted)}
.bar-value{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
.meter,.gauge{display:block;height:8px;border-radius:4px;background:var(--ground-2);overflow:hidden}
.meter-fill,.gauge-fill{display:block;height:100%;border-radius:4px;width:0;background:var(--leaf);transition:width .35s ease}
.gauge{height:14px;border-radius:7px}.gauge-fill{background:var(--gold)}
.stack{display:flex;height:14px;border-radius:7px;overflow:hidden;background:var(--ground-2)}
.stack-seg-1,.stack-seg-2,.stack-seg-3,.stack-seg-4{display:block;height:100%;width:0}
.stack-seg-1{background:var(--gold-2)}.stack-seg-2{background:var(--ink)}.stack-seg-3{background:var(--ink-2)}.stack-seg-4{background:var(--muted)}
.legend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:.8rem;color:var(--ink-3)}
.legend-item{display:inline-flex;align-items:center;gap:6px}
.swatch-1,.swatch-2,.swatch-3,.swatch-4{display:inline-block;width:10px;height:10px;border-radius:2px}
.swatch-1{background:var(--gold-2)}.swatch-2{background:var(--ink)}.swatch-3{background:var(--ink-2)}.swatch-4{background:var(--muted)}
.spark{display:flex;align-items:flex-end;gap:3px;height:56px;padding:4px 0;border-bottom:1px solid var(--line)}
.spark-col,.spark-col-warn{display:block;flex:1;min-width:6px;height:0;border-radius:2px 2px 0 0;background:var(--ink)}
.spark-col-warn{background:var(--ember)}
.delta{display:inline-block;font-size:.8rem;font-weight:600;padding:2px 8px;border-radius:999px;background:var(--ground-2);font-variant-numeric:tabular-nums}
.delta-up{background:var(--leaf-bg);color:var(--leaf)}.delta-down{background:var(--ember-bg);color:var(--ember-2)}
.timeline-h{display:flex;gap:0;overflow:hidden;border-radius:10px;border:1px solid var(--line);background:var(--card)}
.timeline-h-item{flex:1;padding:10px 12px;font-size:.8rem;color:var(--ink-3);border-left:1px solid var(--line-2);position:relative;min-width:0}
.timeline-h-item:first-child{border-left:0}
.timeline-h-item::before{content:"";display:block;width:8px;height:8px;border-radius:50%;background:var(--muted);margin-bottom:6px}
.timeline-h-item-now{color:var(--gold);font-weight:600}.timeline-h-item-now::before{background:var(--gold)}
.timeline-h-item-warn{background:var(--ember-bg);color:var(--ember-2);font-weight:600}.timeline-h-item-warn::before{background:var(--ember)}
mark{background:var(--mark);padding:0 3px;border-radius:3px}
@media (max-width:640px){.grid-2,.grid-3{grid-template-columns:1fr}.tile-value{font-size:1.6rem}.kpi-value{font-size:1.4rem}.timeline-h{flex-direction:column}.timeline-h-item{border-left:0;border-top:1px solid var(--line-2)}.timeline-h-item:first-child{border-top:0}}
`;

/** Runs inside the sandbox: sizes data-pct elements and forwards intents and field values to the host. */
export const CANVAS_BRIDGE = `
(function(){
  function fields(){var o={};document.querySelectorAll('[data-field]').forEach(function(el){o[el.getAttribute('data-field')]=el.value;});return o;}
  document.addEventListener('click',function(ev){
    var btn=ev.target.closest('[data-intent]');if(!btn)return;ev.preventDefault();
    var payload=btn.getAttribute('data-payload');
    var q=btn.closest('.question');var answer=null;
    if(q){var inp=q.querySelector('input,select,textarea');if(inp)answer=inp.value;}
    parent.postMessage({source:'billminder-canvas',intent:btn.getAttribute('data-intent'),payload:payload,answer:answer,fields:fields()},'*');
  });
  function size(){document.querySelectorAll('[data-pct]').forEach(function(el){var p=Math.max(0,Math.min(100,parseInt(el.getAttribute('data-pct'),10)||0));var c=el.className||'';if(c.indexOf('spark-col')>=0){el.style.height=p+'%';}else{el.style.width=p+'%';}});}
  size();
  function report(){parent.postMessage({source:'billminder-canvas',intent:'resize',height:document.documentElement.scrollHeight},'*');}
  new ResizeObserver(report).observe(document.documentElement);report();
})();
`;

export type CanvasMessage =
  | { source: "billminder-canvas"; intent: CanvasIntent; payload: string | null; answer: string | null; fields: Record<string, string> }
  | { source: "billminder-canvas"; intent: "resize"; height: number };

/** A complete sandboxed document for `<iframe sandbox="allow-scripts" srcdoc=…>`. */
export function canvasDocument(fragment: string, theme: "dark" | "light" = "dark", lang = "fr"): string {
  return (
    `<!doctype html><html lang="${lang}" data-theme="${theme}"><head><meta charset="utf-8">` +
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; script-src 'unsafe-inline'; font-src https://fonts.gstatic.com; img-src data:;\">" +
    '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">' +
    `<style>${CANVAS_CSS}</style></head><body>${fragment}<script>${CANVAS_BRIDGE}</script></body></html>`
  );
}
