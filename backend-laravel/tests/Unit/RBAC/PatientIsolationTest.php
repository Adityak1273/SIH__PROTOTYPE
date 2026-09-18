<?php

namespace Tests\Unit\RBAC;

use App\Enums\UserRole;
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

class PatientIsolationTest extends TestCase
{
    protected CognitiveSessionPolicy $sessionPolicy;
    protected ReminderPolicy $reminderPolicy;
    protected UserProfilePolicy $profilePolicy;
    protected ClinicalReportPolicy $clinicalPolicy;
    protected CaregiverPatientPolicy $caregiverPatientPolicy;

    protected User $patientA;
    protected User $patientB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->sessionPolicy = new CognitiveSessionPolicy();
        $this->reminderPolicy = new ReminderPolicy();
        $this->profilePolicy = new UserProfilePolicy();
        $this->clinicalPolicy = new ClinicalReportPolicy();
        $this->caregiverPatientPolicy = new CaregiverPatientPolicy();

        $this->patientA = new User(['id' => 101, 'name' => 'Patient Alice', 'role' => UserRole::Patient]);
        $this->patientA->id = 101;
        $this->patientA->role = UserRole::Patient;

        $this->patientB = new User(['id' => 102, 'name' => 'Patient Bob', 'role' => UserRole::Patient]);
        $this->patientB->id = 102;
        $this->patientB->role = UserRole::Patient;
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    /**
     * PROOF: Cross-patient session viewing is strictly impossible.
     */
    public function test_patient_cannot_view_another_patients_cognitive_session(): void
    {
        $sessionB = new CognitiveSession(['user_id' => 102]);
        $sessionB->user_id = 102;

        $this->assertFalse(
            $this->sessionPolicy->view($this->patientA, $sessionB),
            'Patient A must not be allowed to view Patient B’s cognitive session.'
        );

        $sessionA = new CognitiveSession(['user_id' => 101]);
        $sessionA->user_id = 101;

        $this->assertTrue(
            $this->sessionPolicy->view($this->patientA, $sessionA),
            'Patient A must be allowed to view their own cognitive session.'
        );
    }

    /**
     * PROOF: Patient can complete games for themselves only.
     */
    public function test_patient_can_create_and_complete_games_for_self(): void
    {
        $this->assertTrue(
            $this->sessionPolicy->create($this->patientA),
            'Patient A must be permitted to complete games.'
        );
    }

    /**
     * PROOF: Cross-patient reminder access is strictly impossible.
     */
    public function test_patient_cannot_view_update_or_delete_another_patients_reminder(): void
    {
        $reminderB = new Reminder(['user_id' => 102, 'title' => 'Morning Pill']);
        $reminderB->user_id = 102;

        // View denied
        $this->assertFalse(
            $this->reminderPolicy->view($this->patientA, $reminderB),
            'Patient A must not be allowed to view Patient B’s reminder.'
        );

        // Update denied
        $this->assertFalse(
            $this->reminderPolicy->update($this->patientA, $reminderB),
            'Patient A must not be allowed to update Patient B’s reminder.'
        );

        // Delete denied
        $this->assertFalse(
            $this->reminderPolicy->delete($this->patientA, $reminderB),
            'Patient A must not be allowed to delete Patient B’s reminder.'
        );

        // Create for other patient denied
        $this->assertFalse(
            $this->reminderPolicy->create($this->patientA, $this->patientB),
            'Patient A must not be allowed to create a reminder targeting Patient B.'
        );

        // Own reminder allowed
        $reminderA = new Reminder(['user_id' => 101, 'title' => 'Alice Hydration']);
        $reminderA->user_id = 101;

        $this->assertTrue($this->reminderPolicy->view($this->patientA, $reminderA));
        $this->assertTrue($this->reminderPolicy->update($this->patientA, $reminderA));
        $this->assertTrue($this->reminderPolicy->delete($this->patientA, $reminderA));
        $this->assertTrue($this->reminderPolicy->create($this->patientA, $this->patientA));
    }

    /**
     * PROOF: Cross-patient profile and settings manipulation is strictly impossible.
     */
    public function test_patient_cannot_view_or_modify_another_patients_profile_and_settings(): void
    {
        $profileB = new UserProfile(['user_id' => 102, 'preferred_language' => 'as']);
        $profileB->user_id = 102;

        $this->assertFalse(
            $this->profilePolicy->view($this->patientA, $profileB),
            'Patient A must not view Patient B’s profile.'
        );

        $this->assertFalse(
            $this->profilePolicy->update($this->patientA, $profileB),
            'Patient A must not update Patient B’s profile or language settings.'
        );

        $profileA = new UserProfile(['user_id' => 101, 'preferred_language' => 'en-IN']);
        $profileA->user_id = 101;

        $this->assertTrue(
            $this->profilePolicy->view($this->patientA, $profileA),
            'Patient A must be permitted to view own profile.'
        );
        $this->assertTrue(
            $this->profilePolicy->update($this->patientA, $profileA),
            'Patient A must be permitted to update own profile and settings.'
        );
    }

    /**
     * PROOF: Cross-patient clinical report access is strictly impossible.
     */
    public function test_patient_cannot_view_another_patients_clinical_report(): void
    {
        $reportB = new ClinicalReport(['user_id' => 102]);
        $reportB->user_id = 102;

        $this->assertFalse(
            $this->clinicalPolicy->view($this->patientA, $reportB),
            'Patient A must not view Patient B’s clinical report.'
        );

        $reportA = new ClinicalReport(['user_id' => 101]);
        $reportA->user_id = 101;

        $this->assertTrue(
            $this->clinicalPolicy->view($this->patientA, $reportA),
            'Patient A must be permitted to view own clinical report.'
        );
    }

    /**
     * PROOF: Patient cannot inspect another patient via caregiver endpoints.
     */
    public function test_patient_cannot_view_another_patients_caregiver_dashboard(): void
    {
        $this->assertFalse(
            $this->caregiverPatientPolicy->view($this->patientA, $this->patientB),
            'Patient A must not be allowed to access Patient B’s caregiver view.'
        );

        $this->assertTrue(
            $this->caregiverPatientPolicy->view($this->patientA, $this->patientA),
            'Patient A can access own view.'
        );
    }
}
