<?php

namespace Tests\Unit\RBAC;

use App\Enums\UserRole;
use App\Models\ClinicalReport;
use App\Models\CognitiveSession;
use App\Models\Reminder;
use App\Models\User;
use App\Models\UserProfile;
use App\Policies\AdminSystemPolicy;
use App\Policies\CaregiverPatientPolicy;
use App\Policies\ClinicalReportPolicy;
use App\Policies\CognitiveSessionPolicy;
use App\Policies\ReminderPolicy;
use App\Policies\UserProfilePolicy;
use Mockery;
use PHPUnit\Framework\TestCase;

class AdminMedicalBarrierTest extends TestCase
{
    protected AdminSystemPolicy $adminPolicy;
    protected CognitiveSessionPolicy $sessionPolicy;
    protected ClinicalReportPolicy $clinicalPolicy;
    protected ReminderPolicy $reminderPolicy;
    protected UserProfilePolicy $profilePolicy;
    protected CaregiverPatientPolicy $caregiverPatientPolicy;

    protected User $admin;
    protected User $patient;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminPolicy = new AdminSystemPolicy();
        $this->sessionPolicy = new CognitiveSessionPolicy();
        $this->clinicalPolicy = new ClinicalReportPolicy();
        $this->reminderPolicy = new ReminderPolicy();
        $this->profilePolicy = new UserProfilePolicy();
        $this->caregiverPatientPolicy = new CaregiverPatientPolicy();

        $this->admin = new User(['id' => 1, 'name' => 'Admin Boss', 'role' => UserRole::Admin]);
        $this->admin->id = 1;
        $this->admin->role = UserRole::Admin;

        $this->patient = new User(['id' => 99, 'name' => 'Patient Elder', 'role' => UserRole::Patient]);
        $this->patient->id = 99;
        $this->patient->role = UserRole::Patient;
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * PROOF: System Administrator is granted system administration capabilities.
     */
    public function test_admin_can_perform_system_administration(): void
    {
        $this->assertTrue(
            $this->adminPolicy->manageSystem($this->admin),
            'Admin role must be permitted to perform system administration.'
        );

        $this->assertFalse(
            $this->adminPolicy->manageSystem($this->patient),
            'Patient must not perform system administration.'
        );
    }

    /**
     * PROOF: Admin has NO unrestricted medical-data access by default.
     */
    public function test_admin_is_strictly_denied_medical_and_clinical_data_access(): void
    {
        // 1. General policy check
        $this->assertFalse(
            $this->adminPolicy->accessMedicalData($this->admin),
            'Admins must not have unrestricted medical data access by default.'
        );

        // 2. Cognitive sessions barrier
        $session = new CognitiveSession(['user_id' => 99]);
        $session->user_id = 99;

        $this->assertFalse(
            $this->sessionPolicy->view($this->admin, $session),
            'Admin must be denied access to view patient cognitive training sessions.'
        );
        $this->assertFalse(
            $this->sessionPolicy->create($this->admin),
            'Admin must be denied ability to complete games.'
        );

        // 3. Clinical reports barrier
        $report = new ClinicalReport(['user_id' => 99]);
        $report->user_id = 99;

        $this->assertFalse(
            $this->clinicalPolicy->view($this->admin, $report),
            'Admin must be denied access to view clinical diagnostic reports.'
        );
        $this->assertFalse(
            $this->clinicalPolicy->create($this->admin),
            'Admin must be denied ability to author clinical reports.'
        );

        // 4. Reminders barrier
        $reminder = new Reminder(['user_id' => 99]);
        $reminder->user_id = 99;

        $this->assertFalse(
            $this->reminderPolicy->view($this->admin, $reminder),
            'Admin must be denied access to patient routine/medication reminders.'
        );
        $this->assertFalse(
            $this->reminderPolicy->update($this->admin, $reminder),
            'Admin must not modify patient reminders.'
        );

        // 5. Personal profile medical barrier
        $profile = new UserProfile(['user_id' => 99]);
        $profile->user_id = 99;

        $this->assertFalse(
            $this->profilePolicy->view($this->admin, $profile),
            'Admin must not view personal patient profile details by default.'
        );

        // 6. Caregiver overview barrier
        $this->assertFalse(
            $this->caregiverPatientPolicy->view($this->admin, $this->patient),
            'Admin must not view caregiver clinical overview for a patient by default.'
        );
    }
}
