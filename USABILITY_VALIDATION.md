# Elderly Usability Validation Protocol

## Purpose
Validate that Cognitive Care NER can be used comfortably and safely by older adults on the actual Android phone/tablet intended for deployment.

## Participants
Use representative older adults from the intended NER user population. Obtain informed consent and do not collect unnecessary identifiers or raw voice recordings.

## Tasks
1. Start a daily cognitive session.
2. Complete one round of each game.
3. Ask Momo for a tutorial and follow it.
4. Create a medicine/hydration/activity reminder.
5. Confirm the reminder permission and understand the reminder message.
6. Open progress and identify today's activity.
7. Change language between English, Hindi, Bengali and Assamese where appropriate.
8. Use voice interaction.
9. Exit a game and confirm that the participant understands the confirmation dialog.
10. Return to the app after connectivity is disabled and confirm that local work remains available.

## Measures
- Task completion rate.
- Time to complete each task.
- Number of errors/help requests.
- Number of accidental taps.
- Ability to read the smallest important text without assistance.
- Ability to hear/understand Momo's speech.
- Voice recognition success rate in a quiet and typical home environment.
- Reminder comprehension and successful acknowledgement.
- Participant comfort/confidence rating after the session.

## Acceptance targets
For the MVP pilot, target at least 90% task completion without facilitator intervention, no safety-critical misunderstanding, and no recurring touch-target or readability problems. Investigate every failure rather than averaging it away.

## Built-in instrumentation
`usability-validation.js` provides a test mode that records task completion, task timing and errors and runs a basic DOM accessibility audit. It intentionally does not claim that automated checks are equivalent to human validation.

## Release gate
A production clinical release should not be declared usability-validated until representative older adults have completed the protocol on the real target devices and the findings have been reviewed and documented by the project team.
