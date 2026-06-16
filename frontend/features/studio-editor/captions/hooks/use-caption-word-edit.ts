"use client"

import { useState } from "react"

export function useCaptionWordEdit({
  onCommitWordText,
}: {
  onCommitWordText: (wordId: string, text: string) => void
}) {
  const [editingWordId, setEditingWordId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")

  const startEditingWord = ({
    text,
    wordId,
  }: {
    text: string
    wordId: string
  }) => {
    setEditingWordId(wordId)
    setEditingText(text)
  }

  const commitEditingWord = () => {
    if (!editingWordId) {
      return
    }

    onCommitWordText(editingWordId, editingText)
    setEditingWordId(null)
    setEditingText("")
  }

  const cancelEditingWord = () => {
    setEditingWordId(null)
    setEditingText("")
  }

  return {
    cancelEditingWord,
    commitEditingWord,
    editingText,
    editingWordId,
    setEditingText,
    startEditingWord,
  }
}
