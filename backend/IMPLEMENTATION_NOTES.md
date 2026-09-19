# APIx Implementation Notes — Batch 1 + Batch 2

## 1. Live collection

The current verified source is `fast-flights` backed by Google Flights results. The adapter records the fields the source actually exposes. It does not invent flight numbers or fare components.

Current verified fields:
- route
- travel date
- advance days
- airline
- departure time
- arrival time
- duration
- stops
- total INR fare

Current unavailable fields remain null:
- base fare
- taxes
- airport fee/UDF
- convenience fee
- flight number when the source does not expose it

## 2. Source capability architecture

Every adapter publishes a capability object. The index layer therefore knows whether a source exposes component-level fare information. A generic authorized JSON adapter is included for future airline/OTA integrations, but it is deliberately not enabled without an authorized endpoint.

No CAPTCHA solving, IP rotation for evasion, stealth fingerprinting, unauthorized authenticated requests or protected-API reverse engineering is implemented.

## 3. Standard fare

The standard product is:
- adult
- one-way
- economy
- non-stop
- INR
- total mandatory consumer airfare

Optional baggage, seat selection, meals, insurance and conditional/member discounts are not silently included.

## 4. Route basket and weights

The route basket is loaded from a legitimate DGCA reference file. For route r:

`w_r = Q_r / sum(Q_j)`

where Q is passenger volume in the selected reference period.

The loader validates:
- IATA-style three-character airport codes
- different origin/destination
- positive passenger volume
- source and reference period
- weights sum to one

No passenger-volume values are bundled into the prototype.

## 5. Price index

For a matched item:

`R_i = P_current / P_reference`

Jevons:

`I = 100 * exp(mean(ln(R_i)))`

When exact flight identity is unavailable, APIx uses a stable schedule matching key built from source, airline, route, optional flight number, departure, arrival, duration and stops. Travel date is excluded from this key so a recurring schedule can be tracked as the booking horizon rolls forward.

If source identifiers change enough that too few schedule matches remain, the implementation uses a clearly labelled median-level fallback for the same route/lead-time basket. The snapshot stores the calculation method.

## 6. Route APIx

Each available lead-time window produces an elementary index. The prototype aggregates available windows using equal weights in log space. Coverage is stored with the result.

## 7. National APIx

National APIx is calculated only when a verified route-weight basket exists and route coverage reaches the configured minimum (default 75%). Covered route weights are renormalized over the observed subset. If coverage is insufficient, no national index row is published.

## 8. Periodic indices

Daily, weekly and monthly values are derived from national APIx snapshots in log space, weighted by valid observation support. They are prototype aggregations, not a claim that the official CPI compilation uses this exact temporal aggregation.

## 9. Data quality

Outliers are detected using the 1.5 IQR rule within the collection basket. They are flagged and retained. Flagged observations are excluded from index calculations.

Source failures are stored as statuses such as:
- no_flights
- source_timeout
- source_blocked
- captcha_detected
- source_error
- parse_error

## 10. Backtesting

The backtest consumes an independent DGCA reference file. APIx and reference fare series are aligned by route and period and normalized to 100 at the first common period for each route.

Metrics:
- MAE
- RMSE
- MAPE
- Pearson correlation

The system does not manufacture historical observations to satisfy a 30-day requirement. A run is marked `partial_success` when the available APIx history does not cover the configured minimum calendar-day requirement.

## 11. Reproducibility

Every index result carries or is associated with:
- methodology version
- route basket/reference period
- collection timestamp
- pipeline run
- source capability metadata
- quality status

This makes the calculation traceable rather than a black-box dashboard number.
