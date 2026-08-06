import { parsePatchFiles } from "@pierre/diffs";
import {
  CodeView,
  type CodeViewDiffItem,
  type CodeViewHandle,
  type FileDiffMetadata,
} from "@pierre/diffs/react";
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CheckIcon,
  ChevronIcon,
  ClipboardIcon,
  CollapseAllIcon,
  CloseIcon,
  EyeIcon,
  FileIcon,
  FilesIcon,
  FlatListIcon,
  MoonIcon,
  MonitorIcon,
  SearchIcon,
  SidebarIcon,
  SunIcon,
  TreeIcon,
  UploadIcon,
  WrapIcon,
} from "./icons";
import { samplePatch } from "./samplePatch";
import { TreeFileList } from "./TreeFileList";

type DiffStyle = "unified" | "split";
type Theme = "light" | "dark";
type ThemePreference = "system" | Theme;
type SidebarView = "flat" | "tree";

type PatchState = {
  contents: string;
  name: string;
};

type FileStats = {
  additions: number;
  deletions: number;
};

const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
const preferencesStorageKey = "patchpreview-preferences";
const legacyPreferencesStorageKey = "patch-viewer-preferences";
const legacyThemeStorageKey = "patch-viewer-theme";

type ViewerPreferences = {
  version: 1;
  diffStyle: DiffStyle;
  themePreference: ThemePreference;
  wrapLines: boolean;
  sidebarView: SidebarView;
  sidebarCollapsed: boolean;
};

