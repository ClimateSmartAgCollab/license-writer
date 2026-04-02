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

  it("prints Builder-native conditional syntax without limitation", () => {
    const template = "{% if holder.active %}{{ holder.name }}{% else %}Unknown{% endif %}";
    const parsed = jinjaAdapter.parse(template);
    const projection = builderAdapter.print(parsed);

    expect(projection.isLimited).toBe(false);
    expect(projection.text).toContain("[If: holder.active]");
    expect(projection.text).toContain("[Else]");
    expect(projection.text).toContain("[End if]");
  });

  it("parses Builder-native conditional syntax back to Jinja", () => {
    const builderText = [
      "[If: holder.active]",
      "[holder.name]",
      "[Else if: holder.pending]",
      "Pending",
      "[Else]",
      "Unknown",
      "[End if]",
    ].join("\n");

    const parsed = builderAdapter.parse(builderText);
    const jinja = jinjaAdapter.print(parsed);
    expect(jinja).toContain("{% if holder.active %}");
    expect(jinja).toContain("{{ holder.name }}");
    expect(jinja).toContain("{% elif holder.pending %}");
    expect(jinja).toContain("{% else %}");
    expect(jinja).toContain("{% endif %}");
  });
});
