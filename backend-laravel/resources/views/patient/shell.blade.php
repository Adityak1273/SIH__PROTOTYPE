<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#f7efe5" />
    <title>Cognitive Care NER — Daily Companion</title>
    <link rel="stylesheet" href="/styles.css?v=0.20.0" />
    <link rel="stylesheet" href="/avatar.css?v=0.20.0" />
    <style>
        :root {
            --bg-color: #f7efe5;
            --card-bg: #ffffff;
            --text-dark: #1b2e23;
            --primary-green: #235c3b;
            --accent-gold: #c28821;
        }
        body {
            background-color: var(--bg-color);
            color: var(--text-dark);
            font-family: system-ui, -apple-system, sans-serif;
            margin: 0;
            padding: 12px;
        }
        .patient-shell {
            max-width: 650px;
            margin: 0 auto 60px;
        }
        .eyebrow {
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-size: 0.8rem;
            color: var(--accent-gold);
            font-weight: bold;
            margin-bottom: 4px;
        }
        h1, h2 {
            font-family: Georgia, serif;
            color: var(--text-dark);
            margin-top: 0;
        }
        .companion-box {
            background: var(--card-bg);
            border: 2px solid #e0d5c3;
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.06);
            margin-bottom: 20px;
            text-align: center;
        }
        .speech-bubble {
            background: #fbf8f2;
            border: 1px solid #dcd1be;
            border-radius: 14px;
            padding: 16px;
            font-size: 1.25rem;
            line-height: 1.5;
            margin: 16px 0;
            font-weight: 500;
        }
        .action-button {
            display: block;
            width: 100%;
            min-height: 64px;
            font-size: 1.25rem;
            font-weight: 800;
            border-radius: 16px;
            border: none;
            cursor: pointer;
            margin: 12px 0;
            transition: transform 0.1s ease;
        }
        .action-button:active {
            transform: scale(0.98);
        }
        .action-button.primary {
            background: var(--primary-green);
            color: #ffffff;
        }
        .action-button.secondary {
            background: #eae2d3;
            color: var(--text-dark);
        }
        .routine-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 16px;
        }
        .routine-card {
            background: var(--card-bg);
            padding: 14px;
            border-radius: 12px;
            border: 1px solid #e0d5c3;
        }
        .safety-disclaimer {
            font-size: 0.85rem;
            color: #6a7870;
            text-align: center;
            margin-top: 24px;
            line-height: 1.4;
        }
    </style>
</head>
<body>
<main class="patient-shell">
    <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div>
            <div class="eyebrow">COGNITIVE CARE NER · NORTH EAST INDIA</div>
            <h1>Meet {{ $profile->momo_name ?? 'Momo' }}</h1>
        </div>
        <div>
            <button id="soundToggle" style="font-size:1.8rem; background:none; border:none; cursor:pointer;" title="Voice Audio">🔊</button>
        </div>
    </header>

    <section class="companion-box">
        <!-- Exact Momo CSS Character Rig -->
        <div id="momoRig" class="momo-rig" data-mood="happy" data-gesture="none" role="img" aria-label="Animated puppy companion Momo">
            <div class="momo-shadow"></div>
            <div class="momo-tail"></div>
            <div class="momo-torso"><span class="momo-belly"></span><span class="momo-badge">♥</span></div>
            <div class="momo-head">
                <div class="momo-ear left"></div>
                <div class="momo-ear right"></div>
                <div class="momo-eye left"><span class="momo-pupil"></span></div>
                <div class="momo-eye right"><span class="momo-pupil"></span></div>
                <div class="momo-nose"></div>
                <div class="momo-mouth"><span class="momo-tongue"></span></div>
            </div>
        </div>

        <div class="speech-bubble" id="speechText">
            Hello {{ $profile->full_name ?? 'there' }}! I'm {{ $profile->momo_name ?? 'Momo' }}. Shall we do today's little brain workout together? 🐾
        </div>

        <button class="action-button primary" id="startSessionBtn" type="button">
            🎮 Start Today's Cognitive Training
        </button>
        <button class="action-button secondary" id="talkMomoBtn" type="button">
            🎙️ Talk to {{ $profile->momo_name ?? 'Momo' }}
        </button>
    </section>

    <section>
        <div class="eyebrow">DAILY ROUTINE</div>
        <h2>Your reminders for today</h2>
        <div class="routine-grid">
            @forelse($reminders as $reminder)
                <div class="routine-card">
                    <span style="font-size:1.5rem;">⏰</span>
                    <strong style="display:block; margin:4px 0;">{{ $reminder->title }}</strong>
                    <small style="color:#555;">{{ substr($reminder->reminder_time, 0, 5) }}</small>
                </div>
            @empty
                <div class="routine-card" style="grid-column: span 2;">
                    <strong>No pending reminders today.</strong>
                    <p style="margin:4px 0 0; color:#555;">You are all caught up!</p>
                </div>
            @endforelse
        </div>
    </section>

    <!-- Continuous 5-Game Container (Runs Offline & Syncs to Laravel) -->
    <div id="gameContainer" style="display:none;"></div>

    <p class="safety-disclaimer">
        Safety Notice: Training scores describe game performance only. They do not establish a diagnosis of dementia or assign a clinical stage.
    </p>
</main>

<script src="/laravel-sync-bridge.js"></script>
</body>
</html>
