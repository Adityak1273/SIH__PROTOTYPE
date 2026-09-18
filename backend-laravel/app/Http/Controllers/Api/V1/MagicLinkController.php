<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\MagicLinkNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class MagicLinkController extends Controller
{
    /**
     * Send magic login link with rate limiting protection.
     * Prevents OTP/link spamming (maximum 5 requests per 10 minutes).
     */
    public function sendLink(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

        $throttleKey = 'magic_link|' . Str::transliterate(Str::lower($validated['email']) . '|' . $request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many login link requests. Please wait {$seconds} seconds before requesting another link.",
                'lockout_seconds' => $seconds,
            ], 429)->header('Retry-After', (string) $seconds);
        }

        RateLimiter::hit($throttleKey, 600);

        $user = User::firstOrCreate(
            ['email' => $validated['email']],
            ['name' => strstr($validated['email'], '@', true), 'role' => 'patient']
        );

        $url = URL::temporarySignedRoute(
            'api.magic-link.verify',
            now()->addMinutes(20),
            ['user' => $user->id]
        );

        $user->notify(new MagicLinkNotification($url));

        return response()->json([
            'message' => 'Magic login link sent to your email.',
        ]);
    }

    /**
     * Verify signed magic link with single-use redemption enforcement.
     * Prevents replay attacks where a valid URL is consumed more than once.
     */
    public function verify(Request $request, User $user): JsonResponse
    {
        if (!$request->hasValidSignature()) {
            return response()->json(['message' => 'Invalid or expired login link.'], 403);
        }

        $signature = (string) $request->query('signature');
        $cacheKey = "magic_link_redeemed:{$signature}";

        if (Cache::has($cacheKey)) {
            return response()->json([
                'error' => 'LINK_ALREADY_USED',
                'message' => 'This magic login link has already been redeemed. Please request a new one.',
            ], 403);
        }

        // Mark this signature as redeemed for 30 minutes to prevent replay
        Cache::put($cacheKey, true, now()->addMinutes(30));

        $token = $user->createToken('magic-auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
            ],
        ]);
    }
}
