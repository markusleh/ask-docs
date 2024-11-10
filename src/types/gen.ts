interface Metadata {
  source: string
  title: string
  subtitle?: string
  original_text: string
}
export interface SourceHoverCardProps {
  linkTitle: string
  content: string
  metadata: Metadata
}
