import { DepartmentType } from '@prisma/client';
import { prisma } from '../lib/db';

// Department templates by industry vertical
const departmentTemplates = {
  'SaaS/Tech GTM Teams': [
    { type: DepartmentType.SALES, description: 'Revenue-generating sales org' },
    { type: DepartmentType.MARKETING, description: 'Demand generation and brand' },
    { type: DepartmentType.CUSTOMER_SUCCESS, description: 'Retention and expansion' },
    { type: DepartmentType.REVENUE_OPERATIONS, description: 'GTM enablement and ops' },
  ],

  'Automotive/Manufacturing': [
    { type: DepartmentType.AUTONOMOUS_VEHICLES, description: 'Self-driving and ADAS' },
    { type: DepartmentType.MANUFACTURING_OPERATIONS, description: 'Production and quality control' },
    { type: DepartmentType.INDUSTRIAL_DESIGN, description: 'Product design and R&D' },
    { type: DepartmentType.IT_DATA_CENTER, description: 'Infrastructure and cloud' },
  ],
};

export { departmentTemplates, prisma };
