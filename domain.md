# Domain Rules

## Roles
- Seller, Collector, Shop Owner, Admin
- One user = one role
- Admin has final authority

## Seller Rules
- Collectors capture new products and batches while on-site with the seller
- One product per seller at one price
- Pickup quantity is locked as soon as the collector saves the batch
- Can cancel batch before seller confirmation
- Seller must confirm the auto-logged pickup before it moves to shops
- Can withdraw unsold items

## Batch Rules
- Each seller product = unique batch
- Same product from different sellers is always isolated
- Every batch automatically produces a matching pickup record handled through collections
- Sold items are immutable

## Pricing
- Seller sets base price
- System adds commission (configurable)
- Admin can override price with warning and audit log
- Discounts cannot cause negative seller profit

## Discounts
- Seller may request
- Admin decides
- Seller has 2 days to respond
- No response = rejected
- Max 3 rejections

## Unsold Products
- Admin decides slow-moving status
- Price offers may apply to full or partial remaining batch
- Expired products are returned to sellers
