# Project Rules

- **Avoid Artifacts for Implementation Plans:** Do not create `implementation_plan.md` artifacts with `request_feedback = true` when presenting a plan. Instead, present the plan as plain text in the conversation directly so the user can manually approve it.
- **Prefix Code Execution:** Whenever you are about to start writing the actual code (not the plan), you must explicitly start your text response with the sentence: "بدأت كتابة الكود الفعلي الآن". This ensures clarity for the user that execution has begun.
