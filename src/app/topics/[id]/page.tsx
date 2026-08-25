import { TopicDetail } from "@/components/hermes/topic-detail";

/**
 * Topic-detail view — labels, published volume, producers, and subscribers for
 * one topic. In Next 15 route params are async, so they are awaited here.
 */
export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TopicDetail topicId={decodeURIComponent(id)} />;
}
