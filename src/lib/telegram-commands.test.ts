import { describe, expect, it } from "vitest";
import { classifyPhaseOneCommand, phaseOneReply } from "./telegram-commands";

describe("classifyPhaseOneCommand", () => {
  it.each([
    ["/start", "start"],
    [" /HELP ", "help"],
    ["/status@private_finance_bot", "status"],
    ["tea 45", "unknown"],
  ] as const)("classifies %s", (input, expected) => {
    expect(classifyPhaseOneCommand(input)).toBe(expected);
  });
});

describe("phaseOneReply", () => {
  it("makes the no-write boundary explicit", () => {
    expect(phaseOneReply("status")).toContain("Financial writes: disabled");
    expect(phaseOneReply("unknown")).toContain("not enabled");
  });
});
