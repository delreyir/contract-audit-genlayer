# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import typing
from datetime import datetime, timezone


class ContractAudit(gl.Contract):
    audit_count: i32
    audits: TreeMap[str, str]

    def __init__(self):
        self.audit_count = i32(0)

    @gl.public.write.payable
    def request_audit(self, code: str, language: str, context: str) -> i32:
        value = gl.message.value
        if value == u256(0):
            raise gl.vm.UserError("Must pay audit fee")

        self.audit_count = i32(int(self.audit_count) + 1)
        audit_id = str(int(self.audit_count))
        now = int(datetime.now(timezone.utc).timestamp())

        audit = {
            "id": audit_id,
            "requester": str(gl.message.sender_address),
            "code": code,
            "language": language,
            "context": context,
            "fee": str(value),
            "status": 0,  # 0=pending, 1=audited
            "report": "",
            "created_at": now,
        }
        self.audits[audit_id] = json.dumps(audit)
        return self.audit_count

    @gl.public.write
    def run_audit(self, audit_id: str) -> typing.Any:
        audit = json.loads(self.audits[audit_id])
        if audit["status"] != 0:
            raise gl.vm.UserError("Already audited")

        code = audit["code"]
        language = audit["language"]
        context = audit["context"]

        def leader_fn():
            prompt = f"""You are a smart contract security auditor. Analyze the following code for vulnerabilities, bugs, and best practice violations.

LANGUAGE: {language}
CONTEXT: {context}

CODE:
{code}

Analyze for:
1. Security vulnerabilities (reentrancy, overflow, access control)
2. Logic bugs (incorrect conditions, edge cases)
3. Gas/efficiency issues
4. Best practice violations

Return JSON:
{{
    "severity": "critical" or "high" or "medium" or "low" or "clean",
    "issues_count": number,
    "issues": [
        {{"title": "...", "severity": "...", "line_hint": "...", "description": "...", "fix": "..."}}
    ],
    "summary": "brief overall assessment",
    "score": 1-10 (10 = perfectly secure)
}}"""
            response = gl.nondet.exec_prompt(prompt)
            return json.loads(response)

        def validator_fn(leader_result) -> bool:
            if not isinstance(leader_result, gl.vm.Return):
                return False
            validator_data = leader_fn()
            leader_data = leader_result.calldata
            # Severity must match, score within ±2, issue count within ±1
            return (leader_data["severity"] == validator_data["severity"]
                    and abs(leader_data["score"] - validator_data["score"]) <= 2
                    and abs(leader_data["issues_count"] - validator_data["issues_count"]) <= 1)

        result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

        audit["status"] = 1
        audit["report"] = json.dumps(result)
        self.audits[audit_id] = json.dumps(audit)

    @gl.public.view
    def get_audit(self, audit_id: str) -> str:
        return self.audits[audit_id]

    @gl.public.view
    def get_audit_count(self) -> i32:
        return self.audit_count
