"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { AlertTriangle, RotateCcw, Save } from "lucide-react"
import { useStore } from "zustand"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApiError } from "@/lib/api/api-error"

import {
  useStudioEditorStoreApi,
} from "../store/studio-editor-store"
import {
  getEditorDocumentFingerprint,
  hydrateEditorDocument,
  serializeEditorDocument,
} from "./editor-snapshot.mapper"
import type { EditorDocument } from "./editor-snapshot.schema"
import { editorSnapshotService } from "./editor-snapshot.service"
import type {
  EditorSnapshotConflict,
  EditorSnapshotSaveStatus,
} from "./editor-snapshot.types"

const AUTOSAVE_DELAY_MS = 2000

type ReloadedSnapshot = {
  document: EditorDocument
  version: number
}

type EditorSnapshotPersistenceContextValue = {
  conflict: EditorSnapshotConflict | null
  discardChanges: () => Promise<void>
  overwrite: () => void
  retry: () => void
  status: EditorSnapshotSaveStatus
}

const EditorSnapshotPersistenceContext =
  createContext<EditorSnapshotPersistenceContextValue | null>(null)

export function getEditorSnapshotVersionConflict(
  error: unknown
): EditorSnapshotConflict | null {
  if (
    !(error instanceof ApiError) ||
    error.code !== "EDITOR_SNAPSHOT_VERSION_CONFLICT" ||
    !error.details ||
    Array.isArray(error.details)
  ) {
    return null
  }

  const currentVersion = error.details.currentVersion
  const baseVersion = error.details.baseVersion

  return typeof currentVersion === "number" &&
    typeof baseVersion === "number"
    ? { currentVersion, baseVersion }
    : null
}

