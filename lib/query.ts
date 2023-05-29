import {
  ConversationChain,
  ConversationalRetrievalQAChain,
} from "langchain/chains"
import { SupabaseVectorStore } from "langchain/vectorstores/supabase"

import { embeddings, model } from "@/lib/ai-server"
import { supabaseServer } from "@/lib/supabase-server"

export const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabaseServer,
  tableName: "documents",
  queryName: "match_documents",
})

const retriever = vectorStore.asRetriever(4)

export const chain = ConversationalRetrievalQAChain.fromLLM(model, retriever, {
  returnSourceDocuments: true,
})
