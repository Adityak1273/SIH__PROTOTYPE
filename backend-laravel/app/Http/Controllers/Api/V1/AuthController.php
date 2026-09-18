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
            'username' => ['nullable', 'string', 'max:50', 'unique:users,username'],
            'login_id' => ['nullable', 'string', 'max:50'],
            'email' => ['nullable', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', 'string', Rule::in(['patient', 'caregiver'])],
            'region' => ['nullable', 'string'],
            'preferred_language' => ['nullable', 'string'],
            'momo_name' => ['nullable', 'string'],
            'caregiver_info' => ['nullable', 'array'],
            'health_background' => ['nullable', 'array'],
            'daily_life_background' => ['nullable', 'array'],
            'accessibility_settings' => ['nullable', 'array'],
            'privacy_preferences' => ['nullable', 'array'],
        ], [
            'role.in' => 'Public registration is restricted to patient and caregiver accounts only. Administrative and clinical roles cannot be self-assigned.',
        ]);

        $username = $validated['username'] ?? $validated['login_id'] ?? null;
        if (!$username) {
            $username = Str::slug($validated['name']) . '.' . rand(100, 999);
        }

        $email = $validated['email'] ?? ($username . '@cognitivecare.ner');

        $user = User::create([
            'name' => $validated['name'],
            'username' => $username,
            'email' => $email,
            'password' => Hash::make($validated['password']),
            'role' => UserRole::from($validated['role']),
        ]);

        $roleVal = $validated['role'];
        $initialPct = $roleVal === 'caregiver' ? 75 : 30;

        $profile = UserProfile::create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'full_name' => $validated['name'],
            'preferred_name' => $validated['name'],
            'region' => $validated['region'] ?? 'Assam',
            'preferred_language' => $validated['preferred_language'] ?? 'en-IN',
            'momo_name' => $validated['momo_name'] ?? 'Momo',
            'caregiver_info' => $validated['caregiver_info'] ?? [],
            'health_background' => $validated['health_background'] ?? [],
            'daily_life_background' => $validated['daily_life_background'] ?? [],
            'accessibility_settings' => $validated['accessibility_settings'] ?? [],
            'privacy_preferences' => $validated['privacy_preferences'] ?? [],
            'profile_complete' => true,
            'onboarding_step' => $roleVal === 'caregiver' ? 7 : 2,
            'profile_completion_pct' => $initialPct,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;
        $redirectTo = $roleVal === 'caregiver' ? '/caregiver/dashboard' : '/patient/dashboard';

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role->value,
            ],
            'profile' => new UserProfileResource($profile),
            'redirect_to' => $redirectTo,
        ], 201);
    }

    /**
     * User login with rate limiting and lockout protection.
     * Supports Login ID / username or email, and preset demo accounts (patient.demo, caregiver.demo).
     * Enforces AuthRules: Lockout after 5 consecutive failed attempts for 300 seconds (5 minutes).
     */
    public function login(Request $request): JsonResponse
    {
        $identifier = $request->input('login_id') ?: $request->input('username') ?: $request->input('email');

        if (!$identifier || !$request->filled('password')) {
            return response()->json(['message' => 'Please provide your login ID or email and password.'], 422);
        }

        $password = $request->input('password');
        $throttleKey = Str::transliterate(Str::lower($identifier) . '|' . $request->ip());

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many failed login attempts. Account temporarily locked for security. Please try again in {$seconds} seconds.",
                'lockout_seconds' => $seconds,
            ], 429)->header('Retry-After', (string) $seconds);
        }

        // Support preset demo accounts with seamless self-provisioning if not yet seeded
        $isDemoAccount = in_array(strtolower($identifier), ['patient.demo', 'caregiver.demo']);

        $user = User::where('email', $identifier)
            ->orWhere('username', $identifier)
            ->first();

        if (!$user && $isDemoAccount) {
            $demoRole = strtolower($identifier) === 'caregiver.demo' ? UserRole::Caregiver : UserRole::Patient;
            $demoPass = env('DEMO_PASSWORD', 'CognitiveCare2026!');

            $user = User::create([
                'name' => $demoRole === UserRole::Caregiver ? 'Demo Caregiver' : 'Demo Patient',
                'username' => strtolower($identifier),
                'email' => strtolower($identifier) . '@cognitivecare.ner',
                'password' => Hash::make($demoPass),
                'role' => $demoRole,
            ]);

            UserProfile::create([
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'full_name' => $user->name,
                'preferred_name' => $demoRole === UserRole::Caregiver ? 'Caregiver' : 'Patient',
                'date_of_birth' => $demoRole === UserRole::Caregiver ? '1985-05-15' : '1952-03-10',
                'age' => $demoRole === UserRole::Caregiver ? 41 : 74,
                'gender' => $demoRole === UserRole::Caregiver ? 'Female' : 'Male',
                'region' => 'Assam',
                'preferred_language' => 'en-IN',
                'momo_name' => 'Momo',
                'profile_complete' => true,
                'profile_completion_pct' => 85,
                'caregiver_info' => [
                    'caregiver_name' => 'Ananya Sharma',
                    'relationship' => 'Daughter',
                    'caregiver_phone' => '9876543210',
                    'emergency_contact' => '9876543210',
                    'emergency_relationship' => 'Daughter',
                ],
                'health_background' => [
                    'known_conditions' => ['Mild memory forgetfulness', 'Hypertension'],
                    'medications' => ['Amlodipine 5mg'],
                    'allergies' => ['Penicillin'],
                ],
                'daily_life_background' => [
                    'hobbies' => ['Gardening', 'Morning walks', 'Tea with family'],
                    'daily_routine' => 'Wake up at 6am, light exercises, breakfast at 8am, cognitive training at 10am.',
                ],
                'accessibility_settings' => [
                    'font_size' => 'large',
                    'high_contrast' => false,
                    'voice_speed' => 1.0,
                ],
            ]);
        }

        if (!$user || !Hash::check($password, $user->password)) {
            RateLimiter::hit($throttleKey, 300); // 5 minute lockout decay
            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        RateLimiter::clear($throttleKey);

        $token = $user->createToken('auth-token')->plainTextToken;

        $roleVal = $user->role instanceof UserRole ? $user->role->value : (string) $user->role;
        $redirectTo = match($roleVal) {
            'caregiver' => '/caregiver/dashboard',
            'health_worker' => '/caregiver/dashboard',
            'admin' => '/admin/dashboard',
            default => '/patient/dashboard',
        };

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $roleVal,
            ],
            'profile' => $user->profile ? new UserProfileResource($user->profile) : null,
            'redirect_to' => $redirectTo,
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
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role->value,
            ],
            'profile' => $user->profile ? new UserProfileResource($user->profile) : null,
        ]);
    }

    /**
     * Update user profile, language preferences, and accessibility settings across 6 structured domains.
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
            'preferred_name' => ['nullable', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'age' => ['nullable', 'integer', 'between:1,130'],
            'gender' => ['nullable', 'string', Rule::in(['Female', 'Male', 'Other', 'Prefer not to say'])],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'string', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'country' => ['nullable', 'string', 'max:100'],
            'emergency_contact' => ['nullable', 'string', 'max:20'],
            'emergency_relationship' => ['nullable', 'string', 'max:100'],
            'caregiver_info' => ['nullable', 'array'],
            'health_background' => ['nullable', 'array'],
            'daily_life_background' => ['nullable', 'array'],
            'accessibility_settings' => ['nullable', 'array'],
            'privacy_preferences' => ['nullable', 'array'],
            'region' => ['nullable', 'string', 'max:100'],
            'preferred_language' => ['nullable', 'string'],
            'additional_languages' => ['nullable', 'array'],
            'momo_name' => ['nullable', 'string', 'max:50'],
            'accessibility_mode' => ['nullable', 'string', Rule::in(['standard', 'high-contrast', 'large-touch', 'simplified'])],
            'speech_rate' => ['nullable', 'numeric', 'between:0.7,1.2'],
            'voice_preference' => ['nullable', 'string', Rule::in(['default', 'slow', 'loud'])],
            'onboarding_step' => ['nullable', 'integer', 'between:1,7'],
            'profile_complete' => ['nullable', 'boolean'],
        ]);

        // Validate language if provided
        if (!empty($validated['preferred_language']) && !LanguageRegistry::isValid($validated['preferred_language'])) {
            $validated['preferred_language'] = 'en-IN'; // Fallback per ProfileRules
        }

        // Compute completion percentage across domains
        $pct = 0;
        $name = $validated['full_name'] ?? $profile->full_name;
        $dob = $validated['date_of_birth'] ?? $profile->date_of_birth;
        if (!empty($name) && !empty($dob)) $pct += 25;

        $cg = $validated['caregiver_info'] ?? $profile->caregiver_info;
        if (!empty($cg) && is_array($cg) && count($cg) > 0) $pct += 20;

        $health = $validated['health_background'] ?? $profile->health_background;
        if (!empty($health) && is_array($health) && count($health) > 0) $pct += 20;

        $routine = $validated['daily_life_background'] ?? $profile->daily_life_background;
        if (!empty($routine) && is_array($routine) && count($routine) > 0) $pct += 15;

        $access = $validated['accessibility_settings'] ?? $profile->accessibility_settings;
        if (!empty($access) && is_array($access) && count($access) > 0) $pct += 10;

        $privacy = $validated['privacy_preferences'] ?? $profile->privacy_preferences;
        if (!empty($privacy) && is_array($privacy) && count($privacy) > 0) $pct += 10;

        $profileCompletion = min(100, max(20, $pct));

        $updateData = array_filter([
            'full_name' => $validated['full_name'] ?? $profile->full_name,
            'preferred_name' => $validated['preferred_name'] ?? $profile->preferred_name,
            'date_of_birth' => $validated['date_of_birth'] ?? $profile->date_of_birth,
            'age' => $validated['age'] ?? $profile->age,
            'gender' => $validated['gender'] ?? $profile->gender,
            'phone' => $validated['phone'] ?? $profile->phone,
            'email' => $validated['email'] ?? $profile->email,
            'address' => $validated['address'] ?? $profile->address,
            'city' => $validated['city'] ?? $profile->city,
            'state' => $validated['state'] ?? $profile->state,
            'country' => $validated['country'] ?? $profile->country,
            'emergency_contact' => $validated['emergency_contact'] ?? $profile->emergency_contact,
            'emergency_relationship' => $validated['emergency_relationship'] ?? $profile->emergency_relationship,
            'caregiver_info' => $validated['caregiver_info'] ?? $profile->caregiver_info,
            'health_background' => $validated['health_background'] ?? $profile->health_background,
            'daily_life_background' => $validated['daily_life_background'] ?? $profile->daily_life_background,
            'accessibility_settings' => $validated['accessibility_settings'] ?? $profile->accessibility_settings,
            'privacy_preferences' => $validated['privacy_preferences'] ?? $profile->privacy_preferences,
            'region' => $validated['region'] ?? $profile->region,
            'preferred_language' => $validated['preferred_language'] ?? $profile->preferred_language,
            'additional_languages' => $validated['additional_languages'] ?? $profile->additional_languages,
            'momo_name' => $validated['momo_name'] ?? $profile->momo_name,
            'onboarding_step' => $validated['onboarding_step'] ?? $profile->onboarding_step,
            'profile_completion_pct' => $profileCompletion,
            'profile_complete' => $validated['profile_complete'] ?? true,
        ], fn($val) => $val !== null);

        $profile->update($updateData);

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
