# Core workflow scope

FIR Saathi remains a prototype for source-preserving complaint intake, not an official filing channel or legal decision system. The following changes are therefore designed to help a citizen state the facts and help a constable identify what still needs human review; they never determine whether an FIR is registered.

The Ministry of Home Affairs’ Digital Police service describes citizen-facing functions including complaint filing, complaint-status access, FIR copies, and information concerning missing people and stolen or recovered property. This supports three workflow priorities: an explicit case reference, source-separated incident context, and transparent readiness for human review.[1]

The Bharatiya Nagarik Suraksha Sanhita lists “Information in cognizable cases” in its investigation chapter and separately identifies requirements around time, place, and person in the contents of a charge. The prototype uses those concepts only as prompts for clearer factual context; it does not make a legal classification or create an official record.[2]

| Product improvement | Guardrail |
|---|---|
| Explicit language selection for ten Indian languages | The language is never guessed, and no source transcript is translated or rewritten. |
| Optional incident time, place, people/vehicle, property, injury/safety, and follow-up contact context | The context is stored as citizen-provided information, separately from the verbatim source statement. |
| Clarification response after a constable return | The response is appended as a separate citizen field and audit event; the original transcript is immutable. |
| Review-readiness checklist | It only surfaces missing factual areas for a constable; it cannot register an FIR or decide a BNS section. |

## References

[1]: https://digitalpolice.gov.in/ "Digital Police — Ministry of Home Affairs / NCRB"
[2]: https://www.indiacode.nic.in/bitstream/123456789/20099/1/A202346.pdf "Bharatiya Nagarik Suraksha Sanhita, 2023"
