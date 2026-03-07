import { getPeriodName } from "../../src/utils/date-utils";

describe("getPeriodName", () => {
  it.each([
    [0, "Night"],
    [1, "Night"],
    [5, "Night"],
    [6, "Morning"],
    [11, "Morning"],
    [12, "Afternoon"],
    [17, "Afternoon"],
    [18, "Evening"],
    [23, "Evening"],
  ] as [number, "Night" | "Morning" | "Afternoon" | "Evening"][])(
    "hour %i -> %s",
    (hour, expected) => {
      expect(getPeriodName(hour)).toBe(expected);
    }
  );
});
