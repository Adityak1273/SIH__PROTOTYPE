<?php

use App\Http\Controllers\Caregiver\AlertController;
use App\Http\Controllers\Caregiver\DashboardController as CaregiverDashboard;
use App\Http\Controllers\Caregiver\PatientLinkController;
use App\Http\Controllers\Caregiver\ReportExportController;
use App\Http\Controllers\Patient\DashboardController as PatientDashboard;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/patient/dashboard');
});

// Patient Web Application Shell (Preserved elderly UX + Momo Companion)
Route::middleware(['auth', 'role:patient'])->prefix('patient')->name('patient.')->group(function () {
    Route::get('/dashboard', [PatientDashboard::class, 'index'])->name('dashboard');
});

// Caregiver Portal
Route::middleware(['auth', 'role:caregiver,health_worker'])->prefix('caregiver')->name('caregiver.')->group(function () {
    Route::get('/dashboard', [CaregiverDashboard::class, 'index'])->name('dashboard');
    Route::get('/patients/{patient}', [CaregiverDashboard::class, 'patientOverview'])
        ->middleware('linked.patient')
        ->name('patient.overview');

    // Caregiver Notes
    Route::post('/patients/{patient}/notes', [CaregiverDashboard::class, 'storeNote'])
        ->middleware('linked.patient')
        ->name('patients.notes.store');

    // Report Exports
    Route::get('/patients/{patient}/export', [ReportExportController::class, 'export'])
        ->middleware('linked.patient')
        ->name('patients.export');
    Route::get('/patients/{patient}/export/csv', [ReportExportController::class, 'exportCsv'])
        ->middleware('linked.patient')
        ->name('patients.export.csv');

    // Caregiver Links
    Route::post('/links/invite', [PatientLinkController::class, 'invite'])->name('links.invite');
    Route::delete('/links/{link}', [PatientLinkController::class, 'revoke'])->name('links.revoke');

    // Caregiver Alerts
    Route::get('/alerts', [AlertController::class, 'index'])->name('alerts.index');
    Route::patch('/alerts/{alert}/ack', [AlertController::class, 'acknowledge'])->name('alerts.ack');
});

