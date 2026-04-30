import type { ResultStatusCounts } from '../types/api';
import { sendMail } from './email';

export interface ContactRequestFormValues {
  name: string;
  email: string;
  companyName: string;
  reasonOrGoal: string;
}

export interface ContactRequestPayload extends ContactRequestFormValues {
  runId: string;
  target: string;
  source: 'audit_results' | 'report_page';
  cacheHit: boolean;
  resultCounts: ResultStatusCounts;
}

const BLOCKED_TARGET_PATTERNS = [
  /(^|\.)google\./i,
  /(^|\.)facebook\./i,
  /(^|\.)meta\./i,
  /(^|\.)amazon\./i,
  /(^|\.)aws\.amazon\.com$/i,
];

export function isBlockedContactTarget(target: string): boolean {
  return BLOCKED_TARGET_PATTERNS.some((pattern) => pattern.test(target));
}

export async function submitContactRequest(payload: ContactRequestPayload): Promise<void> {
  const contactEmail: string = payload.email;
  const contactReason: string = payload.reasonOrGoal;
  const contactName: string = payload.name;
  const contactCompany: string = payload.companyName;
  const testId: string = payload.runId;
  const testCached: boolean = payload.cacheHit;
  
  const ownerEmail = {
    name: 'Darrion, W',
    email: 'whitfieldd@artisanhosting.net',
    message: `Hey wake up ! 
  Somebody wants you to review a website audit! This is what I know:
  
  Name: ${contactName}
  Email: ${contactEmail}
  Company: ${contactCompany || 'I didn;t catch that part'}
  Reason: ${contactReason}
  
  And this was the test they ran: ${testId} and the test cache status was ${testCached}
  Do your research and get em champ!`
  };

  const leadEmail = {
    name: contactName,
    email: contactEmail,
    message: `Hi ${contactName},

Thanks for reaching out about your audit for ${payload.target}${contactCompany ? ` at ${contactCompany}` : ''}.

I saw your note about what you want to understand or fix:
${contactReason}

We’ll take a closer look at the results and follow up with guidance on what stands out, what matters most, and what to tackle first. For reference, your audit run ID is ${testId}.

Here’s the quick snapshot we’re working from:
- Pass: ${payload.resultCounts.pass}
- Warn: ${payload.resultCounts.warn}
- Fail: ${payload.resultCounts.fail}
- Error: ${payload.resultCounts.error}

Talk soon,
Artisan Hosting`
  };


  sendMail(ownerEmail);
  sendMail(leadEmail);
  
  // This is the single frontend handoff point for future email delivery.
  // Page-level submit handlers build the payload from the currently loaded
  // report so custom delivery logic has access to the runId and result summary.
  // Keep runId in this payload so downstream systems can fetch the full report.
}
