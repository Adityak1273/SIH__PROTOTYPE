<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BlockAdminMedicalAccess
{
    /**
     * Handle an incoming request.
     * Enforces the zero-trust principle: System Administrators do NOT have
     * unrestricted access to patient clinical, cognitive, or medical data by default.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && method_exists($user, 'isAdmin') && $user->isAdmin()) {
            abort(
                Response::HTTP_FORBIDDEN,
                'System administrators are restricted from accessing patient medical and cognitive session data by default under strict RBAC.'
            );
        }

        return $next($request);
    }
}
