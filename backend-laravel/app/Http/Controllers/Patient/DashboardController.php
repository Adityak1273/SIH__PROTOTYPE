<?php

namespace App\Http\Controllers\Patient;

use App\Http\Controllers\Controller;
use App\Models\DailyTask;
use App\Models\Reminder;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Serves the elderly-friendly patient experience shell.
     * Contains the Momo rig, speech bubble, daily routine, and continuous game launcher.
     */
    public function index(Request $request): View
    {
        $user = $request->user();
        $profile = $user->profile;

        $reminders = Reminder::where('user_id', $user->id)
            ->where('active', true)
            ->orderBy('reminder_time')
            ->take(4)
            ->get();

        $tasks = DailyTask::where('user_id', $user->id)
            ->where('task_date', now()->toDateString())
            ->get();

        return view('patient.shell', [
            'user' => $user,
            'profile' => $profile,
            'reminders' => $reminders,
            'tasks' => $tasks,
        ]);
    }
}
