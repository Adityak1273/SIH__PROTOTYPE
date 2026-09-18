<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\CaregiverPatientLink;
use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DemoAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $demoPassword = env('DEMO_PASSWORD', 'CognitiveCare2026!');

        // 1. Seed Demo Patient
        $patient = User::firstOrCreate(
            ['username' => 'patient.demo'],
            [
                'name' => 'Aditya Sharma',
                'email' => 'patient.demo@cognitivecare.ner',
                'password' => Hash::make($demoPassword),
                'role' => UserRole::Patient,
            ]
        );

        UserProfile::updateOrCreate(
            ['user_id' => $patient->id],
            [
                'id' => (string) Str::uuid(),
                'full_name' => 'Aditya Sharma',
                'preferred_name' => 'Aditya',
                'date_of_birth' => '1952-03-10',
                'age' => 74,
                'gender' => 'Male',
                'phone' => '9876543210',
                'email' => 'patient.demo@cognitivecare.ner',
                'address' => 'House 42, Green Valley Lane',
                'city' => 'Guwahati',
                'state' => 'Assam',
                'country' => 'India',
                'emergency_contact' => '9876543211',
                'emergency_relationship' => 'Daughter',
                'caregiver_info' => [
                    'caregiver_name' => 'Pooja Sharma',
                    'relationship' => 'Daughter',
                    'caregiver_phone' => '9876543211',
                    'emergency_contact' => '9876543211',
                    'emergency_relationship' => 'Daughter',
                    'family_notes' => 'Prefers morning sessions after a cup of warm tea.',
                ],
                'health_background' => [
                    'known_conditions' => ['Mild memory forgetfulness', 'Hypertension'],
                    'medications' => ['Amlodipine 5mg morning'],
                    'allergies' => ['Penicillin'],
                    'hearing_difficulty' => 'Mild in left ear',
                    'vision_difficulty' => 'Uses reading glasses',
                    'sleep_concerns' => 'Wakes early at 5am',
                ],
                'daily_life_background' => [
                    'hobbies' => ['Gardening', 'Listening to old Hindi songs', 'Morning tea'],
                    'daily_routine' => 'Wake up at 5:30am, morning garden walk, breakfast at 8am, cognitive workout at 10am.',
                    'familiar_objects' => ['Silver tea set', 'Grandmother wall clock'],
                    'family_members' => ['Pooja (daughter)', 'Rahul (son)', 'Aarav (grandson)'],
                    'important_places' => ['Kamakhya Temple', 'Brahmaputra riverfront'],
                ],
                'accessibility_settings' => [
                    'font_size' => 'large',
                    'high_contrast' => false,
                    'reduced_motion' => false,
                    'voice_enabled' => true,
                    'voice_speed' => 0.9,
                    'voice_volume' => 1.0,
                    'subtitles' => true,
                    'large_controls' => true,
                    'simplified_ui' => false,
                ],
                'privacy_preferences' => [
                    'consent_status' => true,
                    'caregiver_sharing' => true,
                    'clinical_sharing' => true,
                    'momo_consent' => true,
                ],
                'region' => 'Assam',
                'preferred_language' => 'en-IN',
                'additional_languages' => ['hi-IN', 'as-IN'],
                'momo_name' => 'Momo',
                'voice_preference' => 'default',
                'profile_complete' => true,
                'onboarding_step' => 7,
                'profile_completion_pct' => 95,
            ]
        );

        // 2. Seed Demo Caregiver
        $caregiver = User::firstOrCreate(
            ['username' => 'caregiver.demo'],
            [
                'name' => 'Pooja Sharma',
                'email' => 'caregiver.demo@cognitivecare.ner',
                'password' => Hash::make($demoPassword),
                'role' => UserRole::Caregiver,
            ]
        );

        UserProfile::updateOrCreate(
            ['user_id' => $caregiver->id],
            [
                'id' => (string) Str::uuid(),
                'full_name' => 'Pooja Sharma',
                'preferred_name' => 'Pooja',
                'date_of_birth' => '1982-08-14',
                'age' => 44,
                'gender' => 'Female',
                'phone' => '9876543211',
                'email' => 'caregiver.demo@cognitivecare.ner',
                'city' => 'Guwahati',
                'state' => 'Assam',
                'country' => 'India',
                'region' => 'Assam',
                'preferred_language' => 'en-IN',
                'momo_name' => 'Momo',
                'profile_complete' => true,
                'onboarding_step' => 7,
                'profile_completion_pct' => 100,
            ]
        );

        // 3. Link Caregiver to Patient
        CaregiverPatientLink::firstOrCreate(
            [
                'caregiver_user_id' => $caregiver->id,
                'patient_user_id' => $patient->id,
            ],
            [
                'id' => (string) Str::uuid(),
                'relationship' => 'Daughter',
                'status' => 'active',
                'permissions' => ['view_progress', 'manage_reminders', 'receive_alerts', 'export_reports'],
            ]
        );
    }
}
