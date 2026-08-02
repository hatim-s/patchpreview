import type { FileDiffMetadata } from "@pierre/diffs";
import type { GitStatusEntry } from "@pierre/trees";
import { FileTree, useFileTree } from "@pierre/trees/react";
import { type MouseEvent, useMemo, useRef } from "react";

type TreeFileListProps = {
  activeFileId: string | null;
  files: FileDiffMetadata[];
  onOpenFile: (file: FileDiffMetadata) => void;
};

function getFileId(file: FileDiffMetadata) {
  return `${file.prevName ?? ""}->${file.name}`;
}

function getStats(file: FileDiffMetadata) {
  return file.hunks.reduce(
    (stats, hunk) => ({
      additions: stats.additions + hunk.additionLines,
      deletions: stats.deletions + hunk.deletionLines,
    }),
    { additions: 0, deletions: 0 },
  );
}

function getGitStatus(file: FileDiffMetadata): GitStatusEntry["status"] {
  if (file.type === "new") return "added";
  if (file.type === "deleted") return "deleted";
  if (file.type === "rename-pure" || file.type === "rename-changed") return "renamed";
  return "modified";
}

export function TreeFileList({
  activeFileId,
  files,
  onOpenFile,
}: TreeFileListProps) {
  const onOpenFileRef = useRef(onOpenFile);
  onOpenFileRef.current = onOpenFile;
  const filesByPath = useMemo(
    () => new Map(files.map((file) => [file.name, file])),
    [files],
  );
  const activePath = files.find((file) => getFileId(file) === activeFileId)?.name;
  const gitStatus = useMemo<GitStatusEntry[]>(
    () => files.map((file) => ({ path: file.name, status: getGitStatus(file) })),
    [files],
  );

  const { model } = useFileTree({
    paths: files.map((file) => file.name),
    density: "compact",
    flattenEmptyDirectories: true,
    gitStatus,
    icons: { set: "standard", colored: false },
    initialExpansion: "open",
    initialSelectedPaths: activePath ? [activePath] : [],
    renderRowDecoration: ({ item }) => {
      const file = filesByPath.get(item.path);
      if (!file) return null;
      const stats = getStats(file);
      return {
        text: `+${stats.additions}  −${stats.deletions}`,
        parts: [
          { text: `+${stats.additions}  `, color: "var(--green)" },
          { text: `−${stats.deletions}`, color: "var(--red)" },
        ],
      };
    },
  });

  const handleTreeClick = (event: MouseEvent<HTMLElement>) => {
    const fileRow = event.nativeEvent
      .composedPath()
      .find(
        (entry): entry is HTMLElement =>
          entry instanceof HTMLElement && entry.dataset.itemType === "file",
      );
    const selectedFile = fileRow?.dataset.itemPath
      ? filesByPath.get(fileRow.dataset.itemPath)
      : undefined;
    if (selectedFile) onOpenFileRef.current(selectedFile);
  };

  return (
    <FileTree
      model={model}
      className="pierre-tree"
      aria-label="Changed files tree"
      onClick={handleTreeClick}
    />
  );
}
