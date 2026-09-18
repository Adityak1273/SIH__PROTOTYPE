<?php

namespace Tests\Unit;

use App\Models\CaregiverPatientLink;
use App\Models\User;
use App\Policies\CaregiverPatientPolicy;
use App\Services\CaregiverDashboardService;
use App\Services\CaregiverFollowUpSignalService;
use Mockery;
use PHPUnit\Framework\TestCase;

class CaregiverDashboardServiceTest extends TestCase
{
    protected CaregiverDashboardService $dashboardService;
    protected CaregiverFollowUpSignalService $signalService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->signalService = new CaregiverFollowUpSignalService();
        $this->dashboardService = new CaregiverDashboardService($this->signalService);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_caregiver_policy_restricts_view_to_active_links_only(): void
    {
        $policy = new CaregiverPatientPolicy();
        $caregiver = new User(['id' => 10, 'name' => 'Caregiver Sita']);
        $caregiver->id = 10;

        $patient = new User(['id' => 20, 'name' => 'Patient Ramesh']);
        $patient->id = 20;

        // Mock CaregiverPatientLink static query
        $mockLink = Mockery::mock('alias:App\Models\CaregiverPatientLink');

        // When link exists and is active -> allow
        $mockLink->shouldReceive('where->where->where->exists')
            ->once()
            ->andReturn(true);

        $this->assertTrue($policy->view($caregiver, $patient));
        $this->assertTrue($policy->createNote($caregiver, $patient));
        $this->assertTrue($policy->exportReport($caregiver, $patient));
    }

    public function test_caregiver_policy_denies_view_when_link_is_not_active(): void
    {
        $policy = new CaregiverPatientPolicy();
        $caregiver = new User(['id' => 10, 'name' => 'Caregiver Sita']);
        $caregiver->id = 10;

        $unlinkedPatient = new User(['id' => 30, 'name' => 'Stranger Patient']);
        $unlinkedPatient->id = 30;

        $mockLink = Mockery::mock('alias:App\Models\CaregiverPatientLink');
        $mockLink->shouldReceive('where->where->where->exists')
            ->once()
            ->andReturn(false);

        $this->assertFalse($policy->view($caregiver, $unlinkedPatient));
    }
}
