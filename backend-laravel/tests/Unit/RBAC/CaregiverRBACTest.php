<?php

namespace Tests\Unit\RBAC;

use App\Enums\LinkStatus;
use App\Enums\UserRole;
use App\Models\CaregiverPatientLink;
use App\Models\ClinicalReport;
use App\Models\CognitiveSession;
use App\Models\Reminder;
use App\Models\User;
use App\Models\UserProfile;
use App\Policies\CaregiverPatientPolicy;
use App\Policies\ClinicalReportPolicy;
use App\Policies\CognitiveSessionPolicy;
use App\Policies\ReminderPolicy;
use App\Policies\UserProfilePolicy;
use Mockery;
use PHPUnit\Framework\TestCase;

class CaregiverRBACTest extends TestCase
{
    protected CaregiverPatientPolicy $caregiverPatientPolicy;
    protected CognitiveSessionPolicy $sessionPolicy;
    protected ReminderPolicy $reminderPolicy;
    protected ClinicalReportPolicy $clinicalPolicy;
    protected UserProfilePolicy $profilePolicy;

    protected User $caregiver;
    protected User $linkedPatient;
    protected User $unlinkedPatient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->caregiverPatientPolicy = new CaregiverPatientPolicy();
        $this->sessionPolicy = new CognitiveSessionPolicy();
        $this->reminderPolicy = new ReminderPolicy();
        $this->clinicalPolicy = new ClinicalReportPolicy();
        $this->profilePolicy = new UserProfilePolicy();

        $this->caregiver = new User(['id' => 201, 'name' => 'Caregiver Sita', 'role' => UserRole::Caregiver]);
        $this->caregiver->id = 201;
        $this->caregiver->role = UserRole::Caregiver;

        $this->linkedPatient = new User(['id' => 301, 'name' => 'Patient Ramesh', 'role' => UserRole::Patient]);
        $this->linkedPatient->id = 301;
        $this->linkedPatient->role = UserRole::Patient;

        $this->unlinkedPatient = new User(['id' => 302, 'name' => 'Patient Stranger', 'role' => UserRole::Patient]);
        $this->unlinkedPatient->id = 302;
        $this->unlinkedPatient->role = UserRole::Patient;
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * PROOF: Caregiver CANNOT access unlinked patients.
     */
    public function test_caregiver_cannot_access_unlinked_patient(): void
    {
        $mockLink = Mockery::mock('alias:App\Models\CaregiverPatientLink');

        // Link does NOT exist for unlinked patient
        $mockLink->shouldReceive('where->where->where->exists')
            ->andReturn(false);

        $mockLink->shouldReceive('where->where->where->first')
            ->andReturn(null);

        $this->assertFalse(
            $this->caregiverPatientPolicy->view($this->caregiver, $this->unlinkedPatient),
            'Caregiver must not access an unlinked patient’s overview.'
        );

        $sessionStranger = new CognitiveSession(['user_id' => 302]);
        $sessionStranger->user_id = 302;

        $this->assertFalse(
            $this->sessionPolicy->view($this->caregiver, $sessionStranger),
            'Caregiver must not view an unlinked patient’s cognitive session.'
        );
    }

    /**
     * PROOF: Caregiver CANNOT play or complete games as the patient.
     */
    public function test_caregiver_cannot_complete_games_as_patient(): void
    {
        $this->assertFalse(
            $this->sessionPolicy->create($this->caregiver),
            'Caregivers must not be permitted to complete games. Only patients can complete exercises.'
        );
    }

    /**
     * PROOF: Caregiver can view progress ONLY when permitted.
     */
    public function test_caregiver_views_progress_only_when_permitted(): void
    {
        $session = new CognitiveSession(['user_id' => 301]);
        $session->user_id = 301;

        $linkWithProgress = new CaregiverPatientLink([
            'status' => LinkStatus::Active,
            'permissions' => ['can_view_trends' => true],
        ]);
        $linkWithProgress->status = LinkStatus::Active;
        $linkWithProgress->permissions = ['can_view_trends' => true];

        $mockLink = Mockery::mock('alias:App\Models\CaregiverPatientLink');
        $mockLink->shouldReceive('where->where->where->first')
            ->once()
            ->andReturn($linkWithProgress);

        $this->assertTrue(
            $this->sessionPolicy->view($this->caregiver, $session),
            'Caregiver with trend permissions must view linked patient session.'
        );
    }

    /**
     * PROOF: Caregiver can manage reminders ONLY when permitted.
     */
    public function test_caregiver_can_manage_reminders_only_when_permission_granted(): void
    {
        $reminder = new Reminder(['user_id' => 301]);
        $reminder->user_id = 301;

        // Permitted link
        $permittedLink = new CaregiverPatientLink([
            'status' => LinkStatus::Active,
            'permissions' => ['can_manage_reminders' => true],
        ]);
        $permittedLink->status = LinkStatus::Active;
        $permittedLink->permissions = ['can_manage_reminders' => true];

        $mockLink = Mockery::mock('alias:App\Models\CaregiverPatientLink');
        $mockLink->shouldReceive('where->where->where->first')
            ->once()
            ->andReturn($permittedLink);

        $this->assertTrue(
            $this->reminderPolicy->update($this->caregiver, $reminder),
            'Caregiver with can_manage_reminders=true must be allowed to update reminder.'
        );

        // Disallowed link
        $deniedLink = new CaregiverPatientLink([
            'status' => LinkStatus::Active,
            'permissions' => ['can_manage_reminders' => false],
        ]);
        $deniedLink->status = LinkStatus::Active;
        $deniedLink->permissions = ['can_manage_reminders' => false];

        $mockLink->shouldReceive('where->where->where->first')
            ->once()
            ->andReturn($deniedLink);

        $this->assertFalse(
            $this->reminderPolicy->update($this->caregiver, $reminder),
            'Caregiver with can_manage_reminders=false must be denied reminder update.'
        );
    }

    /**
     * PROOF: Caregiver cannot modify patient personal settings or profile.
     */
    public function test_caregiver_cannot_modify_patient_profile_settings(): void
    {
        $profile = new UserProfile(['user_id' => 301]);
        $profile->user_id = 301;

        $this->assertFalse(
            $this->profilePolicy->update($this->caregiver, $profile),
            'Caregiver must not be allowed to modify patient account settings or profile.'
        );
    }

    /**
     * PROOF: Caregiver can view clinical reports ONLY with explicit permission.
     */
    public function test_caregiver_views_clinical_reports_only_with_explicit_authorization(): void
    {
        $report = new ClinicalReport(['user_id' => 301]);
        $report->user_id = 301;

        $unauthorizedLink = new CaregiverPatientLink([
            'status' => LinkStatus::Active,
            'permissions' => ['view_clinical_reports' => false],
        ]);
        $unauthorizedLink->status = LinkStatus::Active;
        $unauthorizedLink->permissions = ['view_clinical_reports' => false];

        $mockLink = Mockery::mock('alias:App\Models\CaregiverPatientLink');
        $mockLink->shouldReceive('where->where->where->first')
            ->once()
            ->andReturn($unauthorizedLink);

        $this->assertFalse(
            $this->clinicalPolicy->view($this->caregiver, $report),
            'Caregiver without explicit view_clinical_reports permission must be denied access.'
        );

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
            $this->clinicalPolicy->view($this->caregiver, $report),
            'Caregiver with explicit view_clinical_reports permission must be allowed access.'
        );
    }
}
