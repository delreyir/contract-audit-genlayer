"use client";
import { useState, useEffect } from "react";
import { client, CONTRACT_ADDRESS } from "@/lib/genlayer";

type Audit = {
  id: string; requester: string; code: string; language: string;
  context: string; fee: string; status: number; report: string; created_at: number;
};

export default function Home() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"browse" | "create">("browse");
  const [selected, setSelected] = useState<Audit | null>(null);
  const [form, setForm] = useState({ code: "", language: "Solidity", context: "", fee: "1" });
  const [tx, setTx] = useState("");

  useEffect(() => { if (CONTRACT_ADDRESS) load(); }, []);

  async function load() {
    try {
      const count = Number(await client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: "get_audit_count", args: [] }));
      const loaded: Audit[] = [];
      for (let i = 1; i <= count; i++) {
        const raw = await client.readContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: "get_audit", args: [String(i)] });
        loaded.push(JSON.parse(raw as string));
      }
      setAudits(loaded);
    } catch (e) { console.error(e); }
  }

  async function send(fn: string, args: any[], value?: bigint) {
    setLoading(true); setTx(`${fn}...`);
    try {
      const hash = await client.writeContract({ address: CONTRACT_ADDRESS as `0x${string}`, functionName: fn, args, ...(value ? { value } : {}) });
      await client.waitForTransactionReceipt({ hash });
      setTx("✓ Done!"); await load(); setSelected(null);
    } catch (e: any) { setTx(`Error: ${e.message}`); }
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ textAlign: "center" }}>🛡️ ContractAudit</h1>
      <p style={{ textAlign: "center", color: "#888" }}>AI-powered smart contract security audits on-chain</p>

      {tx && <div style={{ background: "#1a1a2e", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{tx}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button onClick={() => { setTab("browse"); setSelected(null); }} style={tabBtn(tab === "browse")}>Audits</button>
        <button onClick={() => { setTab("create"); setSelected(null); }} style={tabBtn(tab === "create")}>Request Audit</button>
      </div>

      {tab === "create" && (
        <form onSubmit={e => { e.preventDefault(); send("request_audit", [form.code, form.language, form.context], BigInt(form.fee) * BigInt(10**18)); }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <select value={form.language} onChange={e => setForm({...form, language: e.target.value})} style={inp}>
            <option>Solidity</option><option>Python</option><option>Rust</option><option>Move</option>
          </select>
          <textarea placeholder="Paste your smart contract code here..." value={form.code} onChange={e => setForm({...form, code: e.target.value})} required rows={10} style={{ ...inp, fontFamily: "monospace" }} />
          <input placeholder="Context (what does this contract do?)" value={form.context} onChange={e => setForm({...form, context: e.target.value})} required style={inp} />
          <input placeholder="Audit fee (GEN)" type="number" min="1" value={form.fee} onChange={e => setForm({...form, fee: e.target.value})} required style={inp} />
          <button type="submit" disabled={loading} style={btn}>🛡️ Request Audit</button>
        </form>
      )}

      {tab === "browse" && !selected && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {audits.length === 0 && <p style={{ color: "#888" }}>No audits yet.</p>}
          {audits.map(a => (
            <div key={a.id} onClick={() => setSelected(a)} style={{ background: "#1a1a2e", padding: 16, borderRadius: 8, cursor: "pointer", border: "1px solid #333" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>#{a.id} — {a.language} contract</span>
                <span style={{ background: a.status === 1 ? "#4caf50" : "#ff9800", padding: "4px 10px", borderRadius: 12, fontSize: 12 }}>{a.status === 0 ? "Pending" : "Audited"}</span>
              </div>
              <small style={{ color: "#888" }}>{a.context.slice(0, 60)}</small>
              {a.report && (() => { const r = JSON.parse(a.report); return <span style={{ marginLeft: 8, color: r.severity === "clean" ? "#4caf50" : r.severity === "critical" ? "#f44336" : "#ff9800" }}>Severity: {r.severity}</span>; })()}
            </div>
          ))}
        </div>
      )}

      {tab === "browse" && selected && (
        <div style={{ background: "#1a1a2e", padding: 24, borderRadius: 12, border: "1px solid #333" }}>
          <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#6c5ce7", cursor: "pointer" }}>← Back</button>
          <h3>Audit #{selected.id} — {selected.language}</h3>
          <p style={{ color: "#aaa" }}>{selected.context}</p>
          <pre style={{ background: "#0d0d1a", padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 200, fontSize: 12 }}>{selected.code}</pre>

          {selected.report && (() => {
            const r = JSON.parse(selected.report);
            const sevColor = r.severity === "clean" ? "#4caf50" : r.severity === "critical" ? "#f44336" : r.severity === "high" ? "#ff5722" : "#ff9800";
            return (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  <span style={{ background: sevColor, padding: "4px 12px", borderRadius: 8 }}>Severity: {r.severity}</span>
                  <span>Score: {r.score}/10</span>
                  <span>Issues: {r.issues_count}</span>
                </div>
                <p><strong>Summary:</strong> {r.summary}</p>
                {r.issues && r.issues.map((issue: any, i: number) => (
                  <div key={i} style={{ background: "#12122a", padding: 12, borderRadius: 8, marginBottom: 8, borderLeft: `3px solid ${issue.severity === "critical" ? "#f44336" : issue.severity === "high" ? "#ff5722" : "#ff9800"}` }}>
                    <strong>{issue.title}</strong> <small>({issue.severity})</small>
                    <p style={{ margin: "4px 0" }}>{issue.description}</p>
                    <p style={{ color: "#4caf50", margin: 0 }}>Fix: {issue.fix}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {selected.status === 0 && (
            <button onClick={() => send("run_audit", [selected.id])} disabled={loading} style={{ ...btn, marginTop: 16 }}>🔍 Run AI Audit</button>
          )}
        </div>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { padding: 12, borderRadius: 8, border: "1px solid #333", background: "#1a1a2e", color: "#e0e0e0", fontSize: 14 };
const btn: React.CSSProperties = { padding: "12px 20px", borderRadius: 8, border: "none", background: "#6c5ce7", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: "bold" };
const tabBtn = (a: boolean): React.CSSProperties => ({ padding: "10px 20px", background: a ? "#6c5ce7" : "#2d2d2d", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer" });
