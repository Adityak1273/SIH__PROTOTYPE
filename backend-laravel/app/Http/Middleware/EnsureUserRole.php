<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (!$user) {
            abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
        }

        // Expand any comma-separated role arguments, e.g. 'caregiver,health_worker'
        $allowedRoles = [];
        foreach ($roles as $r) {
            foreach (explode(',', $r) as $subRole) {
                $trimmed = trim($subRole);
                if ($trimmed !== '') {
                    $allowedRoles[] = $trimmed;
                }
            }
        }

        $userRoleValue = method_exists($user, 'getRoleValue')
            ? $user->getRoleValue()
            : (is_string($user->role) ? $user->role : $user->role?->value);

        if (!in_array($userRoleValue, $allowedRoles, true)) {
            abort(Response::HTTP_FORBIDDEN, 'Unauthorized access for your role.');
        }

        return $next($request);
    }
}
