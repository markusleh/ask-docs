import { NextResponse } from "next/server"
import { LLMChain, PromptTemplate } from "langchain"
import { ConsoleCallbackHandler } from "langchain/callbacks"
import { ChainValues, LLMResult } from "langchain/schema"

import { model } from "@/lib/ai-server"
import { chain } from "@/lib/query"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const { query } = await req.json()
  console.log("query", query)
  let responseStream = new TransformStream()
  const writer = responseStream.writable.getWriter()
  const encoder = new TextEncoder()

  chain
    .call(
      {
        question: query,
        chat_history: [],
        verbose: true,
      },
      [
        new ConsoleCallbackHandler(),
        {
          async handleLLMNewToken(token: string) {
            await writer.write(encoder.encode(`data: ${token}\n\n`))
            console.log("handleLLMNewToken", token)
          },
          handleChainEnd(
            outputs: ChainValues,
            runId: string,
            parentRunId?: string
          ): Promise<void> | void {
            console.log("chainEnd", runId, parentRunId)
            try {
              writer.close()
            } catch (e) {
              console.error("writer.close", e)
            }
          },
        },
      ]
    )
    .catch((e) => {
      console.error("chain error", e)
    })
  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
    },
  })
}
