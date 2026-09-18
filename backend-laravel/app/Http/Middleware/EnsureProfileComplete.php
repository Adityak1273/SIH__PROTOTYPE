<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProfileComplete
{
    /**
     * Handle an incoming request.
     * Enforces that patients must complete their onboarding profile before
     * accessing cognitive training games and clinical evaluations.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
        }

        // Only patients are gated by profile completeness; caregivers and admins have separate onboarding
        if ($user->isPatient()) {
            $profile = $user->profile;

            if (!$profile || !$profile->profile_complete) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'error' => 'PROFILE_INCOMPLETE',
                        'message' => 'Please complete your patient profile before starting cognitive games.',
                        'redirect' => '/patient/profile',
                    ], Response::HTTP_FORBIDDEN);
                }

                return redirect()->route('patient.profile')->with('warning', 'Please complete your profile first.');
            }
        }

        return $next($request);
    }
}
