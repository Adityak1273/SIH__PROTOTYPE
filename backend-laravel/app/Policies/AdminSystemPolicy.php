<?php

namespace App\Policies;

use App\Models\User;

class AdminSystemPolicy
{
    /**
     * Determine if a user can perform system administration.
     * Allowed only for Users with the Admin role.
     */
    public function manageSystem(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine if an admin can view unrestricted medical data.
     * Enforces the core requirement: Admins have NO unrestricted medical-data access by default.
     */
    public function accessMedicalData(User $user): bool
    {
        return false;
    }
}
