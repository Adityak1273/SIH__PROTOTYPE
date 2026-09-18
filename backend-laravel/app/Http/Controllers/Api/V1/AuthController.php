<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserProfileResource;
use App\Models\User;
use App\Models\UserProfile;
use App\Support\LanguageRegistry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    /**
     * Public user registration.
     * Security Boundary: Only 'patient' and 'caregiver' roles are permitted via public registration.
     * 'admin' and 'health_worker' roles require internal administrative provisioning.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::in(['patient', 'caregiver'])],
            'region' => ['nullable', 'string'],
            'preferred_language' => ['nullable', 'string'],
            'momo_name' => ['nullable', 'string'],
        ], [
            'role.in' => 'Public registration is restricted to patient and caregiver accounts only. Administrative and clinical roles cannot be self-assigned.',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => UserRole::from($validated['role']),
        ]);

        $profile = UserProfile::create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'full_name' => $validated['name'],
            'region' => $validated['region'] ?? 'Assam',
            'preferred_language' => $validated['preferred_language'] ?? 'en-IN',
            'momo_name' => $validated['momo_name'] ?? 'Momo',
            'profile_complete' => true,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
            ],
            'profile' => new UserProfileResource($profile),
        ], 201);
    }

    /**
     * User login with rate limiting and lockout protection.
     * Enforces AuthRules: Lockout after 5 consecutive failed attempts for 300 seconds (5 minutes).
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $throttleKey = Str::transliterate(Str::lower($validated['email']) . '|' . $request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many failed login attempts. Account temporarily locked for security. Please try again in {$seconds} seconds.",
                'lockout_seconds' => $seconds,
            ], 429)->header('Retry-After', (string) $seconds);
        }

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            RateLimiter::hit($throttleKey, 300); // 5 minute lockout decay
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        RateLimiter::clear($throttleKey);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
            ],
            'profile' => $user->profile ? new UserProfileResource($user->profile) : null,
        ]);
    }

    /**
     * Get current authenticated user details.
     */
    public function user(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
            ],
            'profile' => $user->profile ? new UserProfileResource($user->profile) : null,
        ]);
    }

    /**
     * Update user profile, language preferences, and accessibility settings.
     * Enforces AccessibilityRules & LanguageRegistry validation.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = $user->profile;

        if (!$profile) {
            $profile = UserProfile::create([
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'full_name' => $user->name,
            ]);
        }

        $validated = $request->validate([
            'full_name' => ['nullable', 'string', 'max:255'],
            'region' => ['nullable', 'string', 'max:100'],
            'preferred_language' => ['nullable', 'string'],
            'momo_name' => ['nullable', 'string', 'max:50'],
            'accessibility_mode' => ['nullable', 'string', Rule::in(['standard', 'high-contrast', 'large-touch', 'simplified'])],
            'speech_rate' => ['nullable', 'numeric', 'between:0.7,1.2'],
            'voice_preference' => ['nullable', 'string', Rule::in(['default', 'slow', 'loud'])],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'profile_complete' => ['nullable', 'boolean'],
        ]);

        // Validate language if provided
        if (!empty($validated['preferred_language']) && !LanguageRegistry::isValid($validated['preferred_language'])) {
            $validated['preferred_language'] = 'en-IN'; // Fallback per ProfileRules
        }

        $profile->update(array_filter([
            'full_name' => $validated['full_name'] ?? $profile->full_name,
            'region' => $validated['region'] ?? $profile->region,
            'preferred_language' => $validated['preferred_language'] ?? $profile->preferred_language,
            'momo_name' => $validated['momo_name'] ?? $profile->momo_name,
            'date_of_birth' => $validated['date_of_birth'] ?? $profile->date_of_birth,
            'profile_complete' => $validated['profile_complete'] ?? true,
        ], fn($val) => $val !== null));

        return response()->json([
            'message' => 'Profile updated successfully.',
            'profile' => new UserProfileResource($profile->fresh()),
        ]);
    }

    /**
     * Single-device logout: Revokes current access token.
     */
    public function logout(Request $request): JsonResponse
    {
        $token = $request->user()->currentAccessToken();
        if ($token) {
            $token->delete();
        }

        return response()->json(['message' => 'Logged out successfully.']);
    }

    /**
     * Terminate all concurrent sessions across all devices.
     * Revokes all tokens associated with the authenticated user account.
     */
    public function logoutAll(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->tokens()->delete();

        return response()->json([
            'message' => 'All active sessions and device tokens have been revoked successfully.',
        ]);
    }

    /**
     * Request role elevation.
     * Strict RBAC Gate: Patients cannot self-elevate to caregiver, health_worker, or admin.
     */
    public function elevateRole(Request $request): JsonResponse
    {
        $user = $request->user();
        $targetRole = $request->input('target_role');

        if ($user->isPatient() && in_array($targetRole, ['caregiver', 'health_worker', 'admin'], true)) {
            return response()->json([
                'error' => 'ROLE_ELEVATION_DENIED',
                'message' => 'Patients cannot self-elevate their role to caregiver or administrator.',
            ], 403);
        }

        return response()->json(['message' => 'Role change request evaluated.']);
    }
}
