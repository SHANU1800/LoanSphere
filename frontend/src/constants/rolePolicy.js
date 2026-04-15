export const ROLES = {
  ADMIN: 'admin',
  AGENT: 'agent',
  UNDERWRITER: 'underwriter',
  CREDIT_MANAGER: 'credit_manager',
  FINANCE: 'finance',
  OPERATIONS: 'operations',
  COMPLIANCE_OFFICER: 'compliance_officer',
  CUSTOMER: 'customer',
};

export const ALL_ROLES = Object.values(ROLES);

export const ROLE_GROUPS = {
  STAFF: [
    ROLES.ADMIN,
    ROLES.AGENT,
    ROLES.UNDERWRITER,
    ROLES.CREDIT_MANAGER,
    ROLES.FINANCE,
    ROLES.OPERATIONS,
    ROLES.COMPLIANCE_OFFICER,
  ],
  LOAN_DECISION: [ROLES.ADMIN, ROLES.UNDERWRITER, ROLES.CREDIT_MANAGER],
  AUDIT: [ROLES.ADMIN, ROLES.COMPLIANCE_OFFICER],
};

export const ROUTE_ROLES = {
  dashboard: ALL_ROLES,
  applications: ALL_ROLES,
  applicationsNew: [ROLES.ADMIN, ROLES.AGENT],
  applicationDetail: ALL_ROLES,
  underwriting: [ROLES.ADMIN, ROLES.UNDERWRITER, ROLES.CREDIT_MANAGER],
  disbursal: [ROLES.ADMIN, ROLES.UNDERWRITER, ROLES.CREDIT_MANAGER, ROLES.OPERATIONS],
  fees: [ROLES.ADMIN, ROLES.FINANCE],
  emiCalculator: [ROLES.ADMIN, ROLES.AGENT],
  agents: [ROLES.ADMIN],
  notifications: [ROLES.ADMIN, ROLES.OPERATIONS, ROLES.COMPLIANCE_OFFICER, ROLES.AGENT, ROLES.CUSTOMER],
  reports: [ROLES.ADMIN, ROLES.FINANCE, ROLES.OPERATIONS, ROLES.COMPLIANCE_OFFICER],
  audit: [ROLES.ADMIN, ROLES.COMPLIANCE_OFFICER],
  settings: ALL_ROLES,
};

export function hasRoleAccess(userRole, allowedRoles = []) {
  if (!userRole) return false;
  if (!allowedRoles || allowedRoles.length === 0) return true;
  return allowedRoles.includes(userRole);
}
