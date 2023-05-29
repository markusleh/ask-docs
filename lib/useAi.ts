"use client"
import {useState} from "react";
import { fetchEventSource } from '@microsoft/fetch-event-source';

export function useAi() {
  const [convhistory, setConvhistory] = useState<string[]>([])
  const [tokens, setTokens] = useState<string[]>([])

  const query = async (question: string) => {
    fetchEventSource('/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({query: question}),
      onmessage: (event) => {
        console.log("onmessage", event.data)
        setTokens((tokens) => [...tokens, event.data])
      }
    })
  }
  return {convhistory, tokens, query}
}
