# Cognitive Care NER — UI/UX Direction

## Elderly experience

The elderly application should feel calm, obvious, and forgiving.

### Core rules
- One primary action per screen where possible.
- Large touch targets.
- High readability and strong contrast.
- Avoid dense dashboards and small controls.
- Consistent placement of navigation/actions.
- Clear feedback after every interaction.
- Avoid destructive actions without confirmation.
- Keep technical/network errors out of the primary interaction path.

### Accessibility

Plan for:
- scalable text
- screen-reader semantics
- keyboard navigation where applicable
- sufficient contrast
- reduced motion
- voice interaction
- localization expansion
- touch targets appropriate for reduced dexterity

Accessibility requirements must be encoded into shared UI components so individual screens inherit safe defaults.

## Companion character

The initial companion concept is an animated cat. It should provide warmth and feedback without becoming a distraction. Animation must respect reduced-motion preferences.

## Game UX

A game session should communicate:
1. what to do
2. what input is expected
3. immediate feedback
4. progress without pressure
5. a clear completion state

Avoid unnecessary timers, complex menus, and information-dense instructions.

## Caregiver dashboard

The caregiver experience can be information-dense compared with the elderly app, but should prioritize:
- current status
- recent activity
- trends
- alerts needing action
- reminders

Do not imply clinical significance from ordinary game metrics.

## Design system

Shared components should define accessible defaults for typography, spacing, buttons, cards, dialogs, status messages, focus states, and game controls. Theme and localization should be token-driven rather than hard-coded per screen.
