import type { CompanyDepartment, DepartmentType } from '@prisma/client';

/**
 * Map CompanyDepartment.type (and optional customName) to the key used in
 * IndustryPlaybook.valuePropsByDepartment. Playbooks use labels like "Manufacturing", "IT";
 * we map enum + customName to those keys for value-props API and multi-dept config.
 */
const DEPARTMENT_TYPE_TO_PLAYBOOK_KEY: Record<DepartmentType, string> = {
  SALES: 'Sales',
  MARKETING: 'Marketing',
  CUSTOMER_SUCCESS: 'Customer Success',
  REVENUE_OPERATIONS: 'Revenue Operations',
  PRODUCT: 'Product',
  ENGINEERING: 'Engineering',
  IT_INFRASTRUCTURE: 'IT',
  FINANCE: 'Finance',
  LEGAL: 'Legal',
  HR: 'HR',
  SUPPLY_CHAIN: 'Supply Chain',
  OPERATIONS: 'Operations',
  SECURITY: 'Security',
  DATA_ANALYTICS: 'Data & Analytics',
  PROCUREMENT: 'Procurement',
  PARTNERSHIPS: 'Partnerships',
  EXECUTIVE_LEADERSHIP: 'Executive Leadership',
  OTHER: 'Other',
};

/**
 * Returns the playbook key for a department (used to look up valuePropsByDepartment[key]).
 * Prefers customName when it looks like a display name; otherwise uses the type mapping.
 */
export function getDepartmentPlaybookKey(dept: Pick<CompanyDepartment, 'type' | 'customName'>): string {
  if (dept.customName?.trim()) {
    return dept.customName.trim();
  }
  return DEPARTMENT_TYPE_TO_PLAYBOOK_KEY[dept.type] ?? dept.type;
}
