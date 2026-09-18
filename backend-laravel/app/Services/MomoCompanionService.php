<?php

namespace App\Services;

use App\Models\User;
use App\Support\LanguageRegistry;
use Illuminate\Support\Facades\Http;

class MomoCompanionService
{
    /**
     * Proxies chat to OpenAI or fallback with regional Indic context and strict safety guardrails.
     * Ported from server.js chat handler.
     */
    public function generateReply(User $user, string $message, array $history, string $screen, string $game, int $level): string
    {
        $profile = $user->profile;
        $languageCode = $profile?->preferred_language ?? 'en-IN';
        $languageMeta = LanguageRegistry::getLanguage($languageCode);
        $languageName = $languageMeta['name'] ?? 'English';

        $langInstruction = ($languageCode === 'en-IN')
            ? 'Respond in English.'
            : "Respond naturally in {$languageName}. Preserve simple, elderly-friendly language and use the selected language consistently.";

        $instructions = <<<PROMPT
You are Momo, a warm, playful AI companion inside Cognitive Care NER, an elderly-friendly cognitive training app for people in the North Eastern Region of India.
Be natural, varied, encouraging and concise. Speak like a friendly pet companion, not a clinical assistant. Use simple language and occasional gentle humor.
Never diagnose dementia, never interpret a game score as a medical diagnosis, and never invent clinical conclusions.
If the user asks to start/play a game, the app handles that action; your job is to encourage them. Keep replies to 1-3 short sentences.
{$langInstruction}
Current screen: {$screen}
Current game: {$game}
Adaptive training level: {$level}
PROMPT;

        $sanitizedInput = [];
        foreach (array_slice($history, -8) as $item) {
            $sanitizedInput[] = [
                'role' => ($item['role'] ?? 'user') === 'assistant' ? 'assistant' : 'user',
                'content' => mb_substr(strip_tags($item['text'] ?? ''), 0, 2000),
            ];
        }
        $sanitizedInput[] = [
            'role' => 'user',
            'content' => mb_substr(strip_tags($message), 0, 2000),
        ];

        $apiKey = config('services.openai.key') ?: env('OPENAI_API_KEY');
        if (!$apiKey) {
            return "Woof! I'm right here with you. Let's take today one step at a time! 🐾";
        }

        try {
            $response = Http::withToken($apiKey)
                ->timeout(15)
                ->post('https://api.openai.com/v1/responses', [
                    'model' => config('services.openai.model', 'gpt-4o-mini'),
                    'instructions' => $instructions,
                    'input' => $sanitizedInput,
                    'max_output_tokens' => 180,
                    'store' => false,
                ]);

            if ($response->successful()) {
                $data = $response->json();
                return $data['output_text'] ?? "I'm happy to be by your side today! 🐶";
            }
        } catch (\Throwable $e) {
            // Safe fallback
        }

        return "Hello! I'm Momo. Shall we do a little brain workout together today? 🐾";
    }
}
