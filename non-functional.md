# Non-Functional Requirements

## Scale
- Sellers: ~10
- Items/day: ~500
- Architecture must support future growth

## Offline Support
- Shop sales can occur offline
- Local queue required
- Conflict resolution handled by admin

## Performance
- No real-time guarantees required
- Eventual consistency acceptable

## Data Retention
- No hard deletes
- Full traceability forever

## Reliability
- Nightly background jobs
- Sync reconciliation checks
