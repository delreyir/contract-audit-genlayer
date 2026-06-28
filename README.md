# 🔐 ContractAudit

**Decentralized smart-contract security audits, powered by AI consensus.**

🔗 **Live app:** https://contract-audit-4cw.pages.dev

---

## The Problem

Professional audits cost $5k–$100k and take weeks. Automated scanners miss context. There's no fast, affordable way to get a multi-perspective security review during development or before a smaller deployment.

ContractAudit gives you an instant, multi-AI-verified security review. Not a replacement for a top-tier mainnet audit — but ideal for development, learning, pre-audit screening, and catching obvious issues before they become exploits.

---

## How It Works

1. **Connect your wallet** (MetaMask, Rabby, or any EVM wallet)
2. **Submit code** paste a contract (Solidity, Python, Rust, Move), add context, pay a small fee.
3. **Run the audit** a panel of GenLayer AI validators independently analyzes it.
4. **Read the report** severity rating, list of issues with locations and fixes, and an overall score — stored on-chain.

---

## What It Checks

- Security vulnerabilities (reentrancy, overflow, access control)
- Logic bugs and edge cases
- Gas / efficiency issues
- Best-practice violations

---

## Why GenLayer?

A normal contract can't read and reason about source code. GenLayer validators each analyze the code independently and must agree on the **severity** (exact match), **score** (±2), and **issue count** (±1) before the report finalizes so one AI "having a bad day" can't stamp a vulnerable contract as safe.

---

## Wallet & Network

Standard EVM wallet, normal signing popup **no GenLayer Snap**. On connect it adds/switches to the **GenLayer Studio Network** (chain `61999`, RPC `https://studio.genlayer.com/api`).

---

## Contract API

| Method | Type | Description |
|--------|------|-------------|
| `request_audit(code, language, context)` | payable | Submit code with the audit fee |
| `run_audit(audit_id)` | write (AI) | Run the multi-AI security review |
| `get_audit(audit_id)` | view | Full report (severity, issues, fixes) |
| `get_audit_count()` | view | Total audits |

**Consensus rule:** `severity` must match exactly; `score` within ±2; `issues_count` within ±1.

---

## Project Structure

```
contract-audit-genlayer/
├── contracts/
│   └── contract_audit.py    # GenLayer Intelligent Contract (Python)
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx     # Terminal-emulator UI
│   │   └── lib/
│   │       └── genlayer.ts  # Wallet connect (no Snap) + read client
│   ├── next.config.js
│   └── package.json
└── README.md
```

---

## Run Locally

```bash
npm install -g genlayer
genlayer network set studionet
genlayer account create --name deployer --password "yourpass"
genlayer account unlock --password "yourpass"
genlayer deploy --contract contracts/contract_audit.py

cd frontend
npm install
npm run dev
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart contract | Python — GenLayer Intelligent Contract |
| AI consensus | `gl.vm.run_nondet_unsafe` + partial field matching |
| Frontend | Next.js (static export) + TypeScript |
| SDK | genlayer-js |
| Hosting | Cloudflare Pages |

---

## Disclaimer

ContractAudit is an AI-assisted screening tool, not a substitute for a professional human audit on production contracts handling real value.

---

## License

MIT
