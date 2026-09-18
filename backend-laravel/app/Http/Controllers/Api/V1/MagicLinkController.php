<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Notifications\MagicLinkNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;

class MagicLinkController extends Controller
{
    public function sendLink(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
        ]);

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

    public function verify(Request $request, User $user): JsonResponse
    {
        if (!$request->hasValidSignature()) {
            return response()->json(['message' => 'Invalid or expired login link.'], 403);
        }

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
