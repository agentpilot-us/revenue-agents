import type { CompanyDepartment, DepartmentType } from '@prisma/client';

/**
 * Map CompanyDepartment.type (and optional customName) to the key used in
 * IndustryPlaybook.valuePropsByDepartment. Playbooks use labels like "Manufacturing", "IT";
 * we map enum + customName to those keys for value-props API and multi-dept config.
 */
const DEPARTMENT_TYPE_TO_PLAYBOOK_KEY: Record<DepartmentType, string> = {
  MANUFACTURING_OPERATIONS: 'Manufacturing',
  INDUSTRIAL_DESIGN: 'Industrial Design',
  IT_DATA_CENTER: 'IT',
  AUTONOMOUS_VEHICLES: 'Autonomous Vehicles',
  SUPPLY_CHAIN: 'Supply Chain',
  CONNECTED_SERVICES: 'Connected Services',
  ENGINEERING: 'Engineering',
  PRODUCT: 'Product',
  SALES: 'Sales',
  MARKETING: 'Marketing',
  CUSTOMER_SUCCESS: 'Customer Success',
  REVENUE_OPERATIONS: 'Revenue Operations',
  EXECUTIVE_LEADERSHIP: 'Executive Leadership',
  FINANCE: 'Finance',
  LEGAL: 'Legal',
  HR: 'HR',
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
