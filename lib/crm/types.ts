export type CrmSource = 'salesforce' | 'hubspot';

export type CrmContact = {
  id: string; // CRM-native id (Salesforce Id or HubSpot id)
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  phone: string | null;
  companyId?: string | null; // CRM company/account id
  companyName?: string | null;
  /** Segment/buying group name from CRM (e.g. Salesforce custom field AgentPilot_Segment__c) */
  segmentName?: string | null;
};

export type CrmAccount = {
  id: string;
  name: string;
  domain?: string | null;
  website?: string | null;
  /** Segment/buying group from Account custom field (e.g. AgentPilot_Segment__c) */
  segmentName?: string | null;
};

export type CrmImportResult = {
  created: number;
  updated: number;
  errors: string[];
};

export type CrmPushResult = {
  pushed: number;
  errors: string[];
};
