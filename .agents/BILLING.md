# Polar.sh Billing Refactor

Simplify product offering: remove free tier, remove seat-based pricing, remove lifetime plan. Replace with Pro Monthly / Pro Annual (unlimited seats, 14-day trial). Move all existing users to trial.

---

## 1. Polar Dashboard — Product Setup

- [x] Create two new Polar products: **"Pro Monthly"** and **"Pro Annual"** (fixed price, recurring, with `trial_interval: "day"`, `trial_interval_count: 14`)
- [x] Archive/deactivate the old Free, Team Monthly, Team Annual, and Lifetime products in Polar dashboard
- [x] Confirm new product IDs and update any hardcoded references in runtime config or env vars

---

## 2. DB Schema (`server/db/schema.ts`)

- [ ] Remove `SeatBasedPrice` from the `Price` union type — simplify to `FixedPrice | FreePrice | OneTimePrice`
- [ ] Drop the `orders` table or mark it obsolete — no more lifetime one-time purchases (keep for historical data, just stop writing to it)
- [x] Update `currentPlan` logic in `useMemberships.ts` — remove the "free" fallback default, remove order-based plan resolution; active plan = active/trialing subscription only
- [x] Update `Membership` interface — remove `orders` field

---

## 3. `usePolar.ts` Composable

- [x] Remove `isFree()`, `isSeatBased()`, `isOneTime()`, `getSeatPrice()` helpers
- [x] Remove `fetchSeatUsage()` and `limitReached` computed — no more seat enforcement
- [x] Remove `seatUsage` from reactive state

---

## 4. `PricingTable.vue` Component

- [x] Rewrite to show only **Pro Monthly** and **Pro Annual** cards (no Free tier, no Lifetime card)
- [x] Remove seat count display and seat-based pricing logic
- [x] Add trial callout ("14-day free trial") on both cards
- [x] Remove `isFree`, `isSeatBased`, `isOneTime` conditional rendering branches

---

## 5. `org/new.vue` (Org Creation Page)

- [x] Remove the free plan path — all new orgs go through checkout
- [x] Remove `pending=false` immediate set for free plans — set after checkout completion for all plans
- [x] Update plan selection to only show Pro Monthly / Pro Annual (auto-selects first product)

---

## 6. `organizations.router.ts` (tRPC)

- [x] Remove `switchToFreePlan` procedure entirely
- [x] Update `create` mutation: remove the free-plan branch — always go through `polar.checkouts.create()`
- [x] Update `createCheckoutSession`: remove seat-based logic and `seats` param
- [x] Remove seat assignment from `verifyCheckout`
- [x] Keep `createPortalSession` and `verifyCheckout` as-is (minus seat logic)

---

## 7. `team.router.ts` (tRPC)

- [x] Remove seat availability check in `inviteMember` — require active/trialing subscription only
- [x] Remove `polar.customerSeats.assignSeat()` calls from `inviteMember` and `acceptInvite`
- [x] Remove `purchaseSeats` procedure entirely
- [x] Simplify `getSeatUsage` to return `{used: N, total: Infinity}` from DB member count only

---

## 8. `billing.vue` Page

- [x] Remove seat usage display section
- [x] Remove "Purchase more seats" button and `SeatPurchaseModal` / `SeatTrialModal` usage
- [x] Remove `PlanDowngradeModal` (no downgrade path — only Pro or nothing)
- [x] Simplify "Change plan" to swap between Pro Monthly ↔ Pro Annual via `createCheckoutSession`
- [x] Show trial end date prominently if `status === 'trialing'`
- [x] Show "Subscribe" CTA if no active subscription

---

## 9. Seat-related UI Components

- [x] Delete `SeatPurchaseModal.vue`
- [x] Delete `SeatTrialModal.vue`
- [x] Delete `PlanDowngradeModal.vue`
- [x] Rewrite `BillingPricingTable.vue` — remove seat pricing, show only Monthly / Annual cards
- [x] `OrganizationSidebar.vue` — no seat count was displayed (confirmed clean)

---

## 10. Webhook Handler (`supabase/functions/polar-webhook/index.ts`)

- [ ] Remove `order.created/updated` handlers (no more one-time purchases)
- [ ] Add handling for `subscription.active` event to set `org.pending = false` as source of truth / fallback
- [ ] On `subscription.created` with new Pro product: ensure org is set to active/not-pending
- [ ] Add webhook signature verification (currently missing — security gap)

---

## 11. User Migration (One-time Script)

- [ ] Write a migration script that:
  - Fetches all active subscriptions (old Free, Team Monthly, Team Annual, Lifetime)
  - For each: calls `PATCH /v1/subscriptions/{id}` with `{ "trial_end": "<now + 14 days>" }` and updates to the new Pro product id
  - For lifetime order holders: cancel old order access, convert to trialing Pro
- [ ] Send an email to all users notifying them of the plan change and trial start
- [ ] After migration window: deactivate old products in Polar

---

## 12. Access Control Audit

- [ ] Find every place that checks `currentPlan === 'free'` or checks `orders` for lifetime access — replace with a single `hasActivePro()` check (status `active` or `trialing`)
- [ ] Ensure expired/canceled subscriptions correctly gate access to the console
- [ ] Remove any logic that allows unlimited access for lifetime plan holders via `orders` table

---

## Recommended Order of Work

1. ~~Create new Polar products (step 1) — get the product IDs first~~ ✅
2. ~~Schema & type cleanup (step 2)~~ ✅ (partial — DB schema types still need `SeatBasedPrice` removal)
3. ~~Backend: router cleanup (steps 6, 7)~~ ✅
4. Webhook handler update (step 10)
5. ~~Frontend: composables + components (steps 3, 4, 8, 9)~~ ✅
6. Migration script (step 11)
7. Access control audit (step 12)
8. QA the full checkout → trial → active → cancel lifecycle
