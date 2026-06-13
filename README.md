# 🛡️ ContractAudit

**Decentralized smart contract security audits, powered by AI consensus.**

Paste your contract code, pay a small fee, and multiple AI validators independently analyze it for vulnerabilities, logic bugs, and best practice violations. Get an on-chain audit report with severity rating, specific issues found, and recommended fixes — all verified through GenLayer's consensus.

---

## Why This Exists

Traditional audits cost $5k-$100k and take weeks. Automated tools miss context. ContractAudit gives you an instant, multi-AI-verified security review for a fraction of the cost. Not a replacement for top-tier audits on mainnet contracts — but perfect for development, learning, pre-audit screening, and catching obvious issues before they become exploits.

---

## How It Works

1. **Submit Code** — Paste your contract (Solidity, Python, Rust, Move)
2. **Pay Fee** — Small GEN amount covers validator computation
3. **AI Audit** — Multiple AI validators independently:
   - Analyze for reentrancy, overflow, access control flaws
   - Check logic bugs and edge cases
   - Evaluate gas efficiency
   - Score overall security (1-10)
4. **On-Chain Report** — Severity, issues list with fixes, stored permanently

---

## Consensus Model

Validators must agree on:
- **Severity level** (critical/high/medium/low/clean) — must match exactly
- **Security score** — within ±2
- **Issue count** — within ±1

This prevents a single AI from having an off day and stamping a vulnerable contract as safe.

---

## Deployed Contract

**Network:** GenLayer Studionet  
**Address:** (see deployment output)

---

## Quick Start

```bash
npm install -g genlayer
genlayer network set studionet
genlayer deploy --contract contracts/contract_audit.py

cd frontend && npm install && npm run dev
```

---

## License

MIT
