/**
 * Standard shape for IndustryPlaybook.valuePropsByDepartment (JSON).
 * Key = department key (e.g. "Manufacturing", "IT"); value = structured value props.
 */
export type DepartmentValueProps = {
  headline: string;
  pitch: string;
  bullets?: string[];
  cta?: string;
};

export type ValuePropsByDepartment = Record<string, DepartmentValueProps>;
