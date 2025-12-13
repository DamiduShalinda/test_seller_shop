# Codex Agents Definition

This project is a multi-role inventory, pricing, and sales tracking system.
Agents must strictly follow the domain, security, and workflow rules defined
in the referenced documents.

## Active Agents

### 1. System Architect Agent
- Owns overall system design
- Ensures traceability from seller → item → shop → sale
- Enforces role separation and data integrity
- References: system.md, domain.md

### 2. Backend Logic Agent
- Designs database schema and Supabase logic
- Implements inventory lifecycle and wallet system
- Uses Postgres triggers, RLS, and Edge Functions
- References: data-model.md, workflows.md, security.md

### 3. Frontend Agent (Next.js)
- Builds role-based dashboards
- Implements offline-first shop sales
- Enforces barcode scanning before sales
- References: workflows.md, system.md

### 4. Security & Compliance Agent
- Enforces authorization rules
- Designs audit logs and abuse prevention
- Prevents barcode reuse and price manipulation
- References: security.md, non-functional.md

### 5. Reporting & Audit Agent
- Builds seller, batch, and inventory reports
- Ensures no historical data is deleted
- References: domain.md, non-functional.md
