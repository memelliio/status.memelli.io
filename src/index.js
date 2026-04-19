import Fastify from 'fastify';

const app = Fastify({ logger: true });
const PORT = Number(process.env.PORT) || 8080;
const STATUS_URL = process.env.SELF_HEAL_STATUS_URL || 'https://api.memelli.io/api/admin/self-heal/status';

const HTML = `<!doctype html><html><head><meta charset="utf-8"/>
<title>Memelli Status</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;margin:0;background:#fff;color:#0a0a0a}
  .wrap{max-width:900px;margin:0 auto;padding:48px 24px}
  h1{font-size:36px;margin:0 0 8px;font-weight:700}
  .sub{color:#555;margin-bottom:32px}
  .card{border:1px solid #e5e5e5;border-radius:12px;padding:24px;margin-bottom:16px;background:#fafafa}
  .pill{display:inline-block;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600}
  .ok{background:#dcfce7;color:#166534}
  .degraded{background:#fee2e2;color:#991b1b}
  .unknown{background:#f3f4f6;color:#555}
  .row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #eee}
  .row:last-child{border-bottom:0}
  .url{font-family:monospace;font-size:13px;color:#0a0a0a}
  .meta{color:#666;font-size:13px}
  .bad{color:#991b1b}
  .good{color:#166534}
  .hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
  .hdr h2{margin:0;font-size:18px}
  footer{color:#888;font-size:12px;text-align:center;margin-top:32px}
</style></head>
<body>
<div class="wrap">
  <h1>Memelli Platform Status</h1>
  <div class="sub">Autonomous self-heal loop - probes every 5 min, auto-dispatches fix agents on failure.</div>
  <div class="card">
    <div class="hdr"><h2>System</h2><span id="pill" class="pill unknown">loading</span></div>
    <div class="row"><span class="meta">Last sweep</span><span id="lastRun" class="meta">-</span></div>
    <div class="row"><span class="meta">Total runs</span><span id="runs" class="meta">-</span></div>
    <div class="row"><span class="meta">Failures tracked</span><span id="failCount" class="meta">-</span></div>
    <div class="row"><span class="meta">Auto-dispatches</span><span id="dispatchCount" class="meta">-</span></div>
  </div>
  <div class="card">
    <div class="hdr"><h2>Failing endpoints</h2></div>
    <div id="failures"><div class="meta">-</div></div>
  </div>
  <div class="card">
    <div class="hdr"><h2>Recent fix dispatches</h2></div>
    <div id="dispatches"><div class="meta">-</div></div>
  </div>
  <footer>memelli.io - polling every 30s</footer>
</div>
<script>
async function poll(){
  try{
    const r = await fetch('/api/status', { cache:'no-store' });
    const j = await r.json();
    const d = j.data || {};
    const pill = document.getElementById('pill');
    pill.textContent = d.lastStatus || 'unknown';
    pill.className = 'pill ' + (d.lastStatus||'unknown');
    document.getElementById('lastRun').textContent = d.lastRun ? new Date(d.lastRun).toLocaleString() : '-';
    document.getElementById('runs').textContent = d.runs ?? '-';
    document.getElementById('failCount').textContent = (d.failures||[]).length;
    document.getElementById('dispatchCount').textContent = (d.dispatches||[]).length;
    const fc = document.getElementById('failures');
    if ((d.failures||[]).length === 0) fc.innerHTML = '<div class="row"><span class="good">All endpoints green.</span></div>';
    else fc.innerHTML = d.failures.map(f=>
      '<div class="row"><span class="url">'+f.url+'</span><span class="bad">'+f.status+' '+(f.errorMarkers||[]).join(', ')+'</span></div>'
    ).join('');
    const dc = document.getElementById('dispatches');
    if ((d.dispatches||[]).length === 0) dc.innerHTML = '<div class="row"><span class="meta">No fix dispatches yet.</span></div>';
    else dc.innerHTML = d.dispatches.slice(0,10).map(x=>
      '<div class="row"><span class="url">'+x.url+'</span><span class="meta">'+new Date(x.at).toLocaleTimeString()+' - '+(x.result && x.result.ok?'dispatched':'skipped:'+((x.result && (x.result.reason||x.result.error))||'err'))+'</span></div>'
    ).join('');
  }catch(e){}
}
poll(); setInterval(poll, 30000);
</script></body></html>`;

app.get('/', async (_req, reply) => reply.type('text/html').send(HTML));
app.get('/health', async () => ({ ok: true, service: 'status.memelli.io' }));
app.get('/api/status', async (_req, reply) => {
  try {
    const r = await fetch(STATUS_URL, { signal: AbortSignal.timeout(6000) });
    const j = await r.json();
    reply.send(j);
  } catch (e) {
    reply.code(502).send({ success: false, error: 'upstream-unavailable' });
  }
});

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => console.log('status.memelli.io listening on', PORT));
