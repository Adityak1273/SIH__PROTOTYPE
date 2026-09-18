# Five-Game Cognitive Training — Training & Demo Guide

This guide preserves the five-game MVP structure agreed for the Cognitive Care NER prototype and describes the exact GUI flow used by the restored training engine.

## Session format

- One continuous session.
- Exactly five games, one after another.
- No separate game-selection menu for the elderly user.
- Momo introduces each game and explains what to do.
- Each game has three short rounds.
- Difficulty is Easy / Medium / Hard and is personalized from prior performance.
- The engine records score, accuracy, correct/incorrect answers, response time, attempts, difficulty and completion.
- Results are training-performance data only; they are not a dementia diagnosis.

## Game 1 — Familiar Object Memory 🧠

**Purpose:** short-term visual memory.

**GUI:**
1. Momo says: “Look carefully and remember these objects.”
2. Large familiar-object cards appear in the centre of the screen.
3. Easy: 3 objects for 10 seconds.
4. Medium: 5 objects for 8 seconds.
5. Hard: 6 objects for 6 seconds.
6. The objects disappear.
7. Four large answer cards appear.
8. The user taps the object that was shown.

**Adaptive variables:** number of objects and viewing time.

**Video sequence:** Momo intro → object cards → countdown/wait → recall choices → correct/encouraging feedback.

## Game 2 — Find the Object 🔍

**Purpose:** attention and concentration.

**GUI:**
1. Momo names the target object.
2. Large object choices fill the screen.
3. Easy: 4 choices.
4. Medium: 6 choices.
5. Hard: 8 choices.
6. The user taps the matching object.

**Adaptive variables:** number of choices, distractors and visual similarity can be expanded later.

**Video sequence:** target instruction → object grid → user scans → tap → feedback.

## Game 3 — Sequence Recall 🔢

**Purpose:** daily-routine recall and ordering.

**GUI:**
1. Momo introduces a familiar routine.
2. Example: Wake up → Brush teeth → Breakfast → Medicine.
3. Easy: 4 steps; Medium: 5; Hard: 6.
4. The sequence is shown clearly.
5. The steps are then scrambled.
6. The user taps each step in the correct order.
7. A “Your order” row shows the selected sequence.

**Adaptive variable:** sequence length and routine complexity.

**Video sequence:** routine display → scramble → user builds order → completion feedback.

## Game 4 — Pattern Completion 🧩

**Purpose:** pattern and object recognition.

**GUI:**
1. A large sequence appears, for example:
   `🍎 → 🥭 → 🍎 → 🥭 → ?`
2. The user chooses what comes next.
3. Higher difficulty introduces longer patterns and three-symbol patterns.

**Adaptive variables:** sequence length and pattern complexity.

**Video sequence:** pattern appears → Momo asks “What comes next?” → three large choices → feedback.

## Game 5 — Local Object Memory 🌏

**Purpose:** memory training using familiar NER-style everyday content.

**GUI:**
1. Momo presents familiar objects such as tea, bamboo, bamboo basket, rice, coconut, shawl, earthen lamp and betel leaf.
2. Easy: 3 objects for 10 seconds.
3. Medium: 5 objects for 8 seconds.
4. Hard: 6 objects for 6 seconds.
5. Objects disappear and the user recalls one from large answer cards.

**NER principle:** keep the game mechanic simple while changing the content to familiar local foods, household objects, daily-life scenes and culturally relevant visuals.

## Adaptive AI loop

`GAME → PERFORMANCE → AI → DIFFICULTY → NEXT GAME`

Example:

- Strong performance → increase challenge next time.
- Moderate performance → keep the current level.
- Weak performance → reduce challenge or provide more viewing time.

The engine maintains separate difficulty profiles for memory, attention, routine recall, pattern recognition and local-memory training.

## Final results GUI

Show:

- Overall score
- Overall accuracy
- Five games completed
- Average response time
- Per-game score
- Per-game accuracy
- Attempts
- Difficulty used
- Training trend

Any trend alert must be phrased as a **performance change to review**, never as a dementia diagnosis.

## Real-world deployment modes

The restored build also includes optional care extensions requested during the project discussion:

- **Clinic / Hospital mode:** shared-tablet guided sessions for a caregiver or health worker. This supports a supervised four-week program concept without claiming that the software itself hospitalizes a patient.
- **Community play:** group-friendly sessions with participant codes and privacy-aware presentation.
- **Storytelling:** supervised local/family story recording and playback in the browser session.
- **Music memory:** caregiver-provided regional/family audio can be played locally without bundling copyrighted music.
- **Optional health context:** prototype-only manual steps/pulse entry for demonstration; it is not a medical interpretation.

## Important safety boundary

The platform is a cognitive training and assistance system. It must not claim to diagnose dementia, assign a dementia stage, or make clinical conclusions from game scores. Caregiver/health-worker views should describe observable training performance and changes over time.
