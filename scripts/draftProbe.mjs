import "dotenv/config";
import { generateSafeDraft } from "../server/drafting";

const draft = await generateSafeDraft({
  language: "en",
  sourceStatement: "Synthetic verification only: a bicycle was damaged outside a library at noon.",
});

console.log(JSON.stringify({
  fields: draft.fields,
  missingDetails: draft.missingDetails,
  followUpQuestions: draft.followUpQuestions,
  bnsSuggestions: draft.bnsSuggestions,
}, null, 2));
