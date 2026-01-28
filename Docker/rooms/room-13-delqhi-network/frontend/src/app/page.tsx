import { Timeline } from '@/components/Timeline';
import { CreatePost } from '@/components/CreatePost';

export default function HomePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Home</h1>
      <CreatePost />
      <Timeline />
    </div>
  );
}
