"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { CONTRACT_ADDRESS, connectWallet, readClient, shortAddr, type WalletState } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

type Audit = { id: string; requester: string; code: string; language: string; context: string; fee: string; status: number; report: string; };
const sevColor = (s: string) => ({ clean: "#22c55e", low: "#84cc16", medium: "#eab308", high: "#f97316", critical: "#ef4444" }[s] || "#6b7280");

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, client: null });
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<{ kind: "list" } | { kind: "new" } | { kind: "detail"; id: string }>({ kind: "list" });
  const [form, setForm] = useState({ code: "", language: "Solidity", context: "", fee: "1" });
  const [history, setHistory] = useState<string[]>(["audit-shell v1.0 — GenLayer security scanner", "type a command or click below. wallet required for writes.", ""]);
  const termRef = useRef<HTMLDivElement>(null);

  const log = (s: string) => setHistory(h => [...h, s]);

  const load = useCallback(async () => {
    try {
      const rc = readClient();
      const count = Number(await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_audit_count", args: [] }));
      const out: Audit[] = [];
      for (let i = 1; i <= count; i++) {
        const raw = await rc.readContract({ address: CONTRACT_ADDRESS, functionName: "get_audit", args: [String(i)] });
        out.push(JSON.parse(raw as string));
      }
      setAudits(out.reverse());
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { termRef.current?.scrollTo(0, termRef.current.scrollHeight); }, [history]);

  async function handleConnect() {
    log("$ wallet connect");
    try { const w = await connectWallet(); setWallet(w); log(`  → authorized ${w.address}`); }
    catch (e: any) { log(`  ! ${e.message}`); }
    log("");
  }

  async function send(fn: string, args: any[], value?: bigint) {
    if (!wallet.client) { log("  ! no wallet — run `connect` first"); log(""); return; }
    setLoading(true); log(`$ ${fn} ${args.map(a => typeof a === "string" && a.length > 20 ? "<data>" : a).join(" ")}`);
    try {
      const hash = await wallet.client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args, value: value ?? BigInt(0) });
      log(`  tx ${hash.slice(0, 18)}… submitted`);
      const _rcpt: any = await wallet.client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED, retries: 30, interval: 5000 });
      const _st = String((_rcpt && (_rcpt.statusName ?? _rcpt.status)) || "").toUpperCase();
      if (_st && _st !== "ACCEPTED" && _st !== "FINALIZED") throw new Error(/UNDETERMINED|TIMEOUT|NO_MAJORITY|DISAGREE/.test(_st) ? "AI validators could not reach consensus — no funds were moved. Please try again." : ("Transaction did not complete (" + _st + ")."));
      log("  → accepted ✓"); await load();
    } catch (e: any) { log(`  ! ${e.message}`); }
    log(""); setLoading(false);
  }

  const prompt = (
    <span><span style={{ color: "#15803d" }}>root@genlayer</span><span style={{ color: "#3f6212" }}>:</span><span style={{ color: "#2dd4bf" }}>~/audit</span><span style={{ color: "#15803d" }}>$ </span></span>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#000", padding: 16, fontFamily: "'SF Mono',Menlo,Consolas,monospace" }}>
      {/* terminal window chrome */}
      <div style={{ maxWidth: 920, margin: "0 auto", border: "1px solid #1a3a1a", borderRadius: 10, overflow: "hidden", boxShadow: "0 0 60px rgba(34,197,94,0.08)" }}>
        <div style={{ background: "#0c140c", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #1a3a1a" }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#eab308" }} />
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
          <span style={{ marginLeft: 10, color: "#4d7c4d", fontSize: 13 }}>contract-audit — security scanner — {wallet.address ? shortAddr(wallet.address) : "no wallet"}</span>
          <button onClick={handleConnect} style={{ marginLeft: "auto", background: "none", border: "1px solid #22c55e", color: "#22c55e", borderRadius: 4, padding: "3px 10px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
            {wallet.address ? "● connected" : "connect"}
          </button>
        </div>

        {/* terminal body */}
        <div ref={termRef} style={{ background: "#000", color: "#22c55e", padding: 16, height: 230, overflowY: "auto", fontSize: 13, lineHeight: 1.7 }}>
          {history.map((line, i) => <div key={i} style={{ whiteSpace: "pre-wrap", color: line.startsWith("  !") ? "#ef4444" : line.startsWith("  →") ? "#86efac" : "#22c55e" }}>{line.startsWith("$") ? <>{prompt}{line.slice(2)}</> : line}</div>)}
          <div>{prompt}<span style={{ animation: "blink 1s steps(1) infinite" }}>▋</span></div>
        </div>

        {/* command bar */}
        <div style={{ background: "#0c140c", borderTop: "1px solid #1a3a1a", padding: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setView({ kind: "list" })} style={cmd(view.kind === "list")}>ls audits</button>
          <button onClick={() => setView({ kind: "new" })} style={cmd(view.kind === "new")}>new audit</button>
          <span style={{ color: "#2d4d2d", alignSelf: "center", fontSize: 12 }}>·  {audits.length} audit(s) on-chain</span>
        </div>
      </div>

      {/* output panel below terminal */}
      <div style={{ maxWidth: 920, margin: "16px auto 60px" }}>
        {view.kind === "new" && (
          <form onSubmit={e => { e.preventDefault(); send("request_audit", [form.code, form.language, form.context], BigInt(form.fee || "0") * BigInt(10 ** 18)); setView({ kind: "list" }); }} style={panel}>
            <div style={{ color: "#4d7c4d", marginBottom: 10 }}># compose new audit request</div>
            <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} style={inp}>
              <option>Solidity</option><option>Python</option><option>Rust</option><option>Move</option>
            </select>
            <textarea placeholder="// paste contract source" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required rows={10} style={inp} />
            <input placeholder="--context: what does it do?" value={form.context} onChange={e => setForm({ ...form, context: e.target.value })} required style={inp} />
            <input placeholder="--fee (GEN)" type="number" min="1" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} required style={inp} />
            <button type="submit" disabled={loading} style={{ ...cmd(true), padding: "10px 18px", marginTop: 8 }}>$ submit_audit</button>
          </form>
        )}

        {view.kind === "list" && (
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ ...panel, borderLeft: "3px solid #22c55e" }}>
              <div style={{ color: "#86efac", fontWeight: 700 }}># man contract-audit</div>
              <div style={{ color: "#4d7c4d", marginTop: 6, lineHeight: 1.7 }}>AI-powered smart-contract security scanner. Paste Solidity / Python / Rust / Move code and a panel of GenLayer AI validators independently reviews it for vulnerabilities, logic bugs and bad practices — they must agree on the severity before the report is written on-chain.</div>
              <div style={{ marginTop: 10, color: "#22c55e" }}>
                <div>$ 1. connect      <span style={{ color: "#4d7c4d" }}># link your wallet (top right)</span></div>
                <div>$ 2. new audit    <span style={{ color: "#4d7c4d" }}># paste code + context + fee</span></div>
                <div>$ 3. run_audit    <span style={{ color: "#4d7c4d" }}># AI validators scan the code</span></div>
                <div>$ 4. read report  <span style={{ color: "#4d7c4d" }}># severity, issues & fixes on-chain</span></div>
              </div>
            </div>
            {audits.length === 0 && <div style={{ ...panel, color: "#4d7c4d" }}># no audits found. run `new audit`.</div>}
            {audits.map(a => {
              const r = a.report ? JSON.parse(a.report) : null;
              return (
                <div key={a.id} onClick={() => setView({ kind: "detail", id: a.id })} style={{ ...panel, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#86efac" }}>[{String(a.id).padStart(3, "0")}] {a.language} · <span style={{ color: "#4d7c4d" }}>{a.context.slice(0, 38)}</span></span>
                  {r ? <span style={{ color: sevColor(r.severity), border: `1px solid ${sevColor(r.severity)}`, padding: "2px 10px", borderRadius: 4, fontSize: 12 }}>{r.severity} · {r.score}/10</span> : <span style={{ color: "#eab308", fontSize: 12 }}>● queued</span>}
                </div>
              );
            })}
          </div>
        )}

        {view.kind === "detail" && (() => {
          const a = audits.find(x => x.id === view.id); if (!a) return null;
          const r = a.report ? JSON.parse(a.report) : null;
          return (
            <div style={panel}>
              <button onClick={() => setView({ kind: "list" })} style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", fontFamily: "inherit" }}>$ cd ..</button>
              <div style={{ color: "#4d7c4d", marginTop: 8 }}># audit [{String(a.id).padStart(3, "0")}] · {a.language} · {a.context}</div>
              <pre style={{ background: "#000", border: "1px solid #1a3a1a", padding: 12, borderRadius: 6, overflow: "auto", maxHeight: 200, fontSize: 12, color: "#86efac", marginTop: 10 }}>{a.code}</pre>
              {r ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <span style={{ color: sevColor(r.severity), fontSize: 16, fontWeight: 700 }}>{r.severity.toUpperCase()}</span>
                    <span style={{ color: "#86efac" }}>score {r.score}/10</span>
                    <span style={{ color: "#4d7c4d" }}>{r.issues_count} issue(s)</span>
                  </div>
                  <p style={{ color: "#86efac" }}>{r.summary}</p>
                  {(r.issues || []).map((iss: any, i: number) => (
                    <div key={i} style={{ background: "#000", padding: 12, borderRadius: 6, marginTop: 8, borderLeft: `3px solid ${sevColor(iss.severity)}` }}>
                      <strong style={{ color: sevColor(iss.severity) }}>{iss.title}</strong> <span style={{ color: "#4d7c4d", fontSize: 12 }}>[{iss.severity}]</span>
                      <p style={{ margin: "6px 0", color: "#a3a3a3", fontSize: 13 }}>{iss.description}</p>
                      <p style={{ margin: 0, color: "#22c55e", fontSize: 13 }}>→ {iss.fix}</p>
                    </div>
                  ))}
                </div>
              ) : <button onClick={() => send("run_audit", [a.id])} disabled={loading} style={{ ...cmd(true), padding: "10px 18px", marginTop: 12 }}>$ run_audit {a.id}</button>}
            </div>
          );
        })()}
      </div>
      <div style={{ textAlign: "center", color: "#2d4d2d", fontFamily: "monospace", fontSize: 11 }}># genlayer ai consensus · {shortAddr(CONTRACT_ADDRESS)}</div>
      <style>{`@keyframes blink{50%{opacity:0}} body{margin:0}`}</style>
    </div>
  );
}

const panel: React.CSSProperties = { background: "#080c08", border: "1px solid #1a3a1a", borderRadius: 8, padding: 16, color: "#22c55e", fontSize: 13 };
const inp: React.CSSProperties = { padding: 10, borderRadius: 4, border: "1px solid #1a3a1a", background: "#000", color: "#86efac", fontSize: 13, width: "100%", boxSizing: "border-box", marginBottom: 8, fontFamily: "'SF Mono',Menlo,monospace" };
const cmd = (a: boolean): React.CSSProperties => ({ background: a ? "#001a00" : "transparent", border: "1px solid " + (a ? "#22c55e" : "#1a3a1a"), color: a ? "#22c55e" : "#4d7c4d", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontFamily: "'SF Mono',Menlo,monospace", fontSize: 13 });
