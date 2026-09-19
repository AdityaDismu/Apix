# Official reference data inputs

This directory intentionally contains **no fabricated DGCA data**.

## Route basket file

Supply a legitimately obtained DGCA route/passenger-volume export as `dgca_routes.csv` with:

```csv
origin,destination,passenger_volume,reference_period,source,effective_from,effective_to,route_name
```

`passenger_volume` is used only to calculate route weights:

`weight = passenger_volume / sum(passenger_volume)` within the selected reference period.

The source and reference period are stored with the basket. Do not type guessed passenger volumes into this file.

## Backtest reference

Supply an independently published DGCA airfare reference as `dgca_fares.csv` with:

```csv
origin,destination,period_start,reference_value
```

`reference_value` must be the published fare measure for the stated route and period. Do not create historical values from current scraper results.
