import "server-only"
import { HuggingFaceInferenceEmbeddings } from "langchain/embeddings/hf"
import { OpenAI } from "langchain/llms/openai"

// verify that the API keys are set
if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY not set, please set it in your .env file or in your environment variables"
  )
}
// verify that the API keys are set
if (!process.env.HUGGGINGFACE_API_KEY) {
  throw new Error(
    "HUGGGINGFACE_API_KEY not set, please set it in your .env file or in your environment variables"
  )
}

export const model = new OpenAI({
  temperature: 0.2,
  openAIApiKey: process.env.OPENAI_API_KEY,
  streaming: true,
  modelName: "gpt-3.5-turbo",
})

export const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HUGGGINGFACE_API_KEY,
  model: "obrizum/all-MiniLM-L6-v2", // TODO: select model
})
