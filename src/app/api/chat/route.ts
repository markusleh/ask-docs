/* from https://github.com/langchain-ai/langchain-nextjs-template/blob/main/app/api/chat/retrieval/route.ts */
import { NextRequest, NextResponse } from "next/server"
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf"
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase"
import { Document } from "@langchain/core/documents"
import {
  BytesOutputParser,
  StringOutputParser,
} from "@langchain/core/output_parsers"
import { PromptTemplate } from "@langchain/core/prompts"
import { RunnableSequence } from "@langchain/core/runnables"
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai"
import { createClient } from "@supabase/supabase-js"
import { StreamingTextResponse, Message as VercelChatMessage } from "ai"

export const runtime = "edge"

const combineDocumentsFn = (docs: Document[]) => {
  const serializedDocs = docs.map((doc) => doc.pageContent)
  return serializedDocs.join("\n\n")
}

const formatVercelMessages = (chatHistory: VercelChatMessage[]) => {
  const formattedDialogueTurns = chatHistory.map((message) => {
    if (message.role === "user") {
      return `Human: ${message.content}`
    } else if (message.role === "assistant") {
      return `Assistant: ${message.content}`
    } else {
      return `${message.role}: ${message.content}`
    }
  })
  return formattedDialogueTurns.join("\n")
}

const CONDENSE_QUESTION_TEMPLATE = `Given the following conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

<chat_history>
  {chat_history}
</chat_history>

Follow Up Input: {question}
Standalone question:`
const condenseQuestionPrompt = PromptTemplate.fromTemplate(
  CONDENSE_QUESTION_TEMPLATE
)

const ANSWER_TEMPLATE = `You are a security consultant helping customer to set up Microsoft security tools.

Answer the question based only on the following context and chat history:
<context>
  {context}
</context>

<chat_history>
  {chat_history}
</chat_history>

Question: {question}
`
const answerPrompt = PromptTemplate.fromTemplate(ANSWER_TEMPLATE)

/**
 * This handler initializes and calls a retrieval chain. It composes the chain using
 * LangChain Expression Language. See the docs for more information:
 *
 * https://js.langchain.com/v0.2/docs/how_to/qa_chat_history_how_to/
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const messages = body.messages ?? []
    const previousMessages = messages.slice(0, -1)
    const currentMessageContent = messages[messages.length - 1].content
    console.log("messages", messages)

    const model = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.2,
    })

    const client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    )
    const embeddings = new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HUGGGINGFACE_API_KEY!,
      model: "sentence-transformers/all-MiniLM-L6-v2",
    })
    const vectorstore = new SupabaseVectorStore(embeddings, {
      client,
      tableName: "documents",
      queryName: "match_documents",
    })

    /**
     * We use LangChain Expression Language to compose two chains.
     * To learn more, see the guide here:
     *
     * https://js.langchain.com/docs/guides/expression_language/cookbook
     *
     * You can also use the "createRetrievalChain" method with a
     * "historyAwareRetriever" to get something prebaked.
     */
    const standaloneQuestionChain = RunnableSequence.from([
      condenseQuestionPrompt,
      model,
      new StringOutputParser(),
    ])

    let resolveWithDocuments: (value: Document[]) => void
    const documentPromise = new Promise<Document[]>((resolve) => {
      resolveWithDocuments = resolve
    })

    const retriever = vectorstore.asRetriever({
      callbacks: [
        {
          handleRetrieverEnd(documents) {
            resolveWithDocuments(documents)
          },
        },
      ],
    })

    const retrievalChain = retriever.pipe(combineDocumentsFn)

    const answerChain = RunnableSequence.from([
      {
        context: RunnableSequence.from([
          (input) => input.question,
          retrievalChain,
        ]),
        chat_history: (input) => input.chat_history,
        question: (input) => input.question,
      },
      answerPrompt,
      model,
    ])

    const conversationalRetrievalQAChain = RunnableSequence.from([
      {
        question: standaloneQuestionChain,
        chat_history: (input) => input.chat_history,
      },
      answerChain,
      new BytesOutputParser(),
    ])

    const stream = await conversationalRetrievalQAChain.stream({
      question: currentMessageContent,
      chat_history: formatVercelMessages(previousMessages),
    })

    const documents = await documentPromise
    const serializedSources = Buffer.from(
      JSON.stringify(
        documents.map((doc) => {
          return {
            pageContent: doc.pageContent.slice(0, 30) + "...",
            metadata: doc.metadata,
          }
        })
      )
    ).toString("base64")

    return new StreamingTextResponse(stream, {
      headers: {
        "x-message-index": (previousMessages.length + 1).toString(),
        "x-sources": serializedSources,
      },
    })
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 })
  }
}
