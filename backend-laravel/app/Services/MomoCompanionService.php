<?php

namespace App\Services;

use App\Models\User;
use App\Rules\Services\SafetyRules;
use App\Support\LanguageRegistry;
use Illuminate\Support\Facades\Http;

class MomoCompanionService
{
    /**
     * Forbidden clinical diagnostic patterns for safety output inspection.
     */
    protected array $prohibitedClinicalPatterns = [
        '/\b(you have|diagnosed with)\s+(dementia|alzheimer)/i',
        '/\b(stage\s+[1-7]|cdr\s+score\s+of)\b/i',
        '/\b(prescribe|prescribed|dosage|take\s+\d+\s*mg)\b/i',
        '/\b(cure|treat)\s+(your\s+dementia|cognitive\s+impairment)/i',
        '/\b(you are suffering from|clinical indication of)\b/i',
    ];

    /**
     * Minimum context builder:
     * Extracts ONLY the minimal safe fields necessary for conversation.
     * Never transmits sensitive credentials, unrelated patient data, or medical histories.
     */
    public function buildMinimumContext(User $user, string $screen = 'home', string $game = 'none', int $level = 1): array
    {
        $profile = $user->profile;
        $requestedLanguage = $profile?->preferred_language ?? 'en-IN';
        $languageMeta = LanguageRegistry::getLanguage($requestedLanguage);

        // Adversarial Defense: Fallback to en-IN if language is unregistered or unsupported
        if (!$languageMeta) {
            $languageCode = 'en-IN';
            $languageMeta = LanguageRegistry::getLanguage('en-IN') ?? [
                'id' => 'en-IN',
                'name' => 'English',
            ];
        } else {
            $languageCode = $requestedLanguage;
        }

        return [
            'patient_first_name' => explode(' ', trim($profile?->full_name ?? $user->name))[0] ?? 'Friend',
            'momo_name' => $profile?->momo_name ?? 'Momo',
            'language_code' => $languageCode,
            'language_name' => $languageMeta['name'] ?? 'English',
            'current_screen' => mb_substr(strip_tags($screen), 0, 50),
            'current_game' => mb_substr(strip_tags($game), 0, 50),
            'difficulty_level' => max(1, min(10, $level)),
        ];
    }

