# Spec Implementation Process

Now that we have a spec and tasks list ready for implementation, we will proceed with implementation of this spec by following this multi-phase process:

PHASE 1: Determine which task group(s) from tasks.md should be implemented
PHASE 2: Delegate implementation to the implementer subagent
PHASE 2.5: Simplify modified code
PHASE 3: After ALL task groups have been implemented, delegate to implementation-verifier to produce the final verification report.

Follow each of these phases and their individual workflows IN SEQUENCE:

## Multi-Phase Process

### PHASE 1: Determine which task group(s) to implement

First, check if the user has already provided instructions about which task group(s) to implement.

**If the user HAS provided instructions:** Proceed to PHASE 2 to delegate implementation of those specified task group(s) to the **implementer** subagent.

**If the user has NOT provided instructions:**

Read `agent-os/specs/[this-spec]/tasks.md` to review the available task groups, then output the following message to the user and WAIT for their response:

```
Should we proceed with implementation of all task groups in tasks.md?

If not, then please specify which task(s) to implement.
```

### PHASE 2: Delegate implementation to the implementer subagent

Use the Task tool with `subagent_type: "implementer"` to spawn the implementer subagent.

In the Task prompt, provide:

- The specific task group(s) from `agent-os/specs/[this-spec]/tasks.md` including the parent task, all sub-tasks, and any sub-bullet points
- The path to this spec's documentation: `agent-os/specs/[this-spec]/spec.md`
- The path to this spec's requirements: `agent-os/specs/[this-spec]/planning/requirements.md`
- The path to this spec's visuals (if any): `agent-os/specs/[this-spec]/planning/visuals`

Instruct the subagent to:

1. Analyze the provided spec.md, requirements.md, and visuals (if any)
2. Analyze patterns in the codebase according to its built-in workflow
3. Implement the assigned task group according to requirements and standards
4. Update `agent-os/specs/[this-spec]/tasks.md` to mark completed tasks with `- [x]`

### PHASE 2.5: Simplify modified code

Before proceeding to verification, use the Task tool with `subagent_type: "code-simplifier:code-simplifier"` to analyze and simplify all code that was modified during this implementation session.

The agent should focus on:

- Code changes made during this implementation
- Improving clarity and maintainability
- Ensuring consistency with existing patterns

Once simplification is complete, proceed to PHASE 3.

### PHASE 3: Produce the final verification report

IF ALL task groups in tasks.md are marked complete with `- [x]`, then proceed with this step. Otherwise, return to PHASE 1.

Assuming all tasks are marked complete, use the Task tool with `subagent_type: "implementation-verifier"` to spawn the verification subagent.

In the Task prompt, provide:

- The path to this spec: `agent-os/specs/[this-spec]`
  Instruct the subagent to do the following:
  1. Run all of its final verifications according to its built-in workflow
  2. Produce the final verification report in `agent-os/specs/[this-spec]/verifications/final-verification.md`.
