Update all `@figma/*` packages to their latest versions.

Steps:

1. Run `pnpm update @figma/*` to update all Figma packages to their latest compatible versions.
2. Run `pnpm install` to ensure the lockfile is consistent.
3. Run `pnpm dev` to verify the dev server still starts successfully.
4. If there are breaking changes, check the package changelogs and help the user fix any issues.

After updating, tell the user which packages were updated and to what versions.
