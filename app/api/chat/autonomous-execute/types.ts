/**
 * Stream event types for autonomous play execution.
 * Client can use these to render the same card UI as the demo artifact.
 */

export type ContactCardResult = {
  type: 'contact_card';
  data: {
    name: string;
    title: string;
    company: string;
    previousRole?: string;
    education?: string;
    background?: string;
    email: string;
    linkedin?: string;
  };
};

export type EmailResult = {
  type: 'email';
  data: { to: string; subject: string; body: string };
};

export type BriefingSection = { heading: string; content: string };
export type BriefingResult = {
  type: 'briefing';
  data: { title: string; sections: BriefingSection[] };
};

export type LinkedInResult = {
  type: 'linkedin';
  data: { note: string };
};

export type MeetingResult = {
  type: 'meeting';
  data: {
    title: string;
    duration: string;
    suggestedDate: string;
    agenda: string;
    attendees: string;
  };
};

export type StepResult =
  | ContactCardResult
  | EmailResult
  | BriefingResult
  | LinkedInResult
  | MeetingResult;

export type StepEvent =
  | {
      type: 'start';
      playName: string;
      contactName: string;
      accountName: string;
      divisionName: string;
      productName?: string;
      stepCount: number;
    }
  | {
      type: 'step_start';
      stepIndex: number;
      stepName: string;
      channel: string;
      actionId: string;
    }
  | { type: 'step_thinking'; stepIndex: number; message: string }
  | { type: 'step_result'; stepIndex: number; result: StepResult }
  | { type: 'step_complete'; stepIndex: number; completionMessage: string }
  | {
      type: 'done';
      summary: {
        stepsCompleted: number;
        emailsGenerated: number;
        engagementArcDays?: number;
      };
    };
