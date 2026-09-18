<?php

namespace App\Http\Controllers\Privacy;

use App\Events\ConsentUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreConsentRequest;
use App\Models\PrivacyConsent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ConsentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $consents = PrivacyConsent::where('user_id', $request->user()->id)->get();
        return response()->json(['consents' => $consents]);
    }

    public function store(StoreConsentRequest $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $consent = PrivacyConsent::updateOrCreate(
            [
                'user_id' => $user->id,
                'consent_version' => $validated['consent_version'],
                'purpose' => $validated['purpose'],
            ],
            [
                'id' => (string) Str::uuid(),
                'accepted_at' => $validated['accepted'] ? now() : null,
                'revoked_at' => !$validated['accepted'] ? now() : null,
                'metadata' => $validated['metadata'] ?? [],
            ]
        );

        event(new ConsentUpdated($consent));

        return response()->json(['consent' => $consent]);
    }
}
