# System Overview

This system manages sellers, collectors, retail shops, and administrators.
Each user has exactly one role.

The platform enables:
- Seller-submitted product batches
- Item-level barcode traceability
- Collector-based product transportation
- Shop-based barcode-only sales
- Admin-controlled pricing, discounts, and disputes

The system is eventually consistent and supports offline shop sales with
mandatory synchronization.

Supabase is used for:
- Authentication & authorization
- Centralized business logic
- Database-level security

Next.js is used for:
- Web dashboards per role
- Barcode scanning interfaces
- Offline-first shop UI
