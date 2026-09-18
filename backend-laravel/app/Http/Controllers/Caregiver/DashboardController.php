<?php

namespace App\Http\Controllers\Caregiver;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCaregiverNoteRequest;
use App\Models\CaregiverNote;
use App\Models\User;
use App\Services\CaregiverDashboardService;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DashboardController extends Controller
{
    public function __construct(
        protected CaregiverDashboardService $dashboardService
    ) {
    }

    /**
     * Caregiver Main Dashboard.
     * Caregivers only see patients explicitly linked to them with status = 'active'.
     */
    public function index(Request $request): View
    {
        $caregiver = $request->user();

        // 1. PATIENT SELECTOR: Retrieve all active linked patients
        $linkedPatients = $this->dashboardService->getLinkedPatients($caregiver);

        $selectedPatientId = $request->query('patient_id');
        $selectedPatient = null;

        if ($selectedPatientId) {
            $selectedPatient = collect($linkedPatients)->firstWhere('id', (int) $selectedPatientId);
        }

        if (!$selectedPatient && !empty($linkedPatients)) {
            $selectedPatient = $linkedPatients[0];
        }

        $overview = null;
        if ($selectedPatient) {
            $this->authorize('view', $selectedPatient);
            $overview = $this->dashboardService->getPatientOverview($selectedPatient);
        }

        return view('caregiver.dashboard', [
            'caregiver' => $caregiver,
            'patients' => $linkedPatients,
            'selectedPatient' => $selectedPatient,
            'overview' => $overview,
        ]);
    }

    /**
     * View a specific linked patient overview.
     */
    public function patientOverview(Request $request, User $patient): RedirectResponse
    {
        $this->authorize('view', $patient);

        return redirect()->route('caregiver.dashboard', ['patient_id' => $patient->id]);
    }


    /**
     * Store an observation note written by the caregiver for a linked patient.
     */
    public function storeNote(StoreCaregiverNoteRequest $request, User $patient): RedirectResponse
    {
        $this->authorize('createNote', $patient);

        CaregiverNote::create([
            'id' => (string) Str::uuid(),
            'caregiver_id' => $request->user()->id,
            'patient_id' => $patient->id,
            'category' => $request->input('category'),
            'content' => $request->input('content'),
            'note_date' => $request->input('note_date') ?? now()->toDateString(),
        ]);

        return redirect()->route('caregiver.dashboard', ['patient_id' => $patient->id])
            ->with('success', 'Caregiver note saved successfully.');
    }
}
