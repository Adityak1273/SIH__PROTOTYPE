# Restoration Audit — Cognitive Care NER

## What was found in the project references

The agreed MVP called for five specific games:

1. Familiar Object Memory
2. Find the Object
3. Sequence Recall
4. Pattern Completion
5. Local Object Memory

The references also defined the core adaptive mechanism as:

`Game → Performance → AI → Difficulty → Next Game`

and required memory, attention/concentration, daily routine recall, pattern/object recognition, multilingual/voice interaction, NER-familiar content, reminders, caregiver monitoring, offline support, secure data controls and elderly-friendly UI.

## What was weak or missing in the previous implementation

The existing `app.js` had five named games, but each was only a very small one-question/one-action implementation:

- Familiar Object Memory showed several objects but asked for only one recalled item.
- Find the Object used a basic choice grid without a real difficulty progression.
- Sequence Recall required tapping tiles in order rather than the agreed scrambled daily-routine reconstruction format.
- Pattern Completion used a very small two-symbol pattern and needed a clearer, robust choice presentation.
- Local Object Memory was largely a duplicate of generic memory with only a different emoji list.

The previous implementation also did not provide a dedicated guided-training presentation for each game.

## Restored implementation

`phase8.js` adds a complete five-game training engine without deleting the existing application modules.

### Session

- Exactly five games in one continuous session.
- Personalized ordering based on the weakest adaptive area.
- Three short rounds per game.
- Easy / Medium / Hard.
- Large, elderly-friendly controls.
- Momo voice instruction before each game.
- Guided training card explaining what the game trains and how to play.
- Final five-game results and trend feedback.

### Adaptive difficulty

Separate adaptive profiles are stored for:

- Memory
- Attention
- Routine recall
- Pattern recognition
- Local-memory training

Strong performance moves a game toward a harder level; weak performance moves it toward an easier level.

### Game mechanics

**Familiar Object Memory**
- Easy: 3 objects / 10 seconds
- Medium: 5 objects / 8 seconds
- Hard: 6 objects / 6 seconds
- Recall from large answer cards

**Find the Object**
- Easy: 4 choices
- Medium: 6 choices
- Hard: 8 choices
- Target is named and user finds it

**Sequence Recall**
- Daily-life sequence
- Easy: 4 steps
- Medium: 5 steps
- Hard: 6 steps
- Sequence is shown, scrambled, then reconstructed by tapping

**Pattern Completion**
- Simple repeating patterns at lower levels
- Longer/multi-symbol pattern at higher level
- Large answer choices

**Local Object Memory**
- Uses familiar everyday/local-life content such as tea, bamboo, bamboo basket, rice, coconut, shawl, earthen lamp and betel leaf
- Same memory mechanism with NER-oriented content

## Earlier requested extensions restored as care/engagement subfeatures

These are implemented as supporting features rather than extra top-level architecture modules:

- Clinic / Hospital guided shared-tablet mode
- Community play mode
- Storytelling recording/playback in the browser session
- Music memory using caregiver-provided regional/family audio
- Optional manual health-context log for steps and pulse
- Training-performance trend alert across recent sessions

The hospital mode represents a supervised deployment workflow; it does not claim that the software itself admits or hospitalizes patients.

## Existing modules retained

The restoration leaves the existing Phase 1–7 architecture in place:

- Reminders and daily tasks
- Weekly/monthly performance reporting
- Caregiver/health-worker dashboard
- Cloud account/sync layer
- AI personalization
- Safety/consent/audit controls
- Multilingual layer
- Offline queue and local persistence
- Privacy/export/delete-local-data controls

## Safety boundary

Game scores and trends are explicitly training-performance information. The platform must not diagnose dementia or assign a clinical stage from game results.

## Demo/video reference

`GAME_TRAINING_AND_VIDEO_GUIDE.md` contains the exact five-game GUI flow, narration flow, difficulty levels, adaptive loop and suggested demo/video sequence for the training demonstration.