const defaultPreferences: ViewerPreferences = {
  version: 1,
  diffStyle: "split",
  themePreference: "system",
  wrapLines: false,
  sidebarView: "tree",
  sidebarCollapsed: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStoredPreferences(): ViewerPreferences {
  try {
    const stored =
      window.localStorage.getItem(preferencesStorageKey) ??
      window.localStorage.getItem(legacyPreferencesStorageKey);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    const legacyTheme = window.localStorage.getItem(legacyThemeStorageKey);

    if (!isRecord(parsed)) {
      return {
        ...defaultPreferences,
        themePreference:
          legacyTheme === "light" || legacyTheme === "dark" || legacyTheme === "system"
            ? legacyTheme
            : defaultPreferences.themePreference,
      };
    }

    return {
      version: 1,
      diffStyle:
        parsed.diffStyle === "unified" || parsed.diffStyle === "split"
          ? parsed.diffStyle
          : defaultPreferences.diffStyle,
      themePreference:
        parsed.themePreference === "light" ||
        parsed.themePreference === "dark" ||
        parsed.themePreference === "system"
          ? parsed.themePreference
          : defaultPreferences.themePreference,
      wrapLines:
        typeof parsed.wrapLines === "boolean"
          ? parsed.wrapLines
          : defaultPreferences.wrapLines,
      sidebarView:
        parsed.sidebarView === "flat" || parsed.sidebarView === "tree"
          ? parsed.sidebarView
          : defaultPreferences.sidebarView,
      sidebarCollapsed:
        typeof parsed.sidebarCollapsed === "boolean"
          ? parsed.sidebarCollapsed
          : defaultPreferences.sidebarCollapsed,
    };
  } catch {
    return defaultPreferences;
  }
}

function nextTheme(theme: ThemePreference): ThemePreference {
  if (theme === "system") return "light";
  if (theme === "light") return "dark";
  return "system";
}

function getFileStats(file: FileDiffMetadata): FileStats {
  return file.hunks.reduce(
    (stats, hunk) => ({
      additions: stats.additions + hunk.additionLines,
      deletions: stats.deletions + hunk.deletionLines,
    }),
    { additions: 0, deletions: 0 },
  );
}

function shortPath(path: string) {
  const parts = path.split("/");
  return parts.length > 3 ? `…/${parts.slice(-3).join("/")}` : path;
}

function getFileId(file: FileDiffMetadata) {
  return `${file.prevName ?? ""}->${file.name}`;
}

function App() {
  const [storedPreferences] = useState(getStoredPreferences);
  const [patch, setPatch] = useState<PatchState>({
    contents: samplePatch,
    name: "example.patch",
  });
  const [diffStyle, setDiffStyle] = useState<DiffStyle>(storedPreferences.diffStyle);
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    storedPreferences.themePreference,
  );
  const [systemTheme, setSystemTheme] = useState<Theme>(
    colorSchemeQuery.matches ? "dark" : "light",
  );
  const [wrapLines, setWrapLines] = useState(storedPreferences.wrapLines);
  const [sidebarView, setSidebarView] = useState<SidebarView>(
    storedPreferences.sidebarView,
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    storedPreferences.sidebarCollapsed,
  );
  const [collapsedFileIds, setCollapsedFileIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [viewedFileIds, setViewedFileIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [focusedFileId, setFocusedFileId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const codeViewRef = useRef<CodeViewHandle<undefined>>(null);

  const loadPatch = useCallback((contents: string, name: string) => {
    try {
      const parsed = parsePatchFiles(contents, `${name}-${contents.length}`, true);
      if (!parsed.some((entry) => entry.files.length > 0)) {
        throw new Error("No file changes were found in this patch.");
      }
      setPatch({ contents, name });
      setLoadError(null);
      setQuery("");
      setCollapsedFileIds(new Set());
      setViewedFileIds(new Set());
      setActiveFileId(null);
      setFocusedFileId(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to parse this patch.");
    }
  }, []);

  useEffect(() => {
    const patchUrl = `${import.meta.env.BASE_URL}initial-patch.json`;
    fetch(patchUrl)
      .then((response) => {
        if (!response.ok) throw new Error("No initial patch configured");
        return response.json() as Promise<PatchState>;
      })
      .then(({ contents, name }) => loadPatch(contents, name))
      .catch(() => undefined);
  }, [loadPatch]);

  useEffect(() => {
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };
    colorSchemeQuery.addEventListener("change", handleSystemThemeChange);
    return () => colorSchemeQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const theme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreference = themePreference;
  }, [theme, themePreference]);

  useEffect(() => {
    const preferences: ViewerPreferences = {
      version: 1,
      diffStyle,
      themePreference,
      wrapLines,
      sidebarView,
      sidebarCollapsed,
    };

    try {
      window.localStorage.setItem(preferencesStorageKey, JSON.stringify(preferences));
      window.localStorage.removeItem(legacyPreferencesStorageKey);
      window.localStorage.removeItem(legacyThemeStorageKey);
    } catch {
      // Keep preferences usable for this session when browser storage is unavailable.
    }
  }, [diffStyle, sidebarCollapsed, sidebarView, themePreference, wrapLines]);

  const files = useMemo(() => {
    try {
      return parsePatchFiles(
        patch.contents,
        `${patch.name}-${patch.contents.length}`,
        true,
      ).flatMap((entry) => entry.files);
    } catch {
      return [];
    }
  }, [patch]);

  const filteredFiles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return files;
    return files.filter((file) => file.name.toLowerCase().includes(normalizedQuery));
  }, [files, query]);

  const viewedFiles = useMemo(() => {
    if (!focusedFileId) return filteredFiles;
    return files.filter((file) => getFileId(file) === focusedFileId);
  }, [files, filteredFiles, focusedFileId]);

  const items = useMemo<CodeViewDiffItem[]>(
    () =>
      viewedFiles.map((file) => ({
        id: getFileId(file),
        type: "diff",
        fileDiff: file,
        collapsed: collapsedFileIds.has(getFileId(file)),
        version: collapsedFileIds.has(getFileId(file)) ? 1 : 0,
      })),
    [collapsedFileIds, viewedFiles],
  );

  const focusedFile = useMemo(
    () => files.find((file) => getFileId(file) === focusedFileId),
    [files, focusedFileId],
  );

  const viewedCount = useMemo(
    () => files.filter((file) => viewedFileIds.has(getFileId(file))).length,
    [files, viewedFileIds],
  );

  const allFilesCollapsed = useMemo(
    () => files.length > 0 && files.every((file) => collapsedFileIds.has(getFileId(file))),
    [collapsedFileIds, files],
  );

  useEffect(() => {
    setActiveFileId(files[0] ? getFileId(files[0]) : null);
  }, [files]);

  const totals = useMemo(
    () =>
      files.reduce(
        (stats, file) => {
          const fileStats = getFileStats(file);
          return {
            additions: stats.additions + fileStats.additions,
            deletions: stats.deletions + fileStats.deletions,
          };
        },
        { additions: 0, deletions: 0 },
      ),
    [files],
  );

  const readFile = useCallback(
    async (file?: globalThis.File) => {
      if (!file) return;
      loadPatch(await file.text(), file.name);
    },
    [loadPatch],
  );

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    void readFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void readFile(event.dataTransfer.files[0]);
  };

  const applyPastedPatch = () => {
    loadPatch(pasteValue, "pasted.patch");
    if (pasteValue.trim()) setPasteOpen(false);
  };

  const finishViewingFile = (fileId: string) => {
    setViewedFileIds((current) => new Set(current).add(fileId));
    setCollapsedFileIds((current) => new Set(current).add(fileId));
  };

  const activateFile = (fileId: string) => {
    const previousFileId = activeFileId ?? (files[0] ? getFileId(files[0]) : null);
    if (previousFileId && previousFileId !== fileId) {
      finishViewingFile(previousFileId);
    }
    setActiveFileId(fileId);
    setCollapsedFileIds((current) => {
      const next = new Set(current);
      next.delete(fileId);
      return next;
    });
  };

  const scrollToFile = (file: FileDiffMetadata) => {
    const fileId = getFileId(file);
    activateFile(fileId);
    if (focusedFileId && focusedFileId !== fileId) {
      setFocusedFileId(fileId);
      return;
    }
    requestAnimationFrame(() => {
      codeViewRef.current?.scrollTo({
        type: "item",
        id: fileId,
        align: "start",
        behavior: "smooth",
      });
    });
  };

  const toggleFileCollapsed = (fileId: string) => {
    setCollapsedFileIds((current) => {
      const next = new Set(current);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const toggleFocusedFile = (fileId: string) => {
    if (focusedFileId === fileId) {
      finishViewingFile(fileId);
      setFocusedFileId(null);
      setActiveFileId(null);
    } else {
      activateFile(fileId);
      setFocusedFileId(fileId);
    }
    setQuery("");
  };

  const toggleAllFilesCollapsed = () => {
    if (allFilesCollapsed) {
      setCollapsedFileIds(new Set());
    } else {
      setCollapsedFileIds(new Set(files.map(getFileId)));
    }
  };

  const cycleTheme = () => setThemePreference((value) => nextTheme(value));

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (target instanceof HTMLElement &&
          (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)))
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "c") toggleAllFilesCollapsed();
      else if (key === "w" || key === "z") setWrapLines((value) => !value);
      else if (key === "t") cycleTheme();
      else if (key === "v") {
        setDiffStyle((value) => (value === "split" ? "unified" : "split"));
      } else {
        return;
      }
      event.preventDefault();
    };

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  return (
    <div
      className={`app-shell${isDragging ? " is-dragging" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      <header className="topbar">
        <div className="header-identity">
          <h1 className="wordmark">
            <FilesIcon />
            <span>patchpreview</span>
          </h1>
          <div className="patch-identity">
            <strong title={patch.name}>{patch.name}</strong>
          </div>
        </div>

        <div className="header-summary" aria-label="Patch summary">
          <span>{files.length} changed</span>
          <span className="addition">+{totals.additions}</span>
          <span className="deletion">−{totals.deletions}</span>
        </div>

        <div className="topbar-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".patch,.diff,text/x-diff,text/plain"
            hidden
            onChange={handleFileInput}
          />
          <button
            className="icon-button header-action"
            aria-label="Paste patch"
            title="Paste patch"
            onClick={() => setPasteOpen(true)}
          >
            <ClipboardIcon />
          </button>
          <button className="button open-patch-button" onClick={() => fileInputRef.current?.click()}>
            <UploadIcon /> Open patch
          </button>
        </div>
      </header>

      <section className="summarybar">
        <div className="workspace-context">
          <button
            className="icon-button sidebar-toggle"
            aria-label={sidebarCollapsed ? "Expand file sidebar" : "Collapse file sidebar"}
            aria-pressed={sidebarCollapsed}
            title={sidebarCollapsed ? "Expand file sidebar" : "Collapse file sidebar"}
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            <SidebarIcon />
          </button>
          <span className="workspace-label">{focusedFile ? "Focused file" : "All changes"}</span>
          <span className="viewed-count"><CheckIcon /> {viewedCount} / {files.length} viewed</span>
          {focusedFile && (
            <button className="focus-pill" onClick={() => toggleFocusedFile(getFileId(focusedFile))}>
              <EyeIcon /> {shortPath(focusedFile.name)} <CloseIcon />
            </button>
          )}
        </div>

        <div className="viewer-controls">
          <button
            className="toolbar-button"
            aria-label={allFilesCollapsed ? "Expand all files" : "Collapse all files"}
            aria-pressed={allFilesCollapsed}
            title={`${allFilesCollapsed ? "Expand all files" : "Collapse all files"} (C)`}
            onClick={toggleAllFilesCollapsed}
          >
            <CollapseAllIcon />
          </button>
          <div className="segmented" aria-label="Diff layout">
            <button
              aria-pressed={diffStyle === "unified"}
              title="Unified view (V)"
              onClick={() => setDiffStyle("unified")}
            >
              Unified
            </button>
            <button
              aria-pressed={diffStyle === "split"}
              title="Split view (V)"
              onClick={() => setDiffStyle("split")}
            >
              Split
            </button>
          </div>
          <button
            className="icon-button"
            aria-label={wrapLines ? "Disable line wrapping" : "Wrap long lines"}
            aria-pressed={wrapLines}
            title={`${wrapLines ? "Disable" : "Enable"} line wrapping (W or Z)`}
            onClick={() => setWrapLines((value) => !value)}
          >
            <WrapIcon />
          </button>
          <button
            className="icon-button"
            aria-label={`Theme: ${themePreference}`}
            title={`Theme: ${themePreference} (T)`}
            onClick={cycleTheme}
          >
            {themePreference === "system" ? (
              <MonitorIcon />
            ) : themePreference === "dark" ? (
              <MoonIcon />
            ) : (
              <SunIcon />
            )}
          </button>
        </div>
      </section>

      {loadError && (
        <div className="error-banner" role="alert">
          <span>{loadError}</span>
          <button aria-label="Dismiss error" onClick={() => setLoadError(null)}>
            <CloseIcon />
          </button>
        </div>
      )}

      <main className={`workspace${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
        <aside className="file-panel">
          <div className="file-panel-header">
            <div className="file-panel-title">
              <span>Files</span>
              <span className="count-badge">{files.length}</span>
            </div>
            <div className="sidebar-view-toggle" aria-label="Sidebar layout">
              <button
                aria-label="Tree view"
                aria-pressed={sidebarView === "tree"}
                title="Tree view"
                onClick={() => setSidebarView("tree")}
              >
                <TreeIcon />
              </button>
              <button
                aria-label="Flat view"
                aria-pressed={sidebarView === "flat"}
                title="Flat view"
                onClick={() => setSidebarView("flat")}
              >
                <FlatListIcon />
              </button>
            </div>
          </div>
          <label className="search-field">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter files"
              aria-label="Filter changed files"
            />
            {query && (
              <button aria-label="Clear filter" onClick={() => setQuery("")}>
                <CloseIcon />
              </button>
            )}
          </label>
          {sidebarView === "tree" && filteredFiles.length > 0 ? (
            <TreeFileList
              key={`${patch.name}:${patch.contents.length}:${query}`}
              files={filteredFiles}
              activeFileId={activeFileId}
              onOpenFile={scrollToFile}
            />
          ) : (
            <nav className="file-list" aria-label="Changed files">
              {filteredFiles.map((file) => {
              const stats = getFileStats(file);
              const fileId = getFileId(file);
              const isCollapsed = collapsedFileIds.has(fileId);
              const isFocused = focusedFileId === fileId;
              const isViewed = viewedFileIds.has(fileId);
              const isActive = activeFileId === fileId;
              return (
                <div
                  className={`file-row${isFocused ? " is-focused" : ""}${isViewed ? " is-viewed" : ""}${isActive ? " is-active" : ""}`}
                  key={fileId}
                >
                  <button className="file-jump" onClick={() => scrollToFile(file)}>
                    <span className={`file-status ${file.type}`}>{file.type[0].toUpperCase()}</span>
                    <span className="file-name" title={file.name}>
                      <FileIcon />
                      <span>{shortPath(file.name)}</span>
                      {isViewed && <CheckIcon className="viewed-check" />}
                    </span>
                    <span className="file-stats">
                      <span className="addition">+{stats.additions}</span>
                      <span className="deletion">−{stats.deletions}</span>
                    </span>
                  </button>
                  <div className="file-actions">
                    <button
                      aria-label={`${isFocused ? "Show all files instead of" : "View only"} ${file.name}`}
                      aria-pressed={isFocused}
                      title={isFocused ? "Show all files" : "View only this file"}
                      onClick={() => toggleFocusedFile(fileId)}
                    >
                      <EyeIcon />
                    </button>
                    <button
                      aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${file.name}`}
                      aria-pressed={isCollapsed}
                      title={isCollapsed ? "Expand file" : "Collapse file"}
                      onClick={() => toggleFileCollapsed(fileId)}
                    >
                      <ChevronIcon className={isCollapsed ? "is-collapsed" : ""} />
                    </button>
                  </div>
                </div>
              );
              })}
              {filteredFiles.length === 0 && (
                <p className="empty-filter">No files match “{query}”.</p>
              )}
            </nav>
          )}
          <div className="drop-hint"><UploadIcon /> Drop a .patch or .diff anywhere</div>
        </aside>

        <section className="diff-panel" aria-label="Diff viewer">
          {items.length > 0 ? (
            <CodeView
              ref={codeViewRef}
              key={`${patch.name}:${patch.contents.length}`}
              items={items}
              className="code-view"
              renderHeaderMetadata={(item) => {
                if (item.type !== "diff") return null;
                const isCollapsed = collapsedFileIds.has(item.id);
                const isFocused = focusedFileId === item.id;
                return (
                  <div className="diff-header-actions">
                    <button
                      aria-label={isFocused ? "Show all files" : `View only ${item.fileDiff.name}`}
                      aria-pressed={isFocused}
                      title={isFocused ? "Show all files" : "View only this file"}
                      onClick={() => toggleFocusedFile(item.id)}
                    >
                      <EyeIcon />
                    </button>
                    <button
                      aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${item.fileDiff.name}`}
                      aria-pressed={isCollapsed}
                      title={isCollapsed ? "Expand file" : "Collapse file"}
                      onClick={() => toggleFileCollapsed(item.id)}
                    >
                      <ChevronIcon className={isCollapsed ? "is-collapsed" : ""} />
                    </button>
                  </div>
                );
              }}
              options={{
                diffStyle,
                diffIndicators: "bars",
                hunkSeparators: "line-info",
                overflow: wrapLines ? "wrap" : "scroll",
                stickyHeaders: true,
                theme: { light: "github-light", dark: "github-dark" },
                themeType: theme,
                lineDiffType: "word-alt",
                enableLineSelection: true,
              }}
            />
          ) : (
            <div className="empty-state">
              <span><FileIcon /></span>
              <h2>No changes to show</h2>
              <p>Open a unified patch or clear the file filter.</p>
              <button className="button primary" onClick={() => fileInputRef.current?.click()}>
                <UploadIcon /> Open patch
              </button>
            </div>
          )}
        </section>
      </main>

      {isDragging && (
        <div className="drop-overlay">
          <span><UploadIcon /></span>
          <strong>Drop patch to review</strong>
          <p>.patch, .diff, or unified text</p>
        </div>
      )}

      {pasteOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setPasteOpen(false)}>
          <section
            className="paste-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="paste-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">Import</span>
                <h2 id="paste-title">Paste a unified diff</h2>
              </div>
              <button className="icon-button" aria-label="Close" onClick={() => setPasteOpen(false)}>
                <CloseIcon />
              </button>
            </div>
            <textarea
              autoFocus
              spellCheck={false}
              value={pasteValue}
              onChange={(event) => setPasteValue(event.target.value)}
              placeholder={"--- old/file.ts\n+++ new/file.ts\n@@ -1 +1 @@\n-old\n+new"}
            />
            <div className="modal-actions">
              <button className="button secondary" onClick={() => setPasteOpen(false)}>Cancel</button>
              <button className="button primary" disabled={!pasteValue.trim()} onClick={applyPastedPatch}>
                Review patch
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
