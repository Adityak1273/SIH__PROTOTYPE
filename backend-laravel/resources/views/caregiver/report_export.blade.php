<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Cognitive Care NER — Caregiver Summary Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #1e293b;
            margin: 40px;
            font-size: 14px;
            line-height: 1.6;
        }
        .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
        }
        h1 { margin: 0 0 4px 0; color: #1e3a2b; font-size: 24px; }
        h2 { border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-top: 24px; font-size: 18px; color: #1e3a2b; }
        .disclaimer-box {
            background: #f8fafc;
            border-left: 4px solid #0f766e;
            padding: 12px 16px;
            margin: 16px 0;
            font-size: 13px;
            color: #334155;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 12px;
        }
        th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            text-align: left;
        }
        th { background: #f1f5f9; }
        .print-btn {
            background: #1e3a2b;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            margin-bottom: 20px;
        }
        @media print {
            .print-btn { display: none; }
            body { margin: 0; }
        }
    </style>
</head>
<body>
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>

    <div class="header">
        <div>
            <h1>Cognitive Care NER — Caregiver Progress Summary</h1>
            <div>Patient: <strong>{{ $overview['patient']['name'] }}</strong> ({{ $overview['patient']['region'] }})</div>
            <div>Companion Name: {{ $overview['patient']['momo_name'] }} | Language: {{ $overview['patient']['language'] }}</div>
        </div>
        <div style="text-align:right;">
            <div>Prepared for Caregiver: <strong>{{ $caregiver->name }}</strong></div>
            <div>Generated: {{ $generated_at }}</div>
        </div>
    </div>

    <div class="disclaimer-box">
        <strong>Important Clinical Notice:</strong> This summary describes game interaction metrics, daily routine tracking, and caregiver observations. These scores describe training performance only and <strong>do not diagnose dementia</strong>, assign a clinical stage, or replace professional medical assessment.
    </div>

    <h2>1. 30-Day Routine & Adherence Overview</h2>
    <p>
        In the past 30 days, the patient completed <strong>{{ $overview['adherence']['thirty_day_active_days'] }} active days</strong> of cognitive training ({{ $overview['adherence']['thirty_day_percent'] }}% adherence).
        Average weekly score across active sessions: <strong>{{ $overview['adherence']['weekly_average_score'] }}%</strong>.
    </p>

    <h2>2. Game-by-Game Training Performance</h2>
    <table>
        <thead>
            <tr>
                <th>Cognitive Exercise</th>
                <th>Accuracy</th>
                <th>Total Trials</th>
                <th>Avg. Response Time</th>
                <th>Current Level (1–10)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($overview['game_performance'] as $key => $game)
                <tr>
                    <td><strong>{{ $game['title'] }}</strong></td>
                    <td>{{ $game['accuracy'] }}%</td>
                    <td>{{ $game['total_trials'] }}</td>
                    <td>{{ $game['avg_latency'] }}s</td>
                    <td>Level {{ $game['current_difficulty'] }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <h2>3. Recent Cognitive Workout Sessions</h2>
    <table>
        <thead>
            <tr>
                <th>Date & Time</th>
                <th>Overall Score</th>
                <th>Accuracy</th>
                <th>Avg. Response Time</th>
                <th>Completion</th>
            </tr>
        </thead>
        <tbody>
            @forelse($overview['recent_sessions'] as $session)
                <tr>
                    <td>{{ $session['date'] }}</td>
                    <td>{{ $session['overall_score'] }}%</td>
                    <td>{{ $session['accuracy'] }}%</td>
                    <td>{{ $session['response_time'] }}</td>
                    <td>{{ $session['games_completed'] }} of 5 games</td>
                </tr>
            @empty
                <tr><td colspan="5">No completed sessions recorded yet.</td></tr>
            @endforelse
        </tbody>
    </table>

    <h2>4. Follow-Up Signals & Observations</h2>
    @forelse($overview['follow_up_signals'] as $sig)
        <div style="margin-bottom:12px; padding:8px 12px; background:#f8fafc; border-left:3px solid #64748b;">
            <strong>{{ $sig['title'] }}</strong>: {{ $sig['message'] }}<br>
            <em style="color:#475569;">Recommended support: {{ $sig['recommended_action'] }}</em>
        </div>
    @empty
        <p>No active follow-up signals at this time.</p>
    @endforelse

    <h2>5. Caregiver Observation Notes</h2>
    @forelse($overview['caregiver_notes'] as $note)
        <div style="margin-bottom:8px;">
            <strong>{{ \Carbon\Carbon::parse($note->note_date)->format('M j, Y') }}</strong> [{{ ucfirst($note->category) }}]: {{ $note->content }}
        </div>
    @empty
        <p>No caregiver notes recorded.</p>
    @endforelse
</body>
</html>
