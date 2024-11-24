"use client"

import React from "react"
import { useChat } from "ai/react"

import { SourceHoverCardProps } from "@/types/gen"
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

function SourceHoverCard({
  linkTitle,
  content,
  metadata,
}: SourceHoverCardProps) {
  return (
    <a
      className="text-start"
      href={metadata.source}
      target="_blank"
      rel="noreferrer"
    >
      {linkTitle}. {metadata.title} {"->"} {metadata.subtitle || metadata.title}
    </a>
  )
}

type CardProps = React.ComponentProps<typeof Card>

function ChatCard({ className, ...props }: CardProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [sourcesForMessages, setSourcesForMessages] = React.useState<
    Record<string, any>
  >({})

  console.log("sourcesForMessages", sourcesForMessages)
  const {
    messages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading: chatEndpointIsLoading,
    setMessages,
  } = useChat({
    api: "/api/chat",
    onResponse(response) {
      const sourcesHeader = response.headers.get("x-sources")
      const sources = sourcesHeader
        ? JSON.parse(Buffer.from(sourcesHeader, "base64").toString("utf8"))
        : []
      const messageIndexHeader = response.headers.get("x-message-index")
      if (sources.length && messageIndexHeader !== null) {
        setSourcesForMessages({
          ...sourcesForMessages,
          [messageIndexHeader]: sources,
        })
      }
    },
    streamMode: "text",
    onError: (e) => {
      console.error(e)
    },
  })

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    handleSubmit(event)
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    event.preventDefault()
    event.currentTarget.reset()
  }
  return (
    <Card className={cn("w-full", className)} {...props}>
      <CardHeader>
        <CardTitle>Ask</CardTitle>
        <CardDescription>Ask docs</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          {messages.map((message, index: number) => (
            <div
              key={index}
              className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0"
            >
              <span className="flex h-2 w-2 translate-y-1 rounded-full bg-sky-500" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {message.role}
                </p>
                <p className="text-sm text-muted-foreground">
                  {message.content}
                </p>
                <div className="flex w-full flex-col items-start text-sm">
                  {sourcesForMessages[index]?.map(
                    (source: any, index: number) => (
                      <SourceHoverCard
                        key={index}
                        metadata={source.metadata}
                        linkTitle={(index + 1).toString()}
                        content={source.pageContent}
                      />
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
          {chatEndpointIsLoading && (
            <div
              key={"thinking"}
              className="mb-4 grid grid-cols-[25px_1fr] items-start pb-4 last:mb-0 last:pb-0"
            >
              <span className="relative flex h-2 w-2 translate-y-1 ">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">assistant</p>
                <p className="text-sm text-muted-foreground">Thinking...</p>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </CardContent>
      <CardFooter>
        <form onSubmit={onSubmit} className="w-full">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Ask something"
              name="question"
              autoComplete="off"
              className="min-w-32"
              onChange={handleInputChange}
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
      <ChatCard />
    </section>
  )
}
