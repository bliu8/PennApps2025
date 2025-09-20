import axios from 'axios';

import { config } from './config.js';

type GeminiGenerationConfig = {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
};

type GeminiContent = {
  role: 'user' | 'model' | 'system';
  parts: { text: string }[];
};

async function callGemini(prompt: string, options?: { systemInstruction?: string; generationConfig?: GeminiGenerationConfig }) {
  if (!config.googleGeminiApiKey) {
    return null;
  }

  const body: {
    contents: GeminiContent[];
    systemInstruction?: GeminiContent;
    generationConfig?: GeminiGenerationConfig;
  } = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
  };

  if (options?.systemInstruction) {
    body.systemInstruction = {
      role: 'system',
      parts: [{ text: options.systemInstruction }],
    };
  }

  if (options?.generationConfig) {
    body.generationConfig = options.generationConfig;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${config.googleGeminiModel}:generateContent`;

  const response = await axios.post(endpoint, body, {
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.googleGeminiApiKey,
    },
  });

  const candidate = response.data?.candidates?.[0];
  if (!candidate) {
    return null;
  }

  const text = candidate.content?.parts?.map((part: { text?: string }) => part.text).filter(Boolean).join('\n');
  return text ?? null;
}

export type AiNudge = {
  id: string;
  headline: string;
  supportingCopy: string;
  defaultLabel: string;
};

const FALLBACK_NUDGES: AiNudge[] = [
  {
    id: 'default-window',
    headline: 'Default to a 30-minute pickup window',
    supportingCopy: 'Momentum matters. Keeping the window short tells neighbors you are ready right away.',
    defaultLabel: 'Suggested · 30 min',
  },
  {
    id: 'location-hint',
    headline: 'Name a public handoff spot upfront',
    supportingCopy: 'Library foyers, grocery vestibules, or guard desks feel safest for everyone involved.',
    defaultLabel: 'Popular · Public lobby',
  },
  {
    id: 'impact-tally',
    headline: 'Mention the climate win in your description',
    supportingCopy: 'A quick note like “saves 3 lbs of food waste” boosts claim rates by 18% in pilots.',
    defaultLabel: 'Add an impact stat',
  },
];

export async function fetchGeminiNudges(context: {
  persona: string;
  sustainabilityFocus: string;
  count?: number;
}): Promise<{ nudges: AiNudge[]; source: 'live' | 'fallback' }> {
  const count = context.count ?? 3;
  if (!config.googleGeminiApiKey) {
    return { nudges: FALLBACK_NUDGES.slice(0, count), source: 'fallback' };
  }

  const prompt = `Generate ${count} concise behavioral nudges to help a community food sharing host named ${context.persona}.
Focus on ${context.sustainabilityFocus} and keeping items out of landfills.
Respond ONLY as minified JSON with a "nudges" array. Each nudge must include:
{"id": string,"headline": string,"supportingCopy": string,"defaultLabel": string}.
Avoid markdown, explanations, or extra keys.`;

  try {
    const result = await callGemini(prompt, {
      systemInstruction:
        'You are a sustainability coach helping volunteers share surplus food safely. Keep tone encouraging, mobile-friendly, and under 140 characters per field.',
      generationConfig: { temperature: 0.65, topP: 0.9, maxOutputTokens: 512 },
    });

    if (!result) {
      return { nudges: FALLBACK_NUDGES.slice(0, count), source: 'fallback' };
    }

    const parsed = JSON.parse(result) as { nudges?: AiNudge[] };
    if (!parsed.nudges || parsed.nudges.length === 0) {
      return { nudges: FALLBACK_NUDGES.slice(0, count), source: 'fallback' };
    }

    const normalized = parsed.nudges
      .filter((nudge) => nudge.id && nudge.headline && nudge.supportingCopy)
      .slice(0, count)
      .map((nudge) => ({
        ...nudge,
        defaultLabel: nudge.defaultLabel || 'Tap to apply',
      }));

    if (normalized.length === 0) {
      return { nudges: FALLBACK_NUDGES.slice(0, count), source: 'fallback' };
    }

    return { nudges: normalized, source: 'live' };
  } catch (error) {
    console.error('Gemini nudge generation failed', error);
    return { nudges: FALLBACK_NUDGES.slice(0, count), source: 'fallback' };
  }
}

export type ListingAssist = {
  titleSuggestion: string;
  quantityLabel: string;
  pickupWindowLabel: string;
  pickupLocationHint: string;
  impactNarrative: string;
  tags: string[];
};

const FALLBACK_LISTING_ASSIST: ListingAssist = {
  titleSuggestion: 'Rescue these sealed snacks',
  quantityLabel: 'Ready for pickup — 30 min window',
  pickupWindowLabel: 'Today · next 30 minutes',
  pickupLocationHint: 'Public lobby table near the elevators',
  impactNarrative: 'Keeps perfectly good food in circulation and saves roughly 2.4 lbs of emissions.',
  tags: ['ZeroWaste', 'FastPickup', 'SealedOnly'],
};

export async function fetchListingAssist(input: {
  title?: string;
  quantityLabel?: string;
  allergens?: string[];
  notes?: string | null;
  expiryDate?: string | null;
}): Promise<{ suggestion: ListingAssist; source: 'live' | 'fallback' }> {
  if (!config.googleGeminiApiKey) {
    return { suggestion: FALLBACK_LISTING_ASSIST, source: 'fallback' };
  }

  const prompt = `You craft mobile-friendly listing defaults for a zero-waste food sharing app.
Create JSON with keys titleSuggestion, quantityLabel, pickupWindowLabel, pickupLocationHint, impactNarrative, tags (array of strings).
Context:
title: ${input.title ?? 'Unknown item'}
quantity: ${input.quantityLabel ?? 'Not provided'}
allergens: ${(input.allergens ?? []).join(', ') || 'none declared'}
notes: ${input.notes ?? 'n/a'}
expiry: ${input.expiryDate ?? 'not provided'}
Constraints: keep everything under 120 characters except impactNarrative (max 200 chars). Mention sustainability wins.`;

  try {
    const result = await callGemini(prompt, {
      systemInstruction:
        'Return only valid JSON. Encourage public pickups, highlight climate impact, and respect allergen clarity. Never invent expiry guarantees.',
      generationConfig: { temperature: 0.6, topP: 0.8, maxOutputTokens: 640 },
    });

    if (!result) {
      return { suggestion: FALLBACK_LISTING_ASSIST, source: 'fallback' };
    }

    const parsed = JSON.parse(result) as ListingAssist;
    const sanitized: ListingAssist = {
      titleSuggestion: parsed.titleSuggestion?.trim() || FALLBACK_LISTING_ASSIST.titleSuggestion,
      quantityLabel: parsed.quantityLabel?.trim() || FALLBACK_LISTING_ASSIST.quantityLabel,
      pickupWindowLabel: parsed.pickupWindowLabel?.trim() || FALLBACK_LISTING_ASSIST.pickupWindowLabel,
      pickupLocationHint: parsed.pickupLocationHint?.trim() || FALLBACK_LISTING_ASSIST.pickupLocationHint,
      impactNarrative: parsed.impactNarrative?.trim() || FALLBACK_LISTING_ASSIST.impactNarrative,
      tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags.slice(0, 4) : FALLBACK_LISTING_ASSIST.tags,
    };

    return { suggestion: sanitized, source: 'live' };
  } catch (error) {
    console.error('Gemini listing assist failed', error);
    return { suggestion: FALLBACK_LISTING_ASSIST, source: 'fallback' };
  }
}

export { FALLBACK_NUDGES, FALLBACK_LISTING_ASSIST };
