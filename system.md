# System Overview

This system manages sellers, collectors, retail shops, and administrators.
Each user has exactly one role.

The platform enables:
- Collector-recorded product batches on behalf of sellers
- Item-level barcode traceability
- Collector-based product transportation
- Shop-based barcode-only sales
- Admin-controlled pricing, discounts, and disputes

Collectors capture seller inventory details while on-site, then sellers confirm the pickup before
items move toward shops. Saving a batch automatically records the pickup quantity—no separate
collection entry is required. Shop owners generate/print the barcodes for each confirmed batch
so collectors can label items prior to the handover.

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
