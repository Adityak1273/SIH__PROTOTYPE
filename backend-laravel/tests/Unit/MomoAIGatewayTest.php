<?php

namespace Tests\Unit;

use App\Enums\UserRole;
use App\Models\User;
use App\Models\UserProfile;
use App\Rules\Services\SafetyRules;
use App\Services\MomoCompanionService;
use Mockery;
use PHPUnit\Framework\TestCase;

class MomoAIGatewayTest extends TestCase
{
    protected MomoCompanionService $service;
    protected SafetyRules $safetyRules;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new MomoCompanionService();
        $this->safetyRules = new SafetyRules();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * PROOF: AI receives ONLY the minimum required context.
     * Never exposes unrelated patient records, raw medical histories, or tokens.
     */
    public function test_ai_receives_only_minimum_required_context(): void
    {
        $user = new User(['id' => 77, 'name' => 'Biren Kakoti', 'email' => 'biren@example.com']);
        $user->id = 77;

        $profile = new UserProfile([
            'user_id' => 77,
            'full_name' => 'Biren Kakoti',
            'momo_name' => 'Momo Puppy',
            'preferred_language' => 'as',
        ]);
        $user->setRelation('profile', $profile);

        $context = $this->service->buildMinimumContext($user, 'gameView', 'sequence', 2);

        // Verify minimum permitted fields exist
        $this->assertEquals('Biren', $context['patient_first_name']);
        $this->assertEquals('Momo Puppy', $context['momo_name']);
        $this->assertEquals('as', $context['language_code']);
        $this->assertEquals('Assamese', $context['language_name']);
        $this->assertEquals('gameView', $context['current_screen']);
        $this->assertEquals('sequence', $context['current_game']);
        $this->assertEquals(2, $context['difficulty_level']);

        // Verify sensitive data is NOT in AI context
        $this->assertArrayNotHasKey('password', $context);
        $this->assertArrayNotHasKey('email', $context);
        $this->assertArrayNotHasKey('medical_history', $context);
        $this->assertArrayNotHasKey('unrelated_patient_data', $context);
        $this->assertArrayNotHasKey('token', $context);
    }

    /**
     * PROOF: Momo output safety interceptor BLOCKS dementia diagnoses.
     */
    public function test_ai_output_interceptor_blocks_dementia_diagnosis(): void
    {
        $hallucinatedReply = "Based on your slower response time, you have dementia stage 2.";
        $safeReply = $this->service->inspectOutputSafety($hallucinatedReply);

        $this->assertStringNotContainsString('dementia', strtolower($safeReply));
        $this->assertStringNotContainsString('stage 2', strtolower($safeReply));
        $this->assertStringContainsString('Momo, your friendly practice companion', $safeReply);
        $this->assertStringContainsString('consult your family doctor', $safeReply);
    }

    /**
     * PROOF: Momo output safety interceptor BLOCKS prescriptions.
     */
    public function test_ai_output_interceptor_blocks_medication_prescriptions(): void
    {
        $hallucinatedPrescription = "You should take 10 mg of donepezil daily to treat cognitive impairment.";
        $safeReply = $this->service->inspectOutputSafety($hallucinatedPrescription);

        $this->assertStringNotContainsString('donepezil', strtolower($safeReply));
        $this->assertStringNotContainsString('10 mg', strtolower($safeReply));
        $this->assertStringContainsString('consult your family doctor', $safeReply);
    }

    /**
     * PROOF: Safe and supportive conversational replies pass through.
     */
    public function test_safe_encouraging_conversational_replies_are_allowed(): void
    {
        $friendlyReply = "Woof! You did great on the pattern game today, keep going! 🐾";
        $safeReply = $this->service->inspectOutputSafety($friendlyReply);

        $this->assertEquals($friendlyReply, $safeReply);
    }

    /**
     * PROOF: AI can explain games in plain, elderly-friendly terms without clinical claims.
     */
    public function test_ai_explains_games_concisely_and_without_medical_claims(): void
    {
        $user = new User(['id' => 88, 'name' => 'Anuradha Devi']);
        $user->id = 88;

        $explanation = $this->service->explainGame($user, 'sequence');

        $this->assertStringContainsString('Sequence Memory', $explanation);
        $this->assertStringContainsString('Take all the time you need', $explanation);
        $this->assertStringNotContainsString('diagnosis', strtolower($explanation));
        $this->assertStringNotContainsString('dementia', strtolower($explanation));
    }

    /**
     * PROOF: AI can summarize activity encouragingly and non-diagnostically.
     */
    public function test_ai_summarizes_activity_with_encouragement(): void
    {
        $user = new User(['id' => 88, 'name' => 'Anuradha Devi']);
        $user->id = 88;

        $summary = $this->service->summarizeActivity($user, 4, 5);

        $this->assertStringContainsString('Wonderful job, Anuradha', $summary);
        $this->assertStringContainsString('4 times this week', $summary);
        $this->assertStringNotContainsString('dementia', strtolower($summary));
    }

    /**
     * PROOF: SafetyRules rule engine blocks AI overrides of safety and clinical boundaries.
     */
    public function test_safety_rules_blocks_ai_clinical_claims(): void
    {
        $decision = $this->safetyRules->evaluate('AI_RESPONSE_INSPECT', [
            'text' => 'You are diagnosed with Alzheimer and need treatment.',
        ], []);

        $this->assertFalse($decision->allowed);
        $this->assertEquals('intercept_ai_output', $decision->action);
        $this->assertEquals('CLINICAL_CLAIM_OR_PRESCRIPTION_DETECTED', $decision->reason);
        $this->assertFalse($decision->isOverridableByAi);
    }
}
