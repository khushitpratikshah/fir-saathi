import "dotenv/config";
import {
  addCitizenClarification,
  confirmComplaint,
  correctComplaintField,
  createComplaint,
  getComplaintDetail,
  returnComplaint,
  verifyComplaint,
} from "../server/db";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const created = await createComplaint({
    language: "en",
    sourceTranscript: "Synthetic functional verification only: a bicycle was damaged outside a library at noon.",
    consent: true,
    context: {
      incident_when: "today at noon",
      incident_where: "outside the central library",
      property_or_loss: "blue bicycle",
    },
  });

  const first = await getComplaintDetail(created.publicId);
  assert(first, "Created complaint cannot be retrieved.");
  assert(first.complaint.status === "needs_citizen_confirmation", "Created complaint did not enter citizen-confirmation status.");
  assert(first.complaint.sourceTranscript.includes("Synthetic functional verification only"), "Source transcript was not preserved.");
  assert(first.fields.some((field) => field.fieldKey === "context_incident_where" && field.source === "citizen_context"), "Citizen-provided incident context was not stored separately.");

  await confirmComplaint(created.publicId);
  const afterConfirm = await getComplaintDetail(created.publicId);
  assert(afterConfirm?.complaint.status === "ready_for_review", "Citizen confirmation did not open the review state.");

  await correctComplaintField({
    publicId: created.publicId,
    fieldKey: "manual_location",
    label: "Manual review note",
    value: "library exterior",
    actorLabel: "Functional audit constable",
    reason: "Synthetic audit correction",
  });
  const afterCorrection = await getComplaintDetail(created.publicId);
  assert(afterCorrection?.fields.some((field) => field.fieldKey === "manual_location" && field.verificationState === "unverified"), "Correction did not create an unverified audit field.");

  await returnComplaint({ publicId: created.publicId, actorLabel: "Functional audit constable", reason: "Synthetic audit return" });
  const afterReturn = await getComplaintDetail(created.publicId);
  assert(afterReturn?.complaint.status === "returned", "Return-for-correction did not set the returned status.");

  await addCitizenClarification({ publicId: created.publicId, clarification: "The bicycle was locked beside the library entrance." });
  const afterClarification = await getComplaintDetail(created.publicId);
  assert(afterClarification?.fields.some((field) => field.fieldKey.startsWith("clarification_") && field.source === "citizen_context"), "Citizen clarification was not stored separately.");
  assert(afterClarification?.audit.some((event) => event.eventType === "clarification_added"), "Clarification audit event was not persisted.");

  await confirmComplaint(created.publicId);
  await verifyComplaint({ publicId: created.publicId, actorLabel: "Functional audit constable" });
  const final = await getComplaintDetail(created.publicId);
  assert(final?.complaint.status === "verified", "Verification did not set the verified status.");
  assert(final.fields.every((field) => field.verificationState === "officer_verified"), "Verification did not update field verification states.");
  assert(final.audit.some((event) => event.eventType === "created") && final.audit.some((event) => event.eventType === "verified") && final.audit.some((event) => event.eventType === "field_corrected"), "Expected audit events were not persisted.");

  console.log(JSON.stringify({ publicId: created.publicId, finalStatus: final.complaint.status, auditEvents: final.audit.length, sourcePreserved: true }, null, 2));
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
