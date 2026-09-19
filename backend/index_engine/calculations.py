import math


def calculate_price_relative(current_price, base_price):
    if current_price <= 0 or base_price <= 0:
        raise ValueError("Prices must be greater than zero")
    return current_price / base_price


def calculate_jevons_from_relatives(price_relatives, base_index=100.0):
    if not price_relatives:
        raise ValueError("No price relatives supplied")
    if any(x <= 0 or not math.isfinite(x) for x in price_relatives):
        raise ValueError("Price relatives must be finite and positive")
    return math.exp(sum(math.log(x) for x in price_relatives) / len(price_relatives)) * base_index


def calculate_jevons_index(current_prices, base_prices, base_index=100.0):
    if len(current_prices) != len(base_prices) or not current_prices:
        raise ValueError("Price lists must be non-empty and equal in length")
    return calculate_jevons_from_relatives([calculate_price_relative(c,b) for c,b in zip(current_prices,base_prices)], base_index)


def calculate_weighted_jevons(index_values, weights, base_index=100.0):
    if len(index_values) != len(weights) or not index_values:
        raise ValueError("Index values and weights must be non-empty and equal in length")
    if any(v <= 0 for v in index_values) or any(w < 0 for w in weights):
        raise ValueError("Indices must be positive and weights non-negative")
    total = sum(weights)
    if total <= 0:
        raise ValueError("Total weight must be greater than zero")
    return math.exp(sum((w / total) * math.log(v / base_index) for v,w in zip(index_values,weights))) * base_index


def percent_change(current, previous):
    if previous <= 0:
        raise ValueError("Previous value must be greater than zero")
    return (current / previous - 1) * 100
