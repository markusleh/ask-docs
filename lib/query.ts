import { SupabaseVectorStore } from "langchain/vectorstores/supabase";
import { supabaseServer} from "@/lib/supabase-server";
import {model, embeddings} from "@/lib/ai-server";
import { ConversationalRetrievalQAChain, ConversationChain } from "langchain/chains";


export const vectorStore = new SupabaseVectorStore(
  embeddings,
  {
    client: supabaseServer,
    tableName: "documents",
    queryName: "match_documents",
  }
)

const retriever = vectorStore.asRetriever(4)

export const chain = ConversationalRetrievalQAChain.fromLLM(
  model,
  retriever,
  {
    returnSourceDocuments: true,
  },
);

