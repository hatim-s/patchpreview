export const samplePatch = `diff --git a/src/format.ts b/src/format.ts
index 27a9c31..139e7fb 100644
--- a/src/format.ts
+++ b/src/format.ts
@@ -1,6 +1,7 @@
 export function formatTitle(value: string) {

-  return value.trim();
+  const normalized = value.trim();
+  return normalized || "Untitled";
 }

diff --git a/src/components/EmptyState.tsx b/src/components/EmptyState.tsx
new file mode 100644
index 0000000..153b39a
--- /dev/null
+++ b/src/components/EmptyState.tsx
@@ -0,0 +1,5 @@
+export function EmptyState() {
+  return <p>No results yet.</p>;
+}
+
+export default EmptyState;
`;
