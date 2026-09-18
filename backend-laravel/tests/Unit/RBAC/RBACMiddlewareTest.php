<?php

namespace Tests\Unit\RBAC;

use App\Enums\UserRole;
use App\Http\Middleware\BlockAdminMedicalAccess;
use App\Http\Middleware\EnsurePatientLinked;
use App\Http\Middleware\EnsureUserRole;
use App\Models\User;
use Illuminate\Http\Request;
use Mockery;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpKernel\Exception\HttpException;

class RBACMiddlewareTest extends TestCase
{
    protected EnsureUserRole $roleMiddleware;
    protected BlockAdminMedicalAccess $blockAdminMiddleware;
    protected EnsurePatientLinked $linkedMiddleware;

    protected function setUp(): void
    {
        parent::setUp();

        $this->roleMiddleware = new EnsureUserRole();
        $this->blockAdminMiddleware = new BlockAdminMedicalAccess();
        $this->linkedMiddleware = new EnsurePatientLinked();
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_ensure_user_role_allows_authorized_role(): void
    {
        $patient = new User(['id' => 1, 'role' => UserRole::Patient]);
        $patient->role = UserRole::Patient;

        $request = Request::create('/patient/dashboard', 'GET');
        $request->setUserResolver(fn() => $patient);

        $executed = false;
        $response = $this->roleMiddleware->handle($request, function ($req) use (&$executed) {
            $executed = true;
            return response('OK');
        }, 'patient');

        $this->assertTrue($executed);
        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_ensure_user_role_aborts_unauthorized_role_with_403(): void
    {
        $this->expectException(HttpException::class);

        $caregiver = new User(['id' => 2, 'role' => UserRole::Caregiver]);
        $caregiver->role = UserRole::Caregiver;

        $request = Request::create('/patient/dashboard', 'GET');
        $request->setUserResolver(fn() => $caregiver);

        $this->roleMiddleware->handle($request, fn() => response('OK'), 'patient');
    }

    public function test_block_admin_medical_access_blocks_admin_with_403(): void
    {
        $this->expectException(HttpException::class);

        $admin = new User(['id' => 3, 'role' => UserRole::Admin]);
        $admin->role = UserRole::Admin;

        $request = Request::create('/api/v1/cognitive-sessions', 'GET');
        $request->setUserResolver(fn() => $admin);

        $this->blockAdminMiddleware->handle($request, fn() => response('OK'));
    }

    public function test_block_admin_medical_access_allows_patient_and_caregiver(): void
    {
        $patient = new User(['id' => 4, 'role' => UserRole::Patient]);
        $patient->role = UserRole::Patient;

        $request = Request::create('/api/v1/cognitive-sessions', 'GET');
        $request->setUserResolver(fn() => $patient);

        $executed = false;
        $response = $this->blockAdminMiddleware->handle($request, function ($req) use (&$executed) {
            $executed = true;
            return response('OK');
        });

        $this->assertTrue($executed);
        $this->assertEquals(200, $response->getStatusCode());
    }

    public function test_ensure_patient_linked_blocks_unlinked_caregiver_with_403(): void
    {
        $this->expectException(HttpException::class);

        $caregiver = new User(['id' => 5, 'role' => UserRole::Caregiver]);
        $caregiver->role = UserRole::Caregiver;

        $patient = new User(['id' => 6, 'role' => UserRole::Patient]);
        $patient->id = 6;

        $request = Request::create('/caregiver/patients/6', 'GET');
        $request->setUserResolver(fn() => $caregiver);
        $request->setRouteResolver(function () use ($patient) {
            $route = Mockery::mock();
            $route->shouldReceive('parameter')->with('patient')->andReturn($patient);
            return $route;
        });

        $mockLink = Mockery::mock('alias:App\Models\CaregiverPatientLink');
        $mockLink->shouldReceive('where->where->where->exists')
            ->andReturn(false);

        $this->linkedMiddleware->handle($request, fn() => response('OK'));
    }
}
