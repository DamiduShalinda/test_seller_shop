# Workflows

## Product Lifecycle
CREATED
→ COLLECTING
→ COLLECTED
→ IN_SHOP
→ PARTIALLY_SOLD
→ SOLD | RETURNED

## Collection Flow
1. Seller submits batch
2. Collector verifies quantity and condition
3. Partial collection allowed
4. Seller confirms collected quantity
5. Collector hands over to shop with proof

## Sales Flow
1. Customer selects item
2. Shop scans barcode (mandatory)
3. System validates item state
4. Sale recorded (offline if needed)
5. Sync when online

## Payment Flow
1. Sale increases seller wallet
2. Nightly earnings notification
3. Seller requests payout
4. Admin approves
5. Wallet deducted

## Return Flow
1. Item marked unsold/expired
2. Admin approves return
3. Item returned to seller
4. Inventory updated
