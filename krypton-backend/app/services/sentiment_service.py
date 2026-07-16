"""
Deterministic, rule-based sentiment scoring (VADER) -- NOT an LLM call.
Same headline always produces the same score, instantly, for free.

VADER outputs a "compound" score in [-1, 1]. We translate that into the
bullish/bearish/neutral labels a trader actually thinks in.
"""

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_analyzer = SentimentIntensityAnalyzer()

# Thresholds are VADER's own commonly recommended cutoffs for pos/neg/neutral.
BULLISH_THRESHOLD = 0.15
BEARISH_THRESHOLD = -0.15


def score_sentiment(text: str) -> dict:
    scores = _analyzer.polarity_scores(text)
    compound = scores["compound"]

    if compound >= BULLISH_THRESHOLD:
        label = "bullish"
    elif compound <= BEARISH_THRESHOLD:
        label = "bearish"
    else:
        label = "neutral"

    return {"label": label, "score": round(compound, 3)}