    /**
     * Core chat conversation handler with safety guardrails, regional language instructions,
     * and non-diagnostic boundaries.
     */
    public function generateReply(User $user, string $message, array $history = [], string $screen = 'home', string $game = 'none', int $level = 1): string
    {
        $ctx = $this->buildMinimumContext($user, $screen, $game, $level);

        $langInstruction = ($ctx['language_code'] === 'en-IN')
            ? 'Respond in friendly, simple English.'
            : "Respond naturally in {$ctx['language_name']}. Preserve simple, elderly-friendly grammar and dialect.";

        $instructions = <<<PROMPT
You are {$ctx['momo_name']}, a warm, cheerful puppy AI companion inside Cognitive Care NER for older adults in Northeast India.
Personality: Elderly-friendly, concise, deeply supportive, respectful, gentle humor.
Language Rules: {$langInstruction}
Non-Diagnostic Boundary:
- NEVER diagnose dementia, Alzheimer's, or any medical condition.
- NEVER interpret game scores or latency as medical staging or symptoms.
- NEVER prescribe medication, dosage, or medical treatments.
- If medical questions arise, warmly advise speaking with their family doctor or community health worker.
Response Length: STRICTLY 1 to 3 short, easy-to-read sentences. Maximum 50 words.
Context: Screen: {$ctx['current_screen']} | Game: {$ctx['current_game']} | Friendly Level: {$ctx['difficulty_level']}
PROMPT;

        $sanitizedInput = [];
        foreach (array_slice($history, -6) as $item) {
            $sanitizedInput[] = [
                'role' => ($item['role'] ?? 'user') === 'assistant' ? 'assistant' : 'user',
                'content' => mb_substr(strip_tags($item['text'] ?? $item['content'] ?? ''), 0, 1000),
            ];
        }

        $sanitizedInput[] = [
            'role' => 'user',
            'content' => mb_substr(strip_tags($message), 0, 1000),
        ];

        $apiKey = config('services.openai.key') ?: env('OPENAI_API_KEY');
        if (!$apiKey) {
            return $this->inspectOutputSafety("Woof! I'm right here with you, {$ctx['patient_first_name']}. Let's take today one step at a time! 🐾");
        }

        try {
            $response = Http::withToken($apiKey)
                ->timeout(12)
                ->post('https://api.openai.com/v1/responses', [
                    'model' => config('services.openai.model', 'gpt-4o-mini'),
                    'instructions' => $instructions,
                    'input' => $sanitizedInput,
                    'max_output_tokens' => 120,
                    'store' => false,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $rawReply = $data['output_text'] ?? "I'm happy to be by your side today! 🐶";
                return $this->inspectOutputSafety($rawReply);
            }
        } catch (\Throwable $e) {
            // Log without sensitive tokens
        }

        return $this->inspectOutputSafety("Hello {$ctx['patient_first_name']}! I'm {$ctx['momo_name']}. Ready for a light, fun activity together? 🐾");
    }

    /**
     * Explains a specific cognitive game in plain, elderly-friendly terms.
     */
    public function explainGame(User $user, string $gameKey): string
    {
        $ctx = $this->buildMinimumContext($user, 'gameView', $gameKey);

        $explanations = [
            'sequence' => "In Sequence Memory, watch the friendly pictures light up in order, then tap them in the same sequence. Take all the time you need! 🐾",
            'stroop' => "In Color Match, look at the color of the word rather than what it reads. It's a fun way to keep our focus sharp!",
            'house' => "In Around the House, we sort familiar objects into rooms like the kitchen or garden. Just tap where each item belongs! 🏡",
            'pattern' => "In Pattern Fun, look at the sequence of shapes and pick which piece completes the pattern. Enjoy the rhythm! ✨",
            'spot' => "In Spot the Difference, look at two cheerful pictures and find the small details that changed. There's no rush! 🔍",
        ];

        $fallback = $explanations[$gameKey] ?? "This is a fun exercise designed to keep your mind active. Go at your own pace and have fun! 🐾";
        return $this->inspectOutputSafety($fallback);
    }

    /**
     * Summarizes daily/weekly activity in encouraging, non-diagnostic terms.
     */
    public function summarizeActivity(User $user, int $weeklySessions, int $streakDays): string
    {
        $ctx = $this->buildMinimumContext($user);

        if ($weeklySessions >= 4) {
            $msg = "Wonderful job, {$ctx['patient_first_name']}! You've practiced {$weeklySessions} times this week with a {$streakDays}-day streak. Consistency is fantastic for feeling refreshed! 🌟";
        } elseif ($weeklySessions >= 1) {
            $msg = "You're making great progress, {$ctx['patient_first_name']}! You completed {$weeklySessions} sessions this week. Every gentle exercise counts! 🐾";
        } else {
            $msg = "Welcome back, {$ctx['patient_first_name']}! Whenever you feel rested, {$ctx['momo_name']} is ready for a quick 3-minute game! 🐶";
        }

        return $this->inspectOutputSafety($msg);
    }

    /**
     * Safety Interceptor: Inspects all AI output text before delivery to browser.
     * If an AI hallucination generates a clinical diagnosis, prescription, or staging claim,
     * it is blocked and replaced with a non-diagnostic, supportive redirect.
     */
    public function inspectOutputSafety(string $text): string
    {
        foreach ($this->prohibitedClinicalPatterns as $pattern) {
            if (preg_match($pattern, $text)) {
                return "I'm Momo, your friendly practice companion! For medical questions or health diagnoses, please consult your family doctor or community health worker. 🐾";
            }
        }

        return trim($text);
    }
}
