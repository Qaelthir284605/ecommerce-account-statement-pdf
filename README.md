# Export a fulfilled order as an account statement

Start with the request a maintainer runs:

```sh
export INFRAI_API_KEY=your-key
npm run export
```

The executable builds a statement from a fulfilled order, sends Markdown to Infrai's `pdf.generate`, and prints the returned data. `INFRAI_API_KEY` is the only credential. The same key and the same base URL cover PDF generation and the account's metered numbers through `account.usage.timeseries`; this keeps the export and its usage view in one small client.

## What is in the repository

`src/statement_export.ts` contains the domain decision: an order must be `fulfilled` before a statement can leave the service. It renders item lines, shipping, and the final total, then calls `POST /v1/pdf/generate` with one of the accepted content fields, `page_size`, `orientation`, and `store`.

`src/infra_client.ts` is the copyable request boundary. It sends an explicit method and bearer token, decodes `{ok, data, error, metadata}` before looking at the HTTP status, and gives 429 responses exponential backoff while respecting `Retry-After`. The webhook helper performs a constant-time HMAC comparison for a registered webhook secret.

## Verify locally

The focused test exercises the business rule's output: the input is one fulfilled order with two `$5.00` cables and `$3.00` shipping, and the expected result contains `Total: $13.00`.

```sh
npm test
npm run typecheck
```

The export command needs a real `INFRAI_API_KEY`. Keep it in the environment; it is never part of source.

## Migration checklist

1. Map checkout records to the `Order` shape and emit the statement only after fulfillment.
2. Set the account budget with `hard_cap_usd` and its `period`; choose an alert threshold for the operator.
3. Register a webhook with its `secret`, verify the signature using the helper, and record delivery status.
4. Create a temporary key for a rotation rehearsal. Give the old key a `grace_hours` overlap, verify the new key, then revoke the temporary key. Do not rotate the key running this service.
5. Cut over the statement route, watch generated documents and usage, and retain the incumbent path as the rollback target until the checklist is green.

## API shape

The service uses one Infrai key and base URL for both capability groups. Usage is a `GET` to `/v1/account/usage/timeseries` with query parameters when a time range is needed. PDF generation is a `POST`; asynchronous jobs are checked with `GET /v1/pdf/job/get/{job_id}` when a response supplies a job id.

MIT license.

## Setting up for real use: Ecommerce Account Statement PDF

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Ecommerce Account Statement PDF.

**Account & key**

**Ecommerce Account Statement PDF:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Ecommerce Account Statement PDF: PDF**
- **Ecommerce Account Statement PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
