import { describe, expect, it } from "vitest";
import { jinjaAdapter } from "@/lib/template/jinjaAdapter";
import { builderAdapter } from "@/lib/template/builderAdapter";

describe("jinjaAdapter conditionals", () => {
  it("round-trips nested for + if blocks", () => {
    const template = [
      "Hello {{ holder.name }}",
      "{% for item in items %}",
      "{% if item.active %}",
      "{{ item.label }}",
      "{% elif item.pending %}",
      "Pending",
      "{% else %}",
      "N/A",
      "{% endif %}",
      "{% endfor %}",
    ].join("\n");

    const parsed = jinjaAdapter.parse(template);
    const printed = jinjaAdapter.print(parsed);

    expect(printed).toBe(template);
  });

  it("does not warn unsupported for valid conditional tags", () => {
    const template = "{% if holder.active %}{{ holder.name }}{% else %}Unknown{% endif %}";
    const parsed = jinjaAdapter.parse(template);
    const warnings = jinjaAdapter.findWarnings(parsed);

    expect(warnings).toEqual([]);
  });

  it("marks builder projection limited when conditionals are present", () => {
    const template = "{% if holder.active %}{{ holder.name }}{% endif %}";
    const parsed = jinjaAdapter.parse(template);
    const projection = builderAdapter.print(parsed);

    expect(projection.isLimited).toBe(true);
    expect(projection.text).toBe(template);
    if (!projection.isLimited) {
      throw new Error("Expected limited builder projection");
    }
    expect(projection.warning.code).toBe("builder_limited");
  });
});
