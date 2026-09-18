<?php

namespace Tests\Unit\RBAC;

use App\Enums\LinkStatus;
use App\Enums\UserRole;
use App\Models\CaregiverPatientLink;
use App\Models\ClinicalReport;
use App\Models\CognitiveSession;
use App\Models\User;
use App\Models\UserProfile;
use App\Policies\ClinicalReportPolicy;
use App\Policies\CognitiveSessionPolicy;
use App\Policies\UserProfilePolicy;
use Mockery;
use PHPUnit\Framework\TestCase;

class HealthWorkerRBACTest extends TestCase
{
    protected ClinicalReportPolicy $clinicalPolicy;
    protected CognitiveSessionPolicy $sessionPolicy;
    protected UserProfilePolicy $profilePolicy;

    protected User $healthWorker;
    protected User $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->clinicalPolicy = new ClinicalReportPolicy();
        $this->sessionPolicy = new CognitiveSessionPolicy();
        $this->profilePolicy = new UserProfilePolicy();

        $this->healthWorker = new User(['id' => 401, 'name' => 'CHW Anita', 'role' => UserRole::HealthWorker]);
        $this->healthWorker->id = 401;
        $this->healthWorker->role = UserRole::HealthWorker;

        $this->patient = new User(['id' => 501, 'name' => 'Patient Biren', 'role' => UserRole::Patient]);
        $this->patient->id = 501;
        $this->patient->role = UserRole::Patient;
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * PROOF: Health Worker accesses ONLY explicitly authorized clinical information.
     */
    public function test_health_worker_accesses_clinical_reports_only_with_explicit_authorization(): void
    {
        $report = new ClinicalReport(['user_id' => 501]);
        $report->user_id = 501;

        $mockLink = Mockery::mock('alias:App\Models\CaregiverPatientLink');

        // Case A: No active link or clinical authorization
        $mockLink->shouldReceive('where->where->where->first')
            ->once()
            ->andReturn(null);

        $this->assertFalse(
            $this->clinicalPolicy->view($this->healthWorker, $report),
            'Health Worker without active link must be denied access to clinical report.'
        );

        // Case B: Explicitly authorized link
        $authorizedLink = new CaregiverPatientLink([
            'status' => LinkStatus::Active,
            'permissions' => ['view_clinical_reports' => true],
        ]);
        $authorizedLink->status = LinkStatus::Active;
        $authorizedLink->permissions = ['view_clinical_reports' => true];

        $mockLink->shouldReceive('where->where->where->first')
            ->once()
            ->andReturn($authorizedLink);

        $this->assertTrue(
            $this->clinicalPolicy->view($this->healthWorker, $report),
            'Health Worker with explicit clinical authorization must be granted access.'
        );
    }

    /**
     * PROOF: Health Worker CANNOT complete games as the patient.
     */
    public function test_health_worker_cannot_complete_games_as_patient(): void
    {
        $this->assertFalse(
            $this->sessionPolicy->create($this->healthWorker),
            'Health Worker must not complete games on behalf of a patient.'
        );
    }

    /**
     * PROOF: Health Worker CAN create/analyze clinical reports.
     */
    public function test_health_worker_can_create_clinical_reports(): void
    {
        $this->assertTrue(
            $this->clinicalPolicy->create($this->healthWorker),
            'Health Worker must be permitted to create and analyze clinical reports.'
        );
    }

    /**
     * PROOF: Health Worker CANNOT modify patient profile or personal settings.
     */
    public function test_health_worker_cannot_modify_patient_profile(): void
    {
        $profile = new UserProfile(['user_id' => 501]);
        $profile->user_id = 501;

        $this->assertFalse(
            $this->profilePolicy->update($this->healthWorker, $profile),
            'Health Worker must not modify patient personal account profile settings.'
        );
    }
}
