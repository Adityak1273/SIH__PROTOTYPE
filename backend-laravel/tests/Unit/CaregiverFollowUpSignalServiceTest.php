<?php

namespace Tests\Unit;

use App\Models\CaregiverAlert;
use App\Models\CognitiveSession;
use App\Models\User;
use App\Services\CaregiverFollowUpSignalService;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Collection;
use Mockery;
use PHPUnit\Framework\TestCase;

class CaregiverFollowUpSignalServiceTest extends TestCase
{
    protected CaregiverFollowUpSignalService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CaregiverFollowUpSignalService();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_inactivity_signal_generated_when_no_sessions_exist(): void
    {
        $patient = new User(['id' => 1, 'name' => 'Alice Sharma']);
        $patient->id = 1;

        // Mock CognitiveSession static query
        $mockQuery = Mockery::mock('alias:App\Models\CognitiveSession');
        $mockQuery->shouldReceive('where->orderByDesc->take->get')
            ->andReturn(new Collection([]));

        $mockAlertQuery = Mockery::mock('alias:App\Models\CaregiverAlert');
        $mockAlertQuery->shouldReceive('where->where->where->whereNull->count')
            ->andReturn(0);

        $signals = $this->service->generateSignals($patient);

        $this->assertTrue($signals->contains('id', 'sig_inactivity'));
        $inactivitySignal = $signals->firstWhere('id', 'sig_inactivity');
        $this->assertEquals('Break in Daily Routine', $inactivitySignal['title']);
        $this->assertEquals('attention', $inactivitySignal['severity']);
        $this->assertFalse($inactivitySignal['requires_physician']);
    }

    public function test_signals_never_contain_dementia_diagnosis_or_staging_claims(): void
    {
        $patient = new User(['id' => 2, 'name' => 'Grandpa Mohan']);
        $patient->id = 2;

        $session1 = new CognitiveSession(['accuracy' => 0.30, 'avg_response_time_seconds' => 7.5, 'completed_at' => Carbon::now()->subDays(1)]);
        $session2 = new CognitiveSession(['accuracy' => 0.40, 'avg_response_time_seconds' => 8.0, 'completed_at' => Carbon::now()->subDays(2)]);
        $session3 = new CognitiveSession(['accuracy' => 0.35, 'avg_response_time_seconds' => 9.0, 'completed_at' => Carbon::now()->subDays(3)]);

        $mockQuery = Mockery::mock('alias:App\Models\CognitiveSession');
        $mockQuery->shouldReceive('where->orderByDesc->take->get')
            ->andReturn(new Collection([$session1, $session2, $session3]));

        $mockAlertQuery = Mockery::mock('alias:App\Models\CaregiverAlert');
        $mockAlertQuery->shouldReceive('where->where->where->whereNull->count')
            ->andReturn(1);

        $signals = $this->service->generateSignals($patient);

        foreach ($signals as $signal) {
            $text = strtolower($signal['title'] . ' ' . $signal['message'] . ' ' . $signal['recommended_action']);
            $this->assertStringNotContainsString('dementia', $text);
            $this->assertStringNotContainsString('alzheimer', $text);
            $this->assertStringNotContainsString('stage 1', $text);
            $this->assertStringNotContainsString('stage 2', $text);
            $this->assertStringNotContainsString('stage 3', $text);
            $this->assertStringNotContainsString('clinical diagnosis', $text);
        }
    }
}
