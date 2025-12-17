# Data Model (Logical)

## Core Entities
- users (id, role)
- sellers
- collectors
- shops
- admins

## Inventory
- products (global definition)
- batches (seller_id, product_id, price, quantity)
- items (unique barcode, batch_id, status)

## Operations
- collections (auto-created pickups per batch: seller_id, collector_id, quantities)
- shop_inventory (item_id, shop_id)
- sales (item_id, shop_id, timestamp)

## Pricing & Finance
- commissions (seller_id, rules)
- discounts (batch_id, scope, expiry)
- wallets (seller_id, balance)
- payouts (wallet_id, status)

## Audits
- audit_logs (entity, action, before, after, actor)
- price_override_logs
- quantity_adjustments

No records are ever deleted.