export function EditorSnapshotPersistenceProvider({
  canEdit,
  children,
  initialVersion,
  projectId,
  reloadLatest,
}: {
  canEdit: boolean
  children: ReactNode
  initialVersion: number
  projectId: string
  reloadLatest: () => Promise<ReloadedSnapshot>
}) {
  const store = useStudioEditorStoreApi()
  const project = useStore(store, (state) => state.project)
  const normalizedInitialDocument = useMemo(
    () => serializeEditorDocument(project),
    // The store is created from the initial project once per route key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const [status, setStatus] = useState<EditorSnapshotSaveStatus>(
    canEdit ? "idle" : "view-only"
  )
  const [conflict, setConflict] =
    useState<EditorSnapshotConflict | null>(null)
  const latestDocumentRef = useRef(normalizedInitialDocument)
  const latestFingerprintRef = useRef(
    getEditorDocumentFingerprint(normalizedInitialDocument)
  )
  const baselineFingerprintRef = useRef(
    getEditorDocumentFingerprint(normalizedInitialDocument)
  )
  const versionRef = useRef(initialVersion)
  const inFlightRef = useRef<Promise<void> | null>(null)
  const trailingSaveRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const conflictRef = useRef<EditorSnapshotConflict | null>(null)
  const mountedRef = useRef(true)
  const saveLatestRef = useRef<(baseVersion?: number) => void>(() => undefined)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const updateStatus = useCallback((nextStatus: EditorSnapshotSaveStatus) => {
    if (mountedRef.current) {
      setStatus(nextStatus)
    }
  }, [])

  const setActiveConflict = useCallback(
    (nextConflict: EditorSnapshotConflict | null) => {
      conflictRef.current = nextConflict
      if (mountedRef.current) {
        setConflict(nextConflict)
      }
    },
    []
  )

  const saveLatest = useCallback(
    (baseVersionOverride?: number) => {
      if (!canEdit || conflictRef.current) {
        return
      }

      clearTimer()

      if (inFlightRef.current) {
        trailingSaveRef.current = true
        return
      }

      const document = latestDocumentRef.current
      const fingerprint = latestFingerprintRef.current

      if (fingerprint === baselineFingerprintRef.current) {
        return
      }

      const baseVersion = baseVersionOverride ?? versionRef.current
      trailingSaveRef.current = false
      updateStatus("saving")

      const request = editorSnapshotService
        .save(projectId, {
          baseVersion,
          document,
        })
        .then(({ editorSnapshot }) => {
          if (!editorSnapshot) {
            throw new Error("Editor snapshot save returned no snapshot")
          }

          versionRef.current = editorSnapshot.version
          baselineFingerprintRef.current = fingerprint

          if (latestFingerprintRef.current === fingerprint) {
            updateStatus("saved")
          } else {
            trailingSaveRef.current = true
            updateStatus("dirty")
          }
        })
        .catch((error: unknown) => {
          const nextConflict = getEditorSnapshotVersionConflict(error)

          if (nextConflict) {
            setActiveConflict(nextConflict)
            updateStatus("conflict")
            return
          }

          updateStatus("error")
        })
        .finally(() => {
          inFlightRef.current = null

          if (
            trailingSaveRef.current &&
            !conflictRef.current &&
            latestFingerprintRef.current !== baselineFingerprintRef.current
          ) {
            trailingSaveRef.current = false
            queueMicrotask(() => saveLatestRef.current())
          }
        })

      inFlightRef.current = request
    },
    [
      canEdit,
      clearTimer,
      projectId,
      setActiveConflict,
      updateStatus,
    ]
  )

  useEffect(() => {
    saveLatestRef.current = saveLatest
  }, [saveLatest])

  useEffect(() => {
    const document = serializeEditorDocument(project)
    const fingerprint = getEditorDocumentFingerprint(document)

    latestDocumentRef.current = document
    latestFingerprintRef.current = fingerprint

    if (
      !canEdit ||
      fingerprint === baselineFingerprintRef.current ||
      conflictRef.current
    ) {
      return
    }

    if (inFlightRef.current) {
      trailingSaveRef.current = true
      return
    }

    if (status === "error") {
      return
    }

    updateStatus("dirty")
    clearTimer()
    timerRef.current = setTimeout(() => saveLatestRef.current(), AUTOSAVE_DELAY_MS)
  }, [canEdit, clearTimer, project, status, updateStatus])

  useEffect(() => {
    mountedRef.current = true

    const hasPendingChanges = () =>
      latestFingerprintRef.current !== baselineFingerprintRef.current ||
      Boolean(inFlightRef.current)

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingChanges()) return

      event.preventDefault()
      event.returnValue = ""
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveLatestRef.current()
      }
    }
    const handlePageHide = () => {
      saveLatestRef.current()
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    window.addEventListener("pagehide", handlePageHide)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      mountedRef.current = false
      clearTimer()
      saveLatestRef.current()
      window.removeEventListener("beforeunload", handleBeforeUnload)
      window.removeEventListener("pagehide", handlePageHide)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [clearTimer])

  const retry = useCallback(() => {
    if (status !== "error") return
    saveLatestRef.current()
  }, [status])

  const overwrite = useCallback(() => {
    const activeConflict = conflictRef.current

    if (!activeConflict) return

    versionRef.current = activeConflict.currentVersion
    setActiveConflict(null)
    saveLatestRef.current(activeConflict.currentVersion)
  }, [setActiveConflict])

  const discardChanges = useCallback(async () => {
    clearTimer()
    updateStatus("saving")

    try {
      const latest = await reloadLatest()
      const state = store.getState()
      const nextProject = hydrateEditorDocument(state.project, latest.document)
      const normalizedDocument = serializeEditorDocument(nextProject)
      const fingerprint = getEditorDocumentFingerprint(normalizedDocument)

      store.setState({
        currentTime: 0,
        historyFuture: [],
        historyPast: [],
        isPlaying: false,
        project: nextProject,
        selectedItemId: nextProject.sourceMedia.id,
      })
      latestDocumentRef.current = normalizedDocument
      latestFingerprintRef.current = fingerprint
      baselineFingerprintRef.current = fingerprint
      versionRef.current = latest.version
      trailingSaveRef.current = false
      setActiveConflict(null)
      updateStatus(canEdit ? "saved" : "view-only")
    } catch {
      updateStatus("error")
    }
  }, [
    canEdit,
    clearTimer,
    reloadLatest,
    setActiveConflict,
    store,
    updateStatus,
  ])

  const value = useMemo(
    () => ({
      conflict,
      discardChanges,
      overwrite,
      retry,
      status,
    }),
    [conflict, discardChanges, overwrite, retry, status]
  )

  return (
    <EditorSnapshotPersistenceContext.Provider value={value}>
      {children}
      <Dialog open={Boolean(conflict)}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>Newer editor version detected</DialogTitle>
            <DialogDescription>
              This project was saved elsewhere while you were editing. Keep
              your local composition by overwriting the newer version, or
              discard your changes and load the latest saved version.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-border/70 bg-muted/35 px-3 py-2 text-xs text-muted-foreground">
            Local base version {conflict?.baseVersion ?? "—"} · Latest version{" "}
            {conflict?.currentVersion ?? "—"}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => void discardChanges()}
            >
              <RotateCcw />
              Discard changes
            </Button>
            <Button type="button" onClick={overwrite}>
              <Save />
              Overwrite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EditorSnapshotPersistenceContext.Provider>
  )
}

export function useEditorSnapshotPersistence() {
  const context = useContext(EditorSnapshotPersistenceContext)

  if (!context) {
    throw new Error(
      "Editor snapshot persistence hooks must be used within its provider."
    )
  }

  return context
}
