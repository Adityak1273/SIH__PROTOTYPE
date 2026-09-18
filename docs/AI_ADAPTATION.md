# Cognitive Care NER — AI & Adaptation

## Principle

The prototype should be adaptive without pretending to be clinically intelligent. Start with transparent, deterministic rules and preserve an interface that can later support trained models.

## Inputs

Potential inputs include:
- recent game accuracy
- completion time
- error patterns
- streaks/consistency
- recent difficulty
- skipped/abandoned sessions
- longer-term trend features

Avoid using sensitive attributes as adaptation inputs unless there is a documented product/safety reason and explicit approval.

## Output

The adaptation layer returns a typed recommendation containing:
- next game/configuration
- difficulty level
- confidence/quality metadata where meaningful
- reason codes
- adaptation-policy version

## MVP policy

Use bounded adjustments rather than aggressive jumps. A user's difficulty should change gradually and be reversible. Missing/low-quality data must fall back to a safe default rather than producing a confident recommendation.

All decisions must be deterministic for the same versioned input/policy so they are testable and explainable.

## Future model interface

A future model provider may implement the same recommendation interface. Model inference must not bypass authorization, data minimization, or safety rules.

## Important boundary

Game performance is product telemetry. It must not be presented as a diagnosis, medical assessment, or clinical prediction unless the product is separately validated and approved for that purpose.
