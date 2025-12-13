# Security Model

## Authentication
- Supabase Auth
- Role stored in JWT metadata

## Authorization
- Row Level Security (RLS) on all tables
- Sellers can only see their own data
- Shops cannot see seller pricing breakdowns
- Admin bypass with audit logs

## Barcode Security
- Each item barcode is unique
- Barcodes cannot be reused
- Sale requires barcode scan
- Manual sales are blocked

## Abuse Controls
- Max 3 price rejections per batch
- Admin-only inventory correction
- Collector verification required for seller products
