"use client"

import React from "react"
import { EventStreamContentType } from "@fortaine/fetch-event-source"
import { fetchEventSource } from "@microsoft/fetch-event-source"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type CardProps = React.ComponentProps<typeof Card>

interface ChatMessage {
  text: string
  type: "user" | "bot"
}

function CardDemo({ className, ...props }: CardProps) {
  const [tokens, setTokens] = React.useState<string[] | []>([])
  const [conversation, setConversation] = React.useState<ChatMessage[] | []>([])
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const updateTokens = (token: string) => {
    setTokens((currentTokens) => [...currentTokens, token])
  }
  const makeQuery = (question: string) => {
    if (tokens.length > 0) {
      setConversation((currentConversation) => [
        ...currentConversation,
        { type: "bot", text: tokens.join("") },
      ])
    }
    setTokens([])
    setConversation((currentConversation) => [
      ...currentConversation,
      { type: "user", text: question },
    ])
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    fetchEventSource("/api/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: question, history: conversation.map(i => i.text) }),
      async onopen(response) {
        if (
          response.ok &&
          response.headers.get("content-type") === EventStreamContentType
        ) {
          scrollRef.current?.scrollIntoView({ behavior: "smooth" })
          return // everything's good
        } else if (
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429
        ) {
          // client-side errors are usually non-retriable:
          throw new Error("non-retriable client-side error")
        } else {
          throw new Error("server-side error")
        }
      },
      onmessage: (event) => updateTokens(event.data),
      onerror: (event) => {
        console.log("onerror", event)
      },
    })
  }
  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const question = formData.get("question") as string
    makeQuery(question)
    event.currentTarget.reset()
  }
  const currentConv: ChatMessage[] =
    tokens.length > 0
      ? [...conversation, { type: "bot", text: tokens.join("") }]
      : conversation
  return (
    <Card className={cn("w-full", className)} {...props}>
      <CardHeader>
        <CardTitle>Ask</CardTitle>
        <CardDescription>Ask docs</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          {currentConv.map((notification: ChatMessage, index: number) => (
            <div
              key={index}
              className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0"
            >
              <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {notification.type}
                </p>
                <p className="text-sm text-muted-foreground">
                  {notification.text}
                </p>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </CardContent>
      <CardFooter>
        <form onSubmit={onSubmit} className="w-full">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Ask something"
              name="question"
              className="min-w-32"
            />
            <Button className="w-32" variant="default">
              Ask
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  )
}

export default function IndexPage() {
  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <CardDemo />
    </section>
  )
}
