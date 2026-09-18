<?php

namespace App\Http\Middleware;

use App\Models\CaregiverPatientLink;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePatientLinked
{
    /**
     * Handle an incoming request.
     * Ensures that caregivers or health workers can only access patients with an active link.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
        }

        // Retrieve patient from route parameter (User model or ID)
        $patient = $request->route('patient');
        $patientId = $patient instanceof User ? $patient->id : (int) $patient;

        if (!$patientId) {
            return $next($request);
        }

        // Patient viewing themselves is allowed
        if ($user->id === $patientId) {
            return $next($request);
        }

        // Active caregiver or health worker link required
        $hasActiveLink = CaregiverPatientLink::where('caregiver_user_id', $user->id)
            ->where('patient_user_id', $patientId)
            ->where('status', 'active')
            ->exists();

        if (!$hasActiveLink) {
            abort(Response::HTTP_FORBIDDEN, 'Access denied: You do not have an active authorized link for this patient.');
        }

        return $next($request);
    }
}
