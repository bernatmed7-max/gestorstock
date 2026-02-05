import { Role } from '@/types';

/**
 * Check if user has required role in workspace
 */
export function hasRole(userRole: Role, requiredRole: Role): boolean {
    const roleHierarchy: Record<Role, number> = {
        viewer: 1,
        agent: 2,
        admin: 3,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user can perform action
 */
export function canPerformAction(
    userRole: Role,
    action: 'view' | 'edit' | 'delete' | 'manage'
): boolean {
    switch (action) {
        case 'view':
            return hasRole(userRole, 'viewer');
        case 'edit':
            return hasRole(userRole, 'agent');
        case 'delete':
        case 'manage':
            return hasRole(userRole, 'admin');
        default:
            return false;
    }
}
