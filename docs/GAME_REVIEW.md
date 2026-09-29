# Tempo game review

Tempo accuracy is an independent 0–100 estimate, not Chess.com CAPS, a win probability, or an Elo rating. Only recorded player moves are scored; opponent moves are excluded. Existing saved games receive scores from their stored evidence without changing their history.

Version 1 assigns each move `100 * exp(-loss / 200)`, where loss is the nonnegative estimated cost in centipawns already recorded by Tempo. The displayed game score is the rounded arithmetic mean. No valid moves means no score. Nonfinite or negative values are excluded and flagged as a partial review. Fewer than eight scored moves is labeled a short game.

Move labels use the same stored loss: Sound below 50, Inaccuracy 50–149, Mistake 150–299, Blunder 300 or higher. The three largest losses of at least 50 become key moments, displayed in game order. Revisit opens the existing interactive exploration board, without revealing an answer.

These are simple learning indicators. Brief searches, forced moves, already-decided positions, and opponent difficulty can affect their usefulness. The formula is not calibrated against human ratings or another site's scores. The AI explains positions; it does not invent or calculate the score. No Brilliant or Best labels are inferred from a zero loss.
