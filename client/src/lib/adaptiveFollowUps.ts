import type { CitizenContext, DraftField } from "@shared/firSaathi";

export type AdaptiveFollowUp = {
  key: keyof CitizenContext;
  label: string;
  helper: string;
  placeholder: string;
  maxLength: number;
};

const highValueFollowUps: AdaptiveFollowUp[] = [
  { key: "incident_when", label: "When did this happen?", helper: "Optional. Give a date, time, or approximate time only if you want to add it.", placeholder: "For example: yesterday evening, around 7 pm", maxLength: 240 },
  { key: "incident_where", label: "Where did this happen?", helper: "Optional. An area, street, landmark, or route can help human review.", placeholder: "Area, street, landmark, or route", maxLength: 320 },
  { key: "injury_or_safety", label: "Was there an injury, threat, or safety concern?", helper: "Optional. For immediate danger, contact emergency services (112 in India); this prototype cannot dispatch help.", placeholder: "Only details you want to add", maxLength: 500 },
];

const transcriptCoverage: Record<AdaptiveFollowUp["key"], DraftField["key"][]> = {
  incident_when: ["date_time"],
  incident_where: ["location"],
  injury_or_safety: ["injury", "threat_or_safety"],
  people_or_vehicle: ["person", "vehicle"],
  property_or_loss: ["property"],
  follow_up_contact: [],
};

const citizenChosenContext: AdaptiveFollowUp[] = [
  { key: "people_or_vehicle", label: "Add people or vehicle details", helper: "Optional. Add this only if it is useful and safe to share.", placeholder: "Person, vehicle, colour, identifier, or other detail", maxLength: 500 },
  { key: "property_or_loss", label: "Add property or loss details", helper: "Optional. Add an item, document, amount, or identifier only if it applies.", placeholder: "Property, document, amount, or identifier", maxLength: 500 },
  { key: "follow_up_contact", label: "Add a safe follow-up contact", helper: "Optional. Do not add passwords, PINs, OTPs, or other secrets.", placeholder: "Phone, email, or a safe time to contact you", maxLength: 320 },
];

function coveredContextKeys(fields: Array<Pick<DraftField, "key" | "source">>) {
  const transcriptKeys = new Set(fields.filter((field) => field.source === "source_statement").map((field) => field.key));
  const contextKeys = new Set(fields.filter((field) => field.source === "citizen_context").map((field) => field.key.replace(/^context_/, "")));
  return { transcriptKeys, contextKeys };
}

export function getAdaptiveFollowUps(fields: Array<Pick<DraftField, "key" | "source">>) {
  const { transcriptKeys, contextKeys } = coveredContextKeys(fields);
  return highValueFollowUps.filter((question) => !contextKeys.has(question.key) && !transcriptCoverage[question.key].some((key) => transcriptKeys.has(key)));
}

export function getCitizenChosenContextOptions(fields: Array<Pick<DraftField, "key" | "source">>) {
  const { transcriptKeys, contextKeys } = coveredContextKeys(fields);
  return citizenChosenContext.filter((question) => !contextKeys.has(question.key) && !transcriptCoverage[question.key].some((key) => transcriptKeys.has(key)));
}
