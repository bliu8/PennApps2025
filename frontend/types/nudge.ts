export type AiNudge = {
  id: string;
  headline: string;
  supportingCopy: string;
  defaultLabel: string;
};

export type NudgesResponse = {
  nudges: AiNudge[];
  source: 'live' | 'fallback';
};
