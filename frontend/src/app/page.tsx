"use client";
import { useState, useEffect, useCallback } from "react";
import { CONTRACT_ADDRESS, connectWallet, readClient, shortAddr, type WalletState } from "@/lib/genlayer";
import { TransactionStatus } from "genlayer-js/types";

type Audit = { id: string; requester: string; code: string; language: string; context: string; fee: string; status: number; report: string; };

const sevColor = (s: string) => ({ clean: "#22c55e", low: "#84cc16", medium: "#eab308", high: "#f97316", critical: "#ef4444" }[s] || "#6b7280");

export default function Home() {
  const [wallet, setWallet] = useState<WalletState>({ address: null, client: null });
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"browse" | "create">("browse");
  const [selected, setSelected] = useState<Audit | null>(null);
  const [form, setForm] = useState({ code: "", language: "Solidity", context: "", fee: "1" });
  const [tx, setTx] = useState("");

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

  async function handleConnect() {
    setTx("$ connecting wallet...");
    try { const w = await connectWallet(); setWallet(w); setTx(`$ connected ${shortAddr(w.address!)}`); }
    catch (e: any) { setTx(`! ${e.message}`); }
  }

  async function send(fn: string, args: any[], value?: bigint) {
    if (!wallet.client) { setTx("! connect wallet first"); return; }
    setLoading(true); setTx(`$ exec ${fn}...`);
    try {
      const hash = await wallet.client.writeContract({ address: CONTRACT_ADDRESS, functionName: fn, args, value: value ?? BigInt(0) });
      await wallet.client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED });
      setTx("$ ok — on-chain"); await load(); setSelected(null);
    } catch (e: any) { setTx(`! ${e.message}`); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#22c55e", fontFamily: "'SF Mono',Menlo,Consolas,monospace" }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "26px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1a3a1a", paddingBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, color: "#22c55e" }}>
              <span style={{ color: "#15803d" }}>~/</span>contract-audit <span style={{ color: "#15803d" }}>$</span>
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#4d7c4d" }}># AI-powered smart contract security audits</p>
          </div>
          {wallet.address ? (
            <div style={{ ...pill }}>● {shortAddr(wallet.address)}</div>
          ) : (
            <button onClick={handleConnect} style={btn}>[ connect_wallet ]</button>
          )}
        </div>

        {tx && <div style={statusBar}>{tx}<span style={{ animation: "blink 1s steps(1) infinite" }}>_</span></div>}

        <div style={{ display: "flex", gap: 8, margin: "20px 0" }}>
          <button onClick={() => { setTab("browse"); setSelected(null); }} style={tabBtn(tab === "browse")}>./audits</button>
          <button onClick={() => { setTab("create"); setSelected(null); }} style={tabBtn(tab === "create")}>./new_audit</button>
        </div>

        {tab === "create" && (
          <form onSubmit={e => { e.preventDefault(); send("request_audit", [form.code, form.language, form.context], BigInt(form.fee || "0") * BigInt(10 ** 18)); }} style={card}>
            <label style={lbl}>{">"} LANGUAGE</label>
            <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} style={inp}>
              <option>Solidity</option><option>Python</option><option>Rust</option><option>Move</option>
            </select>
            <label style={lbl}>{">"} CONTRACT_CODE</label>
            <textarea placeholder="// paste your contract here" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required rows={10} style={inp} />
            <label style={lbl}>{">"} CONTEXT</label>
            <input placeholder="what does this contract do?" value={form.context} onChange={e => setForm({ ...form, context: e.target.value })} required style={inp} />
            <label style={lbl}>{">"} FEE (GEN)</label>
            <input type="number" min="1" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} required style={inp} />
            <button type="submit" disabled={loading} style={{ ...btn, marginTop: 14, width: "100%" }}>[ run_audit ]</button>
          </form>
        )}

        {tab === "browse" && !selected && (
          <div style={{ display: "grid", gap: 10 }}>
            {audits.length === 0 && <p style={{ color: "#4d7c4d" }}># no audits in queue</p>}
            {audits.map(a => (
              <div key={a.id} onClick={() => setSelected(a)} style={{ ...card, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>[{String(a.id).padStart(3, "0")}] {a.language} · {a.context.slice(0, 36)}</span>
                {a.report ? (() => { const r = JSON.parse(a.report); return <span style={{ ...pill, color: sevColor(r.severity), borderColor: sevColor(r.severity) }}>{r.severity} {r.score}/10</span>; })() : <span style={{ ...pill, color: "#eab308", borderColor: "#854d0e" }}>queued</span>}
              </div>
            ))}
          </div>
        )}

        {tab === "browse" && selected && (
          <div style={card}>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#22c55e", cursor: "pointer", fontFamily: "inherit" }}>{"<"} back</button>
            <h3 style={{ marginTop: 10 }}>[{String(selected.id).padStart(3, "0")}] {selected.language}</h3>
            <p style={{ color: "#4d7c4d", fontSize: 13 }}># {selected.context}</p>
            <pre style={{ background: "#0a0f0a", border: "1px solid #1a3a1a", padding: 12, borderRadius: 6, overflow: "auto", maxHeight: 180, fontSize: 12, color: "#86efac" }}>{selected.code}</pre>

            {selected.report && (() => {
              const r = JSON.parse(selected.report);
              return (
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
                    <span style={{ ...pill, color: sevColor(r.severity), borderColor: sevColor(r.severity), fontSize: 14 }}>{r.severity.toUpperCase()}</span>
                    <span style={{ color: "#86efac" }}>score: {r.score}/10</span>
                    <span style={{ color: "#4d7c4d" }}>issues: {r.issues_count}</span>
                  </div>
                  <p style={{ color: "#86efac" }}>{r.summary}</p>
                  {(r.issues || []).map((iss: any, i: number) => (
                    <div key={i} style={{ background: "#0a0f0a", padding: 12, borderRadius: 6, marginTop: 8, borderLeft: `3px solid ${sevColor(iss.severity)}` }}>
                      <strong style={{ color: sevColor(iss.severity) }}>{iss.title}</strong> <span style={{ color: "#4d7c4d", fontSize: 12 }}>[{iss.severity}]</span>
                      <p style={{ margin: "6px 0", color: "#a3a3a3", fontSize: 13 }}>{iss.description}</p>
                      <p style={{ margin: 0, color: "#22c55e", fontSize: 13 }}>fix: {iss.fix}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            {selected.status === 0 && <button onClick={() => send("run_audit", [selected.id])} disabled={loading} style={{ ...btn, marginTop: 14 }}>[ run_audit ]</button>}
          </div>
        )}

        <footer style={{ marginTop: 50, color: "#2d4d2d", fontSize: 11 }}># genlayer ai consensus · {shortAddr(CONTRACT_ADDRESS)}</footer>
      </div>
      <style>{`@keyframes blink{50%{opacity:0}}`}</style>
    </div>
  );
}

const card: React.CSSProperties = { background: "#080c08", border: "1px solid #1a3a1a", borderRadius: 6, padding: 18 };
const inp: React.CSSProperties = { padding: 10, borderRadius: 4, border: "1px solid #1a3a1a", background: "#000", color: "#86efac", fontSize: 13, width: "100%", boxSizing: "border-box", marginBottom: 4, fontFamily: "inherit" };
const lbl: React.CSSProperties = { fontSize: 11, color: "#4d7c4d", marginTop: 12, display: "block" };
const btn: React.CSSProperties = { padding: "10px 18px", borderRadius: 4, border: "1px solid #22c55e", background: "#001a00", color: "#22c55e", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 };
const pill: React.CSSProperties = { padding: "3px 10px", borderRadius: 4, fontSize: 12, border: "1px solid #22c55e", color: "#22c55e" };
const statusBar: React.CSSProperties = { background: "#0a0f0a", border: "1px solid #1a3a1a", padding: 10, borderRadius: 4, fontSize: 13, color: "#22c55e", marginTop: 14 };
const tabBtn = (a: boolean): React.CSSProperties => ({ padding: "8px 16px", background: a ? "#001a00" : "transparent", border: "1px solid " + (a ? "#22c55e" : "#1a3a1a"), borderRadius: 4, color: a ? "#22c55e" : "#4d7c4d", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 });
