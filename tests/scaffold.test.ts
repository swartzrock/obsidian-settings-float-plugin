import { describe, expect, it } from "vitest";
import manifest from "../manifest.json";
import packageJson from "../package.json";
import versions from "../versions.json";

describe("scaffold metadata", () => {
  it("keeps the plugin id stable", () => {
    expect(manifest.id).toBe("settings-float");
    expect(manifest.name).toBe("Settings Float");
  });

  it("maps the current version to the minimum supported Obsidian version", () => {
    expect(packageJson.version).toBe(manifest.version);
    expect(versions[manifest.version as keyof typeof versions]).toBe(
      manifest.minAppVersion,
    );
  });
});
