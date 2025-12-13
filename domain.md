# Domain Rules

## Roles
- Seller, Collector, Shop Owner, Admin
- One user = one role
- Admin has final authority

## Seller Rules
- One product per seller at one price
- Quantity editable until collection starts
- Can cancel batch before collection
- Can withdraw unsold items

## Batch Rules
- Each seller product = unique batch
- Same product from different sellers is always isolated
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
