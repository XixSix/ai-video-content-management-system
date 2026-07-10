def clamp_score(value: float) -> float:
    """Clamp a numeric score to the 0-1 range."""
    return max(0.0, min(value, 1.0))
