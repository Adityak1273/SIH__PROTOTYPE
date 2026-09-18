<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Caregiver Dashboard — Cognitive Care NER</title>
    <style>
        :root {
            --slate-50: #f8fafc;
            --slate-100: #f1f5f9;
            --slate-200: #e2e8f0;
            --slate-300: #cbd5e1;
            --slate-400: #94a3b8;
            --slate-600: #475569;
            --slate-700: #334155;
            --slate-800: #1e293b;
            --slate-900: #0f172a;
            --emerald-600: #059669;
            --emerald-700: #047857;
            --emerald-50: #ecfdf5;
            --emerald-100: #d1fae5;
            --amber-500: #f59e0b;
            --amber-50: #fffbeb;
            --amber-700: #b45309;
            --rose-600: #e11d48;
            --rose-50: #fff1f2;
            --rose-700: #be123c;
            --sky-600: #0284c7;
            --sky-50: #f0f9ff;
            --sky-700: #0369a1;
        }
        * {
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #f4f6f9;
            color: var(--slate-800);
            margin: 0;
            padding: 0;
            line-height: 1.5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 24px 20px 80px;
        }
        /* Top Navigation Header */
        .top-nav {
            background: white;
            border-bottom: 1px solid var(--slate-200);
            padding: 14px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 50;
        }
        .nav-brand {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            font-size: 1.15rem;
            color: var(--slate-900);
        }
        .badge-role {
            background: var(--emerald-100);
            color: var(--emerald-700);
            font-size: 0.75rem;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 9999px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .nav-user {
            font-size: 0.9rem;
            color: var(--slate-600);
        }

        /* Disclaimer Banner */
        .disclaimer-banner {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 24px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            font-size: 0.85rem;
            color: #166534;
        }
        .disclaimer-banner svg {
            flex-shrink: 0;
            margin-top: 2px;
        }

        /* Section 1: Patient Selector */
        .selector-card {
            background: white;
            border-radius: 12px;
            padding: 16px 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            margin-bottom: 24px;
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
        }
        .selector-group {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }
        .patient-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            border-radius: 9999px;
            background: var(--slate-100);
            color: var(--slate-700);
            text-decoration: none;
            font-weight: 500;
            font-size: 0.9rem;
            border: 1px solid var(--slate-200);
            transition: all 0.15s ease-in-out;
        }
        .patient-pill:hover {
            background: var(--slate-200);
        }
        .patient-pill.active {
            background: #235c3b;
            color: white;
            border-color: #235c3b;
        }
        .patient-meta-bar {
            display: flex;
            gap: 16px;
            font-size: 0.85rem;
            color: var(--slate-600);
            flex-wrap: wrap;
        }
        .patient-meta-item strong {
            color: var(--slate-800);
        }

        /* Layout Grids */
        .grid-2 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
        }
        .grid-3 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
        }
        .grid-5 {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        /* Cards */
        .card {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            border: 1px solid var(--slate-200);
        }
        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--slate-100);
            padding-bottom: 10px;
        }
        .card-title {
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--slate-800);
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .card-subtitle {
            font-size: 0.8rem;
            color: var(--slate-400);
            font-weight: normal;
        }

        /* Section 10: Follow-up Signals */
        .signal-banner {
            border-radius: 10px;
            padding: 16px 18px;
            margin-bottom: 12px;
            display: flex;
            gap: 14px;
            align-items: flex-start;
        }
        .signal-banner.urgent {
            background: var(--rose-50);
            border-left: 5px solid var(--rose-600);
            color: var(--rose-700);
        }
        .signal-banner.attention {
            background: var(--amber-50);
            border-left: 5px solid var(--amber-500);
            color: var(--amber-700);
        }
        .signal-banner.info {
            background: var(--sky-50);
            border-left: 5px solid var(--sky-600);
            color: var(--sky-700);
        }
        .signal-banner.positive {
            background: var(--emerald-50);
            border-left: 5px solid var(--emerald-600);
            color: var(--emerald-700);
        }
        .signal-title {
            font-weight: 700;
            font-size: 0.95rem;
            margin-bottom: 4px;
        }
        .signal-desc {
            font-size: 0.88rem;
            line-height: 1.45;
            color: var(--slate-700);
            margin-bottom: 6px;
        }
        .signal-action {
            font-size: 0.85rem;
            font-weight: 600;
            padding: 6px 10px;
            background: rgba(255,255,255,0.7);
            border-radius: 6px;
            display: inline-block;
        }

        /* Section 2: Today's Activity Stats */
        .stat-highlight {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 14px;
            background: var(--slate-50);
            border-radius: 8px;
            border: 1px solid var(--slate-200);
            text-align: center;
        }
        .stat-num {
            font-size: 1.8rem;
            font-weight: 800;
            color: #235c3b;
        }
        .stat-label {
            font-size: 0.8rem;
            color: var(--slate-600);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .task-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            border-bottom: 1px solid var(--slate-100);
            font-size: 0.9rem;
        }
        .task-row:last-child {
            border-bottom: none;
        }
        .task-badge-done {
            background: var(--emerald-100);
            color: var(--emerald-700);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .task-badge-pending {
            background: var(--slate-100);
            color: var(--slate-600);
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.75rem;
        }

        /* Section 3: Recent Sessions Table */
        .table-responsive {
            overflow-x: auto;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.9rem;
        }
        th {
            text-align: left;
            padding: 10px 12px;
            background: var(--slate-50);
            color: var(--slate-600);
            font-weight: 600;
            border-bottom: 1px solid var(--slate-200);
        }
        td {
            padding: 12px;
            border-bottom: 1px solid var(--slate-100);
            color: var(--slate-800);
        }
        tr:hover td {
            background: var(--slate-50);
        }

        /* Section 4: 7-day visual graph */
        .chart-container {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 12px;
            height: 140px;
            padding: 10px 0 0;
            border-bottom: 2px solid var(--slate-200);
        }
        .chart-bar-group {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            height: 100%;
            justify-content: flex-end;
        }
        .chart-bar {
            width: 70%;
            border-radius: 6px 6px 0 0;
            transition: height 0.3s ease;
            position: relative;
        }
        .chart-bar.completed {
            background: #235c3b;
        }
        .chart-bar.missed {
            background: var(--slate-200);
            min-height: 8px;
        }
        .chart-label {
            font-size: 0.75rem;
            margin-top: 6px;
            font-weight: 600;
            color: var(--slate-600);
        }
        .chart-val {
            font-size: 0.7rem;
            color: white;
            position: absolute;
            top: 4px;
            width: 100%;
            text-align: center;
            font-weight: bold;
        }

        /* Section 5: Game Breakdown Mini-cards */
        .game-card {
            background: var(--slate-50);
            border: 1px solid var(--slate-200);
            border-radius: 8px;
            padding: 14px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }
        .game-title {
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--slate-800);
            margin-bottom: 6px;
        }
        .game-accuracy {
            font-size: 1.4rem;
            font-weight: 800;
            color: #235c3b;
        }
        .game-meta {
            font-size: 0.75rem;
            color: var(--slate-600);
            margin-top: 4px;
        }

        /* Section 6 & 7: Trends & Progression */
        .trend-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.8rem;
        }
        .step-progression {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 10px;
            overflow-x: auto;
            padding-bottom: 6px;
        }
        .step-bubble {
            background: var(--slate-100);
            border: 1px solid var(--slate-300);
            border-radius: 8px;
            padding: 8px 12px;
            min-width: 90px;
            text-align: center;
        }
        .step-bubble.current {
            background: #ecfdf5;
            border-color: #059669;
            color: #047857;
            font-weight: bold;
        }

        /* Section 8 & 9: Reminders & Missed Activity */
        .reminder-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            border-radius: 6px;
            background: var(--slate-50);
            margin-bottom: 8px;
            border: 1px solid var(--slate-200);
        }
        .alert-row {
            border-left: 4px solid var(--rose-600);
            padding: 10px 12px;
            background: var(--rose-50);
            border-radius: 0 6px 6px 0;
            margin-bottom: 8px;
            font-size: 0.88rem;
        }

        /* Section 11: Caregiver Notes */
        .note-item {
            background: var(--slate-50);
            border: 1px solid var(--slate-200);
            border-radius: 8px;
            padding: 14px;
            margin-bottom: 12px;
        }
        .note-header {
            display: flex;
            justify-content: space-between;
            font-size: 0.8rem;
            color: var(--slate-600);
            margin-bottom: 6px;
        }
        .note-cat {
            background: var(--slate-200);
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
            color: var(--slate-700);
            text-transform: capitalize;
        }
        .note-form textarea {
            width: 100%;
            border: 1px solid var(--slate-300);
            border-radius: 6px;
            padding: 10px;
            font-family: inherit;
            font-size: 0.9rem;
            resize: vertical;
            margin-bottom: 10px;
        }
        .form-select, .form-input {
            padding: 8px 12px;
            border: 1px solid var(--slate-300);
            border-radius: 6px;
            font-size: 0.9rem;
            background: white;
        }

        /* Section 12: Export Report Bar */
        .export-bar {
            background: linear-gradient(135deg, #1e293b, #0f172a);
            color: white;
            border-radius: 12px;
            padding: 20px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            margin-top: 30px;
        }
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 9px 18px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 0.9rem;
            text-decoration: none;
            cursor: pointer;
            border: none;
            transition: background 0.15s ease;
        }
        .btn-primary {
            background: #22c55e;
            color: #0f172a;
        }
        .btn-primary:hover {
            background: #16a34a;
        }
        .btn-secondary {
            background: rgba(255,255,255,0.15);
            color: white;
            border: 1px solid rgba(255,255,255,0.25);
        }
        .btn-secondary:hover {
            background: rgba(255,255,255,0.25);
        }
        .btn-submit {
            background: #235c3b;
            color: white;
        }
        .btn-submit:hover {
            background: #1a452c;
        }
        .flash-success {
            background: #ecfdf5;
            border: 1px solid #10b981;
            color: #065f46;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>

<!-- Top Navigation -->
<header class="top-nav">
    <div class="nav-brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#235c3b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
            <path d="M12 6a6 6 0 0 0-6 6c0 2 2 3 2 4h8c0-1 2-2 2-4a6 6 0 0 0-6-6z"/>
        </svg>
        <span>Cognitive Care NER</span>
        <span class="badge-role">Caregiver Portal</span>
    </div>
    <div class="nav-user">
        Signed in as <strong>{{ $caregiver->name }}</strong>
    </div>
</header>

<div class="container">

    <!-- Flash message -->
    @if(session('success'))
        <div class="flash-success">
            {{ session('success') }}
        </div>
    @endif

    <!-- Clinical Non-Diagnostic Disclaimer Banner -->
    <div class="disclaimer-banner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div>
            <strong>Notice for Family & Caregivers:</strong>
            {{ $overview['clinical_disclaimer'] ?? 'This dashboard tracks daily cognitive activity routines and engagement habits. It does not provide a dementia diagnosis or medical evaluation.' }}
        </div>
    </div>

    <!-- SECTION 1: Patient Selector -->
    <div class="selector-card">
        <div>
            <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--slate-400); font-weight: 700; display: block; margin-bottom: 6px;">
                1. Linked Patient Selector
            </span>
            <div class="selector-group">
                @forelse($patients as $p)
                    <a href="{{ route('caregiver.dashboard', ['patient_id' => $p->id]) }}"
                       class="patient-pill {{ $selectedPatient && $selectedPatient->id === $p->id ? 'active' : '' }}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        {{ $p->profile?->full_name ?? $p->name }}
                    </a>
                @empty
                    <span style="color: var(--slate-600); font-size: 0.9rem;">No active patient links found. Link a patient account to view cognitive records.</span>
                @endforelse
            </div>
        </div>

        @if($overview)
            <div class="patient-meta-bar">
                <div class="patient-meta-item">Companion: <strong>{{ $overview['patient']['momo_name'] }}</strong></div>
                <div class="patient-meta-item">Region: <strong>{{ $overview['patient']['region'] }}</strong></div>
                <div class="patient-meta-item">Language: <strong>{{ $overview['patient']['language'] }}</strong></div>
                <div class="patient-meta-item">Emergency: <strong>{{ $overview['patient']['emergency_contact'] }}</strong></div>
            </div>
        @endif
    </div>

    @if($overview && $selectedPatient)

        <!-- SECTION 10: Deterministic Follow-up Signals -->
        <div class="card" style="margin-bottom: 24px; border-left: 5px solid #235c3b;">
            <div class="card-header">
                <h2 class="card-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#235c3b" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    10. Follow-up Signals & Gentle Recommendations
                </h2>
                <span class="card-subtitle">Deterministic rule-based observations</span>
            </div>

            @forelse($overview['follow_up_signals'] as $signal)
                <div class="signal-banner {{ $signal['severity'] }}">
                    <div style="flex-shrink: 0; margin-top: 2px;">
                        @if($signal['severity'] === 'urgent')
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        @elseif($signal['severity'] === 'positive')
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        @else
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        @endif
                    </div>
                    <div style="flex-grow: 1;">
                        <div class="signal-title">{{ $signal['title'] }}</div>
                        <div class="signal-desc">{{ $signal['message'] }}</div>
                        <div class="signal-action">
                            💡 Recommended: {{ $signal['recommended_action'] }}
                        </div>
                    </div>
                </div>
            @empty
                <p style="color: var(--slate-600); margin: 0; font-size: 0.95rem;">
                    Everything looks steady. No alerts or disruptions detected in recent routine engagement.
                </p>
            @endforelse
        </div>

        <!-- ROW: Section 2 (Today's Activity) & Section 4 (7-Day/30-Day Activity) -->
        <div class="grid-2">
            <!-- SECTION 2: Today's Activity -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">2. Today's Activity</h3>
                    <span class="card-subtitle">{{ now()->format('D, M j, Y') }}</span>
                </div>

                <div class="grid-2" style="margin-bottom: 16px;">
                    <div class="stat-highlight">
                        <span class="stat-label">Cognitive Workout</span>
                        <div class="stat-num" style="color: {{ $overview['today_activity']['workout_completed'] ? '#059669' : '#d97706' }};">
                            {{ $overview['today_activity']['workout_completed'] ? 'Completed' : 'Pending' }}
                        </div>
                        <small style="color: var(--slate-600); margin-top: 4px;">
                            @if($overview['today_activity']['workout_completed'])
                                Score: {{ $overview['today_activity']['latest_today_score'] ?? 'Recorded' }}%
                            @else
                                Planned for today
                            @endif
                        </small>
                    </div>

                    <div class="stat-highlight">
                        <span class="stat-label">Daily Routine Tasks</span>
                        <div class="stat-num">
                            {{ $overview['today_activity']['tasks_completed'] }} / {{ max(1, $overview['today_activity']['tasks_total']) }}
                        </div>
                        <small style="color: var(--slate-600); margin-top: 4px;">Tasks acknowledged</small>
                    </div>
                </div>

                <div style="border-top: 1px solid var(--slate-100); padding-top: 12px;">
                    <strong style="font-size: 0.85rem; color: var(--slate-600); text-transform: uppercase;">Scheduled Daily Steps</strong>
                    <div style="margin-top: 8px;">
                        @forelse($overview['today_activity']['tasks'] as $task)
                            <div class="task-row">
                                <div>
                                    <strong>{{ $task->title }}</strong>
                                    <span style="color: var(--slate-400); font-size: 0.8rem; margin-left: 6px;">({{ ucfirst($task->time_slot ?? 'anytime') }})</span>
                                </div>
                                <span class="{{ $task->completed ? 'task-badge-done' : 'task-badge-pending' }}">
                                    {{ $task->completed ? 'Done' : 'Scheduled' }}
                                </span>
                            </div>
                        @empty
                            <div style="color: var(--slate-400); font-size: 0.85rem; padding: 6px 0;">
                                Default daily routine active with Momo companion.
                            </div>
                        @endforelse
                    </div>
                </div>
            </div>

            <!-- SECTION 4: 7-Day & 30-Day Activity -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">4. 7-Day & 30-Day Activity</h3>
                    <span class="card-subtitle">{{ $overview['adherence']['week_active_days'] }} active days this week</span>
                </div>

                <div style="margin-bottom: 12px;">
                    <div class="chart-container">
                        @foreach($overview['adherence']['weekly_bars'] as $bar)
                            <div class="chart-bar-group">
                                <div class="chart-bar {{ $bar['completed'] ? 'completed' : 'missed' }}"
                                     style="height: {{ $bar['completed'] ? max(20, $bar['score']) : 8 }}%;">
                                    @if($bar['completed'])
                                        <span class="chart-val">{{ $bar['score'] }}</span>
                                    @endif
                                </div>
                                <span class="chart-label">{{ $bar['day'] }}</span>
                            </div>
                        @endforeach
                    </div>
                </div>

                <div class="grid-2" style="margin-bottom: 0; margin-top: 16px;">
                    <div class="stat-highlight">
                        <span class="stat-label">30-Day Adherence</span>
                        <div class="stat-num" style="color: #0284c7;">
                            {{ $overview['adherence']['thirty_day_percent'] }}%
                        </div>
                        <small style="color: var(--slate-600);">{{ $overview['adherence']['thirty_day_active_days'] }} of 30 days active</small>
                    </div>

                    <div class="stat-highlight">
                        <span class="stat-label">Weekly Average</span>
                        <div class="stat-num">
                            {{ $overview['adherence']['weekly_average_score'] }}%
                        </div>
                        <small style="color: var(--slate-600);">Average exercise score</small>
                    </div>
                </div>
            </div>
        </div>

        <!-- SECTION 5: Game-by-Game Performance -->
        <div class="card" style="margin-bottom: 24px;">
            <div class="card-header">
                <h3 class="card-title">5. Game-by-Game Performance Breakdown</h3>
                <span class="card-subtitle">Detailed accuracy across the 5 core cognitive modules</span>
            </div>

            <div class="grid-5">
                @foreach($overview['game_performance'] as $key => $game)
                    <div class="game-card">
                        <div>
                            <div class="game-title">{{ $game['title'] }}</div>
                            <div class="game-accuracy">{{ $game['accuracy'] }}%</div>
                            <div class="game-meta">Accuracy rate</div>
                        </div>
                        <div style="margin-top: 12px; border-top: 1px solid var(--slate-200); padding-top: 8px; font-size: 0.75rem; color: var(--slate-600);">
                            <div>Trials: <strong>{{ $game['total_trials'] }}</strong></div>
                            <div>Latency: <strong>{{ $game['avg_latency'] }}s</strong></div>
                            <div>Difficulty: <strong style="color: #235c3b;">Lvl {{ $game['current_difficulty'] }}</strong></div>
                        </div>
                    </div>
                @endforeach
            </div>
        </div>

        <!-- ROW: Section 6 (Response-Time Trends) & Section 7 (Difficulty Progression) -->
        <div class="grid-2">
            <!-- SECTION 6: Response-Time Trends -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">6. Response-Time Trends</h3>
                    <span class="card-subtitle">Average seconds per question</span>
                </div>

                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Average Time</th>
                                <th>Pacing Evaluation</th>
                            </tr>
                        </thead>
                        <tbody>
                            @forelse($overview['response_time_trends'] as $trend)
                                <tr>
                                    <td>{{ $trend['date'] ?: 'Recent' }}</td>
                                    <td><strong>{{ $trend['seconds'] }}s</strong></td>
                                    <td>
                                        @if($trend['seconds'] <= 3.5)
                                            <span class="trend-badge" style="background: #d1fae5; color: #065f46;">Fluid / Quick</span>
                                        @elseif($trend['seconds'] <= 6.0)
                                            <span class="trend-badge" style="background: #f1f5f9; color: #334155;">Steady & Deliberate</span>
                                        @else
                                            <span class="trend-badge" style="background: #fef3c7; color: #92400e;">Took extra time</span>
                                        @endif
                                    </td>
                                </tr>
                            @empty
                                <tr>
                                    <td colspan="3" style="color: var(--slate-400); text-align: center;">No latency data recorded yet.</td>
                                </tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
                <small style="color: var(--slate-400); display: block; margin-top: 10px;">
                    * Deliberate pacing is normal and encouraged. Rushing is not required.
                </small>
            </div>

            <!-- SECTION 7: Difficulty Progression -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">7. Difficulty Progression</h3>
                    <span class="card-subtitle">Automatic adaptive adjustment</span>
                </div>

                <p style="font-size: 0.88rem; color: var(--slate-600); margin-bottom: 12px;">
                    The system smoothly scales difficulty (Levels 1–5) based on 3-session accuracy trends to avoid frustration while keeping exercises engaging.
                </p>

                <div class="step-progression">
                    @forelse($overview['difficulty_progression'] as $prog)
                        <div class="step-bubble {{ $loop->last ? 'current' : '' }}">
                            <div style="font-size: 0.75rem; color: var(--slate-400);">{{ $prog['date'] ?: 'Sess '.$loop->iteration }}</div>
                            <div style="font-size: 1.1rem; font-weight: 700;">Lvl {{ $prog['level'] }}</div>
                        </div>
                    @empty
                        <div class="step-bubble current">
                            <div style="font-size: 0.75rem; color: var(--slate-400);">Standard</div>
                            <div style="font-size: 1.1rem; font-weight: 700;">Level 2</div>
                        </div>
                    @endforelse
                </div>
            </div>
        </div>

        <!-- SECTION 3: Recent Sessions -->
        <div class="card" style="margin-bottom: 24px;">
            <div class="card-header">
                <h3 class="card-title">3. Recent Cognitive Sessions</h3>
                <span class="card-subtitle">Last 5 completed sessions</span>
            </div>

            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Completed At</th>
                            <th>Overall Score</th>
                            <th>Accuracy</th>
                            <th>Avg Latency</th>
                            <th>Exercises Completed</th>
                            <th>Session Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($overview['recent_sessions'] as $session)
                            <tr>
                                <td>{{ $session['date'] }}</td>
                                <td><strong>{{ $session['overall_score'] }}%</strong></td>
                                <td>{{ $session['accuracy'] }}%</td>
                                <td>{{ $session['response_time'] }}</td>
                                <td>{{ $session['games_completed'] }} / 5 modules</td>
                                <td>
                                    <span class="task-badge-done">Completed</span>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="6" style="text-align: center; color: var(--slate-400); padding: 20px;">
                                    No completed sessions found for this patient yet.
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>

        <!-- ROW: Section 8 (Reminder Status) & Section 9 (Missed Activity) -->
        <div class="grid-2">
            <!-- SECTION 8: Reminder Status -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">8. Scheduled Reminders</h3>
                    <span class="card-subtitle">Momo voice & visual reminders</span>
                </div>

                <div>
                    @forelse($overview['reminders'] as $reminder)
                        <div class="reminder-row">
                            <div>
                                <strong>{{ $reminder->title }}</strong>
                                <div style="font-size: 0.75rem; color: var(--slate-600);">
                                    {{ $reminder->frequency }} at {{ \Carbon\Carbon::parse($reminder->reminder_time)->format('g:i A') }} • Category: {{ ucfirst($reminder->category) }}
                                </div>
                            </div>
                            <span class="{{ $reminder->is_active ? 'task-badge-done' : 'task-badge-pending' }}">
                                {{ $reminder->is_active ? 'Active' : 'Paused' }}
                            </span>
                        </div>
                    @empty
                        <p style="color: var(--slate-400); font-size: 0.9rem;">No active reminders registered for this patient.</p>
                    @endforelse
                </div>
            </div>

            <!-- SECTION 9: Missed Activity -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">9. Missed Activity & Unacknowledged Alerts</h3>
                    <span class="card-subtitle">Items needing caregiver check-in</span>
                </div>

                <div>
                    @if($overview['missed_activity']['missed_alerts']->isEmpty() && $overview['missed_activity']['incomplete_tasks']->isEmpty())
                        <div style="padding: 16px; background: #ecfdf5; border-radius: 8px; color: #065f46; font-size: 0.9rem;">
                            ✓ No overdue medication or missed workout alerts in the last 48 hours.
                        </div>
                    @else
                        @foreach($overview['missed_activity']['missed_alerts'] as $alert)
                            <div class="alert-row">
                                <strong>⚠️ {{ $alert->title }}</strong>
                                <div style="color: var(--slate-700); margin-top: 2px;">{{ $alert->message }}</div>
                                <small style="color: var(--slate-400);">{{ $alert->created_at->diffForHumans() }}</small>
                            </div>
                        @endforeach

                        @foreach($overview['missed_activity']['incomplete_tasks'] as $task)
                            <div class="alert-row" style="border-left-color: var(--amber-500); background: var(--amber-50);">
                                <strong>Missed Daily Step: {{ $task->title }}</strong>
                                <div style="color: var(--slate-700); margin-top: 2px;">Scheduled for {{ $task->task_date }}.</div>
                            </div>
                        @endforeach
                    @endif
                </div>
            </div>
        </div>

        <!-- SECTION 11: Caregiver Notes -->
        <div class="card" style="margin-bottom: 24px;">
            <div class="card-header">
                <h3 class="card-title">11. Caregiver Observations & Notes</h3>
                <span class="card-subtitle">Private log for family and health visits</span>
            </div>

            <!-- Note Submission Form -->
            <form action="{{ route('caregiver.patients.notes.store', $selectedPatient->id) }}" method="POST" class="note-form" style="margin-bottom: 24px;">
                @csrf
                <div style="display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap;">
                    <div style="flex: 1; min-width: 180px;">
                        <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--slate-600); margin-bottom: 4px;">Category</label>
                        <select name="category" class="form-select" style="width: 100%;">
                            <option value="routine">Routine Observation</option>
                            <option value="mood">Mood & Energy Level</option>
                            <option value="medication">Medication & Hydration</option>
                            <option value="health">Physician / Health Visit</option>
                        </select>
                    </div>
                    <div style="flex: 1; min-width: 180px;">
                        <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--slate-600); margin-bottom: 4px;">Observation Date</label>
                        <input type="date" name="note_date" class="form-input" value="{{ now()->toDateString() }}" style="width: 100%;">
                    </div>
                </div>

                <div>
                    <label style="display: block; font-size: 0.8rem; font-weight: 600; color: var(--slate-600); margin-bottom: 4px;">Observations</label>
                    <textarea name="content" rows="3" placeholder="Write plain observations (e.g. enjoyed morning tea, seemed cheerful, needed a little extra time on pattern matching)..." required></textarea>
                </div>

                <div style="text-align: right;">
                    <button type="submit" class="btn btn-submit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                            <polyline points="7 3 7 8 15 8"></polyline>
                        </svg>
                        Save Caregiver Note
                    </button>
                </div>
            </form>

            <!-- Notes List -->
            <div style="border-top: 1px solid var(--slate-200); padding-top: 16px;">
                <h4 style="margin: 0 0 12px; font-size: 0.95rem; color: var(--slate-700);">Recent Logged Notes</h4>
                @forelse($overview['caregiver_notes'] as $note)
                    <div class="note-item">
                        <div class="note-header">
                            <span class="note-cat">{{ $note->category }}</span>
                            <span>{{ \Carbon\Carbon::parse($note->note_date)->format('F j, Y') }} • by {{ $note->caregiver?->name ?? 'Caregiver' }}</span>
                        </div>
                        <div style="font-size: 0.92rem; color: var(--slate-800);">
                            {{ $note->content }}
                        </div>
                    </div>
                @empty
                    <p style="color: var(--slate-400); font-size: 0.9rem; margin: 0;">No notes added yet. Use the form above to record daily observations.</p>
                @endforelse
            </div>
        </div>

        <!-- SECTION 12: Export Report -->
        <div class="export-bar">
            <div>
                <h3 style="margin: 0 0 4px; font-size: 1.15rem;">12. Progress & Clinical Export Reports</h3>
                <p style="margin: 0; font-size: 0.85rem; color: var(--slate-300);">
                    Download comprehensive records for doctor consultations, family check-ins, or offline archiving.
                </p>
            </div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                <a href="{{ route('caregiver.patients.export', $selectedPatient->id) }}" target="_blank" class="btn btn-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    Print / PDF Summary Report
                </a>
                <a href="{{ route('caregiver.patients.export.csv', $selectedPatient->id) }}" class="btn btn-secondary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download CSV Data
                </a>
            </div>
        </div>

    @else
        <!-- Empty State When No Patient Linked or Selected -->
        <div class="card" style="text-align: center; padding: 48px 24px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--slate-400)" stroke-width="1.5" style="margin-bottom: 12px;">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <h3 style="margin: 0 0 8px;">No Linked Patients Found</h3>
            <p style="color: var(--slate-600); max-width: 480px; margin: 0 auto 20px;">
                Caregivers can only access records for patients who have explicitly accepted a caregiver connection.
            </p>
        </div>
    @endif

</div>

</body>
</html>

