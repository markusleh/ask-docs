import { ConsoleCallbackHandler } from "langchain/callbacks"
import { ChainValues } from "langchain/schema"

import { chain } from "@/lib/query"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const { query, history } = await req.json()
  console.log("query", query)
  console.log("history", history)
  let responseStream = new TransformStream()
  const writer = responseStream.writable.getWriter()
  const encoder = new TextEncoder()

  chain
    .call(
      {
        question: query,
        chat_history: history,
        // verbose: true,
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
