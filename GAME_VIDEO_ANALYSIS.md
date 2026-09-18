# Game Video Analysis — Cognitive Care NER

## Uploaded clips reviewed

The five uploaded recordings were reviewed frame-by-frame at representative points for layout, interaction, progression, and difficulty:

| Uploaded clip | Identified source game | Used in active build |
|---|---|---|
| `Screen Recording 2026-09-04 035656(2).mp4` | Where Do They Belong? | No — legacy reference only |
| `Screen Recording 2026-09-04 043112(2).mp4` | Sequence Memory | Yes |
| `Screen Recording 2026-09-04 045301(1).mp4` | Around the House Sorting | Yes |
| `Screen Recording 2026-09-04 210824(1).mp4` | Pattern Recognition | Yes |
| `Screen Recording 2026-09-04 211044(1).mp4` | Spot the Difference | Yes |

The requested active set remains exactly: Sequence Memory, Stroop Test, Around the House Sorting, Pattern Recognition, Spot the Difference. The uploaded clips did not include a Stroop Test recording; Stroop is therefore implemented from the existing app engine plus a standard elderly-first Stroop interaction rather than pretending the missing clip was reviewed.

## Shared visual structure extracted from the clips

- Deep forest/near-black green page background.
- Narrow centered content column rather than a full-width dashboard layout.
- Dark green game card with a thin muted-green border.
- Mint/green progress indicator and rounded progress/count badge.
- Large readable serif-style game title and short instruction copy.
- Large, high-contrast controls with generous spacing.
- Immediate in-game feedback using green for correct and restrained red/orange for incorrect states.
- No game-specific timer pressure in the source presentation; the build keeps the interaction calm and measures response time only as a training metric.

## Game-specific implementation decisions

### Sequence Memory
The source shows four large colour tiles, a preview/light-up phase, then a recall phase. The active build keeps four large tiles and uses three adaptive rounds: 4, 5, and 6 colours. This preserves the source structure while avoiding an unnecessarily high starting load.

### Around the House Sorting
The source presents two familiar locations, a list of everyday items, two category buttons per item, and a Check Answers action. The active build preserves that interaction. Three rounds use 4, 5, and 6 items, with familiar household categories such as desk/kitchen, porch/fireplace, bathroom/bedroom, and china/broom storage.

### Pattern Recognition
The source presents a sequence, a missing next value, large answer choices, and an explanation after selection. The active build preserves that structure and uses easy arithmetic patterns first, then a visual alternating pattern in round 3.

### Spot the Difference
The source includes a memorization phase before the change-identification phase. The active build preserves this two-stage interaction. Three rounds use 6, 7, and 8 familiar visual items, with a short, increasing viewing period rather than the source's more demanding 15-question run.

### Stroop Test
No Stroop recording was present in the uploaded set. The active build uses a conventional Stroop interaction: a colour word rendered in a potentially conflicting ink colour, with large answer buttons. Difficulty increases from 2 to 3 to 4 available colours across three rounds.

## Difficulty adaptation

The source games can run for substantially more questions/rounds than is appropriate for the project's elderly-first session. The platform therefore uses three rounds per game, gradual difficulty, large touch targets, no hard countdown, and a calm progression. This is intentional product adaptation, not a claim that the source platform's exact difficulty should be copied.

## Random game order

Every new five-game session generates a fresh Fisher-Yates shuffle of the active five games. The previous session order is stored under `ccner-game-order.v1`; if a newly generated order exactly matches the previous order, it is reshuffled so the same full order is not immediately repeated.

## Clinical-data boundary

Scores, accuracy, response time, difficulty reached, and longitudinal trends are stored as training-performance data. They are not converted directly into MMSE, MoCA, CDR, dementia stage, or a diagnosis. Clinical interpretation remains a separate clinician/health-worker layer because real dementia evaluation uses history, cognitive testing, functional status, informant observations, examination, and other medical assessment rather than a single game percentage.
